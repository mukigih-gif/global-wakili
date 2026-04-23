// apps/api/src/modules/ai/AIAuditService.ts

import type { AIAuditAction } from './ai.types';

function assertTenant(tenantId?: string | null): asserts tenantId is string {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for AI audit'), {
      statusCode: 400,
      code: 'AI_AUDIT_TENANT_REQUIRED',
    });
  }
}

export class AIAuditService {
  static async logAction(
    db: any,
    params: {
      tenantId?: string | null;
      userId?: string | null;
      action: AIAuditAction;
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
        action: `AI_${params.action}`,
        entityId: params.entityId ?? null,
        entityType: params.entityType ?? 'AI',
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

export default AIAuditService;