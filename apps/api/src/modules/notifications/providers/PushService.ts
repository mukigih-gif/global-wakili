/**
 * providers/PushService.ts
 *
 * Push notification delivery via Firebase Cloud Messaging (FCM).
 *
 * Behaviour:
 *   - When FCM_PROJECT_ID + FCM_CLIENT_EMAIL + FCM_PRIVATE_KEY are set: sends via FCM.
 *   - Otherwise: simulation mode (dev/test).
 *
 * Required env vars (production):
 *   FCM_PROJECT_ID   — Firebase project ID
 *   FCM_CLIENT_EMAIL — Service account client email
 *   FCM_PRIVATE_KEY  — Service account private key (PEM, newlines as \n)
 *
 * Each recipient must supply a deviceToken (FCM registration token).
 * Tokens are stored on the User record (User.fcmToken field, if present)
 * or passed directly in the notification input.
 *
 * WIP-002 — Gap 006.
 */

import * as admin from 'firebase-admin';

export type PushRecipient = {
  deviceToken: string;
  name?: string | null;
};

export type PushSendInput = {
  tenantId: string;
  recipients: PushRecipient[];
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export type PushSendResult = {
  provider: 'fcm' | 'simulated';
  accepted: boolean;
  providerMessageIds: string[];
  rawResponse?: Record<string, unknown> | null;
};

let fcmApp: admin.app.App | null = null;

function getFcmApp(): admin.app.App | null {
  const projectId  = process.env.FCM_PROJECT_ID?.trim();
  const clientEmail = process.env.FCM_CLIENT_EMAIL?.trim();
  const privateKey  = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

  if (!projectId || !clientEmail || !privateKey) return null;

  if (!fcmApp) {
    const existing = admin.apps.find((a) => a?.name === 'global-wakili-fcm');
    if (existing) {
      fcmApp = existing;
    } else {
      fcmApp = admin.initializeApp(
        {
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        },
        'global-wakili-fcm',
      );
    }
  }

  return fcmApp;
}

export class PushService {
  static async send(input: PushSendInput): Promise<PushSendResult> {
    if (!input.recipients.length) {
      throw Object.assign(new Error('At least one push notification recipient is required'), {
        statusCode: 400,
        code: 'NOTIFICATION_INVALID_RECIPIENTS',
      });
    }

    const app = getFcmApp();

    if (!app) {
      // Simulation mode
      const ids = input.recipients.map(
        () => `sim-push-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      );
      console.info('[PUSH] Simulation mode (no FCM credentials configured)', {
        tenantId: input.tenantId,
        count: input.recipients.length,
        title: input.title,
      });
      return {
        provider: 'simulated',
        accepted: true,
        providerMessageIds: ids,
        rawResponse: { simulated: true, deliveryClaim: 'ACCEPTED_BY_FOUNDATION_PROVIDER_ONLY' },
      };
    }

    const messaging = app.messaging();
    const tokens = input.recipients.map((r) => r.deviceToken).filter(Boolean);

    if (!tokens.length) {
      return { provider: 'fcm', accepted: false, providerMessageIds: [], rawResponse: { error: 'No valid device tokens' } };
    }

    // FCM multi-cast (up to 500 tokens per call)
    const BATCH_SIZE = 500;
    const ids: string[] = [];
    let accepted = false;

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: {
          title: input.title,
          body: input.body,
          ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
        },
        data: input.data ?? {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });

      for (const result of response.responses) {
        if (result.success && result.messageId) {
          ids.push(result.messageId);
          accepted = true;
        }
      }
    }

    console.info('[PUSH] FCM sent', { tenantId: input.tenantId, total: tokens.length, accepted: ids.length });

    return {
      provider: 'fcm',
      accepted,
      providerMessageIds: ids,
      rawResponse: { sentCount: ids.length, totalRecipients: tokens.length },
    };
  }
}
