import type { Request } from 'express';
import { logAdminAction } from './audit-logger';
import {
  AuditAction,
  AuditSeverity,
  type AuditEventPayload,
} from '../types/audit';

type AuditMeta = {
  action: AuditAction;
  severity?: AuditSeverity;
  entityType?: string;
  entityId?: string | null;
  buildSuccessPayload?: (result: unknown) => AuditEventPayload;
  buildFailurePayload?: (error: unknown) => AuditEventPayload;
};

function requestIdToString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return null;
}

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
        entityType: meta.entityType,
        entityId: meta.entityId ?? null,
        payload:
          meta.buildSuccessPayload?.(result) ?? {
            success: true,
          },
      });
    } catch (auditError) {
      console.error('AUDIT_SUCCESS_LOG_FAILURE', {
        requestId: requestIdToString((req as unknown as { id?: unknown }).id),
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
        entityType: meta.entityType,
        entityId: meta.entityId ?? null,
        payload: meta.buildFailurePayload?.(error) ?? defaultFailurePayload(error),
        success: false,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (auditError) {
      console.error('AUDIT_FAILURE_LOG_FAILURE', {
        requestId: requestIdToString((req as unknown as { id?: unknown }).id),
        auditError,
        action: meta.action,
      });
    }

    throw error;
  }
}