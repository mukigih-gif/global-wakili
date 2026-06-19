// apps/api/src/modules/compliance/ComplianceAuditService.ts

import type { ComplianceAuditAction } from './compliance.types';
import { logSecurityEvent, inferAuditAction } from '../../utils/audit-logger';
import { AuditSeverity } from '../../types/audit';

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

    return logSecurityEvent({
      db,
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: inferAuditAction(params.action),
      severity: AuditSeverity.INFO,
      entityType: params.reportId ? 'COMPLIANCE_REPORT' : 'COMPLIANCE',
      entityId: params.reportId ?? params.clientId ?? 'N/A',
      requestId: params.requestId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      afterData: {
        eventCode: `COMPLIANCE_${params.action}`,
        clientId: params.clientId ?? null,
        reportId: params.reportId ?? null,
        ...(params.metadata ?? {}),
      },
      allowMissingTenant: true,
    });
  }
}

export default ComplianceAuditService;