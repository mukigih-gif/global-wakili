// apps/api/src/modules/analytics/AnalyticsOperationsService.ts

import type { AnalyticsDbClient, AnalyticsPeriodInput } from './analytics.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for operations analytics'), {
      statusCode: 400,
      code: 'ANALYTICS_OPERATIONS_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid operations analytics date'), {
      statusCode: 422,
      code: 'ANALYTICS_OPERATIONS_DATE_INVALID',
    });
  }

  return parsed;
}

function assertDateRange(from?: Date | null, to?: Date | null): void {
  if (from && to && to.getTime() < from.getTime()) {
    throw Object.assign(
      new Error('Operations analytics end date cannot be before start date'),
      {
        statusCode: 422,
        code: 'ANALYTICS_OPERATIONS_PERIOD_INVALID',
      },
    );
  }
}

function buildWindow(field: string, from?: Date | null, to?: Date | null) {
  if (!from && !to) return {};
  return {
    [field]: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    },
  };
}

export class AnalyticsOperationsService {
  static async getAnalytics(
    db: AnalyticsDbClient,
    params: {
      tenantId: string;
      period?: AnalyticsPeriodInput | null;
    },
  ) {
    assertTenant(params.tenantId);

    const from = normalizeDate(params.period?.from);
    const to = normalizeDate(params.period?.to);
    assertDateRange(from, to);

    const notificationWindow = buildWindow('createdAt', from, to);
    const queueWindow = buildWindow('createdAt', from, to);
    const platformWindow = buildWindow('occurredAt', from, to);

    const [
      totalNotifications,
      notificationsByStatus,
      notificationsByChannel,
      recentFailedNotifications,
      totalQueueJobs,
      queueByStatus,
      queueByProvider,
      recentFailedOrDeadQueueJobs,
      upcomingRetries,
      platformActivityCount,
      platformActivityByModule,
      recentPlatformActivity,
    ] = await Promise.all([
      db.notification.count({
        where: {
          tenantId: params.tenantId,
          ...notificationWindow,
        },
      }),
      db.notification.groupBy
        ? db.notification.groupBy({
            by: ['status'],
            where: {
              tenantId: params.tenantId,
              ...notificationWindow,
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.notification.groupBy
        ? db.notification.groupBy({
            by: ['channel'],
            where: {
              tenantId: params.tenantId,
              ...notificationWindow,
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.notification.findMany({
        where: {
          tenantId: params.tenantId,
          status: { in: ['FAILED', 'BOUNCED'] },
          ...notificationWindow,
        },
        select: {
          id: true,
          channel: true,
          status: true,
          recipientEmail: true,
          recipientPhone: true,
          provider: true,
          providerMessageId: true,
          failedAt: true,
          createdAt: true,
        },
        orderBy: [{ failedAt: 'desc' }, { createdAt: 'desc' }],
        take: 20,
      }),
      db.externalJobQueue.count({
        where: {
          tenantId: params.tenantId,
          ...queueWindow,
        },
      }),
      db.externalJobQueue.groupBy
        ? db.externalJobQueue.groupBy({
            by: ['status'],
            where: {
              tenantId: params.tenantId,
              ...queueWindow,
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.externalJobQueue.groupBy
        ? db.externalJobQueue.groupBy({
            by: ['provider'],
            where: {
              tenantId: params.tenantId,
              ...queueWindow,
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.externalJobQueue.findMany({
        where: {
          tenantId: params.tenantId,
          status: { in: ['FAILED', 'DEAD_LETTER'] },
          ...queueWindow,
        },
        select: {
          id: true,
          provider: true,
          jobType: true,
          status: true,
          attempts: true,
          maxAttempts: true,
          lastError: true,
          nextRetryAt: true,
          processedAt: true,
          createdAt: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 20,
      }),
      db.externalJobQueue.findMany({
        where: {
          tenantId: params.tenantId,
          status: 'RETRYING',
          nextRetryAt: { not: null },
          ...queueWindow,
        },
        select: {
          id: true,
          provider: true,
          jobType: true,
          status: true,
          attempts: true,
          maxAttempts: true,
          nextRetryAt: true,
          createdAt: true,
        },
        orderBy: [{ nextRetryAt: 'asc' }],
        take: 20,
      }),
      db.platformActivityLog
        ? db.platformActivityLog.count({
            where: {
              tenantId: params.tenantId,
              ...platformWindow,
            },
          })
        : Promise.resolve(0),
      db.platformActivityLog?.groupBy
        ? db.platformActivityLog.groupBy({
            by: ['module'],
            where: {
              tenantId: params.tenantId,
              ...platformWindow,
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.platformActivityLog
        ? db.platformActivityLog.findMany({
            where: {
              tenantId: params.tenantId,
              ...platformWindow,
            },
            select: {
              id: true,
              module: true,
              action: true,
              severity: true,
              outcome: true,
              source: true,
              requestId: true,
              correlationId: true,
              occurredAt: true,
              message: true,
            },
            orderBy: [{ occurredAt: 'desc' }],
            take: 20,
          })
        : Promise.resolve([]),
    ]);

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      period: { from, to },
      summary: {
        totalNotifications,
        totalQueueJobs,
        platformActivityCount,
        notificationsByStatus: notificationsByStatus.map((item: any) => ({
          status: item.status,
          count: item._count.id,
        })),
        notificationsByChannel: notificationsByChannel.map((item: any) => ({
          channel: item.channel,
          count: item._count.id,
        })),
        queueByStatus: queueByStatus.map((item: any) => ({
          status: item.status,
          count: item._count.id,
        })),
        queueByProvider: queueByProvider.map((item: any) => ({
          provider: item.provider,
          count: item._count.id,
        })),
        platformActivityByModule: (platformActivityByModule as any[]).map((item: any) => ({
          module: item.module,
          count: item._count.id,
        })),
      },
      recentFailedNotifications,
      recentFailedOrDeadQueueJobs,
      upcomingRetries,
      recentPlatformActivity,
    };
  }
}

export default AnalyticsOperationsService;