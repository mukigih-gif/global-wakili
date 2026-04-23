// apps/api/src/modules/analytics/AnalyticsMatterService.ts

import type { AnalyticsDbClient, AnalyticsPeriodInput } from './analytics.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for matter analytics'), {
      statusCode: 400,
      code: 'ANALYTICS_MATTER_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid matter analytics date'), {
      statusCode: 422,
      code: 'ANALYTICS_MATTER_DATE_INVALID',
    });
  }

  return parsed;
}

function assertDateRange(from?: Date | null, to?: Date | null): void {
  if (from && to && to.getTime() < from.getTime()) {
    throw Object.assign(new Error('Matter analytics end date cannot be before start date'), {
      statusCode: 422,
      code: 'ANALYTICS_MATTER_PERIOD_INVALID',
    });
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

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class AnalyticsMatterService {
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

    const createdWindow = buildWindow('createdAt', from, to);
    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalMatters,
      byStatus,
      recentMatters,
      closingSoonMatters,
      archivedMatters,
      matterAmounts,
    ] = await Promise.all([
      db.matter.count({
        where: {
          tenantId: params.tenantId,
          ...createdWindow,
        },
      }),
      db.matter.groupBy
        ? db.matter.groupBy({
            by: ['status'],
            where: { tenantId: params.tenantId },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.matter.findMany({
        where: {
          tenantId: params.tenantId,
          ...createdWindow,
        },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          riskLevel: true,
          trustBalance: true,
          wipValue: true,
          statuteOfLimitationsDate: true,
          openedDate: true,
          closedDate: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 20,
      }),
      db.matter.findMany({
        where: {
          tenantId: params.tenantId,
          statuteOfLimitationsDate: {
            gte: now,
            lte: next30Days,
          },
          status: { in: ['ACTIVE', 'ON_HOLD'] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          statuteOfLimitationsDate: true,
          trustBalance: true,
          wipValue: true,
        },
        orderBy: [{ statuteOfLimitationsDate: 'asc' }],
        take: 20,
      }),
      db.matter.count({
        where: {
          tenantId: params.tenantId,
          status: { in: ['ARCHIVED', 'CLOSED', 'COMPLETED'] },
        },
      }),
      db.matter.findMany({
        where: {
          tenantId: params.tenantId,
        },
        select: {
          trustBalance: true,
          wipValue: true,
        },
      }),
    ]);

    const aggregates = matterAmounts.reduce(
      (acc, item) => {
        acc.totalTrustBalance += toNumber(item.trustBalance);
        acc.totalWipValue += toNumber(item.wipValue);
        return acc;
      },
      {
        totalTrustBalance: 0,
        totalWipValue: 0,
      },
    );

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      period: { from, to },
      summary: {
        totalMatters,
        archivedOrClosedMatters: archivedMatters,
        totalTrustBalance: aggregates.totalTrustBalance,
        totalWipValue: aggregates.totalWipValue,
        byStatus: byStatus.map((item: any) => ({
          status: item.status,
          count: item._count.id,
        })),
      },
      recentMatters,
      closingSoonMatters,
    };
  }
}

export default AnalyticsMatterService;