// apps/api/src/modules/platform/PlatformQueueOpsService.ts

import type { PlatformDbClient } from './platform.types';

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export class PlatformQueueOpsService {
  static async searchJobs(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);

    const where = {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.provider ? { provider: params.provider } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.entityId ? { entityId: params.entityId } : {}),
    };

    const [data, total] = await Promise.all([
      db.externalJobQueue.findMany({ where, orderBy: [{ createdAt: 'desc' }], skip, take: limit }),
      db.externalJobQueue.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async retryJob(db: PlatformDbClient, id: string) {
    const existing = await db.externalJobQueue.findFirst({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error('Queue job not found'), { statusCode: 404, code: 'QUEUE_JOB_NOT_FOUND' });
    }

    return db.externalJobQueue.update({
      where: { id },
      data: {
        status: 'PENDING',
        nextRetryAt: new Date(),
        lastError: null,
      },
    });
  }
}