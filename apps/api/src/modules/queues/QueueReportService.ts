// apps/api/src/modules/queues/QueueReportService.ts

import { QueuePersistenceService } from './QueuePersistenceService';
import type { QueueDbClient, QueueSearchFilters } from './queue.types';

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid queue report date'), {
      statusCode: 422,
      code: 'QUEUE_REPORT_DATE_INVALID',
    });
  }

  return parsed;
}

export class QueueReportService {
  static async search(
    db: QueueDbClient,
    params: {
      tenantId?: string | null;
      filters?: QueueSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    return QueuePersistenceService.searchJobs(db, params);
  }

  static async getSummary(
    db: QueueDbClient,
    params: {
      tenantId?: string | null;
      provider?: string | null;
      from?: Date | string | null;
      to?: Date | string | null;
    },
  ) {
    const from = normalizeDate(params.from);
    const to = normalizeDate(params.to);

    const andClauses: Record<string, unknown>[] = [];

    if (params.tenantId) andClauses.push({ tenantId: params.tenantId });
    if (params.provider) andClauses.push({ provider: params.provider });

    if (from || to) {
      andClauses.push({
        createdAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      });
    }

    const where = andClauses.length ? { AND: andClauses } : {};

    const [
      total,
      pending,
      processing,
      retrying,
      completed,
      failed,
      deadLetter,
      byProvider,
      byStatus,
      recentFailures,
      upcomingRetries,
    ] = await Promise.all([
      db.externalJobQueue.count({ where }),
      db.externalJobQueue.count({ where: { ...where, status: 'PENDING' } }),
      db.externalJobQueue.count({ where: { ...where, status: 'PROCESSING' } }),
      db.externalJobQueue.count({ where: { ...where, status: 'RETRYING' } }),
      db.externalJobQueue.count({ where: { ...where, status: 'COMPLETED' } }),
      db.externalJobQueue.count({ where: { ...where, status: 'FAILED' } }),
      db.externalJobQueue.count({ where: { ...where, status: 'DEAD_LETTER' } }),
      db.externalJobQueue.groupBy
        ? db.externalJobQueue.groupBy({
            by: ['provider'],
            where,
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.externalJobQueue.groupBy
        ? db.externalJobQueue.groupBy({
            by: ['status'],
            where,
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.externalJobQueue.findMany({
        where: {
          ...where,
          status: {
            in: ['FAILED', 'DEAD_LETTER'],
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 20,
      }),
      db.externalJobQueue.findMany({
        where: {
          ...where,
          status: 'RETRYING',
          nextRetryAt: {
            not: null,
          },
        },
        orderBy: [{ nextRetryAt: 'asc' }],
        take: 20,
      }),
    ]);

    return {
      generatedAt: new Date(),
      summary: {
        total,
        pending,
        processing,
        retrying,
        completed,
        failed,
        deadLetter,
        byProvider: byProvider.map((item: any) => ({
          provider: item.provider,
          count: item._count.id,
        })),
        byStatus: byStatus.map((item: any) => ({
          status: item.status,
          count: item._count.id,
        })),
      },
      recentFailures,
      upcomingRetries,
    };
  }
}

export default QueueReportService;