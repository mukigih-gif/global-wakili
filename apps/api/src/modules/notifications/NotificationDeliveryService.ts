// apps/api/src/modules/notifications/NotificationDeliveryService.ts

import { NotificationProviderRegistry } from './NotificationProviderRegistry';
import type {
  NotificationChannel,
  NotificationDbClient,
  NotificationRecipient,
  NotificationSendInput,
  NotificationStatus,
} from './notification.types';

type ResolvedNotificationRecipient = NotificationRecipient & {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
};

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required'), {
      statusCode: 400,
      code: 'NOTIFICATION_TENANT_REQUIRED',
    });
  }
}

function interpolate(
  value: string | null | undefined,
  variables?: Record<string, unknown> | null,
): string | null {
  if (!value) return null;

  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const replacement = variables?.[key];

    if (replacement === undefined || replacement === null) return '';

    return String(replacement);
  });
}

function normalizeChannels(channels?: NotificationChannel[]): NotificationChannel[] {
  const requested = channels?.length
    ? channels
    : NotificationProviderRegistry.getDeliveryOrder();

  const unique = Array.from(new Set(requested));

  const unsupported = unique.filter(
    (channel) => !NotificationProviderRegistry.isSupported(channel),
  );

  if (unsupported.length) {
    throw Object.assign(new Error('Unsupported notification channel requested'), {
      statusCode: 422,
      code: 'NOTIFICATION_CHANNEL_UNSUPPORTED',
      details: { unsupported },
    });
  }

  return NotificationProviderRegistry.sortChannelsByDeliveryOrder(unique);
}

function requireRecipientValue(
  channel: NotificationChannel,
  recipient: ResolvedNotificationRecipient,
): boolean {
  if (channel === 'SYSTEM_ALERT') return Boolean(recipient.userId);
  if (channel === 'EMAIL') return Boolean(recipient.email);
  if (channel === 'SMS') return Boolean(recipient.phoneNumber);

  return false;
}

function buildNotificationPayload(input: NotificationSendInput) {
  const variables = input.template.variables ?? {};

  const systemTitle =
    interpolate(input.template.systemTitle, variables) ??
    interpolate(input.template.emailSubject, variables) ??
    'Global Wakili Notification';

  const systemMessage =
    interpolate(input.template.systemMessage, variables) ??
    interpolate(input.template.emailBody, variables) ??
    interpolate(input.template.smsContent, variables) ??
    'You have a new Global Wakili notification.';

  const emailSubject =
    interpolate(input.template.emailSubject, variables) ?? systemTitle;

  const emailBody =
    interpolate(input.template.emailBody, variables) ??
    interpolate(input.template.systemMessage, variables) ??
    systemMessage;

  const smsContent =
    interpolate(input.template.smsContent, variables) ??
    interpolate(input.template.systemMessage, variables) ??
    systemMessage;

  return {
    systemTitle,
    systemMessage,
    emailSubject,
    emailBody,
    smsContent,
  };
}

async function resolveRecipient(
  db: NotificationDbClient,
  tenantId: string,
  recipient: NotificationRecipient,
): Promise<ResolvedNotificationRecipient> {
  if (!recipient.userId) {
    return {
      ...recipient,
      emailNotifications: true,
      smsNotifications: Boolean(recipient.phoneNumber),
    };
  }

  const user = await db.user.findFirst({
    where: {
      id: recipient.userId,
      tenantId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      emailNotifications: true,
      smsNotifications: true,
    },
  });

  if (!user) {
    throw Object.assign(new Error('Notification recipient user not found or inactive'), {
      statusCode: 404,
      code: 'NOTIFICATION_RECIPIENT_NOT_FOUND',
    });
  }

  return {
    userId: user.id,
    email: recipient.email ?? user.email ?? null,
    phoneNumber: recipient.phoneNumber ?? user.phone ?? null,
    name: recipient.name ?? user.name ?? null,
    emailNotifications: user.emailNotifications !== false,
    smsNotifications: user.smsNotifications === true,
  };
}

function resolveSenderEmail(input: NotificationSendInput): string {
  return (
    input.senderEmail?.trim() ||
    process.env.NOTIFICATION_FROM_EMAIL ||
    process.env.SMTP_FROM_EMAIL ||
    'notifications@globalwakili.com'
  );
}

function resolveSmsSenderId(input: NotificationSendInput): string {
  return (
    input.smsSenderId?.trim() ||
    process.env.NOTIFICATION_SMS_SENDER_ID ||
    process.env.SMS_SENDER_ID ||
    'GlobalWakili'
  );
}

type DeliveryAttemptStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DELIVERED'
  | 'FAILED'
  | 'BOUNCED'
  | 'RETRYING'
  | 'SKIPPED';

function coerceDeliveryErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function recordDeliveryAttempt(
  db: NotificationDbClient,
  params: {
    tenantId: string;
    notificationId: string;
    channel: NotificationChannel;
    provider?: string | null;
    providerMessageId?: string | null;
    status: DeliveryAttemptStatus;
    attemptNumber?: number;
    acceptedAt?: Date | null;
    deliveredAt?: Date | null;
    failedAt?: Date | null;
    bouncedAt?: Date | null;
    nextRetryAt?: Date | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    rawResponse?: unknown;
    metadata?: Record<string, unknown> | null;
  },
) {
  return db.notificationDeliveryAttempt.create({
    data: {
      tenantId: params.tenantId,
      notificationId: params.notificationId,
      channel: params.channel,
      provider: params.provider ?? null,
      providerMessageId: params.providerMessageId ?? null,
      status: params.status,
      attemptNumber: params.attemptNumber ?? 1,
      acceptedAt: params.acceptedAt ?? null,
      deliveredAt: params.deliveredAt ?? null,
      failedAt: params.failedAt ?? null,
      bouncedAt: params.bouncedAt ?? null,
      nextRetryAt: params.nextRetryAt ?? null,
      errorCode: params.errorCode ?? null,
      errorMessage: params.errorMessage ?? null,
      rawResponse: params.rawResponse ?? null,
      metadata: {
        ...(params.metadata ?? {}),
        recordedAt: new Date().toISOString(),
      },
    },
  });
}

