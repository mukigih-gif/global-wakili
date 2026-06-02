/**
 * workers/passive-capture.worker.ts
 *
 * BullMQ worker — processes passive time capture jobs from the integrations queue.
 *
 * Job handlers:
 *   passive.capture.email    → PassiveActivityService.ingestEmailActivity()
 *   passive.capture.calendar → PassiveActivityService.ingestCalendarActivity()
 *   passive.capture.document → PassiveActivityService.ingestDocumentActivity()
 *   passive.capture.matter   → PassiveActivityService.ingestMatterApiActivity()
 *   passive.capture.approve  → WipGenerationService.convertCaptureEventToTimeEntry()
 *   passive.capture.discard  → mark PassiveCaptureEvent as DISCARDED
 *   passive.wip.refresh      → WipGenerationService.refreshWipForMatter()
 *
 * Deduplication is handled by the unique constraint on PassiveCaptureEvent.
 *
 * Start with: npm run worker:passive-capture
 *
 * WIP-004 — Gap 009.
 */

import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '../../../config/database';
import { PassiveActivityService } from '../PassiveActivityService';
import { WipGenerationService } from '../WipGenerationService';

const QUEUE_NAME = 'integrations';

function buildRedisConnection(): IORedis {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('[PASSIVE_CAPTURE_WORKER] REDIS_URL is required.');
  return new IORedis(url, { maxRetriesPerRequest: null });
}

async function handleJob(job: Job): Promise<void> {
  const { name, data } = job;

  switch (name) {
    case 'passive.capture.email':
      await PassiveActivityService.ingestEmailActivity(prisma as any, {
        ...data,
        sentAt: new Date(data.sentAt),
      });
      break;

    case 'passive.capture.calendar':
      await PassiveActivityService.ingestCalendarActivity(prisma as any, {
        ...data,
        startTime: new Date(data.startTime),
      });
      break;

    case 'passive.capture.document':
      await PassiveActivityService.ingestDocumentActivity(prisma as any, {
        ...data,
        accessedAt: new Date(data.accessedAt),
      });
      break;

    case 'passive.capture.matter':
      await PassiveActivityService.ingestMatterApiActivity(prisma as any, {
        ...data,
        occurredAt: new Date(data.occurredAt),
      });
      break;

    case 'passive.capture.approve':
      await WipGenerationService.convertCaptureEventToTimeEntry(prisma as any, {
        tenantId: data.tenantId,
        captureEventId: data.captureEventId,
        approvedBy: data.approvedBy,
        isBillable: data.isBillable,
        description: data.description ?? null,
      });
      break;

    case 'passive.capture.discard':
      await (prisma as any).passiveCaptureEvent.update({
        where: { id: data.captureEventId, tenantId: data.tenantId },
        data: {
          status: 'DISCARDED',
          metadata: {
            discardedBy: data.discardedBy,
            discardedAt: new Date().toISOString(),
            reason: data.reason ?? null,
          },
        },
      });
      break;

    case 'passive.wip.refresh':
      await WipGenerationService.refreshWipForMatter(prisma as any, {
        tenantId: data.tenantId,
        matterId: data.matterId,
      });
      break;

    default:
      // Not a passive capture job — skip silently
      break;
  }
}

async function main(): Promise<void> {
  const connection = buildRedisConnection();

  const worker = new Worker(QUEUE_NAME, handleJob, {
    connection,
    concurrency: 10,
  });

  worker.on('completed', (job) =>
    console.info('[PASSIVE_CAPTURE] Job completed', { id: job.id, name: job.name }),
  );

  worker.on('failed', (job, err) =>
    console.error('[PASSIVE_CAPTURE] Job failed', { id: job?.id, name: job?.name, error: err.message }),
  );

  worker.on('error', (err) =>
    console.error('[PASSIVE_CAPTURE] Worker error', err.message),
  );

  console.info('[PASSIVE_CAPTURE] Worker started on queue:', QUEUE_NAME);

  const shutdown = async (signal: string) => {
    console.info(`[PASSIVE_CAPTURE] Shutting down on ${signal}...`);
    await worker.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('[PASSIVE_CAPTURE] Fatal startup error', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
