// apps/api/src/modules/billing/billing.service.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);

export type BillingSnapshotInput = {
  tenantId: string;
  clientId?: string | null;
  matterId?: string | null;
  from?: Date | null;
  to?: Date | null;
};

export type BillingLedgerItemType =
  | 'INVOICE'
  | 'PROFORMA'
  | 'CREDIT_NOTE'
  | 'PAYMENT'
  | 'RETAINER'
  | 'REMINDER';

export type BillingLedgerItem = {
  id: string;
  type: BillingLedgerItemType;
  reference: string | null;
  date: Date | null;
  status: string | null;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  balanceImpact: Prisma.Decimal;
  metadata?: Record<string, unknown>;
};

export type BillingLifecycleStatus = {
  tenantId: string;
  clientId?: string | null;
  matterId?: string | null;
  totals: {
    proformaCount: number;
    invoiceCount: number;
    creditNoteCount: number;
    retainerCount: number;
    paymentCount: number;
    reminderCount: number;
    invoicedAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    creditedAmount: Prisma.Decimal;
    retainerAmount: Prisma.Decimal;
    outstandingAmount: Prisma.Decimal;
    overdueAmount: Prisma.Decimal;
  };
  ledger: BillingLedgerItem[];
  generatedAt: Date;
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

  if (!parsed.isFinite()) {
    throw Object.assign(new Error('Invalid decimal value'), {
      statusCode: 422,
      code: 'INVALID_DECIMAL_VALUE',
    });
  }

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function periodWhere(input: BillingSnapshotInput, field = 'createdAt') {
  if (!input.from && !input.to) return {};

  return {
    [field]: {
      ...(input.from ? { gte: input.from } : {}),
      ...(input.to ? { lte: input.to } : {}),
    },
  };
}

function scopeWhere(input: BillingSnapshotInput) {
  return {
    tenantId: input.tenantId,
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(input.matterId ? { matterId: input.matterId } : {}),
  };
}

function sortLedger(a: BillingLedgerItem, b: BillingLedgerItem) {
  const aDate = a.date ? new Date(a.date).getTime() : 0;
  const bDate = b.date ? new Date(b.date).getTime() : 0;

  if (aDate === bDate) {
    return String(a.reference ?? '').localeCompare(String(b.reference ?? ''));
  }

  return aDate - bDate;
}

export class BillingService {
  async getBillingSnapshot(input: BillingSnapshotInput): Promise<BillingLifecycleStatus> {
    const invoice = delegate(prisma, 'invoice');
    const proformaInvoice = delegate(prisma, 'proformaInvoice');
    const creditNote = delegate(prisma, 'creditNote');
    const paymentReceipt = delegate(prisma, 'paymentReceipt');
    const retainer = delegate(prisma, 'retainer');
    const paymentReminder = delegate(prisma, 'paymentReminder');

    const baseWhere = scopeWhere(input);

    const [
      invoices,
      proformas,
      creditNotes,
      payments,
      retainers,
      reminders,
    ] = await Promise.all([
      invoice.findMany({
        where: {
          ...baseWhere,
          ...periodWhere(input, 'invoiceDate'),
        },
        orderBy: { createdAt: 'asc' },
      }),
      proformaInvoice.findMany({
        where: {
          ...baseWhere,
          ...periodWhere(input, 'createdAt'),
        },
        orderBy: { createdAt: 'asc' },
      }),
      creditNote.findMany({
        where: {
          ...baseWhere,
          ...periodWhere(input, 'creditDate'),
        },
        orderBy: { createdAt: 'asc' },
      }),
      paymentReceipt.findMany({
        where: {
          ...baseWhere,
          ...periodWhere(input, 'receiptDate'),
        },
        orderBy: { createdAt: 'asc' },
      }),
      retainer.findMany({
        where: {
          ...baseWhere,
          ...periodWhere(input, 'createdAt'),
        },
        orderBy: { createdAt: 'asc' },
      }),
      paymentReminder.findMany({
        where: {
          ...baseWhere,
          ...periodWhere(input, 'createdAt'),
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const ledger: BillingLedgerItem[] = [
      ...proformas.map((item: any) => ({
        id: item.id,
        type: 'PROFORMA' as const,
        reference: item.proformaNumber ?? item.reference ?? null,
        date: item.issueDate ?? item.createdAt ?? null,
        status: item.status ?? null,
        debit: ZERO,
        credit: ZERO,
        balanceImpact: ZERO,
        metadata: { source: 'PROFORMA' },
      })),
      ...invoices.map((item: any) => {
        const amount = money(item.totalAmount ?? item.grandTotal ?? item.amount ?? 0);

        return {
          id: item.id,
          type: 'INVOICE' as const,
          reference: item.invoiceNumber ?? item.reference ?? null,
          date: item.invoiceDate ?? item.issueDate ?? item.createdAt ?? null,
          status: item.status ?? null,
          debit: amount,
          credit: ZERO,
          balanceImpact: amount,
          metadata: { source: 'INVOICE' },
        };
      }),
      ...creditNotes.map((item: any) => {
        const amount = money(item.totalAmount ?? item.amount ?? 0);

        return {
          id: item.id,
          type: 'CREDIT_NOTE' as const,
          reference: item.creditNoteNumber ?? item.reference ?? null,
          date: item.creditDate ?? item.createdAt ?? null,
          status: item.status ?? null,
          debit: ZERO,
          credit: amount,
          balanceImpact: amount.mul(-1),
          metadata: { source: 'CREDIT_NOTE' },
        };
      }),
      ...payments.map((item: any) => {
        const amount = money(item.amount ?? item.totalAmount ?? 0);

        return {
          id: item.id,
          type: 'PAYMENT' as const,
          reference: item.receiptNumber ?? item.reference ?? null,
          date: item.receiptDate ?? item.paymentDate ?? item.createdAt ?? null,
          status: item.status ?? null,
          debit: ZERO,
          credit: amount,
          balanceImpact: amount.mul(-1),
          metadata: { source: 'PAYMENT_RECEIPT' },
        };
      }),
      ...retainers.map((item: any) => {
        const amount = money(item.amount ?? item.totalAmount ?? 0);

        return {
          id: item.id,
          type: 'RETAINER' as const,
          reference: item.retainerNumber ?? item.reference ?? null,
          date: item.receivedAt ?? item.createdAt ?? null,
          status: item.status ?? null,
          debit: ZERO,
          credit: amount,
          balanceImpact: amount.mul(-1),
          metadata: { source: 'RETAINER' },
        };
      }),
      ...reminders.map((item: any) => ({
        id: item.id,
        type: 'REMINDER' as const,
        reference: item.reminderNumber ?? item.reference ?? null,
        date: item.sentAt ?? item.createdAt ?? null,
        status: item.status ?? null,
        debit: ZERO,
        credit: ZERO,
        balanceImpact: ZERO,
        metadata: { source: 'PAYMENT_REMINDER' },
      })),
    ].sort(sortLedger);

    const invoicedAmount = invoices.reduce(
      (sum: Prisma.Decimal, item: any) => sum.plus(money(item.totalAmount ?? item.grandTotal ?? item.amount)),
      ZERO,
    );

    const paidAmount = payments.reduce(
      (sum: Prisma.Decimal, item: any) => sum.plus(money(item.amount ?? item.totalAmount)),
      ZERO,
    );

    const creditedAmount = creditNotes.reduce(
      (sum: Prisma.Decimal, item: any) => sum.plus(money(item.totalAmount ?? item.amount)),
      ZERO,
    );

    const retainerAmount = retainers.reduce(
      (sum: Prisma.Decimal, item: any) => sum.plus(money(item.amount ?? item.totalAmount)),
      ZERO,
    );

    const outstandingAmount = invoices.reduce(
      (sum: Prisma.Decimal, item: any) => sum.plus(money(item.balanceDue ?? item.outstandingAmount ?? 0)),
      ZERO,
    );

    const now = new Date();

    const overdueAmount = invoices.reduce((sum: Prisma.Decimal, item: any) => {
      const dueDate = item.dueDate ? new Date(item.dueDate) : null;

      if (!dueDate || dueDate >= now) return sum;

      if (['PAID', 'CANCELLED', 'VOID'].includes(String(item.status ?? '').toUpperCase())) {
        return sum;
      }

      return sum.plus(money(item.balanceDue ?? item.outstandingAmount ?? 0));
    }, ZERO);

    return {
      tenantId: input.tenantId,
      clientId: input.clientId ?? null,
      matterId: input.matterId ?? null,
      totals: {
        proformaCount: proformas.length,
        invoiceCount: invoices.length,
        creditNoteCount: creditNotes.length,
        retainerCount: retainers.length,
        paymentCount: payments.length,
        reminderCount: reminders.length,
        invoicedAmount: invoicedAmount.toDecimalPlaces(2),
        paidAmount: paidAmount.toDecimalPlaces(2),
        creditedAmount: creditedAmount.toDecimalPlaces(2),
        retainerAmount: retainerAmount.toDecimalPlaces(2),
        outstandingAmount: outstandingAmount.toDecimalPlaces(2),
        overdueAmount: overdueAmount.toDecimalPlaces(2),
      },
      ledger,
      generatedAt: new Date(),
    };
  }

  async assertClientAndMatterScope(input: {
    tx?: Prisma.TransactionClient;
    tenantId: string;
    clientId?: string | null;
    matterId?: string | null;
  }) {
    const db = input.tx ?? prisma;

    if (input.clientId) {
      const client = await delegate(db, 'client').findFirst({
        where: {
          id: input.clientId,
          tenantId: input.tenantId,
        },
        select: { id: true },
      });

      if (!client) {
        throw Object.assign(new Error('Client not found for billing'), {
          statusCode: 404,
          code: 'BILLING_CLIENT_NOT_FOUND',
        });
      }
    }

    if (input.matterId) {
      const matter = await delegate(db, 'matter').findFirst({
        where: {
          id: input.matterId,
          tenantId: input.tenantId,
          ...(input.clientId ? { clientId: input.clientId } : {}),
        },
        select: { id: true, clientId: true },
      });

      if (!matter) {
        throw Object.assign(new Error('Matter not found for billing'), {
          statusCode: 404,
          code: 'BILLING_MATTER_NOT_FOUND',
        });
      }

      return matter;
    }

    return null;
  }

  generateBillingReference(prefix: string, tenantId: string): string {
    const tenantToken = tenantId.slice(-6).toUpperCase();
    const timestamp = Date.now().toString();

    return `${prefix}-${tenantToken}-${timestamp}`;
  }
}

export const billingService = new BillingService();

export default BillingService;