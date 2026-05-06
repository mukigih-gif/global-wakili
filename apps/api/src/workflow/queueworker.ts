// apps/api/src/workflow/queueworker.ts

import {
  ExternalJobProvider,
  ExternalJobStatus,
  Prisma,
} from '@prisma/client';

import prisma from '../prisma/client';

type ExternalJobPayload = Record<string, unknown>;

type ExternalJobRecord = {
  id: string;
  tenantId: string | null;
  provider: ExternalJobProvider;
  jobType: string;
  entityType: string | null;
  entityId: string | null;
  status: ExternalJobStatus;
  payload: Prisma.JsonValue;
  attempts: number;
  maxAttempts: number;
};

type QueueWorkerResult = {
  processed: number;
  completed: number;
  failed: number;
  retried: number;
};

function normalizePayload(payload: Prisma.JsonValue): ExternalJobPayload {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as ExternalJobPayload;
  }

  return {
    value: payload,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function calculateNextRetryAt(attempts: number): Date {
  const delayMinutes = Math.min(Math.max(attempts, 1) * 5, 60);
  return new Date(Date.now() + delayMinutes * 60_000);
}

async function dispatchExternalJob(job: ExternalJobRecord): Promise<void> {
  const payload = normalizePayload(job.payload);

  if (!Object.values(ExternalJobProvider).includes(job.provider)) {
    throw new Error(`Unsupported external job provider: ${String(job.provider)}`);
  }

  if (!job.jobType.trim()) {
    throw new Error('External job type is required');
  }

  // Provider-specific processors will be wired here once the integration workers
  // are promoted from placeholders to production handlers.
  void payload;
}

export class QueueWorker {
  static async processQueue(limit = 10): Promise<QueueWorkerResult> {
    const pendingJobs = (await prisma.externalJobQueue.findMany({
      where: {
        OR: [
          {
            status: ExternalJobStatus.PENDING,
          },
          {
            status: ExternalJobStatus.RETRYING,
            OR: [
              {
                nextRetryAt: null,
              },
              {
                nextRetryAt: {
                  lte: new Date(),
                },
              },
            ],
          },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
      select: {
        id: true,
        tenantId: true,
        provider: true,
        jobType: true,
        entityType: true,
        entityId: true,
        status: true,
        payload: true,
        attempts: true,
        maxAttempts: true,
      },
    })) as ExternalJobRecord[];

    const result: QueueWorkerResult = {
      processed: pendingJobs.length,
      completed: 0,
      failed: 0,
      retried: 0,
    };

    for (const job of pendingJobs) {
      try {
        await prisma.externalJobQueue.update({
          where: {
            id: job.id,
          },
          data: {
            status: ExternalJobStatus.PROCESSING,
            attempts: {
              increment: 1,
            },
            lastError: null,
            nextRetryAt: null,
          },
        });

        await dispatchExternalJob(job);

        await prisma.externalJobQueue.update({
          where: {
            id: job.id,
          },
          data: {
            status: ExternalJobStatus.COMPLETED,
            processedAt: new Date(),
            lastError: null,
            nextRetryAt: null,
          },
        });

        result.completed += 1;
      } catch (error: unknown) {
        const nextAttempts = job.attempts + 1;
        const shouldRetry = nextAttempts < job.maxAttempts;
        const nextStatus = shouldRetry
          ? ExternalJobStatus.RETRYING
          : ExternalJobStatus.FAILED;

        await prisma.externalJobQueue.update({
          where: {
            id: job.id,
          },
          data: {
            status: nextStatus,
            lastError: getErrorMessage(error),
            nextRetryAt: shouldRetry ? calculateNextRetryAt(nextAttempts) : null,
            processedAt: shouldRetry ? null : new Date(),
          },
        });

        if (shouldRetry) {
          result.retried += 1;
        } else {
          result.failed += 1;
        }
      }
    }

    return result;
  }
}

export default QueueWorker;