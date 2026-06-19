// apps/api/src/modules/task/TaskAuditService.ts

import type { TaskAuditAction } from './task.types';
import { logSecurityEvent, inferAuditAction } from '../../utils/audit-logger';
import { AuditSeverity } from '../../types/audit';

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

    return logSecurityEvent({
      db,
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: inferAuditAction(params.action),
      severity: AuditSeverity.INFO,
      entityType: 'TASK',
      entityId: params.taskId ?? 'N/A',
      requestId: params.requestId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      afterData: { eventCode: `TASK_${params.action}`, matterId: params.matterId ?? null, ...(params.metadata ?? {}) },
      allowMissingTenant: true,
    });
  }
}

export default TaskAuditService;