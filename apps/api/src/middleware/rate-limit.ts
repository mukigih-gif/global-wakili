import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { logAdminAction } from '../utils/audit-logger';
import { AuditSeverity } from '../types/audit';

type Bucket = {
  tokens: number;
  last: number;
};

const buckets = new Map<string, Bucket>();

export const rateLimiter = (): RequestHandler => {
  const capacity = 100;
  const refillIntervalMs = 60_000;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const forwarded =
      typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : null;

    const key = forwarded || req.ip || 'unknown';

    const now = Date.now();
    const bucket = buckets.get(key) ?? { tokens: capacity, last: now };

    const elapsed = now - bucket.last;
    const refill = Math.floor((elapsed / refillIntervalMs) * capacity);

    if (refill > 0) {
      bucket.tokens = Math.min(capacity, bucket.tokens + refill);
      bucket.last = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      buckets.set(key, bucket);

      res.setHeader('X-RateLimit-Limit', String(capacity));
      res.setHeader('X-RateLimit-Remaining', String(bucket.tokens));

      next();
      return;
    }

    try {
      await logAdminAction({
        actor: req.user
          ? { id: req.user.sub, role: req.user.role ?? 'UNKNOWN' }
          : { id: 'anonymous', role: 'UNKNOWN' },
        tenantId: req.tenantId,
        action: 'RATE_LIMIT_EXCEEDED',
        severity: AuditSeverity.WARNING,
        req,
        requestId: req.id,
        after: {
          ip: key,
          path: req.originalUrl || req.url,
        },
      });
    } catch (auditError) {
      console.error('RATE_LIMIT_AUDIT_FAILURE', {
        requestId: req.id,
        auditError,
      });
    }

    res.status(429).json({
      error: 'Too Many Requests',
      code: 'RATE_LIMIT_EXCEEDED',
      requestId: req.id,
    });
  };
};