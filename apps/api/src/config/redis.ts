import Redis, { type RedisOptions } from 'ioredis';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __globalWakiliRedis__: Redis | undefined;
}

const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

const redisDisabled =
  process.env.REDIS_DISABLED === 'true' ||
  process.env.DISABLE_REDIS === 'true' ||
  isTest;

let isRedisConnected = false;
let hasLoggedRedisUnavailable = false;

function buildRedisOptions(): RedisOptions {
  return {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: isProduction ? 5 : 1,
    connectTimeout: isProduction ? 10_000 : 2_000,
    commandTimeout: isProduction ? 10_000 : 2_000,
    retryStrategy: (times) => {
      if (!isProduction && times > 1) {
        return null;
      }

      return Math.min(times * 250, 2_000);
    },
  };
}

function createRedisClient(): Redis {
  const options = buildRedisOptions();

  const client = env.REDIS_URL
    ? new Redis(env.REDIS_URL, options)
    : new Redis({
        host: '127.0.0.1',
        port: 6379,
        ...options,
      });

  client.on('connect', () => {
    if (!isProduction) {
      console.info('✔ Redis connected');
    }
  });

  client.on('ready', () => {
    isRedisConnected = true;

    if (!isProduction) {
      console.info('✔ Redis ready');
    }
  });

  client.on('reconnecting', () => {
    if (isProduction) {
      console.warn('Redis reconnecting');
    }
  });

  client.on('end', () => {
    isRedisConnected = false;

    if (isProduction) {
      console.warn('Redis connection closed');
    }
  });

  client.on('error', (error) => {
    isRedisConnected = false;

    if (isProduction) {
      console.error('Redis error', error);
      return;
    }

    if (!hasLoggedRedisUnavailable) {
      hasLoggedRedisUnavailable = true;
      console.warn(
        'Redis unavailable in non-production mode. Continuing without Redis-backed cache/session features.',
      );
    }
  });

  return client;
}

export const redis = global.__globalWakiliRedis__ ?? createRedisClient();

if (!isProduction) {
  global.__globalWakiliRedis__ = redis;
}

export async function connectRedis(): Promise<void> {
  if (redisDisabled) {
    if (!isProduction) {
      console.warn('Redis disabled by environment/test mode. Skipping Redis connection.');
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

    if (isProduction) {
      console.error('Redis initial connect failed', error);
      throw error;
    }

    if (!hasLoggedRedisUnavailable) {
      hasLoggedRedisUnavailable = true;
      console.warn(
        'Redis initial connect failed in non-production mode. API will continue without Redis.',
      );
    }

    try {
      redis.disconnect(false);
    } catch {
      // Ignore cleanup failure in local/dev fallback mode.
    }
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisDisabled) {
    return;
  }

  if (!isRedisConnected && redis.status === 'end') {
    return;
  }

  try {
    if (redis.status === 'ready' || redis.status === 'connect' || redis.status === 'connecting') {
      await redis.quit();
    } else {
      redis.disconnect(false);
    }
  } catch {
    redis.disconnect(false);
  } finally {
    isRedisConnected = false;
  }
}

export function isRedisReady(): boolean {
  return !redisDisabled && redis.status === 'ready';
}

export function isRedisEnabled(): boolean {
  return !redisDisabled;
}

export async function pingRedis(): Promise<boolean> {
  if (!isRedisReady()) {
    return false;
  }

  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

export default redis;