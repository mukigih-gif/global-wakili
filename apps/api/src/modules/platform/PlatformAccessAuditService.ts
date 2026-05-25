import type { Request } from 'express';

import { logSecurityEvent } from '../../utils/audit-logger';
import { AuditAction, AuditSeverity } from '../../types/audit';

type PlatformAccessDecisionAction =
  | 'PLATFORM_ACCESS_ALLOWED'
  | 'PLATFORM_ACCESS_DENIED'
  | 'PLATFORM_WRITE_BLOCKED'
  | 'PLATFORM_FEATURE_DENIED'
  | 'PLATFORM_IMPERSONATION_BLOCKED'
  | 'PLATFORM_MAINTENANCE_BLOCKED'
  | 'PLATFORM_QUOTA_BLOCKED';

type PlatformAccessAuditDb = {
  auditLog: {
    findFirst(args: unknown): Promise<{ hash: string } | null>;
    create(args: unknown): Promise<unknown>;
  };
};

function safeUserId(req: Request): string | null {
  return req.user?.sub ?? req.user?.id ?? req.user?.userId ?? null;
}

function safeTenantId(req: Request): string | null {
  return req.tenantId ?? null;
}

function toAuditAction(action: PlatformAccessDecisionAction): AuditAction {
  switch (action) {
    case 'PLATFORM_ACCESS_ALLOWED':
      return AuditAction.READ;

    case 'PLATFORM_ACCESS_DENIED':
    case 'PLATFORM_WRITE_BLOCKED':
    case 'PLATFORM_FEATURE_DENIED':
    case 'PLATFORM_IMPERSONATION_BLOCKED':
    case 'PLATFORM_MAINTENANCE_BLOCKED':
    case 'PLATFORM_QUOTA_BLOCKED':
      return AuditAction.REQUEST_FAILURE;

    default:
      return AuditAction.REQUEST_FAILURE;
  }
}

function toAuditSeverity(action: PlatformAccessDecisionAction): AuditSeverity {
  switch (action) {
    case 'PLATFORM_ACCESS_ALLOWED':
      return AuditSeverity.INFO;

    case 'PLATFORM_ACCESS_DENIED':
    case 'PLATFORM_FEATURE_DENIED':
    case 'PLATFORM_MAINTENANCE_BLOCKED':
    case 'PLATFORM_QUOTA_BLOCKED':
      return AuditSeverity.WARNING;

    case 'PLATFORM_WRITE_BLOCKED':
    case 'PLATFORM_IMPERSONATION_BLOCKED':
      return AuditSeverity.HIGH;

    default:
      return AuditSeverity.WARNING;
  }
}

function toEntityId(params: {
  entityId?: string | null;
  moduleKey?: string | null;
  action: PlatformAccessDecisionAction;
}): string {
  if (typeof params.entityId === 'string' && params.entityId.trim().length > 0) {
    return params.entityId.trim();
  }

  const moduleKey =
    typeof params.moduleKey === 'string' && params.moduleKey.trim().length > 0
      ? params.moduleKey.trim()
      : 'platform';

  return `${moduleKey}:${params.action}`;
}

export class PlatformAccessAuditService {
  static async logDecision(
    db: PlatformAccessAuditDb,
    req: Request,
    params: {
      action: PlatformAccessDecisionAction;
      moduleKey?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    const success = params.action === 'PLATFORM_ACCESS_ALLOWED';

    return logSecurityEvent({
      db,
      req,
      tenantId: safeTenantId(req),
      userId: safeUserId(req),
      action: toAuditAction(params.action),
      severity: toAuditSeverity(params.action),
      entityType: params.entityType ?? 'PLATFORM_ENFORCEMENT',
      entityId: toEntityId({
        entityId: params.entityId,
        moduleKey: params.moduleKey,
        action: params.action,
      }),
      success,
      failureReason: success ? null : params.action,
      reason: params.action,
      afterData: {
        eventCode: params.action,
        platformAction: params.action,
        moduleKey: params.moduleKey ?? null,
        requestId: req.id ?? null,
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
        method: req.method,
        path: req.originalUrl ?? req.path ?? null,
        occurredAt: new Date().toISOString(),
        ...(params.metadata ?? {}),
      },
    });
  }
}

export default PlatformAccessAuditService;