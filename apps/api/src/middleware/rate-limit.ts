/**
 * middleware/rate-limit.ts
 *
 * Multi-instance-safe rate limiter.
 *
 * When REDIS_URL is set: uses Redis store via rate-limit-redis
 *   → safe for horizontal scaling (multiple API instances share state)
 *
 * When REDIS_URL is absent: falls back to in-memory token bucket
 *   → dev/test only; not safe for multi-instance production
 *
 * Both paths use req.ip (Express trust proxy resolved) — not
 * x-forwarded-for[0] which is spoofable by clients.
 *
 * Gap 019 — Production Infrastructure.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import IORedis from 'ioredis';
import { logAdminAction } from '../utils/audit-logger';
import { AuditSeverity } from '../types/audit';

// ── In-memory fallback (dev only) ─────────────────────────────────────────────

type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();

function inMemoryRateLimiter(capacity = 100, refillIntervalMs = 60_000): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
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

    await auditRateLimit(req).catch(() => {});
    res.status(429).json({ error: 'Too Many Requests', code: 'RATE_LIMIT_EXCEEDED', requestId: req.id });
  };
}

// ── Redis-backed rate limiter (production) ────────────────────────────────────

let _redisClient: IORedis | null = null;

function getRedisClient(): IORedis {
  if (_redisClient) return _redisClient;
  _redisClient = new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
  _redisClient.on('error', (err) => console.warn('[RATE_LIMIT_REDIS]', err.message));
  return _redisClient;
}

function redisRateLimiter(capacity = 100, windowMs = 60_000): RequestHandler {
  const limiter = rateLimit({
    windowMs,
    max: capacity,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown',
    store: new RedisStore({
      sendCommand: (...args: string[]) => getRedisClient().call(...args) as any,
    }),
    handler: async (req: Request, res: Response) => {
      await auditRateLimit(req).catch(() => {});
      res.status(429).json({ error: 'Too Many Requests', code: 'RATE_LIMIT_EXCEEDED', requestId: req.id });
    },
  });
  return limiter;
}

async function auditRateLimit(req: Request): Promise<void> {
  await logAdminAction({
    actor: req.user ? { id: req.user.sub, role: req.user.role ?? 'UNKNOWN' } : { id: 'anonymous', role: 'UNKNOWN' },
    tenantId: req.tenantId,
    action: 'RATE_LIMIT_EXCEEDED',
    severity: AuditSeverity.WARNING,
    req,
    requestId: req.id,
    after: { ip: req.ip, path: req.originalUrl || req.url },
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

const CAPACITY     = parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10);
const WINDOW_MS    = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10);

export const rateLimiter = (): RequestHandler => {
  if (process.env.REDIS_URL?.trim()) {
    console.info('[RATE_LIMITER] Using Redis store (multi-instance safe)');
    return redisRateLimiter(CAPACITY, WINDOW_MS);
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn('[RATE_LIMITER] WARNING: REDIS_URL not set in production — using in-memory store (not multi-instance safe)');
  }
  return inMemoryRateLimiter(CAPACITY, WINDOW_MS);
};
