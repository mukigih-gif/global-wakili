// src/utils/idempotency.ts
import { redis } from '../config/redis';

export async function isDuplicateRequest(requestId: string): Promise<boolean> {
  const key = `idempotency:${requestId}`;
  const result = await redis.set(key, 'locked', { nx: true, ex: 3600 }); // Lock for 1 hour
  return result === null; // If null, the key already existed
}