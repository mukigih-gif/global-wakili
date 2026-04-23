// apps/api/src/modules/approval/ApprovalAuditService.ts

import type { ApprovalAuditAction } from './approval.types';

function assertTenant(tenantId?: string | null): asserts tenantId is string {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for approval audit'), {
      statusCode: 400,
      code: 'APPROVAL_AUDIT_TENANT_REQUIRED',
    });
  }
}

export class ApprovalAuditService {
  static async logAction(
    db: any,
    params: {
      tenantId?: string | null;
      userId?: string | null;
      approvalId?: string | null;
      action: ApprovalAuditAction;
      requestId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    assertTenant(params.tenantId);

    return db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId ?? null,
        action: `APPROVAL_${params.action}`,
        entityId: params.approvalId ?? null,
        entityType: 'APPROVAL',
        metadata: {
          requestId: params.requestId ?? null,
          ip: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          timestamp: new Date().toISOString(),
          ...(params.metadata ?? {}),
        },
      },
    });
  }
}

export default ApprovalAuditService;