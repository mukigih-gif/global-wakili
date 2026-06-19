// apps/api/src/modules/notifications/NotificationAuditService.ts

import { AuditAction, AuditSeverity } from '../../types/audit';
import { logSecurityEvent } from '../../utils/audit-logger';
import type { NotificationAuditAction } from './notification.types';

function mapNotificationAuditAction(action: NotificationAuditAction): AuditAction {
  switch (action) {
    case 'SEND_REQUESTED':
    case 'QUEUE_REQUESTED':
      return AuditAction.CREATE;

    case 'READ':
    case 'WEBHOOK_STATUS_UPDATED':
      return AuditAction.UPDATE;

    case 'SEARCHED':
    case 'DASHBOARD_VIEWED':
    case 'REPORT_VIEWED':
    case 'CAPABILITY_VIEWED':
    default:
      return AuditAction.READ;
  }
}
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

    return logSecurityEvent({
      db,
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: mapNotificationAuditAction(params.action),
      severity: AuditSeverity.INFO,
      entityType: 'NOTIFICATION',
      entityId: params.notificationId ?? 'N/A',
      requestId: params.requestId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      afterData: {
        eventCode: `NOTIFICATION_${params.action}`,
        notificationAction: params.action,
        notificationId: params.notificationId ?? null,
        ...(params.metadata ?? {}),
      },
      allowMissingTenant: true,
    });
  }
}

export default NotificationAuditService;