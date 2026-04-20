import { Worker, QueueEvents } from 'bullmq';
import type { Job } from 'bullmq';
import { getQueueConnection, QUEUE_NAMES } from './queue';
import { handleEtimsJob } from './jobs/etims.job';
import { handleBankSyncJob } from './jobs/bank-sync.job';
import { handleReminderJob } from './jobs/reminder.job';
import { handleReportExportJob } from './jobs/report-export.job';

type SupportedJobName =
  | 'etims.submit.invoice'
  | 'etims.sync.status'
  | 'bank.sync.account'
  | 'reminder.dispatch'
  | 'report.export.generate';

type SupportedJob = Job<Record<string, unknown>, unknown, SupportedJobName>;

let integrationWorker: Worker | null = null;
let reminderWorker: Worker | null = null;
let reportingWorker: Worker | null = null;

let integrationEvents: QueueEvents | null = null;
let reminderEvents: QueueEvents | null = null;
let reportingEvents: QueueEvents | null = null;

async function dispatch(job: SupportedJob): Promise<unknown> {
  switch (job.name) {
    case 'etims.submit.invoice':
    case 'etims.sync.status':
      return handleEtimsJob(job);
    case 'bank.sync.account':
      return handleBankSyncJob(job);
    case 'reminder.dispatch':
      return handleReminderJob(job);
    case 'report.export.generate':
      return handleReportExportJob(job);
    default:
      throw new Error(`Unsupported job name: ${job.name as string}`);
  }
}

function buildWorker(queueName: string): Worker {
  return new Worker(
    queueName,
    async (job) => dispatch(job as SupportedJob),
    {
      connection: getQueueConnection(),
      concurrency: 5,
    },
  );
}

function attachWorkerLogging(worker: Worker): void {
  worker.on('completed', (job) => {
    console.info('[QUEUE_JOB_COMPLETED]', {
      queue: worker.name,
      jobId: job.id,
      name: job.name,
    });
  });

  worker.on('failed', (job, error) => {
    console.error('[QUEUE_JOB_FAILED]', {
      queue: worker.name,
      jobId: job?.id ?? null,
      name: job?.name ?? null,
      error: error.message,
    });
  });
}

function attachEventLogging(events: QueueEvents): void {
  events.on('error', (error) => {
    console.error('[QUEUE_EVENTS_ERROR]', {
      queue: events.name,
      error: error.message,
    });
  });
}

export function startWorkers(): void {
  if (!integrationWorker) {
    integrationWorker = buildWorker(QUEUE_NAMES.integration);
    attachWorkerLogging(integrationWorker);
  }

  if (!reminderWorker) {
    reminderWorker = buildWorker(QUEUE_NAMES.reminder);
    attachWorkerLogging(reminderWorker);
  }

  if (!reportingWorker) {
    reportingWorker = buildWorker(QUEUE_NAMES.reporting);
    attachWorkerLogging(reportingWorker);
  }

  if (!integrationEvents) {
    integrationEvents = new QueueEvents(QUEUE_NAMES.integration, {
      connection: getQueueConnection(),
    });
    attachEventLogging(integrationEvents);
  }

  if (!reminderEvents) {
    reminderEvents = new QueueEvents(QUEUE_NAMES.reminder, {
      connection: getQueueConnection(),
    });
    attachEventLogging(reminderEvents);
  }

  if (!reportingEvents) {
    reportingEvents = new QueueEvents(QUEUE_NAMES.reporting, {
      connection: getQueueConnection(),
    });
    attachEventLogging(reportingEvents);
  }
}

export async function shutdownWorkers(): Promise<void> {
  await Promise.all([
    integrationWorker?.close(),
    reminderWorker?.close(),
    reportingWorker?.close(),
    integrationEvents?.close(),
    reminderEvents?.close(),
    reportingEvents?.close(),
  ]);

  integrationWorker = null;
  reminderWorker = null;
  reportingWorker = null;
  integrationEvents = null;
  reminderEvents = null;
  reportingEvents = null;
}