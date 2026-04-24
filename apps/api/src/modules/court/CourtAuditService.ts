// apps/api/src/modules/court/CourtAuditService.ts

import type { CourtAuditAction } from './court.types';

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

    return db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId ?? null,
        action: `COURT_${params.action}`,
        entityId: params.hearingId ?? null,
        entityType: 'COURT_HEARING',
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

export default CourtAuditService;