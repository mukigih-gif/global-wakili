// apps/api/src/modules/approval/ApprovalAuditService.ts

import type { ApprovalAuditAction } from './approval.types';
import { logSecurityEvent, inferAuditAction } from '../../utils/audit-logger';
import { AuditSeverity } from '../../types/audit';

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

    return logSecurityEvent({
      db,
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: inferAuditAction(params.action),
      severity: AuditSeverity.INFO,
      entityType: 'APPROVAL',
      entityId: params.approvalId ?? 'N/A',
      requestId: params.requestId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      afterData: { eventCode: `APPROVAL_${params.action}`, ...(params.metadata ?? {}) },
      allowMissingTenant: true,
    });
  }
}

export default ApprovalAuditService;