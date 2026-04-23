// apps/api/src/modules/analytics/AnalyticsOverviewService.ts

import type { AnalyticsDbClient, AnalyticsPeriodInput } from './analytics.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for analytics overview'), {
      statusCode: 400,
      code: 'ANALYTICS_OVERVIEW_TENANT_REQUIRED',
    });
  }
}

async function assertTenantExists(
  db: AnalyticsDbClient,
  tenantId: string,
): Promise<void> {
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId },
    select: { id: true },
  });

  if (!tenant) {
    throw Object.assign(new Error('Tenant not found for analytics overview'), {
      statusCode: 404,
      code: 'ANALYTICS_OVERVIEW_TENANT_NOT_FOUND',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid analytics overview date'), {
      statusCode: 422,
      code: 'ANALYTICS_OVERVIEW_DATE_INVALID',
    });
  }

  return parsed;
}

function assertDateRange(from?: Date | null, to?: Date | null): void {
  if (from && to && to.getTime() < from.getTime()) {
    throw Object.assign(
      new Error('Analytics overview end date cannot be before start date'),
      {
        statusCode: 422,
        code: 'ANALYTICS_OVERVIEW_PERIOD_INVALID',
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

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class AnalyticsOverviewService {
  static async getOverview(
    db: AnalyticsDbClient,
    params: {
      tenantId: string;
      period?: AnalyticsPeriodInput | null;
    },
  ) {
    assertTenant(params.tenantId);
    await assertTenantExists(db, params.tenantId);

    const from = normalizeDate(params.period?.from);
    const to = normalizeDate(params.period?.to);
    assertDateRange(from, to);

    const clientWindow = buildWindow('createdAt', from, to);
    const matterWindow = buildWindow('createdAt', from, to);
    const invoiceWindow = buildWindow('issuedDate', from, to);
    const trustWindow = buildWindow('transactionDate', from, to);
    const complianceWindow = buildWindow('createdAt', from, to);
    const queueWindow = buildWindow('createdAt', from, to);
    const notificationWindow = buildWindow('createdAt', from, to);
    const platformWindow = buildWindow('occurredAt', from, to);

    const [
      totalClients,
      activeClients,
      highRiskClients,
      totalMatters,
      activeMatters,
      invoiceCount,
      openInvoiceCount,
      paidInvoiceCount,
      invoiceTotals,
      trustTotals,
      unreconciledTrustTransactions,
      complianceReportsPending,
      failedNotifications,
      queuedJobsBacklog,
      deadLetterJobs,
      platformActivityCount,
    ] = await Promise.all([
      db.client.count({
        where: {
          tenantId: params.tenantId,
          ...clientWindow,
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
          riskBand: { in: ['HIGH', 'CRITICAL'] },
        },
      }),
      db.matter.count({
        where: {
          tenantId: params.tenantId,
          ...matterWindow,
        },
      }),
      db.matter.count({
        where: {
          tenantId: params.tenantId,
          status: 'ACTIVE',
        },
      }),
      db.invoice.count({
        where: {
          tenantId: params.tenantId,
          ...invoiceWindow,
        },
      }),
      db.invoice.count({
        where: {
          tenantId: params.tenantId,
          status: { in: ['INVOICED', 'PARTIALLY_PAID'] },
        },
      }),
      db.invoice.count({
        where: {
          tenantId: params.tenantId,
          status: 'PAID',
        },
      }),
      db.invoice.aggregate
        ? db.invoice.aggregate({
            where: {
              tenantId: params.tenantId,
              ...invoiceWindow,
            },
            _sum: {
              total: true,
              balanceDue: true,
              paidAmount: true,
              vatAmount: true,
              whtAmount: true,
            },
          })
        : Promise.resolve(null),
      db.trustTransaction.aggregate
        ? db.trustTransaction.aggregate({
            where: {
              tenantId: params.tenantId,
              ...trustWindow,
            },
            _sum: {
              amount: true,
              debit: true,
              credit: true,
            },
          })
        : Promise.resolve(null),
      db.trustTransaction.count({
        where: {
          tenantId: params.tenantId,
          isReconciled: false,
        },
      }),
      db.complianceReport.count({
        where: {
          tenantId: params.tenantId,
          status: { in: ['DRAFT', 'PENDING_REVIEW'] },
          ...complianceWindow,
        },
      }),
      db.notification.count({
        where: {
          tenantId: params.tenantId,
          status: { in: ['FAILED', 'BOUNCED'] },
          ...notificationWindow,
        },
      }),
      db.externalJobQueue.count({
        where: {
          tenantId: params.tenantId,
          status: { in: ['PENDING', 'PROCESSING', 'RETRYING'] },
          ...queueWindow,
        },
      }),
      db.externalJobQueue.count({
        where: {
          tenantId: params.tenantId,
          status: 'DEAD_LETTER',
          ...queueWindow,
        },
      }),
      db.platformActivityLog
        ? db.platformActivityLog.count({
            where: {
              tenantId: params.tenantId,
              ...platformWindow,
            },
          })
        : Promise.resolve(0),
    ]);

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      period: { from, to },
      summary: {
        totalClients,
        activeClients,
        highRiskClients,
        totalMatters,
        activeMatters,
        invoiceCount,
        openInvoiceCount,
        paidInvoiceCount,
        invoicedAmount: toNumber(invoiceTotals?._sum?.total),
        outstandingAmount: toNumber(invoiceTotals?._sum?.balanceDue),
        collectedAmount: toNumber(invoiceTotals?._sum?.paidAmount),
        vatAmount: toNumber(invoiceTotals?._sum?.vatAmount),
        whtAmount: toNumber(invoiceTotals?._sum?.whtAmount),
        trustMovementAmount: toNumber(trustTotals?._sum?.amount),
        trustDebitAmount: toNumber(trustTotals?._sum?.debit),
        trustCreditAmount: toNumber(trustTotals?._sum?.credit),
        unreconciledTrustTransactions,
        complianceReportsPending,
        failedNotifications,
        queuedJobsBacklog,
        deadLetterJobs,
        platformActivityCount,
      },
    };
  }

  static async getKpis(
    db: AnalyticsDbClient,
    params: {
      tenantId: string;
      period?: AnalyticsPeriodInput | null;
    },
  ) {
    const overview = await this.getOverview(db, params);

    return {
      tenantId: params.tenantId,
      generatedAt: new Date(),
      period: overview.period,
      kpis: [
        {
          key: 'clients.total',
          label: 'Total Clients',
          module: 'CLIENT',
          value: overview.summary.totalClients,
          valueType: 'COUNT',
        },
        {
          key: 'matters.active',
          label: 'Active Matters',
          module: 'MATTER',
          value: overview.summary.activeMatters,
          valueType: 'COUNT',
        },
        {
          key: 'billing.invoiced_amount',
          label: 'Invoiced Amount',
          module: 'BILLING',
          value: overview.summary.invoicedAmount,
          valueType: 'MONEY',
          unit: 'KES',
        },
        {
          key: 'billing.outstanding_amount',
          label: 'Outstanding Amount',
          module: 'BILLING',
          value: overview.summary.outstandingAmount,
          valueType: 'MONEY',
          unit: 'KES',
        },
        {
          key: 'trust.unreconciled_count',
          label: 'Unreconciled Trust Transactions',
          module: 'TRUST',
          value: overview.summary.unreconciledTrustTransactions,
          valueType: 'COUNT',
        },
        {
          key: 'compliance.pending_reports',
          label: 'Pending Compliance Reports',
          module: 'COMPLIANCE',
          value: overview.summary.complianceReportsPending,
          valueType: 'COUNT',
        },
        {
          key: 'notifications.failed',
          label: 'Failed Notifications',
          module: 'NOTIFICATIONS',
          value: overview.summary.failedNotifications,
          valueType: 'COUNT',
        },
        {
          key: 'queues.backlog',
          label: 'Queue Backlog',
          module: 'QUEUES',
          value: overview.summary.queuedJobsBacklog,
          valueType: 'COUNT',
        },
      ],
    };
  }
}

export default AnalyticsOverviewService;