// apps/api/src/modules/analytics/AnalyticsClientService.ts

import type { AnalyticsDbClient, AnalyticsPeriodInput } from './analytics.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for client analytics'), {
      statusCode: 400,
      code: 'ANALYTICS_CLIENT_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid client analytics date'), {
      statusCode: 422,
      code: 'ANALYTICS_CLIENT_DATE_INVALID',
    });
  }

  return parsed;
}

function assertDateRange(from?: Date | null, to?: Date | null): void {
  if (from && to && to.getTime() < from.getTime()) {
    throw Object.assign(new Error('Client analytics end date cannot be before start date'), {
      statusCode: 422,
      code: 'ANALYTICS_CLIENT_PERIOD_INVALID',
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

export class AnalyticsClientService {
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

    const [
      totalClients,
      activeClients,
      inactiveClients,
      eddClients,
      completedOnboardingClients,
      byType,
      byKycStatus,
      byPepStatus,
      bySanctionsStatus,
      byRiskBand,
      highRiskClients,
      recentClients,
    ] = await Promise.all([
      db.client.count({
        where: {
          tenantId: params.tenantId,
          ...createdWindow,
        },
      }),
      db.client.count({
        where: {
          tenantId: params.tenantId,
          status: 'ACTIVE',
        },
      }),
      db.client.count({
        where: {
          tenantId: params.tenantId,
          status: { not: 'ACTIVE' },
        },
      }),
      db.client.count({
        where: {
          tenantId: params.tenantId,
          needsEnhancedDueDiligence: true,
        },
      }),
      db.client.count({
        where: {
          tenantId: params.tenantId,
          onboardingCompletedAt: { not: null },
        },
      }),
      db.client.groupBy
        ? db.client.groupBy({
            by: ['type'],
            where: { tenantId: params.tenantId },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.client.groupBy
        ? db.client.groupBy({
            by: ['kycStatus'],
            where: { tenantId: params.tenantId },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.client.groupBy
        ? db.client.groupBy({
            by: ['pepStatus'],
            where: { tenantId: params.tenantId },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.client.groupBy
        ? db.client.groupBy({
            by: ['sanctionsStatus'],
            where: { tenantId: params.tenantId },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.client.groupBy
        ? db.client.groupBy({
            by: ['riskBand'],
            where: { tenantId: params.tenantId },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.client.findMany({
        where: {
          tenantId: params.tenantId,
          riskBand: { in: ['HIGH', 'CRITICAL'] },
        },
        select: {
          id: true,
          clientCode: true,
          name: true,
          status: true,
          kycStatus: true,
          pepStatus: true,
          sanctionsStatus: true,
          riskScore: true,
          riskBand: true,
          needsEnhancedDueDiligence: true,
          lastKycReviewedAt: true,
          lastPepScreenedAt: true,
          lastSanctionsScreenedAt: true,
          updatedAt: true,
        },
        orderBy: [{ riskScore: 'desc' }, { updatedAt: 'desc' }],
        take: 20,
      }),
      db.client.findMany({
        where: {
          tenantId: params.tenantId,
          ...createdWindow,
        },
        select: {
          id: true,
          clientCode: true,
          name: true,
          type: true,
          status: true,
          kycStatus: true,
          riskBand: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 20,
      }),
    ]);

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      period: { from, to },
      summary: {
        totalClients,
        activeClients,
        inactiveClients,
        eddClients,
        completedOnboardingClients,
        byType: byType.map((item: any) => ({
          type: item.type,
          count: item._count.id,
        })),
        byKycStatus: byKycStatus.map((item: any) => ({
          status: item.kycStatus,
          count: item._count.id,
        })),
        byPepStatus: byPepStatus.map((item: any) => ({
          status: item.pepStatus,
          count: item._count.id,
        })),
        bySanctionsStatus: bySanctionsStatus.map((item: any) => ({
          status: item.sanctionsStatus,
          count: item._count.id,
        })),
        byRiskBand: byRiskBand.map((item: any) => ({
          riskBand: item.riskBand,
          count: item._count.id,
        })),
      },
      highRiskClients,
      recentClients,
    };
  }
}

export default AnalyticsClientService;