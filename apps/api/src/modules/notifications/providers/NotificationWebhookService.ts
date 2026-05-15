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

export class NotificationWebhookService {
  static async updateProviderStatus(
    db: any,
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