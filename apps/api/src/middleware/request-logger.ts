import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { logAdminAction } from '../utils/audit-logger';
import { AuditAction, AuditSeverity } from '../types/audit';

function requestIdToString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return null;
}

function getRequestUserMeta(req: Request): {
  id: string;
  role: string;
} {
  const user = (req as unknown as {
    user?: {
      sub?: string;
      id?: string;
      userId?: string;
      role?: string | null;
      primaryRole?: string | null;
      tenantRole?: string | null;
      systemRole?: string | null;
    };
  }).user;

  return {
    id: user?.sub ?? user?.id ?? user?.userId ?? 'anonymous',
    role:
      user?.role ??
      user?.primaryRole ??
      user?.tenantRole ??
      user?.systemRole ??
      'UNKNOWN',
  };
}

export const requestLogger = (): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on('finish', () => {
      void (async () => {
        const duration = Date.now() - start;
        const requestId = requestIdToString((req as unknown as { id?: unknown }).id);
        const requestUser = getRequestUserMeta(req);

        const meta = {
          requestId,
          method: req.method,
          path: req.originalUrl || req.url,
          status: res.statusCode,
          durationMs: duration,
          ip: req.ip,
          userId: requestUser.id,
          tenantId: req.tenantId ?? null,
        };

        if (res.statusCode >= 500) {
          console.error('REQUEST_ERROR', meta);
        } else if (res.statusCode >= 400) {
          console.warn('REQUEST_WARN', meta);
        } else {
          console.info('REQUEST_OK', meta);
        }

        if (duration > 2000) {
          console.warn('SLOW_REQUEST', meta);
        }

        if (res.statusCode >= 500 && req.tenantId) {
          try {
            await logAdminAction({
              actor: {
                id: requestUser.id === 'anonymous' ? 'SYSTEM' : requestUser.id,
                role: requestUser.role,
              },
              tenantId: req.tenantId,
              action: AuditAction.REQUEST_FAILURE,
              severity: AuditSeverity.CRITICAL,
              entityType: 'HttpRequest',
              entityId: requestId ?? `${req.method}:${req.originalUrl || req.url}`,
              req,
              requestId: requestId ?? undefined,
              payload: {
                success: false,
                eventCode: 'REQUEST_FAILURE',
                method: req.method,
                path: req.originalUrl || req.url,
                status: res.statusCode,
                durationMs: duration,
              },
              success: false,
              failureReason: `HTTP ${res.statusCode}`,
            });
          } catch (auditError) {
            console.error('REQUEST_LOGGER_AUDIT_FAILURE', {
              requestId,
              auditError,
            });
          }
        }
      })();
    });

    next();
  };
};