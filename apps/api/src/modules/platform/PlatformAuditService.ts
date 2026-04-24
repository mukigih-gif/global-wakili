// apps/api/src/modules/platform/PlatformAuditService.ts

import type { PlatformAuditAction } from './platform.types';

export class PlatformAuditService {
  static async logAction(
    db: any,
    params: {
      actorUserId?: string | null;
      action: PlatformAuditAction;
      entityType?: string | null;
      entityId?: string | null;
      requestId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return db.auditLog.create({
      data: {
        tenantId: null,
        userId: params.actorUserId ?? null,
        action: `PLATFORM_${params.action}`,
        entityType: params.entityType ?? 'PLATFORM',
        entityId: params.entityId ?? null,
        metadata: {
          requestId: params.requestId ?? null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          occurredAt: new Date().toISOString(),
          ...(params.metadata ?? {}),
        },
      },
    });
  }
}