type NotificationWebhookStatus =
  | 'DELIVERED'
  | 'FAILED'
  | 'BOUNCED'
  | 'SENT';

export class NotificationWebhookService {
  static async updateProviderStatus(
    db: any,
    params: {
      providerMessageId: string;
      provider?: string | null;
      status: NotificationWebhookStatus;
      payload?: Record<string, unknown> | null;
      timestamp?: Date;
    },
  ) {
    const notification = await db.notification.findFirst({
      where: {
        providerMessageId: params.providerMessageId,
        ...(params.provider ? { provider: params.provider } : {}),
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!notification) {
      throw Object.assign(new Error('Notification not found for provider callback'), {
        statusCode: 404,
        code: 'NOTIFICATION_PROVIDER_MESSAGE_NOT_FOUND',
        details: {
          providerMessageId: params.providerMessageId,
          provider: params.provider ?? null,
        },
      });
    }

    const now = params.timestamp ?? new Date();

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