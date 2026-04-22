// apps/api/src/modules/queues/QueueAuditService.ts

import type { QueueAuditAction } from './queue.types';

export class QueueAuditService {
  static async logAction(
    db: any,
    params: {
      tenantId?: string | null;
      userId?: string | null;
      jobId?: string | null;
      action: QueueAuditAction;
      requestId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return db.auditLog.create({
      data: {
        tenantId: params.tenantId ?? null,
        userId: params.userId ?? null,
        action: `QUEUE_${params.action}`,
        entityId: params.jobId ?? null,
        entityType: 'EXTERNAL_JOB_QUEUE',
        metadata: {
          requestId: params.requestId ?? null,
          jobId: params.jobId ?? null,
          ip: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          timestamp: new Date().toISOString(),
          ...(params.metadata ?? {}),
        },
      },
    });
  }
}

export default QueueAuditService;