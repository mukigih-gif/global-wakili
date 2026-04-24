// apps/api/src/modules/billing/billing.dashboard.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);

export type BillingDashboardInput = {
  tenantId: string;
  year?: number;
  month?: number;
  clientId?: string | null;
  matterId?: string | null;
};

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply Billing schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'BILLING_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate;
}

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) return ZERO;

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function periodWhere(input: BillingDashboardInput, field: string) {
  if (input.year && input.month) {
    return {
      [field]: {
        gte: new Date(input.year, input.month - 1, 1),
        lt: new Date(input.year, input.month, 1),
      },
    };
  }

  if (input.year) {
    return {
      [field]: {
        gte: new Date(input.year, 0, 1),
        lt: new Date(input.year + 1, 0, 1),
      },
    };
  }

  return {};
}

function scopeWhere(input: BillingDashboardInput) {
  return {
    tenantId: input.tenantId,
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(input.matterId ? { matterId: input.matterId } : {}),
  };
}

export class BillingDashboardService {
  async getDashboard(input: BillingDashboardInput) {
    const invoice = delegate(prisma, 'invoice');
    const proformaInvoice = delegate(prisma, 'proformaInvoice');
    const creditNote = delegate(prisma, 'creditNote');
    const retainer = delegate(prisma, 'retainer');
    const paymentReminder = delegate(prisma, 'paymentReminder');

    const baseWhere = scopeWhere(input);
    const invoiceWhere = {
      ...baseWhere,
      ...periodWhere(input, 'invoiceDate'),
    };

    const [
      invoices,
      invoiceStatusBreakdown,
      proformaStatusBreakdown,
      creditNoteCount,
      activeRetainers,
      reminderStatusBreakdown,
      recentInvoices,
      recentProformas,
      recentCreditNotes,
      overdueInvoices,
    ] = await Promise.all([
      invoice.findMany({
        where: invoiceWhere,
        select: {
          id: true,
          totalAmount: true,
          balanceDue: true,
          paidAmount: true,
          taxAmount: true,
          dueDate: true,
          status: true,
        },
      }),

      invoice.groupBy({
        by: ['status'],
        where: invoiceWhere,
        _count: { id: true },
      }),

      proformaInvoice.groupBy({
        by: ['status'],
        where: {
          ...baseWhere,
          ...periodWhere(input, 'createdAt'),
        },
        _count: { id: true },
      }),

      creditNote.count({
        where: {
          ...baseWhere,
          ...periodWhere(input, 'creditDate'),
        },
      }),

      retainer.findMany({
        where: {
          ...baseWhere,
          status: {
            in: ['ACTIVE', 'PARTIALLY_APPLIED'],
          },
        },
        select: {
          id: true,
          amount: true,
          appliedAmount: true,
          unappliedAmount: true,
          status: true,
        },
      }),

      paymentReminder.groupBy({
        by: ['status'],
        where: {
          ...baseWhere,
          ...periodWhere(input, 'createdAt'),
        },
        _count: { id: true },
      }),

      invoice.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      proformaInvoice.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      creditNote.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      invoice.findMany({
        where: {
          ...baseWhere,
          dueDate: { lt: new Date() },
          status: {
            notIn: ['PAID', 'CANCELLED', 'VOID'],
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 50,
      }),
    ]);

    const totals = invoices.reduce(
      (acc, item: any) => ({
        invoiceCount: acc.invoiceCount + 1,
        invoicedAmount: acc.invoicedAmount.plus(money(item.totalAmount)),
        paidAmount: acc.paidAmount.plus(money(item.paidAmount)),
        taxAmount: acc.taxAmount.plus(money(item.taxAmount)),
        outstandingAmount: acc.outstandingAmount.plus(money(item.balanceDue)),
      }),
      {
        invoiceCount: 0,
        invoicedAmount: ZERO,
        paidAmount: ZERO,
        taxAmount: ZERO,
        outstandingAmount: ZERO,
      },
    );

    const retainerTotals = activeRetainers.reduce(
      (acc: any, item: any) => ({
        count: acc.count + 1,
        amount: acc.amount.plus(money(item.amount)),
        appliedAmount: acc.appliedAmount.plus(money(item.appliedAmount)),
        unappliedAmount: acc.unappliedAmount.plus(money(item.unappliedAmount)),
      }),
      {
        count: 0,
        amount: ZERO,
        appliedAmount: ZERO,
        unappliedAmount: ZERO,
      },
    );

    const overdueAmount = overdueInvoices.reduce(
      (sum: Prisma.Decimal, item: any) => sum.plus(money(item.balanceDue)),
      ZERO,
    );

    return {
      tenantId: input.tenantId,
      filters: {
        year: input.year ?? null,
        month: input.month ?? null,
        clientId: input.clientId ?? null,
        matterId: input.matterId ?? null,
      },
      totals: {
        invoiceCount: totals.invoiceCount,
        invoicedAmount: totals.invoicedAmount.toDecimalPlaces(2),
        paidAmount: totals.paidAmount.toDecimalPlaces(2),
        taxAmount: totals.taxAmount.toDecimalPlaces(2),
        outstandingAmount: totals.outstandingAmount.toDecimalPlaces(2),
        overdueAmount: overdueAmount.toDecimalPlaces(2),
      },
      retainers: {
        count: retainerTotals.count,
        amount: retainerTotals.amount.toDecimalPlaces(2),
        appliedAmount: retainerTotals.appliedAmount.toDecimalPlaces(2),
        unappliedAmount: retainerTotals.unappliedAmount.toDecimalPlaces(2),
      },
      creditNotes: {
        count: creditNoteCount,
      },
      overdue: {
        count: overdueInvoices.length,
        amount: overdueAmount.toDecimalPlaces(2),
        invoices: overdueInvoices,
      },
      breakdowns: {
        invoiceStatus: invoiceStatusBreakdown,
        proformaStatus: proformaStatusBreakdown,
        reminderStatus: reminderStatusBreakdown,
      },
      recent: {
        invoices: recentInvoices,
        proformas: recentProformas,
        creditNotes: recentCreditNotes,
      },
      generatedAt: new Date(),
    };
  }
}

export const billingDashboardService = new BillingDashboardService();

export default BillingDashboardService;