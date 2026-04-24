// apps/api/src/modules/analytics/AnalyticsTrustService.ts

import type { AnalyticsDbClient, AnalyticsPeriodInput } from './analytics.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for trust analytics'), {
      statusCode: 400,
      code: 'ANALYTICS_TRUST_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid trust analytics date'), {
      statusCode: 422,
      code: 'ANALYTICS_TRUST_DATE_INVALID',
    });
  }

  return parsed;
}

function assertDateRange(from?: Date | null, to?: Date | null): void {
  if (from && to && to.getTime() < from.getTime()) {
    throw Object.assign(new Error('Trust analytics end date cannot be before start date'), {
      statusCode: 422,
      code: 'ANALYTICS_TRUST_PERIOD_INVALID',
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

export class AnalyticsTrustService {
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

    const transactionWindow = buildWindow('transactionDate', from, to);

    const [
      totalTransactions,
      reconciledCount,
      unreconciledCount,
      byTransactionType,
      trustSums,
      recentTransactions,
    ] = await Promise.all([
      db.trustTransaction.count({
        where: {
          tenantId: params.tenantId,
          ...transactionWindow,
        },
      }),
      db.trustTransaction.count({
        where: {
          tenantId: params.tenantId,
          isReconciled: true,
          ...transactionWindow,
        },
      }),
      db.trustTransaction.count({
        where: {
          tenantId: params.tenantId,
          isReconciled: false,
          ...transactionWindow,
        },
      }),
      db.trustTransaction.groupBy
        ? db.trustTransaction.groupBy({
            by: ['transactionType'],
            where: {
              tenantId: params.tenantId,
              ...transactionWindow,
            },
            _count: { id: true },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      db.trustTransaction.aggregate
        ? db.trustTransaction.aggregate({
            where: {
              tenantId: params.tenantId,
              ...transactionWindow,
            },
            _sum: {
              amount: true,
              debit: true,
              credit: true,
            },
          })
        : Promise.resolve(null),
      db.trustTransaction.findMany({
        where: {
          tenantId: params.tenantId,
          ...transactionWindow,
        },
        select: {
          id: true,
          reference: true,
          description: true,
          transactionType: true,
          amount: true,
          debit: true,
          credit: true,
          transactionDate: true,
          isReconciled: true,
          matterId: true,
          clientId: true,
        },
        orderBy: [{ transactionDate: 'desc' }],
        take: 20,
      }),
    ]);

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      period: { from, to },
      summary: {
        totalTransactions,
        reconciledCount,
        unreconciledCount,
        totalAmount: toNumber(trustSums?._sum?.amount),
        totalDebit: toNumber(trustSums?._sum?.debit),
        totalCredit: toNumber(trustSums?._sum?.credit),
        byTransactionType: byTransactionType.map((item: any) => ({
          transactionType: item.transactionType,
          count: item._count.id,
          amount: toNumber(item._sum?.amount),
        })),
      },
      recentTransactions,
    };
  }
}

export default AnalyticsTrustService;