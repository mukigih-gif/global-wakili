// apps/api/src/modules/reporting/ReportingAuditService.ts

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

    return db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId ?? null,
        action: `REPORTING_${params.action}`,
        entityId: params.entityId ?? null,
        entityType: params.entityType ?? 'REPORTING',
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

export default ReportingAuditService;