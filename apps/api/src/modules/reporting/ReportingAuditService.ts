// apps/api/src/modules/reporting/ReportingAuditService.ts

import { logSecurityEvent } from '../../utils/audit-logger';
import { AuditAction, AuditSeverity } from '../../types/audit';
import type { ReportingAuditAction } from './reporting.types';

function assertTenant(tenantId?: string | null): asserts tenantId is string {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for reporting audit'), {
      statusCode: 400,
      code: 'REPORTING_AUDIT_TENANT_REQUIRED',
    });
  }
}

export class ReportingAuditService {
  static async logAction(
    db: any,
    params: {
      tenantId?: string | null;
      userId?: string | null;
      action: ReportingAuditAction;
      entityId?: string | null;
      entityType?: string | null;
      requestId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    assertTenant(params.tenantId);

    // Delegate to the hash-chaining audit writer (utils/audit-logger). A raw
    // db.auditLog.create here previously omitted the required `hash`/`previousHash`
    // chain fields (ADR-003) and wrote a non-existent `metadata` column, 500-ing
    // every reporting handler. logSecurityEvent computes the hash chain, uses a
    // valid AuditAction, and stores the audit detail under afterData.
    return logSecurityEvent({
      db,
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: AuditAction.VIEW,
      severity: AuditSeverity.INFO,
      entityType: params.entityType ?? 'REPORTING',
      entityId: params.entityId ?? 'N/A',
      requestId: params.requestId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      afterData: {
        reportingAction: `REPORTING_${params.action}`,
        ...(params.metadata ?? {}),
      },
      allowMissingTenant: true,
    });
  }
}

export default ReportingAuditService;
