import { Queue, JobsOptions, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../config/env';

export type QueueJobName =
  | 'etims.submit.invoice'
  | 'etims.sync.status'
  | 'bank.sync.account'
  | 'reminder.dispatch'
  | 'report.export.generate';

export const QUEUE_NAMES = {
  integration: 'global-wakili:integration',
  reminder: 'global-wakili:reminder',
  reporting: 'global-wakili:reporting',
} as const;

type QueueRegistryKey = keyof typeof QUEUE_NAMES;

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: 1000,
  removeOnFail: 5000,
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
};

const connection = env.REDIS_URL
  ? new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 250, 5000),
    })
  : new IORedis({
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 250, 5000),
    });

const queueOptions: QueueOptions = {
  connection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
};

const queues: Record<QueueRegistryKey, Queue | null> = {
  integration: null,
  reminder: null,
  reporting: null,
};

function createQueue(name: string): Queue {
  return new Queue(name, queueOptions);
}

export function getIntegrationQueue(): Queue {
  if (!queues.integration) {
    queues.integration = createQueue(QUEUE_NAMES.integration);
  }
  return queues.integration;
}

export function getReminderQueue(): Queue {
  if (!queues.reminder) {
    queues.reminder = createQueue(QUEUE_NAMES.reminder);
  }
  return queues.reminder;
}

export function getReportingQueue(): Queue {
  if (!queues.reporting) {
    queues.reporting = createQueue(QUEUE_NAMES.reporting);
  }
  return queues.reporting;
}

export function getQueueConnection(): IORedis {
  return connection;
}

export async function closeQueues(): Promise<void> {
  await Promise.all(
    Object.values(queues)
      .filter((queue): queue is Queue => Boolean(queue))
      .map((queue) => queue.close()),
  );
  await connection.quit();
}