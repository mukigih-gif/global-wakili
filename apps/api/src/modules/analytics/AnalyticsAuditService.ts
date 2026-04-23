// apps/api/src/modules/analytics/AnalyticsAuditService.ts

import type { AnalyticsAuditAction } from './analytics.types';

function assertTenant(tenantId?: string | null): asserts tenantId is string {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for analytics audit'), {
      statusCode: 400,
      code: 'ANALYTICS_AUDIT_TENANT_REQUIRED',
    });
  }
}

export class AnalyticsAuditService {
  static async logAction(
    db: any,
    params: {
      tenantId?: string | null;
      userId?: string | null;
      action: AnalyticsAuditAction;
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
        action: `ANALYTICS_${params.action}`,
        entityId: params.entityId ?? null,
        entityType: params.entityType ?? 'ANALYTICS',
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

export default AnalyticsAuditService;