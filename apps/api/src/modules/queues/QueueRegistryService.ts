// apps/api/src/modules/queues/QueueRegistryService.ts

import type { ExternalJobProvider } from './queue.types';

type RegisteredQueueJob = {
  provider: ExternalJobProvider;
  jobType: string;
  queueName: 'integrations' | 'reminders';
  description: string;
};

const REGISTERED_JOBS: RegisteredQueueJob[] = [
  {
    provider: 'NOTIFICATIONS',
    jobType: 'notification.dispatch',
    queueName: 'integrations',
    description: 'Dispatch system/email/SMS notifications.',
  },
  {
    provider: 'NOTIFICATIONS',
    jobType: 'reminder.dispatch',
    queueName: 'reminders',
    description: 'Dispatch calendar/task reminders.',
  },
  {
    provider: 'ETIMS',
    jobType: 'etims.submit',
    queueName: 'integrations',
    description: 'Submit invoice/document payloads to KRA eTIMS.',
  },
  {
    provider: 'ETIMS',
    jobType: 'etims.sync-status',
    queueName: 'integrations',
    description: 'Sync eTIMS status from provider.',
  },
  {
    provider: 'BANKING',
    jobType: 'banking.sync',
    queueName: 'integrations',
    description: 'Sync bank statements and transactions.',
  },
  {
    provider: 'GOAML',
    jobType: 'goaml.submit-str',
    queueName: 'integrations',
    description: 'Submit STR reports through goAML bridge.',
  },
  {
    provider: 'GOAML',
    jobType: 'goaml.sync-status',
    queueName: 'integrations',
    description: 'Sync goAML submission status.',
  },
  {
    provider: 'OUTLOOK',
    jobType: 'calendar.outlook.sync',
    queueName: 'integrations',
    description: 'Sync Outlook calendar events.',
  },
  {
    provider: 'GOOGLE',
    jobType: 'calendar.google.sync',
    queueName: 'integrations',
    description: 'Sync Google calendar events.',
  },
];

export class QueueRegistryService {
  static listRegisteredJobs(): RegisteredQueueJob[] {
    return [...REGISTERED_JOBS];
  }

  static find(provider: ExternalJobProvider, jobType: string): RegisteredQueueJob | null {
    return (
      REGISTERED_JOBS.find(
        (job) => job.provider === provider && job.jobType === jobType,
      ) ?? null
    );
  }

  static assertRegistered(provider: ExternalJobProvider, jobType: string): RegisteredQueueJob {
    const registered = this.find(provider, jobType);

    if (!registered) {
      throw Object.assign(new Error(`Unsupported queue job: ${provider}:${jobType}`), {
        statusCode: 422,
        code: 'QUEUE_JOB_TYPE_UNSUPPORTED',
        details: {
          provider,
          jobType,
          registeredJobs: REGISTERED_JOBS.map((job) => ({
            provider: job.provider,
            jobType: job.jobType,
          })),
        },
      });
    }

    return registered;
  }
}

export default QueueRegistryService;