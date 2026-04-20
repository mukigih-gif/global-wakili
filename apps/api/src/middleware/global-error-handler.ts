import type { NextFunction, Request, Response } from 'express';
import { logAdminAction } from '../utils/audit-logger';
import { AuditSeverity } from '../types/audit';

type AppError = Error & {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  details?: unknown;
};

export async function globalErrorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const statusCode =
    typeof err?.statusCode === 'number' && err.statusCode >= 400
      ? err.statusCode
      : 500;

  const response: Record<string, unknown> = {
    error: err?.message || 'Internal Server Error',
    code: err?.code || 'INTERNAL_ERROR',
    requestId: req.id,
  };

  if (err?.details) {
    response.details = err.details;
  }

  if (process.env.NODE_ENV !== 'production' && err?.stack) {
    response.stack = err.stack;
  }

  const logMeta = {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode,
    userId: req.user?.sub ?? 'anonymous',
    tenantId: req.tenantId ?? null,
  };

  if (statusCode >= 500) {
    console.error('GLOBAL_ERROR', logMeta, err);
  } else {
    console.warn('CLIENT_ERROR', logMeta);
  }

  if (statusCode >= 500) {
    try {
      await logAdminAction({
        actor: req.user
          ? { id: req.user.sub, role: req.user.role ?? 'UNKNOWN' }
          : { id: 'system', role: 'SYSTEM' },
        tenantId: req.tenantId,
        action: 'SYSTEM_ERROR',
        severity: AuditSeverity.CRITICAL,
        req,
        requestId: req.id,
        after: {
          error: err?.message,
          path: req.originalUrl || req.url,
          method: req.method,
          statusCode,
        },
      });
    } catch (auditError) {
      console.error('ERROR_HANDLER_AUDIT_FAILURE', {
        requestId: req.id,
        auditError,
      });
    }
  }

  res.status(statusCode).json(response);
}