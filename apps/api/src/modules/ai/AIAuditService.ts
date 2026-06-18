// apps/api/src/modules/ai/AIAuditService.ts

import type { AIAuditAction } from './ai.types';
import { logSecurityEvent } from '../../utils/audit-logger';
import { AuditAction, AuditSeverity } from '../../types/audit';

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

function mapAuditAction(action: AIAuditAction): AuditAction {
  switch (action) {
    case 'HUB_VIEWED':
    case 'CAPABILITY_VIEWED':
    case 'PROVIDERS_VIEWED':
    case 'PROVIDER_CONFIGS_VIEWED':
    case 'ARTIFACTS_SEARCHED':
    case 'USAGE_LOGS_SEARCHED':
      return AuditAction.READ;
    case 'PROVIDER_CONFIG_UPSERTED':
      return AuditAction.UPDATE;
    case 'TASK_EXECUTED':
    default:
      return AuditAction.CREATE;
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

    // Delegate to the hash-chaining audit writer (utils/audit-logger). A raw
    // db.auditLog.create here previously omitted the required `hash`/`previousHash`
    // chain fields (ADR-003) and wrote a non-existent `metadata` column, 500-ing
    // every AI handler. logSecurityEvent computes the hash chain, uses a valid
    // AuditAction, and stores the audit detail under afterData. Matches the
    // reporting fix (2e7e70a).
    return logSecurityEvent({
      db: db as any,
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: mapAuditAction(params.action),
      severity: AuditSeverity.INFO,
      entityType: params.entityType ?? 'AI',
      entityId: params.entityId ?? 'N/A',
      requestId: params.requestId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      afterData: {
        eventCode: `AI_${params.action}`,
        ...(params.metadata ?? {}),
      },
      allowMissingTenant: true,
    });
  }
}

export default AIAuditService;
