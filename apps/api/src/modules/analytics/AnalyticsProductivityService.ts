// apps/api/src/modules/analytics/AnalyticsProductivityService.ts

import type { AnalyticsDbClient, AnalyticsPeriodInput } from './analytics.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for productivity analytics'), {
      statusCode: 400,
      code: 'ANALYTICS_PRODUCTIVITY_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid productivity analytics date'), {
      statusCode: 422,
      code: 'ANALYTICS_PRODUCTIVITY_DATE_INVALID',
    });
  }

  return parsed;
}

function assertDateRange(from?: Date | null, to?: Date | null): void {
  if (from && to && to.getTime() < from.getTime()) {
    throw Object.assign(
      new Error('Productivity analytics end date cannot be before start date'),
      {
        statusCode: 422,
        code: 'ANALYTICS_PRODUCTIVITY_PERIOD_INVALID',
      },
    );
  }
}

export class AnalyticsProductivityService {
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

    const [
      totalTasks,
      openTasks,
      totalTimeEntries,
      totalCalendarEvents,
      totalCourtHearings,
    ] = await Promise.all([
      db.matterTask
        ? db.matterTask.count({
            where: {
              tenantId: params.tenantId,
            },
          })
        : Promise.resolve(0),
      db.matterTask
        ? db.matterTask.count({
            where: {
              tenantId: params.tenantId,
              status: {
                in: ['TODO', 'IN_PROGRESS', 'BLOCKED'],
              },
            },
          })
        : Promise.resolve(0),
      db.timeEntry
        ? db.timeEntry.count({
            where: {
              tenantId: params.tenantId,
            },
          })
        : Promise.resolve(0),
      db.calendarEvent
        ? db.calendarEvent.count({
            where: {
              tenantId: params.tenantId,
            },
          })
        : Promise.resolve(0),
      db.courtHearing
        ? db.courtHearing.count({
            where: {
              tenantId: params.tenantId,
            },
          })
        : Promise.resolve(0),
    ]);

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      period: { from, to },
      summary: {
        totalTasks,
        openTasks,
        totalTimeEntries,
        totalCalendarEvents,
        totalCourtHearings,
      },
      notes: [
        'Productivity analytics currently emphasizes safe tenant-scoped counts.',
        'Deeper workload/throughput benchmarking can expand later without conflicting with the legacy dashboards module.',
      ],
    };
  }
}

export default AnalyticsProductivityService;