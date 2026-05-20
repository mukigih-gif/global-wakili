import type { NotificationDbClient } from '../notification.types';

type NotificationWebhookStatus =
  | 'DELIVERED'
  | 'FAILED'
  | 'BOUNCED'
  | 'SENT';

function requireWebhookTenantId(tenantId: string | null | undefined): string {
  if (!tenantId || !tenantId.trim()) {
    throw Object.assign(new Error('Tenant context is required for notification provider webhook.'), {
      statusCode: 401,
      code: 'NOTIFICATION_WEBHOOK_TENANT_REQUIRED',
    });
  }

  return tenantId.trim();
}

function normalizeWebhookPayload(payload?: Record<string, unknown> | null): Record<string, unknown> | null {
  return payload ?? null;
}

async function recordWebhookEventSafely(
  db: NotificationDbClient,
  params: {
    tenantId: string;
    notificationId?: string | null;
    provider: string;
    providerMessageId?: string | null;
    eventType: string;
    status?: NotificationWebhookStatus | null;
    payload?: Record<string, unknown> | null;
    processedAt?: Date | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  try {
    await db.notificationWebhookEvent.create({
      data: {
        tenantId: params.tenantId,
        notificationId: params.notificationId ?? null,
        provider: params.provider,
        providerMessageId: params.providerMessageId ?? null,
        eventType: params.eventType,
        status: params.status ?? null,
        verificationStatus: 'SKIPPED',
        payload: normalizeWebhookPayload(params.payload),
        processedAt: params.processedAt ?? null,
        errorMessage: params.errorMessage ?? null,
        metadata: {
          ...(params.metadata ?? {}),
          recordedAt: new Date().toISOString(),
          verificationClaim: 'SIGNATURE_VERIFICATION_NOT_CONFIGURED',
        },
      },
    });
  } catch (error) {
    // The webhook event table is the callback audit ledger. A ledger write failure
    // must not prevent the existing Notification status update path from completing.
    console.error('Notification webhook event persistence failed', {
      tenantId: params.tenantId,
      notificationId: params.notificationId ?? null,
      provider: params.provider,
      providerMessageId: params.providerMessageId ?? null,
      eventType: params.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
export class NotificationWebhookService {
  static async updateProviderStatus(
    db: NotificationDbClient,
    params: {
      tenantId: string;
      providerMessageId: string;
      provider?: string | null;
      status: NotificationWebhookStatus;
      payload?: Record<string, unknown> | null;
      timestamp?: Date;
    },
  ) {
    const tenantId = requireWebhookTenantId(params.tenantId);

    const notification = await db.notification.findFirst({
      where: {
        tenantId,
        providerMessageId: params.providerMessageId,
        ...(params.provider ? { provider: params.provider } : {}),
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!notification) {
      await recordWebhookEventSafely(db, {
        tenantId,
        notificationId: null,
        provider: params.provider ?? 'unknown',
        providerMessageId: params.providerMessageId,
        eventType: params.status,
        status: params.status,
        payload: params.payload ?? null,
        processedAt: params.timestamp ?? new Date(),
        errorMessage: 'Notification not found for provider callback.',
        metadata: {
          outcome: 'NOTIFICATION_PROVIDER_MESSAGE_NOT_FOUND',
        },
      });

      throw Object.assign(new Error('Notification not found for provider callback'), {
        statusCode: 404,
        code: 'NOTIFICATION_PROVIDER_MESSAGE_NOT_FOUND',
        details: {
          tenantId,
          providerMessageId: params.providerMessageId,
          provider: params.provider ?? null,
        },
      });
    }

    const now = params.timestamp ?? new Date();

    await recordWebhookEventSafely(db, {
      tenantId,
      notificationId: notification.id,
      provider: params.provider ?? 'unknown',
      providerMessageId: params.providerMessageId,
      eventType: params.status,
      status: params.status,
      payload: params.payload ?? null,
      processedAt: now,
      metadata: {
        outcome: 'WEBHOOK_STATUS_UPDATE_RECEIVED',
      },
    });

    return db.notification.update({
      where: { id: notification.id },
      data: {
        status: params.status,
        deliveredAt: params.status === 'DELIVERED' ? now : undefined,
        failedAt:
          params.status === 'FAILED' || params.status === 'BOUNCED'
            ? now
            : undefined,
        metadata: {
          ...(notification.metadata ?? {}),
          providerWebhook: {
            payload: params.payload ?? null,
            receivedAt: now.toISOString(),
          },
        },
      },
    });
  }
}