// apps/api/src/config/redis.ts

import Redis from 'ioredis';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __globalWakiliRedis__: Redis | undefined;
}

let isRedisConnected = false;
let hasLoggedDevRedisFailure = false;

function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

function isRedisEnabled(): boolean {
  if (process.env.REDIS_ENABLED === 'false') return false;
  return true;
}

function createRedisClient(): Redis {
  const commonOptions = {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (!isProduction() && times > 3) {
        if (!hasLoggedDevRedisFailure) {
          console.warn(
            'Redis connection failed. Continuing in cache-less mode for non-production.',
          );
          hasLoggedDevRedisFailure = true;
        }

        return null;
      }

      return Math.min(times * 100, 2_000);
    },
    reconnectOnError(error: Error) {
      return error.message.includes('READONLY');
    },
  } as const;

  const client = env.REDIS_URL
    ? new Redis(env.REDIS_URL, commonOptions)
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        ...commonOptions,
      });

  client.on('connect', () => {
    if (!isProduction()) {
      console.info('Redis connection established.');
    }
  });

  client.on('ready', () => {
    isRedisConnected = true;

    if (!isProduction()) {
      console.info('Redis ready.');
    }
  });

  client.on('end', () => {
    isRedisConnected = false;

    if (!isProduction()) {
      console.warn('Redis connection closed.');
    }
  });

  client.on('reconnecting', () => {
    if (isProduction()) {
      console.warn('Redis reconnecting.');
    }
  });

  client.on('error', (error) => {
    isRedisConnected = false;

    if (isProduction()) {
      console.error('Redis error:', error);
      return;
    }

    if (!hasLoggedDevRedisFailure) {
      console.warn(
        'Redis unavailable in non-production mode. Continuing without Redis-backed cache/session features.',
      );
      hasLoggedDevRedisFailure = true;
    }
  });

  return client;
}

export const redis: Redis | null =
  isRedisEnabled()
    ? global.__globalWakiliRedis__ ?? createRedisClient()
    : null;

if (!isProduction() && redis) {
  global.__globalWakiliRedis__ = redis;
}

export async function connectRedis(): Promise<void> {
  if (!redis) {
    if (!isProduction()) {
      console.warn('Redis disabled by REDIS_ENABLED=false.');
    }

    return;
  }

  if (isRedisConnected || redis.status === 'ready') {
    isRedisConnected = true;
    return;
  }

  try {
    await redis.connect();
    isRedisConnected = redis.status === 'ready';
  } catch (error) {
    isRedisConnected = false;

    if (isProduction()) {
      throw error;
    }

    if (!hasLoggedDevRedisFailure) {
      console.warn(
        'Redis initial connect failed. Continuing in cache-less mode for non-production.',
      );
      hasLoggedDevRedisFailure = true;
    }
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!redis) return;

  try {
    if (redis.status === 'ready' || redis.status === 'connect') {
      await redis.quit();
    } else {
      redis.disconnect();
    }
  } catch {
    redis.disconnect();
  } finally {
    isRedisConnected = false;
  }
}

export function isRedisReady(): boolean {
  return Boolean(redis && redis.status === 'ready');
}

export function getRedisClient(): Redis | null {
  return redis;
}

export default redis;