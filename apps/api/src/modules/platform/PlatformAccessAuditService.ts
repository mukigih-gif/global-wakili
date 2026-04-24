// apps/api/src/modules/platform/PlatformAccessAuditService.ts

import type { Request } from 'express';

function safeUserId(req: Request): string | null {
  return req.user?.sub ?? null;
}

function safeTenantId(req: Request): string | null {
  return req.tenantId ?? null;
}

export class PlatformAccessAuditService {
  static async logDecision(
    db: any,
    req: Request,
    params: {
      action:
        | 'PLATFORM_ACCESS_ALLOWED'
        | 'PLATFORM_ACCESS_DENIED'
        | 'PLATFORM_WRITE_BLOCKED'
        | 'PLATFORM_FEATURE_DENIED'
        | 'PLATFORM_IMPERSONATION_BLOCKED'
        | 'PLATFORM_MAINTENANCE_BLOCKED'
        | 'PLATFORM_QUOTA_BLOCKED';
      moduleKey?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return db.auditLog.create({
      data: {
        tenantId: safeTenantId(req),
        userId: safeUserId(req),
        action: params.action,
        entityType: params.entityType ?? 'PLATFORM_ENFORCEMENT',
        entityId: params.entityId ?? null,
        metadata: {
          moduleKey: params.moduleKey ?? null,
          requestId: req.id ?? null,
          ipAddress: req.ip ?? null,
          userAgent: req.headers['user-agent'] ?? null,
          method: req.method,
          path: req.originalUrl ?? req.path ?? null,
          occurredAt: new Date().toISOString(),
          ...(params.metadata ?? {}),
        },
      },
    });
  }
}

export default PlatformAccessAuditService;