// apps/api/src/modules/reception/ReceptionAuditService.ts

import type { ReceptionAuditAction } from './reception.types';

export class ReceptionAuditService {
  static async logAction(
    db: any,
    params: {
      tenantId: string;
      userId?: string | null;
      logId?: string | null;
      matterId?: string | null;
      action: ReceptionAuditAction;
      requestId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for reception audit'), {
        statusCode: 400,
        code: 'RECEPTION_AUDIT_TENANT_REQUIRED',
      });
    }

    return db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId ?? null,
        action: `RECEPTION_${params.action}`,
        entityId: params.logId ?? null,
        entityType: 'RECEPTION_LOG',
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

export default ReceptionAuditService;