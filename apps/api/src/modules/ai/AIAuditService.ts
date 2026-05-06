// apps/api/src/modules/ai/AIAuditService.ts

import type { AIAuditAction } from './ai.types';

type AuditDbClient = {
  auditLog: {
    create: Function;
  };
};

function assertTenant(tenantId?: string | null): asserts tenantId is string {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for AI audit'), {
      statusCode: 400,
      code: 'AI_AUDIT_TENANT_REQUIRED',
    });
  }
}

function mapAuditAction(action: AIAuditAction): 'CREATE' | 'READ' | 'UPDATE' {
  switch (action) {
    case 'HUB_VIEWED':
    case 'CAPABILITY_VIEWED':
    case 'PROVIDERS_VIEWED':
    case 'PROVIDER_CONFIGS_VIEWED':
    case 'ARTIFACTS_SEARCHED':
    case 'USAGE_LOGS_SEARCHED':
      return 'READ';
    case 'PROVIDER_CONFIG_UPSERTED':
      return 'UPDATE';
    case 'TASK_EXECUTED':
    default:
      return 'CREATE';
  }
}

export class AIAuditService {
  static async logAction(
    db: AuditDbClient,
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
        action: mapAuditAction(params.action),
        entityId: params.entityId ?? null,
        entityType: params.entityType ?? 'AI',
        metadata: {
          eventCode: `AI_${params.action}`,
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
