import { RequestHandler } from 'express';

type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();

/**
 * Very small in-memory rate limiter for dev. Replace with Redis-backed limiter in prod.
 * Limits to 100 requests per minute per IP.
 */
export default function rateLimiter(): RequestHandler {
  const capacity = 100;
  const refillIntervalMs = 60_000;

  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key) ?? { tokens: capacity, last: now };
    const elapsed = now - bucket.last;

    // refill proportionally
    const refill = Math.floor((elapsed / refillIntervalMs) * capacity);
    if (refill > 0) {
      bucket.tokens = Math.min(capacity, bucket.tokens + refill);
      bucket.last = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      buckets.set(key, bucket);
      next();
    } else {
      res.status(429).json({ error: 'Too Many Requests', code: 'RATE_LIMIT_EXCEEDED' });
    }
  };
}