import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { logAdminAction } from '../utils/audit-logger';
import { AuditSeverity } from '../types/audit';

export const requestLogger = (): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on('finish', () => {
      void (async () => {
        const duration = Date.now() - start;

        const meta = {
          requestId: req.id,
          method: req.method,
          path: req.originalUrl || req.url,
          status: res.statusCode,
          durationMs: duration,
          ip: req.ip,
          userId: req.user?.sub ?? 'anonymous',
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

        if (res.statusCode >= 500) {
          try {
            await logAdminAction({
              actor: req.user
                ? { id: req.user.sub, role: req.user.role ?? 'UNKNOWN' }
                : { id: 'system', role: 'SYSTEM' },
              tenantId: req.tenantId,
              action: 'REQUEST_FAILURE',
              severity: AuditSeverity.CRITICAL,
              req,
              requestId: req.id,
              after: meta,
            });
          } catch (auditError) {
            console.error('REQUEST_LOGGER_AUDIT_FAILURE', {
              requestId: req.id,
              auditError,
            });
          }
        }
      })();
    });

    next();
  };
};