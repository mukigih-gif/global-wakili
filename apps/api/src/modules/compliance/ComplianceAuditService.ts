// apps/api/src/modules/compliance/ComplianceAuditService.ts

import type { ComplianceAuditAction } from './compliance.types';

export class ComplianceAuditService {
  static async logAction(
    db: any,
    params: {
      tenantId: string;
      userId?: string | null;
      clientId?: string | null;
      reportId?: string | null;
      action: ComplianceAuditAction;
      requestId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for compliance audit'), {
        statusCode: 400,
        code: 'COMPLIANCE_AUDIT_TENANT_REQUIRED',
      });
    }

    return db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId ?? null,
        action: `COMPLIANCE_${params.action}`,
        entityId: params.reportId ?? params.clientId ?? null,
        entityType: params.reportId ? 'COMPLIANCE_REPORT' : 'COMPLIANCE',
        metadata: {
          requestId: params.requestId ?? null,
          clientId: params.clientId ?? null,
          reportId: params.reportId ?? null,
          ip: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          timestamp: new Date().toISOString(),
          ...(params.metadata ?? {}),
        },
      },
    });
  }
}

export default ComplianceAuditService;