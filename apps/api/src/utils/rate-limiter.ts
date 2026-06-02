/**
 * Pure token bucket rate limiter utilities — no HTTP, no database.
 *
 * Extracted from middleware/rate-limit.ts to enable unit testing of the
 * token bucket arithmetic without a live HTTP server.
 *
 * Algorithm: token bucket with continuous refill
 *   - Each IP starts with `capacity` tokens
 *   - Each request consumes 1 token
 *   - Tokens refill at `capacity / refillIntervalMs` per millisecond
 *   - When bucket is empty: request is rejected (429 Too Many Requests)
 *
 * Production note:
 *   The current implementation uses an in-memory Map which:
 *   - Resets on server restart (limits do not persist)
 *   - Is NOT distributed (each server instance has its own bucket state)
 *   - Is suitable for development and single-instance deployments only
 *
 *   For production with multiple instances or horizontal scaling, replace
 *   the in-memory Map with a Redis-backed store (e.g. ioredis with EXPIRE).
 *   The pure functions below work with any storage backend.
 *
 * Security note:
 *   Key derivation MUST use req.ip (Express proxy-resolved IP), NOT
 *   req.headers['x-forwarded-for'] directly. The raw header can be
 *   spoofed by clients to bypass rate limiting.
 */

export type TokenBucket = {
  tokens: number;
  last: number;
};

export type BucketCheckResult = {
  allowed: boolean;
  remaining: number;
  bucket: TokenBucket;
};

/**
 * Computes how many tokens to refill based on elapsed time.
 * Uses a continuous refill model: tokens += floor(elapsed / interval * capacity).
 */
export function computeRefill(
  currentTokens: number,
  lastRefillTime: number,
  nowMs: number,
  capacity: number,
  refillIntervalMs: number,
): TokenBucket {
  const elapsed = Math.max(0, nowMs - lastRefillTime);
  const refillAmount = Math.floor((elapsed / refillIntervalMs) * capacity);

  if (refillAmount <= 0) {
    return { tokens: currentTokens, last: lastRefillTime };
  }

  return {
    tokens: Math.min(capacity, currentTokens + refillAmount),
    last: nowMs,
  };
}

/**
 * Checks whether a request is allowed and returns the updated bucket state.
 * Consumes 1 token if allowed; leaves bucket unchanged if denied.
 */
export function checkBucket(
  bucket: TokenBucket,
  capacity: number,
  refillIntervalMs: number,
  nowMs: number,
): BucketCheckResult {
  const refilled = computeRefill(
    bucket.tokens,
    bucket.last,
    nowMs,
    capacity,
    refillIntervalMs,
  );

  if (refilled.tokens > 0) {
    const updated: TokenBucket = { tokens: refilled.tokens - 1, last: refilled.last };
    return { allowed: true, remaining: updated.tokens, bucket: updated };
  }

  return { allowed: false, remaining: 0, bucket: refilled };
}

/**
 * Creates a fresh bucket at full capacity.
 */
export function createBucket(capacity: number, nowMs: number): TokenBucket {
  return { tokens: capacity, last: nowMs };
}
