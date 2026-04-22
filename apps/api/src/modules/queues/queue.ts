// apps/api/src/modules/queues/queue.ts

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

type QueueJobPayload = Record<string, unknown>;

type QueueJobResult = {
  id: string | number;
  name: string;
  data: QueueJobPayload;
};

type QueueLike = {
  add: (
    name: string,
    data: QueueJobPayload,
    options?: Record<string, unknown>,
  ) => Promise<QueueJobResult>;
  close?: () => Promise<void>;
};

let reminderQueue: QueueLike | null = null;
let integrationQueue: QueueLike | null = null;
let redisConnection: IORedis | null = null;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function shouldUseRedisQueue(): boolean {
  if (process.env.REDIS_QUEUE_ENABLED === 'false') return false;
  if (process.env.REDIS_ENABLED === 'false') return false;
  if (process.env.REDIS_URL) return true;
  return isProduction();
}

function createNoopQueue(queueName: string): QueueLike {
  return {
    async add(name: string, data: QueueJobPayload): Promise<QueueJobResult> {
      const id = `noop-${queueName}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      if (!isProduction()) {
        console.warn('QUEUE_DISABLED_NON_PRODUCTION', {
          queue: queueName,
          job: name,
          id,
          reason:
            'Redis queue is disabled or unavailable. Job accepted by local no-op queue.',
        });
      }

      return {
        id,
        name,
        data,
      };
    },

    async close(): Promise<void> {
      return undefined;
    },
  };
}

function createRedisConnection(): IORedis {
  const connection = process.env.REDIS_URL
    ? new IORedis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: false,
        retryStrategy: (times) => Math.min(times * 250, 5_000),
      })
    : new IORedis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: false,
        retryStrategy: (times) => Math.min(times * 250, 5_000),
      });

  connection.on('error', (error) => {
    if (isProduction()) {
      console.error('QUEUE_REDIS_ERROR', error);
      return;
    }

    console.warn('QUEUE_REDIS_UNAVAILABLE_NON_PRODUCTION', {
      message: error.message,
    });
  });

  connection.on('ready', () => {
    console.info('QUEUE_REDIS_READY');
  });

  connection.on('end', () => {
    if (!isProduction()) {
      console.warn('QUEUE_REDIS_CONNECTION_CLOSED');
    }
  });

  return connection;
}

function createBullQueue(queueName: string): QueueLike {
  redisConnection = redisConnection ?? createRedisConnection();

  return new Queue(queueName, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2_000,
      },
      removeOnComplete: {
        age: 60 * 60 * 24,
        count: 1_000,
      },
      removeOnFail: {
        age: 60 * 60 * 24 * 7,
        count: 2_000,
      },
    },
  }) as unknown as QueueLike;
}

function getNamedQueue(
  current: QueueLike | null,
  queueName: string,
  setQueue: (queue: QueueLike) => void,
): QueueLike {
  if (current) return current;

  if (!shouldUseRedisQueue()) {
    const noop = createNoopQueue(queueName);
    setQueue(noop);
    return noop;
  }

  try {
    const queue = createBullQueue(queueName);
    setQueue(queue);
    return queue;
  } catch (error) {
    if (isProduction()) {
      throw error;
    }

    console.warn('QUEUE_FALLBACK_TO_NOOP_NON_PRODUCTION', {
      queue: queueName,
      error: error instanceof Error ? error.message : error,
    });

    const noop = createNoopQueue(queueName);
    setQueue(noop);
    return noop;
  }
}

export function getReminderQueue(): QueueLike {
  return getNamedQueue(reminderQueue, 'reminders', (queue) => {
    reminderQueue = queue;
  });
}

export function getIntegrationQueue(): QueueLike {
  return getNamedQueue(integrationQueue, 'integrations', (queue) => {
    integrationQueue = queue;
  });
}

export async function closeQueues(): Promise<void> {
  if (reminderQueue?.close) {
    await reminderQueue.close();
  }

  if (integrationQueue?.close) {
    await integrationQueue.close();
  }

  if (redisConnection) {
    await redisConnection.quit().catch(() => redisConnection?.disconnect());
  }

  reminderQueue = null;
  integrationQueue = null;
  redisConnection = null;
}