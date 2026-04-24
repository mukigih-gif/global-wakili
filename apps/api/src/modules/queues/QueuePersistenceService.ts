// apps/api/src/modules/queues/QueuePersistenceService.ts

import type {
  QueueCreateJobInput,
  QueueDbClient,
  QueueMarkFailedInput,
  QueueSearchFilters,
} from './queue.types';
import { QueueRegistryService } from './QueueRegistryService';

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid queue date'), {
      statusCode: 422,
      code: 'QUEUE_DATE_INVALID',
    });
  }

  return parsed;
}

function buildWhere(params: {
  tenantId?: string | null;
  filters?: QueueSearchFilters | null;
}) {
  const filters = params.filters ?? {};
  const andClauses: Record<string, unknown>[] = [];

  if (params.tenantId) andClauses.push({ tenantId: params.tenantId });
  if (filters.tenantId) andClauses.push({ tenantId: filters.tenantId });
  if (filters.provider) andClauses.push({ provider: filters.provider });
  if (filters.status) andClauses.push({ status: filters.status });
  if (filters.jobType) andClauses.push({ jobType: filters.jobType });
  if (filters.entityType) andClauses.push({ entityType: filters.entityType });
  if (filters.entityId) andClauses.push({ entityId: filters.entityId });

  const createdFrom = normalizeDate(filters.createdFrom);
  const createdTo = normalizeDate(filters.createdTo);
  const nextRetryFrom = normalizeDate(filters.nextRetryFrom);
  const nextRetryTo = normalizeDate(filters.nextRetryTo);

  if (createdFrom || createdTo) {
    andClauses.push({
      createdAt: {
        ...(createdFrom ? { gte: createdFrom } : {}),
        ...(createdTo ? { lte: createdTo } : {}),
      },
    });
  }

  if (nextRetryFrom || nextRetryTo) {
    andClauses.push({
      nextRetryAt: {
        ...(nextRetryFrom ? { gte: nextRetryFrom } : {}),
        ...(nextRetryTo ? { lte: nextRetryTo } : {}),
      },
    });
  }

  return andClauses.length ? { AND: andClauses } : {};
}

async function assertTenant(db: QueueDbClient, tenantId?: string | null) {
  if (!tenantId) return;

  const tenant = await db.tenant.findFirst({
    where: { id: tenantId },
    select: { id: true },
  });

  if (!tenant) {
    throw Object.assign(new Error('Tenant not found for queue job'), {
      statusCode: 404,
      code: 'QUEUE_TENANT_NOT_FOUND',
    });
  }
}

function nextRetryDate(attempts: number): Date {
  const delayMs = Math.min(2 ** Math.max(attempts, 1) * 60_000, 60 * 60 * 1000);
  return new Date(Date.now() + delayMs);
}

export class QueuePersistenceService {
  static async createJob(db: QueueDbClient, input: QueueCreateJobInput) {
    QueueRegistryService.assertRegistered(input.provider, input.jobType);
    await assertTenant(db, input.tenantId ?? null);

    return db.externalJobQueue.create({
      data: {
        tenantId: input.tenantId ?? null,
        provider: input.provider,
        jobType: input.jobType,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        status: 'PENDING',
        payload: input.payload,
        attempts: 0,
        maxAttempts: input.maxAttempts ?? 5,
        lastError: null,
        nextRetryAt: null,
        processedAt: null,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  static async getJob(
    db: QueueDbClient,
    params: {
      jobId: string;
      tenantId?: string | null;
    },
  ) {
    const job = await db.externalJobQueue.findFirst({
      where: {
        id: params.jobId,
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!job) {
      throw Object.assign(new Error('Queue job not found'), {
        statusCode: 404,
        code: 'QUEUE_JOB_NOT_FOUND',
      });
    }

    return job;
  }

  static async searchJobs(
    db: QueueDbClient,
    params: {
      tenantId?: string | null;
      filters?: QueueSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const where = buildWhere({
      tenantId: params.tenantId ?? null,
      filters: params.filters ?? null,
    });

    const [data, total] = await Promise.all([
      db.externalJobQueue.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.externalJobQueue.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async markProcessing(
    db: QueueDbClient,
    params: {
      jobId: string;
      tenantId?: string | null;
    },
  ) {
    const job = await this.getJob(db, params);

    if (!['PENDING', 'RETRYING', 'FAILED'].includes(job.status)) {
      throw Object.assign(new Error(`Queue job cannot be processed from status ${job.status}`), {
        statusCode: 409,
        code: 'QUEUE_JOB_PROCESSING_FORBIDDEN',
      });
    }

    return db.externalJobQueue.update({
      where: { id: params.jobId },
      data: {
        status: 'PROCESSING',
        attempts: job.attempts + 1,
        lastError: null,
        nextRetryAt: null,
      },
    });
  }

  static async markCompleted(
    db: QueueDbClient,
    params: {
      jobId: string;
      tenantId?: string | null;
      result?: Record<string, unknown> | null;
    },
  ) {
    const job = await this.getJob(db, params);

    return db.externalJobQueue.update({
      where: { id: params.jobId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        lastError: null,
        nextRetryAt: null,
        payload: {
          ...(job.payload ?? {}),
          result: params.result ?? null,
        },
      },
    });
  }

  static async markFailed(db: QueueDbClient, input: QueueMarkFailedInput) {
    const job = await this.getJob(db, {
      jobId: input.jobId,
      tenantId: input.tenantId ?? null,
    });

    const nextAttempts = job.attempts;
    const shouldRetry = input.retry !== false && nextAttempts < job.maxAttempts;
    const nextStatus = shouldRetry ? 'RETRYING' : 'DEAD_LETTER';

    return db.externalJobQueue.update({
      where: { id: input.jobId },
      data: {
        status: nextStatus,
        lastError: input.error,
        nextRetryAt: shouldRetry ? nextRetryDate(nextAttempts) : null,
        processedAt: shouldRetry ? null : new Date(),
      },
    });
  }

  static async retryJob(
    db: QueueDbClient,
    params: {
      jobId: string;
      tenantId?: string | null;
    },
  ) {
    const job = await this.getJob(db, params);

    if (!['FAILED', 'RETRYING', 'DEAD_LETTER'].includes(job.status)) {
      throw Object.assign(new Error(`Queue job cannot be retried from status ${job.status}`), {
        statusCode: 409,
        code: 'QUEUE_JOB_RETRY_FORBIDDEN',
      });
    }

    return db.externalJobQueue.update({
      where: { id: params.jobId },
      data: {
        status: 'PENDING',
        lastError: null,
        nextRetryAt: null,
        processedAt: null,
      },
    });
  }
}

export default QueuePersistenceService;