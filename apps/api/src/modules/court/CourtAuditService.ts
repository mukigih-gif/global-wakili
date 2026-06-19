// apps/api/src/modules/court/CourtAuditService.ts

import type { CourtAuditAction } from './court.types';
import { logSecurityEvent, inferAuditAction } from '../../utils/audit-logger';
import { AuditSeverity } from '../../types/audit';

export class CourtAuditService {
  static async logAction(
    db: any,
    params: {
      tenantId: string;
      userId?: string | null;
      hearingId?: string | null;
      matterId?: string | null;
      action: CourtAuditAction;
      requestId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for court audit'), {
        statusCode: 400,
        code: 'COURT_AUDIT_TENANT_REQUIRED',
      });
    }

    return logSecurityEvent({
      db,
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: inferAuditAction(params.action),
      severity: AuditSeverity.INFO,
      entityType: 'COURT_HEARING',
      entityId: params.hearingId ?? 'N/A',
      requestId: params.requestId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      afterData: { eventCode: `COURT_${params.action}`, matterId: params.matterId ?? null, ...(params.metadata ?? {}) },
      allowMissingTenant: true,
    });
  }
}

export default CourtAuditService;