async function recordDeliveryAttemptSafely(
  db: NotificationDbClient,
  params: Parameters<typeof recordDeliveryAttempt>[1],
): Promise<void> {
  try {
    await recordDeliveryAttempt(db, params);
  } catch (error) {
    // Do not convert a provider-accepted notification into FAILED merely because
    // the lifecycle ledger write failed. The legacy Notification row remains
    // the source of current delivery status; the attempt table is the audit ledger.
    // A later repair/reconciliation job can backfill missing attempts from Notification metadata.
    console.error('Notification delivery attempt persistence failed', {
      tenantId: params.tenantId,
      notificationId: params.notificationId,
      channel: params.channel,
      provider: params.provider ?? null,
      providerMessageId: params.providerMessageId ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
export class NotificationDeliveryService {
  static async sendNow(db: NotificationDbClient, input: NotificationSendInput) {
    assertTenant(input.tenantId);

    if (!input.recipients?.length) {
      throw Object.assign(new Error('At least one notification recipient is required'), {
        statusCode: 422,
        code: 'NOTIFICATION_RECIPIENT_REQUIRED',
      });
    }

    const tenant = await db.tenant.findFirst({
      where: {
        id: input.tenantId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!tenant) {
      throw Object.assign(new Error('Tenant not found'), {
        statusCode: 404,
        code: 'NOTIFICATION_TENANT_NOT_FOUND',
      });
    }

    const orderedChannels = normalizeChannels(input.channels);
    const content = buildNotificationPayload(input);
    const results: Array<Record<string, unknown>> = [];

    for (const rawRecipient of input.recipients) {
      const recipient = await resolveRecipient(db, input.tenantId, rawRecipient);

      for (const channel of orderedChannels) {
        if (channel === 'EMAIL' && recipient.emailNotifications === false) continue;
        if (channel === 'SMS' && recipient.smsNotifications !== true) continue;
        if (!requireRecipientValue(channel, recipient)) continue;

        const notification = await db.notification.create({
          data: {
            tenantId: input.tenantId,
            userId: recipient.userId ?? null,
            recipientEmail: recipient.email ?? null,
            recipientPhone: recipient.phoneNumber ?? null,
            recipientName: recipient.name ?? null,
            channel,
            systemTitle: content.systemTitle,
            systemMessage: content.systemMessage,
            emailSubject: channel === 'EMAIL' ? content.emailSubject : null,
            emailBody: channel === 'EMAIL' ? content.emailBody : null,
            smsContent: channel === 'SMS' ? content.smsContent : null,
            status: 'PENDING',
            templateKey: input.template.templateKey ?? null,
            category: input.category ?? 'system_alert',
            priority: input.priority ?? 'normal',
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            provider: NotificationProviderRegistry.getProviderName(channel),
            providerMessageId: null,
            debounceKey: input.debounceKey ?? null,
            metadata: {
              ...(input.metadata ?? {}),
              deliveryOrder: NotificationProviderRegistry.getDeliveryOrder(),
              tenantName: tenant.name,
            },
          },
        });

        try {
          if (channel === 'SYSTEM_ALERT') {
            const updated = await db.notification.update({
              where: { id: notification.id },
              data: {
                status: 'SENT',
                sentAt: new Date(),
                provider: 'system',
                attemptCount: 1,
              },
            });

            await recordDeliveryAttemptSafely(db, {
              tenantId: input.tenantId,
              notificationId: notification.id,
              channel,
              provider: 'system',
              status: 'DELIVERED',
              acceptedAt: updated.sentAt ?? new Date(),
              deliveredAt: updated.sentAt ?? new Date(),
              metadata: {
                deliveryClaim: 'LOCAL_SYSTEM_RECORD',
                tenantName: tenant.name,
              },
            });

            results.push({
              channel,
              notificationId: updated.id,
              status: updated.status,
              provider: 'system',
            });

            continue;
          }

          if (channel === 'EMAIL') {
            const emailResult = await NotificationProviderRegistry.getEmailService().send({
              tenantId: input.tenantId,
              fromEmail: resolveSenderEmail(input),
              to: [
                {
                  email: recipient.email!,
                  name: recipient.name ?? null,
                },
              ],
              subject: content.emailSubject,
              textBody: content.emailBody,
              htmlBody: content.emailBody,
            });

            const updated = await db.notification.update({
              where: { id: notification.id },
              data: {
                status: emailResult.accepted ? 'SENT' : 'FAILED',
                sentAt: emailResult.accepted ? new Date() : null,
                failedAt: emailResult.accepted ? null : new Date(),
                provider: emailResult.provider,
                providerMessageId: emailResult.providerMessageId,
                attemptCount: 1,
                metadata: {
                  ...(notification.metadata ?? {}),
                  providerAcceptance: {
                    provider: emailResult.provider,
                    channel: 'EMAIL',
                    accepted: emailResult.accepted,
                    simulated: Boolean(emailResult.rawResponse?.simulated),
                    deliveryClaim: emailResult.rawResponse?.simulated
                      ? 'ACCEPTED_BY_FOUNDATION_PROVIDER_ONLY'
                      : 'ACCEPTED_BY_EXTERNAL_PROVIDER',
                    providerMessageId: emailResult.providerMessageId,
                    rawResponse: emailResult.rawResponse ?? null,
                    recordedAt: new Date().toISOString(),
                  },
                },
              },
            });

            await recordDeliveryAttemptSafely(db, {
              tenantId: input.tenantId,
              notificationId: notification.id,
              channel,
              provider: emailResult.provider,
              providerMessageId: emailResult.providerMessageId,
              status: emailResult.accepted ? 'ACCEPTED' : 'FAILED',
              acceptedAt: emailResult.accepted ? updated.sentAt ?? new Date() : null,
              failedAt: emailResult.accepted ? null : updated.failedAt ?? new Date(),
              errorMessage: emailResult.accepted
                ? null
                : 'Email provider did not accept the notification request.',
              rawResponse: emailResult.rawResponse ?? null,
              metadata: {
                deliveryClaim: emailResult.rawResponse?.simulated
                  ? 'ACCEPTED_BY_FOUNDATION_PROVIDER_ONLY'
                  : 'ACCEPTED_BY_EXTERNAL_PROVIDER',
                simulated: Boolean(emailResult.rawResponse?.simulated),
              },
            });

            results.push({
              channel,
              notificationId: updated.id,
              status: updated.status,
              provider: emailResult.provider,
              providerMessageId: emailResult.providerMessageId,
            });

            continue;
          }

          if (channel === 'SMS') {
            const smsResult = await NotificationProviderRegistry.getSmsService().send({
              tenantId: input.tenantId,
              senderId: resolveSmsSenderId(input),
              recipients: [
                {
                  phoneNumber: recipient.phoneNumber!,
                  name: recipient.name ?? null,
                },
              ],
              message: content.smsContent,
            });

            const updated = await db.notification.update({
              where: { id: notification.id },
              data: {
                status: smsResult.accepted ? 'SENT' : 'FAILED',
                sentAt: smsResult.accepted ? new Date() : null,
                failedAt: smsResult.accepted ? null : new Date(),
                provider: smsResult.provider,
                providerMessageId: smsResult.providerMessageIds.join(','),
                attemptCount: 1,
                metadata: {
                  ...(notification.metadata ?? {}),
                  providerAcceptance: {
                    provider: smsResult.provider,
                    channel: 'SMS',
                    accepted: smsResult.accepted,
                    simulated: Boolean(smsResult.rawResponse?.simulated),
                    deliveryClaim: smsResult.rawResponse?.simulated
                      ? 'ACCEPTED_BY_FOUNDATION_PROVIDER_ONLY'
                      : 'ACCEPTED_BY_EXTERNAL_PROVIDER',
                    providerMessageIds: smsResult.providerMessageIds,
                    rawResponse: smsResult.rawResponse ?? null,
                    recordedAt: new Date().toISOString(),
                  },
                },
              },
            });

            await recordDeliveryAttemptSafely(db, {
              tenantId: input.tenantId,
              notificationId: notification.id,
              channel,
              provider: smsResult.provider,
              providerMessageId: smsResult.providerMessageIds.join(','),
              status: smsResult.accepted ? 'ACCEPTED' : 'FAILED',
              acceptedAt: smsResult.accepted ? updated.sentAt ?? new Date() : null,
              failedAt: smsResult.accepted ? null : updated.failedAt ?? new Date(),
              errorMessage: smsResult.accepted
                ? null
                : 'SMS provider did not accept the notification request.',
              rawResponse: smsResult.rawResponse ?? null,
              metadata: {
                deliveryClaim: smsResult.rawResponse?.simulated
                  ? 'ACCEPTED_BY_FOUNDATION_PROVIDER_ONLY'
                  : 'ACCEPTED_BY_EXTERNAL_PROVIDER',
                simulated: Boolean(smsResult.rawResponse?.simulated),
                providerMessageIds: smsResult.providerMessageIds,
              },
            });

            results.push({
              channel,
              notificationId: updated.id,
              status: updated.status,
              provider: smsResult.provider,
              providerMessageIds: smsResult.providerMessageIds,
            });
          }
        } catch (error) {
          const updated = await db.notification.update({
            where: { id: notification.id },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              attemptCount: 1,
              metadata: {
                ...(notification.metadata ?? {}),
                deliveryOrder: NotificationProviderRegistry.getDeliveryOrder(),
                failure: error instanceof Error ? error.message : String(error),
              },
            },
          });

          await recordDeliveryAttemptSafely(db, {
            tenantId: input.tenantId,
            notificationId: notification.id,
            channel,
            provider: NotificationProviderRegistry.getProviderName(channel),
            status: 'FAILED',
            failedAt: updated.failedAt ?? new Date(),
            errorMessage: coerceDeliveryErrorMessage(error),
            metadata: {
              deliveryOrder: NotificationProviderRegistry.getDeliveryOrder(),
              failure: coerceDeliveryErrorMessage(error),
            },
          });

          results.push({
            channel,
            notificationId: updated.id,
            status: updated.status,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return {
      tenantId: input.tenantId,
      deliveryOrder: NotificationProviderRegistry.getDeliveryOrder(),
      results,
    };
  }

  static async markRead(
    db: NotificationDbClient,
    params: {
      tenantId: string;
      notificationId: string;
      userId?: string | null;
    },
  ) {
    assertTenant(params.tenantId);

    const notification = await db.notification.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.notificationId,
        ...(params.userId ? { userId: params.userId } : {}),
      },
      select: {
        id: true,
      },
    });

    if (!notification) {
      throw Object.assign(new Error('Notification not found'), {
        statusCode: 404,
        code: 'NOTIFICATION_NOT_FOUND',
      });
    }

    return db.notification.update({
      where: {
        id: params.notificationId,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  static async updateProviderStatus(
    db: NotificationDbClient,
    params: {
      tenantId: string;
      providerMessageId: string;
      provider?: string | null;
      status: NotificationStatus;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    assertTenant(params.tenantId);

    if (!params.providerMessageId?.trim()) {
      throw Object.assign(new Error('Provider message ID is required'), {
        statusCode: 422,
        code: 'NOTIFICATION_PROVIDER_MESSAGE_ID_REQUIRED',
      });
    }

    const notification = await db.notification.findFirst({
      where: {
        tenantId: params.tenantId,
        providerMessageId: params.providerMessageId,
        ...(params.provider ? { provider: params.provider } : {}),
      },
    });

    if (!notification) {
      throw Object.assign(new Error('Notification not found for provider callback'), {
        statusCode: 404,
        code: 'NOTIFICATION_PROVIDER_MESSAGE_NOT_FOUND',
      });
    }

    const now = new Date();

    return db.notification.update({
      where: {
        id: notification.id,
      },
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
            receivedAt: now.toISOString(),
            provider: params.provider ?? notification.provider ?? null,
            providerMessageId: params.providerMessageId,
            status: params.status,
            payload: params.metadata ?? {},
          },
        },
      },
    });
  }
}

export default NotificationDeliveryService;