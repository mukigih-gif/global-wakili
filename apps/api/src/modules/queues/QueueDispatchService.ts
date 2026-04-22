// apps/api/src/modules/queues/QueueDispatchService.ts

import { getIntegrationQueue, getReminderQueue } from './queue';
import { QueuePersistenceService } from './QueuePersistenceService';
import { QueueRegistryService } from './QueueRegistryService';
import type { QueueCreateJobInput, QueueDbClient } from './queue.types';

export class QueueDispatchService {
  static async enqueuePersistedJob(
    db: QueueDbClient,
    params: {
      jobId: string;
      tenantId?: string | null;
    },
  ) {
    const job = await QueuePersistenceService.getJob(db, params);
    const registered = QueueRegistryService.assertRegistered(job.provider, job.jobType);

    const queue =
      registered.queueName === 'reminders' ? getReminderQueue() : getIntegrationQueue();

    const queued = await queue.add(job.jobType, {
      externalJobQueueId: job.id,
      tenantId: job.tenantId ?? null,
      provider: job.provider,
      jobType: job.jobType,
      entityType: job.entityType ?? null,
      entityId: job.entityId ?? null,
      payload: job.payload,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      queuedAt: new Date().toISOString(),
    });

    return {
      queued: true,
      queue: registered.queueName,
      jobName: job.jobType,
      queueJobId: queued.id,
      externalJobQueueId: job.id,
    };
  }

  static async createAndEnqueue(db: QueueDbClient, input: QueueCreateJobInput) {
    const job = await QueuePersistenceService.createJob(db, input);

    const queued = await this.enqueuePersistedJob(db, {
      jobId: job.id,
      tenantId: job.tenantId ?? null,
    });

    return {
      job,
      queued,
    };
  }
}

export default QueueDispatchService;