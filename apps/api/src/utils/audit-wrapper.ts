import type { Request } from 'express';
import { logAdminAction } from './audit-logger';
import type { AuditAction, AuditEventPayload } from '../types/audit';
import { AuditSeverity } from '../types/audit';

type AuditMeta = {
  action: AuditAction;
  severity?: AuditSeverity;
  entityId?: string | null;
  buildSuccessPayload?: (result: unknown) => AuditEventPayload;
  buildFailurePayload?: (error: unknown) => AuditEventPayload;
};

function defaultFailurePayload(error: unknown): AuditEventPayload {
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack ?? null : null,
    };
  }

  return {
    success: false,
    error: 'Unknown error',
  };
}

export async function withAudit<T>(
  req: Request,
  meta: AuditMeta,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const result = await fn();

    try {
      await logAdminAction({
        req,
        action: meta.action,
        severity: meta.severity ?? AuditSeverity.INFO,
        entityId: meta.entityId ?? null,
        payload:
          meta.buildSuccessPayload?.(result) ?? {
            success: true,
          },
      });
    } catch (auditError) {
      console.error('AUDIT_SUCCESS_LOG_FAILURE', {
        requestId: req.id,
        auditError,
        action: meta.action,
      });
    }

    return result;
  } catch (error) {
    try {
      await logAdminAction({
        req,
        action: meta.action,
        severity: AuditSeverity.CRITICAL,
        entityId: meta.entityId ?? null,
        payload: meta.buildFailurePayload?.(error) ?? defaultFailurePayload(error),
      });
    } catch (auditError) {
      console.error('AUDIT_FAILURE_LOG_FAILURE', {
        requestId: req.id,
        auditError,
        action: meta.action,
      });
    }

    throw error;
  }
}