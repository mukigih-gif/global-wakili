// apps/api/src/utils/queue.ts

import { Queue, type JobsOptions } from 'bullmq';

type QueueName = 'etims-sync' | 'bank-payouts';

type QueuePayload = Record<string, unknown>;

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 30_000,
  },
  removeOnComplete: {
    age: 60 * 60 * 24,
    count: 1_000,
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 7,
    count: 5_000,
  },
};

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    return {
      url: redisUrl,
    };
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
  };
}

function createQueue(name: QueueName): Queue<QueuePayload> {
  return new Queue<QueuePayload>(name, {
    connection: getRedisConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}

export const etimsQueue = createQueue('etims-sync');
export const bankQueue = createQueue('bank-payouts');

export async function enqueueEtimsSync(
  name: string,
  payload: QueuePayload,
  options?: JobsOptions,
) {
  return etimsQueue.add(name, payload, options);
}

export async function enqueueBankPayout(
  name: string,
  payload: QueuePayload,
  options?: JobsOptions,
) {
  return bankQueue.add(name, payload, options);
}

export async function closeQueues(): Promise<void> {
  await Promise.all([etimsQueue.close(), bankQueue.close()]);
}

export default {
  etimsQueue,
  bankQueue,
  enqueueEtimsSync,
  enqueueBankPayout,
  closeQueues,
};