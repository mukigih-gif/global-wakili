// apps/api/src/modules/task/TaskAuditService.ts

import type { TaskAuditAction } from './task.types';

export class TaskAuditService {
  static async logAction(
    db: any,
    params: {
      tenantId: string;
      userId?: string | null;
      taskId?: string | null;
      matterId?: string | null;
      action: TaskAuditAction;
      requestId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for task audit'), {
        statusCode: 400,
        code: 'TASK_AUDIT_TENANT_REQUIRED',
      });
    }

    return db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId ?? null,
        action: `TASK_${params.action}`,
        entityId: params.taskId ?? null,
        entityType: 'TASK',
        metadata: {
          requestId: params.requestId ?? null,
          matterId: params.matterId ?? null,
          ip: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          timestamp: new Date().toISOString(),
          ...(params.metadata ?? {}),
        },
      },
    });
  }
}

export default TaskAuditService;