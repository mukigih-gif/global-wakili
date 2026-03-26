// src/config/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// src/middleware/idempotency.ts
export const checkIdempotency = async (key: string) => {
  const exists = await redis.get(`mpesa_lock:${key}`);
  if (exists) return true; // Already processed
  await redis.set(`mpesa_lock:${key}`, "PROCESSED", { ex: 86400 }); // 24h expiry
  return false;
};