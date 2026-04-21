// apps/api/src/modules/finance/VATService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);

export type VatSummaryInput = {
  tenantId: string;
  year: number;
  month: number;
  actorId?: string;
};

export type VatDateRangeInput = {
  tenantId: string;
  from: Date;
  to: Date;
  actorId?: string;
};

export type VatAdjustmentInput = {
  tenantId: string;
  actorId: string;
  adjustmentDate: Date;
  type: 'OUTPUT_VAT' | 'INPUT_VAT' | 'VAT_PAYABLE' | 'VAT_REFUND' | 'OTHER';
  amount: string | number | Prisma.Decimal;
  reason: string;
  reference?: string | null;
  metadata?: Record<string, unknown>;
};

export type VatSummaryResult = {
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  outputVat: Prisma.Decimal;
  inputVat: Prisma.Decimal;
  netVatPayable: Prisma.Decimal;
  invoiceCount: number;
  vendorBillCount: number;
  adjustmentCount: number;
  adjustmentsTotal: Prisma.Decimal;
  generatedAt: Date;
};

function optionalDelegate(db: DbClient, name: string) {
  return db[name] ?? null;
}

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply Finance schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'FINANCE_SCHEMA_DELEGATE_MISSING',
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

function periodForMonth(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw Object.assign(new Error('Invalid VAT year'), {
      statusCode: 422,
      code: 'INVALID_VAT_YEAR',
    });
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw Object.assign(new Error('Invalid VAT month'), {
      statusCode: 422,
      code: 'INVALID_VAT_MONTH',
    });
  }

  return {
    periodStart: new Date(year, month - 1, 1),
    periodEnd: new Date(year, month, 1),
  };
}

