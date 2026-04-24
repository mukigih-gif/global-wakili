// apps/api/src/modules/analytics/AnalyticsBillingService.ts

import type { AnalyticsDbClient, AnalyticsPeriodInput } from './analytics.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for billing analytics'), {
      statusCode: 400,
      code: 'ANALYTICS_BILLING_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid billing analytics date'), {
      statusCode: 422,
      code: 'ANALYTICS_BILLING_DATE_INVALID',
    });
  }

  return parsed;
}

function assertDateRange(from?: Date | null, to?: Date | null): void {
  if (from && to && to.getTime() < from.getTime()) {
    throw Object.assign(new Error('Billing analytics end date cannot be before start date'), {
      statusCode: 422,
      code: 'ANALYTICS_BILLING_PERIOD_INVALID',
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

export class AnalyticsBillingService {
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

    const issuedWindow = buildWindow('issuedDate', from, to);
    const now = new Date();

    const [
      totalInvoices,
      byStatus,
      invoiceSums,
      overdueInvoices,
      etimsValidatedCount,
      etimsRejectedCount,
      recentInvoices,
    ] = await Promise.all([
      db.invoice.count({
        where: {
          tenantId: params.tenantId,
          ...issuedWindow,
        },
      }),
      db.invoice.groupBy
        ? db.invoice.groupBy({
            by: ['status'],
            where: { tenantId: params.tenantId },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.invoice.aggregate
        ? db.invoice.aggregate({
            where: {
              tenantId: params.tenantId,
              ...issuedWindow,
            },
            _sum: {
              total: true,
              subTotal: true,
              taxAmount: true,
              vatAmount: true,
              whtAmount: true,
              balanceDue: true,
              paidAmount: true,
            },
          })
        : Promise.resolve(null),
      db.invoice.findMany({
        where: {
          tenantId: params.tenantId,
          dueDate: { lt: now },
          balanceDue: { gt: 0 },
          status: { in: ['INVOICED', 'PARTIALLY_PAID'] },
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          balanceDue: true,
          issuedDate: true,
          dueDate: true,
          etimsValidated: true,
          etimsStatus: true,
        },
        orderBy: [{ dueDate: 'asc' }],
        take: 20,
      }),
      db.invoice.count({
        where: {
          tenantId: params.tenantId,
          etimsValidated: true,
        },
      }),
      db.invoice.count({
        where: {
          tenantId: params.tenantId,
          status: 'ETIMS_REJECTED',
        },
      }),
      db.invoice.findMany({
        where: {
          tenantId: params.tenantId,
          ...issuedWindow,
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          balanceDue: true,
          paidAmount: true,
          vatAmount: true,
          whtAmount: true,
          issuedDate: true,
          dueDate: true,
          etimsValidated: true,
          etimsStatus: true,
        },
        orderBy: [{ issuedDate: 'desc' }],
        take: 20,
      }),
    ]);

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      period: { from, to },
      summary: {
        totalInvoices,
        byStatus: byStatus.map((item: any) => ({
          status: item.status,
          count: item._count.id,
        })),
        totalAmount: toNumber(invoiceSums?._sum?.total),
        subTotalAmount: toNumber(invoiceSums?._sum?.subTotal),
        taxAmount: toNumber(invoiceSums?._sum?.taxAmount),
        vatAmount: toNumber(invoiceSums?._sum?.vatAmount),
        whtAmount: toNumber(invoiceSums?._sum?.whtAmount),
        outstandingAmount: toNumber(invoiceSums?._sum?.balanceDue),
        collectedAmount: toNumber(invoiceSums?._sum?.paidAmount),
        overdueInvoiceCount: overdueInvoices.length,
        etimsValidatedCount,
        etimsRejectedCount,
      },
      overdueInvoices,
      recentInvoices,
    };
  }
}

export default AnalyticsBillingService;