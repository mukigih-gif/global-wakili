// apps/api/src/modules/notifications/NotificationAuditService.ts

import type { NotificationAuditAction } from './notification.types';

export class NotificationAuditService {
  static async logAction(
    db: any,
    params: {
      tenantId: string;
      userId?: string | null;
      notificationId?: string | null;
      action: NotificationAuditAction;
      requestId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for notification audit'), {
        statusCode: 400,
        code: 'NOTIFICATION_AUDIT_TENANT_REQUIRED',
      });
    }

    return db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId ?? null,
        action: `NOTIFICATION_${params.action}`,
        entityId: params.notificationId ?? null,
        entityType: 'NOTIFICATION',
        metadata: {
          requestId: params.requestId ?? null,
          notificationId: params.notificationId ?? null,
          ip: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          timestamp: new Date().toISOString(),
          ...(params.metadata ?? {}),
        },
      },
    });
  }
}

export default NotificationAuditService;