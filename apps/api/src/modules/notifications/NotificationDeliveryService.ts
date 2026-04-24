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
      providerMessageId: string;
      provider?: string | null;
      status: NotificationStatus;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    if (!params.providerMessageId?.trim()) {
      throw Object.assign(new Error('Provider message ID is required'), {
        statusCode: 422,
        code: 'NOTIFICATION_PROVIDER_MESSAGE_ID_REQUIRED',
      });
    }

    const notification = await db.notification.findFirst({
      where: {
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