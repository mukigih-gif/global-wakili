import type { Request } from 'express';
import { logAdminAction } from '../../../utils/audit-logger';
import { AuditSeverity } from '../../../types/audit';

export class NotificationAuditService {
  static async logQueued(
    req: Request,
    params: {
      templateKey: string;
      channels: string[];
      entityType?: string | null;
      entityId?: string | null;
      queueJobId?: string | number | null;
    },
  ) {
    await logAdminAction({
      req,
      tenantId: req.tenantId!,
      action: 'NOTIFICATION_ENQUEUED',
      severity: AuditSeverity.INFO,
      payload: {
        templateKey: params.templateKey,
        channels: params.channels,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        queueJobId: params.queueJobId ?? null,
      },
    });
  }

  static async logDispatched(
    req: Request,
    params: {
      templateKey: string;
      channels: string[];
      recipientRef: string[];
      entityType?: string | null;
      entityId?: string | null;
    },
  ) {
    await logAdminAction({
      req,
      tenantId: req.tenantId!,
      action: 'NOTIFICATION_DISPATCHED',
      severity: AuditSeverity.INFO,
      payload: {
        templateKey: params.templateKey,
        channels: params.channels,
        recipientRef: params.recipientRef,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
      },
    });
  }

  static async logSuppressed(
    req: Request,
    params: {
      templateKey: string;
      debounceKey: string;
      entityType?: string | null;
      entityId?: string | null;
    },
  ) {
    await logAdminAction({
      req,
      tenantId: req.tenantId!,
      action: 'NOTIFICATION_SUPPRESSED',
      severity: AuditSeverity.WARNING,
      payload: {
        templateKey: params.templateKey,
        debounceKey: params.debounceKey,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
      },
    });
  }
}