function dateRangeWhere(from: Date, to: Date, field: string) {
  return {
    [field]: {
      gte: from,
      lt: to,
    },
  };
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

export class VATService {
  static async getMonthlyVatSummary(input: VatSummaryInput) {
    return new VATService().getMonthlyVatSummary(input);
  }

  static async getVatSummary(input: VatDateRangeInput) {
    return new VATService().getVatSummary(input);
  }

  async getMonthlyVatSummary(input: VatSummaryInput): Promise<VatSummaryResult> {
    const { periodStart, periodEnd } = periodForMonth(input.year, input.month);

    return this.getVatSummary({
      tenantId: input.tenantId,
      from: periodStart,
      to: periodEnd,
      actorId: input.actorId,
    });
  }

  async getVatSummary(input: VatDateRangeInput): Promise<VatSummaryResult> {
    const invoice = optionalDelegate(prisma, 'invoice');
    const vendorBill = optionalDelegate(prisma, 'vendorBill');
    const vatAdjustment = optionalDelegate(prisma, 'vatAdjustment');

    const [invoices, vendorBills, adjustments] = await Promise.all([
      invoice
        ? invoice.findMany({
            where: {
              tenantId: input.tenantId,
              ...dateRangeWhere(input.from, input.to, 'invoiceDate'),
              status: {
                notIn: ['DRAFT', 'CANCELLED', 'VOID'],
              },
            },
            select: {
              id: true,
              invoiceNumber: true,
              taxAmount: true,
              vatAmount: true,
              totalAmount: true,
              status: true,
            },
          })
        : Promise.resolve([]),

      vendorBill
        ? vendorBill.findMany({
            where: {
              tenantId: input.tenantId,
              ...dateRangeWhere(input.from, input.to, 'billDate'),
              status: {
                notIn: ['DRAFT', 'CANCELLED', 'VOID', 'REJECTED'],
              },
            },
            select: {
              id: true,
              billNumber: true,
              taxAmount: true,
              vatAmount: true,
              totalAmount: true,
              status: true,
            },
          })
        : Promise.resolve([]),

      vatAdjustment
        ? vatAdjustment.findMany({
            where: {
              tenantId: input.tenantId,
              ...dateRangeWhere(input.from, input.to, 'adjustmentDate'),
              status: {
                notIn: ['VOID', 'CANCELLED'],
              },
            },
            select: {
              id: true,
              type: true,
              amount: true,
              status: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const invoiceOutputVat = invoices.reduce(
      (sum: Prisma.Decimal, row: any) => sum.plus(money(row.taxAmount ?? row.vatAmount)),
      ZERO,
    );

    const vendorInputVat = vendorBills.reduce(
      (sum: Prisma.Decimal, row: any) => sum.plus(money(row.taxAmount ?? row.vatAmount)),
      ZERO,
    );

    const adjustmentsTotal = adjustments.reduce((sum: Prisma.Decimal, row: any) => {
      const amount = money(row.amount);
      const type = String(row.type ?? '').toUpperCase();

      if (type === 'INPUT_VAT' || type === 'VAT_REFUND') return sum.minus(amount);
      return sum.plus(amount);
    }, ZERO);

    const netVatPayable = invoiceOutputVat.minus(vendorInputVat).plus(adjustmentsTotal);

    return {
      tenantId: input.tenantId,
      periodStart: input.from,
      periodEnd: input.to,
      outputVat: invoiceOutputVat.toDecimalPlaces(2),
      inputVat: vendorInputVat.toDecimalPlaces(2),
      netVatPayable: netVatPayable.toDecimalPlaces(2),
      invoiceCount: invoices.length,
      vendorBillCount: vendorBills.length,
      adjustmentCount: adjustments.length,
      adjustmentsTotal: adjustmentsTotal.toDecimalPlaces(2),
      generatedAt: new Date(),
    };
  }

  async getInvoiceVatExposure(input: {
    tenantId: string;
    invoiceId: string;
  }) {
    const invoice = delegate(prisma, 'invoice');

    const existing = await invoice.findFirst({
      where: {
        id: input.invoiceId,
        tenantId: input.tenantId,
      },
      include: {
        lines: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Invoice not found for VAT exposure'), {
        statusCode: 404,
        code: 'VAT_INVOICE_NOT_FOUND',
      });
    }

    const lines = Array.isArray(existing.lines) ? existing.lines : [];

    const lineSummary = lines.map((line: any) => ({
      lineId: line.id,
      description: line.description ?? null,
      taxableAmount: money(line.subTotal ?? line.amount ?? 0),
      taxRate: money(line.taxRate ?? 0),
      vatAmount: money(line.taxAmount ?? line.vatAmount ?? 0),
      totalAmount: money(line.totalAmount ?? 0),
    }));

    const outputVat = lineSummary.length
      ? lineSummary.reduce((sum, line) => sum.plus(line.vatAmount), ZERO)
      : money(existing.taxAmount ?? existing.vatAmount ?? 0);

    return {
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      invoiceNumber: existing.invoiceNumber ?? null,
      status: existing.status ?? null,
      outputVat: outputVat.toDecimalPlaces(2),
      totalAmount: money(existing.totalAmount ?? existing.grandTotal ?? 0),
      lines: lineSummary,
      generatedAt: new Date(),
    };
  }

  async recordVatAdjustment(input: VatAdjustmentInput) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('VAT adjustment reason is required'), {
        statusCode: 400,
        code: 'VAT_ADJUSTMENT_REASON_REQUIRED',
      });
    }

    const amount = money(input.amount);

    if (amount.eq(0)) {
      throw Object.assign(new Error('VAT adjustment amount cannot be zero'), {
        statusCode: 422,
        code: 'VAT_ADJUSTMENT_ZERO_AMOUNT',
      });
    }

    const vatAdjustment = optionalDelegate(prisma, 'vatAdjustment');

    if (!vatAdjustment) {
      return {
        tenantId: input.tenantId,
        persisted: false,
        type: input.type,
        amount,
        adjustmentDate: input.adjustmentDate,
        reason: input.reason,
        reference: input.reference ?? null,
        metadata: {
          ...(input.metadata ?? {}),
          warning: 'vatAdjustment delegate not available; returned derived adjustment only.',
        },
      };
    }

    return vatAdjustment.create({
      data: {
        tenantId: input.tenantId,
        type: input.type,
        amount,
        adjustmentDate: input.adjustmentDate,
        reason: input.reason,
        reference: input.reference ?? null,
        status: 'POSTED',
        createdById: input.actorId,
        metadata: {
          ...(input.metadata ?? {}),
          createdById: input.actorId,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }

  async voidVatAdjustment(input: {
    tenantId: string;
    adjustmentId: string;
    actorId: string;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Void reason is required'), {
        statusCode: 400,
        code: 'VAT_ADJUSTMENT_VOID_REASON_REQUIRED',
      });
    }

    const vatAdjustment = delegate(prisma, 'vatAdjustment');

    const existing = await vatAdjustment.findFirst({
      where: {
        id: input.adjustmentId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('VAT adjustment not found'), {
        statusCode: 404,
        code: 'VAT_ADJUSTMENT_NOT_FOUND',
      });
    }

    return vatAdjustment.update({
      where: {
        id: input.adjustmentId,
      },
      data: {
        status: 'VOID',
        voidedAt: new Date(),
        voidedById: input.actorId,
        voidReason: input.reason,
        metadata: {
          ...asRecord(existing.metadata),
          voided: {
            actorId: input.actorId,
            reason: input.reason,
            at: new Date().toISOString(),
          },
        },
      },
    });
  }

  async listVatAdjustments(input: {
    tenantId: string;
    from?: Date;
    to?: Date;
    type?: string;
    status?: string;
    take?: number;
    skip?: number;
  }) {
    const vatAdjustment = optionalDelegate(prisma, 'vatAdjustment');

    if (!vatAdjustment) return [];

    return vatAdjustment.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.type ? { type: input.type } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.from || input.to
          ? {
              adjustmentDate: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lt: input.to } : {}),
              },
            }
          : {}),
      },
      orderBy: {
        adjustmentDate: 'desc',
      },
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }
}

export const vatService = new VATService();

export default VATService;