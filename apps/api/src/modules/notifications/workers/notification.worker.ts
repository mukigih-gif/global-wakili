/**
 * workers/notification.worker.ts
 *
 * BullMQ worker — processes notification.dispatch jobs from the integrations queue.
 * Also runs the Reminder, Escalation, and Digest engines on a scheduled interval.
 *
 * Job: notification.dispatch
 *   Payload: NotificationSendInput (tenantId, recipients, channels, template, ...)
 *   Action:  calls NotificationDeliveryService.sendNow()
 *
 * Scheduled (every 60 minutes):
 *   - NotificationReminderService.runAll()   — deadline-based reminders
 *   - NotificationEscalationService.runAll() — unacknowledged notification escalation
 *   - NotificationDigestService.runAll()     — daily/weekly digest batching
 *
 * Start this worker separately from the API server:
 *   npm run worker:notifications
 *
 * WIP-002 — Gap 006.
 */

import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '../../../config/database';
import { NotificationDeliveryService } from '../NotificationDeliveryService';
import { NotificationReminderService } from '../NotificationReminderService';
import { NotificationEscalationService } from '../NotificationEscalationService';
import { NotificationDigestService } from '../NotificationDigestService';
import type { NotificationSendInput } from '../notification.types';

const QUEUE_NAME = 'integrations';
const ENGINES_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function buildRedisConnection(): IORedis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('[NOTIFICATION_WORKER] REDIS_URL is required. Set it in your environment.');
  }
  return new IORedis(url, { maxRetriesPerRequest: null });
}

async function processNotificationDispatch(job: Job): Promise<void> {
  const input = job.data as NotificationSendInput;

  if (!input.tenantId?.trim()) {
    throw new Error('notification.dispatch job missing tenantId');
  }

  console.info('[NOTIFICATION_WORKER] Processing job', {
    jobId: job.id,
    tenantId: input.tenantId,
    channels: input.channels,
    recipientCount: input.recipients?.length ?? 0,
  });

  await NotificationDeliveryService.sendNow(prisma as any, input);
}

async function runEngines(): Promise<void> {
  console.info('[NOTIFICATION_WORKER] Running engines (reminder, escalation, digest)...');

  const [reminders, escalations, digests] = await Promise.allSettled([
    NotificationReminderService.runAll(prisma as any),
    NotificationEscalationService.runAll(prisma as any),
    NotificationDigestService.runAll(prisma as any),
  ]);

  if (reminders.status === 'fulfilled')   console.info('[NOTIFICATION_WORKER] Reminders',   reminders.value);
  if (escalations.status === 'fulfilled') console.info('[NOTIFICATION_WORKER] Escalations', escalations.value);
  if (digests.status === 'fulfilled')     console.info('[NOTIFICATION_WORKER] Digests',      digests.value);

  if (reminders.status === 'rejected')   console.error('[NOTIFICATION_WORKER] Reminder engine error',   reminders.reason);
  if (escalations.status === 'rejected') console.error('[NOTIFICATION_WORKER] Escalation engine error', escalations.reason);
  if (digests.status === 'rejected')     console.error('[NOTIFICATION_WORKER] Digest engine error',      digests.reason);
}

async function main(): Promise<void> {
  const connection = buildRedisConnection();

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      if (job.name === 'notification.dispatch') {
        await processNotificationDispatch(job);
      } else {
        console.info('[NOTIFICATION_WORKER] Skipping unrecognised job', { name: job.name, id: job.id });
      }
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    console.info('[NOTIFICATION_WORKER] Job completed', { id: job.id, name: job.name });
  });

  worker.on('failed', (job, err) => {
    console.error('[NOTIFICATION_WORKER] Job failed', {
      id: job?.id,
      name: job?.name,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    console.error('[NOTIFICATION_WORKER] Worker error', err.message);
  });

  console.info('[NOTIFICATION_WORKER] Started — listening on queue:', QUEUE_NAME);

  // Run engines immediately on start, then every hour
  await runEngines();
  setInterval(runEngines, ENGINES_INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.info(`[NOTIFICATION_WORKER] Shutting down on ${signal}...`);
    await worker.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('[NOTIFICATION_WORKER] Fatal startup error', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
