import { AuditAction, AuditSeverity } from '../../types/audit';
import {
  logSecurityEvent,
  type SecurityAuditResult,
} from '../../utils/audit-logger';

export type PlatformAuditAction = string;

type PlatformAuditDb = {
  auditLog: {
    findFirst(args: unknown): Promise<{ hash: string } | null>;
    create(args: unknown): Promise<unknown>;
  };
};

type PlatformAuditParams = {
  tenantId: string;
  actorUserId?: string | null;
  action: PlatformAuditAction;
  entityType?: string | null;
  entityId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

function mapPlatformActionToAuditAction(action: string): AuditAction {
  const normalized = action.trim().toUpperCase();

  if (
    normalized.includes('DENIED') ||
    normalized.includes('BLOCKED') ||
    normalized.includes('FAILED')
  ) {
    return AuditAction.REQUEST_FAILURE;
  }

  if (
    normalized.includes('ERROR') ||
    normalized.includes('EXCEPTION')
  ) {
    return AuditAction.SYSTEM_ERROR;
  }

  if (
    normalized.includes('REVOKED') ||
    normalized.includes('REVOKE')
  ) {
    return AuditAction.REVOKE;
  }

  /*
   * Use a known valid Prisma AuditAction for non-error platform reads/actions.
   * The specific platform event name is preserved in afterData.eventCode.
   */
  return AuditAction.AUTHORIZE;
}

function normalizeEntityId(params: PlatformAuditParams): string {
  return (
    params.entityId?.trim() ||
    params.actorUserId?.trim() ||
    params.tenantId?.trim() ||
    'platform'
  );
}

function isFailureAction(action: string): boolean {
  const normalized = action.trim().toUpperCase();

  return (
    normalized.includes('DENIED') ||
    normalized.includes('BLOCKED') ||
    normalized.includes('FAILED') ||
    normalized.includes('ERROR') ||
    normalized.includes('EXCEPTION')
  );
}

/**
 * Schema-aligned platform audit bridge.
 *
 * Important:
 * - Does not write fake AuditAction values to AuditLog.action.
 * - Stores platform-specific event names in afterData.eventCode.
 * - Delegates hash/previousHash chaining to the central audit logger.
 * - Keeps logAction() as a compatibility method for existing controllers.
 *
 * Follow-up:
 * True platform-only audit still needs a dedicated platform operational
 * audit model because current AuditLog.tenantId is non-null.
 */
export class PlatformAuditService {
  static async log(
    db: PlatformAuditDb,
    params: PlatformAuditParams,
  ): Promise<SecurityAuditResult> {
    try {
      const failed = isFailureAction(params.action);

      return await logSecurityEvent({
        db,
        tenantId: params.tenantId,
        userId: params.actorUserId ?? null,
        action: mapPlatformActionToAuditAction(params.action),
        severity: failed ? AuditSeverity.WARNING : AuditSeverity.INFO,
        entityType: params.entityType ?? 'Platform',
        entityId: normalizeEntityId(params),
        success: !failed,
        failureReason: failed ? params.action : null,
        requestId: params.requestId ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        afterData: {
          eventCode: params.action,
          platformEvent: true,
          ...(params.metadata ?? {}),
        },
        allowMissingTenant: true,
      });
    } catch (error) {
      console.error('PLATFORM_AUDIT_LOG_FAILURE', {
        tenantId: params.tenantId,
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        entityType: params.entityType ?? 'Platform',
        entityId: params.entityId ?? null,
        requestId: params.requestId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        written: false,
        skippedReason: 'PLATFORM_AUDIT_LOG_FAILURE',
      };
    }
  }

  static async logAction(
    db: PlatformAuditDb,
    params: PlatformAuditParams,
  ): Promise<SecurityAuditResult> {
    return PlatformAuditService.log(db, params);
  }
}

export default PlatformAuditService;