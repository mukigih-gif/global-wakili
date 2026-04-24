// apps/api/src/modules/analytics/AnalyticsComplianceService.ts

import type { AnalyticsDbClient, AnalyticsPeriodInput } from './analytics.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for compliance analytics'), {
      statusCode: 400,
      code: 'ANALYTICS_COMPLIANCE_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid compliance analytics date'), {
      statusCode: 422,
      code: 'ANALYTICS_COMPLIANCE_DATE_INVALID',
    });
  }

  return parsed;
}

function assertDateRange(from?: Date | null, to?: Date | null): void {
  if (from && to && to.getTime() < from.getTime()) {
    throw Object.assign(
      new Error('Compliance analytics end date cannot be before start date'),
      {
        statusCode: 422,
        code: 'ANALYTICS_COMPLIANCE_PERIOD_INVALID',
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

export class AnalyticsComplianceService {
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

    const checksWindow = buildWindow('checkedAt', from, to);
    const reportsWindow = buildWindow('createdAt', from, to);

    const [
      totalChecks,
      checksByType,
      checksByRiskBand,
      totalReports,
      reportsByType,
      reportsByStatus,
      eddClients,
      rejectedReports,
      recentChecks,
      recentReports,
    ] = await Promise.all([
      db.clientComplianceCheck.count({
        where: {
          tenantId: params.tenantId,
          ...checksWindow,
        },
      }),
      db.clientComplianceCheck.groupBy
        ? db.clientComplianceCheck.groupBy({
            by: ['checkType'],
            where: {
              tenantId: params.tenantId,
              ...checksWindow,
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.clientComplianceCheck.groupBy
        ? db.clientComplianceCheck.groupBy({
            by: ['riskBand'],
            where: {
              tenantId: params.tenantId,
              riskBand: { not: null },
              ...checksWindow,
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.complianceReport.count({
        where: {
          tenantId: params.tenantId,
          ...reportsWindow,
        },
      }),
      db.complianceReport.groupBy
        ? db.complianceReport.groupBy({
            by: ['reportType'],
            where: {
              tenantId: params.tenantId,
              ...reportsWindow,
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.complianceReport.groupBy
        ? db.complianceReport.groupBy({
            by: ['status'],
            where: {
              tenantId: params.tenantId,
              ...reportsWindow,
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.client.count({
        where: {
          tenantId: params.tenantId,
          needsEnhancedDueDiligence: true,
        },
      }),
      db.complianceReport.count({
        where: {
          tenantId: params.tenantId,
          status: 'REJECTED',
          ...reportsWindow,
        },
      }),
      db.clientComplianceCheck.findMany({
        where: {
          tenantId: params.tenantId,
          ...checksWindow,
        },
        select: {
          id: true,
          clientId: true,
          checkType: true,
          status: true,
          score: true,
          riskBand: true,
          source: true,
          checkedAt: true,
        },
        orderBy: [{ checkedAt: 'desc' }],
        take: 20,
      }),
      db.complianceReport.findMany({
        where: {
          tenantId: params.tenantId,
          ...reportsWindow,
        },
        select: {
          id: true,
          reportType: true,
          status: true,
          periodStart: true,
          periodEnd: true,
          referenceNumber: true,
          submittedAt: true,
          clientId: true,
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
        totalChecks,
        totalReports,
        eddClients,
        rejectedReports,
        checksByType: checksByType.map((item: any) => ({
          checkType: item.checkType,
          count: item._count.id,
        })),
        checksByRiskBand: checksByRiskBand.map((item: any) => ({
          riskBand: item.riskBand,
          count: item._count.id,
        })),
        reportsByType: reportsByType.map((item: any) => ({
          reportType: item.reportType,
          count: item._count.id,
        })),
        reportsByStatus: reportsByStatus.map((item: any) => ({
          status: item.status,
          count: item._count.id,
        })),
      },
      recentChecks,
      recentReports,
    };
  }
}

export default AnalyticsComplianceService;