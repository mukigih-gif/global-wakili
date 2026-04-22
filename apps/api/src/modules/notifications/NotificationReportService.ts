// apps/api/src/modules/notifications/NotificationReportService.ts

import type { NotificationDbClient, NotificationSearchFilters } from './notification.types';

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid notification date'), {
      statusCode: 422,
      code: 'NOTIFICATION_DATE_INVALID',
    });
  }

  return parsed;
}

function buildWhere(params: {
  tenantId: string;
  query?: string | null;
  filters?: NotificationSearchFilters | null;
}) {
  const filters = params.filters ?? {};
  const andClauses: Record<string, unknown>[] = [];

  if (params.query?.trim()) {
    const query = params.query.trim();

    andClauses.push({
      OR: [
        { systemTitle: { contains: query, mode: 'insensitive' } },
        { systemMessage: { contains: query, mode: 'insensitive' } },
        { emailSubject: { contains: query, mode: 'insensitive' } },
        { emailBody: { contains: query, mode: 'insensitive' } },
        { smsContent: { contains: query, mode: 'insensitive' } },
        { recipientEmail: { contains: query, mode: 'insensitive' } },
        { recipientName: { contains: query, mode: 'insensitive' } },
        { templateKey: { contains: query, mode: 'insensitive' } },
      ],
    });
  }

  if (filters.userId) andClauses.push({ userId: filters.userId });
  if (filters.channel) andClauses.push({ channel: filters.channel });
  if (filters.status) andClauses.push({ status: filters.status });
  if (filters.category) andClauses.push({ category: filters.category });
  if (filters.priority) andClauses.push({ priority: filters.priority });
  if (filters.entityType) andClauses.push({ entityType: filters.entityType });
  if (filters.entityId) andClauses.push({ entityId: filters.entityId });

  const createdFrom = normalizeDate(filters.createdFrom);
  const createdTo = normalizeDate(filters.createdTo);

  if (createdFrom || createdTo) {
    andClauses.push({
      createdAt: {
        ...(createdFrom ? { gte: createdFrom } : {}),
        ...(createdTo ? { lte: createdTo } : {}),
      },
    });
  }

  return {
    tenantId: params.tenantId,
    ...(andClauses.length ? { AND: andClauses } : {}),
  };
}

export class NotificationReportService {
  static async search(
    db: NotificationDbClient,
    params: {
      tenantId: string;
      query?: string | null;
      filters?: NotificationSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const where = buildWhere({
      tenantId: params.tenantId,
      query: params.query,
      filters: params.filters,
    });

    const [data, total] = await Promise.all([
      db.notification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query: params.query?.trim() ?? '',
      },
    };
  }

  static async getSummary(
    db: NotificationDbClient,
    params: {
      tenantId: string;
      from?: Date | string | null;
      to?: Date | string | null;
    },
  ) {
    const filters: NotificationSearchFilters = {
      createdFrom: params.from ?? null,
      createdTo: params.to ?? null,
    };

    const where = buildWhere({
      tenantId: params.tenantId,
      filters,
    });

    const [total, byChannel, byStatus, failures] = await Promise.all([
      db.notification.count({ where }),
      db.notification.groupBy
        ? db.notification.groupBy({
            by: ['channel'],
            where,
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.notification.groupBy
        ? db.notification.groupBy({
            by: ['status'],
            where,
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.notification.findMany({
        where: {
          ...where,
          status: 'FAILED',
        },
        orderBy: [{ failedAt: 'desc' }, { createdAt: 'desc' }],
        take: 20,
      }),
    ]);

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      deliveryOrder: ['SYSTEM_ALERT', 'EMAIL', 'SMS'],
      summary: {
        total,
        byChannel: byChannel.map((item: any) => ({
          channel: item.channel,
          count: item._count.id,
        })),
        byStatus: byStatus.map((item: any) => ({
          status: item.status,
          count: item._count.id,
        })),
      },
      failures,
    };
  }
}

export default NotificationReportService;