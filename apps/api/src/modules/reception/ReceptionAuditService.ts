// apps/api/src/modules/reception/ReceptionAuditService.ts

import type { ReceptionAuditAction } from './reception.types';
import { logSecurityEvent, inferAuditAction } from '../../utils/audit-logger';
import { AuditSeverity } from '../../types/audit';

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

    return logSecurityEvent({
      db,
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: inferAuditAction(params.action),
      severity: AuditSeverity.INFO,
      entityType: 'RECEPTION_LOG',
      entityId: params.logId ?? 'N/A',
      requestId: params.requestId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      afterData: { eventCode: `RECEPTION_${params.action}`, matterId: params.matterId ?? null, ...(params.metadata ?? {}) },
      allowMissingTenant: true,
    });
  }
}

export default ReceptionAuditService;