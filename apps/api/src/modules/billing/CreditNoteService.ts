// apps/api/src/modules/billing/CreditNoteService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);

export type CreditNoteLineInput = {
  invoiceLineId?: string | null;
  description: string;
  quantity?: string | number | Prisma.Decimal;
  unitPrice: string | number | Prisma.Decimal;
  taxRate?: string | number | Prisma.Decimal | null;
  metadata?: Record<string, unknown>;
};

export type CreateCreditNoteInput = {
  tenantId: string;
  actorId: string;
  invoiceId: string;
  reason: string;
  creditDate?: Date | null;
  lines?: CreditNoteLineInput[];
  metadata?: Record<string, unknown>;
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

function qty(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return new Prisma.Decimal(1);

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite() || parsed.lte(0)) {
    throw Object.assign(new Error('Invalid quantity'), {
      statusCode: 422,
      code: 'INVALID_QUANTITY',
    });
  }

  return parsed.toDecimalPlaces(4);
}

function rate(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite() || parsed.lt(0)) {
    throw Object.assign(new Error('Invalid tax rate'), {
      statusCode: 422,
      code: 'INVALID_TAX_RATE',
    });
  }

  return parsed;
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function calculateLines(lines: CreditNoteLineInput[]) {
  if (!lines.length) {
    throw Object.assign(new Error('Credit note requires at least one line'), {
      statusCode: 422,
      code: 'CREDIT_NOTE_LINES_REQUIRED',
    });
  }

  let subTotal = ZERO;
  let taxAmount = ZERO;

  const calculated = lines.map((line, index) => {
    const quantity = qty(line.quantity);
    const unitPrice = money(line.unitPrice);
    const lineSubTotal = quantity.mul(unitPrice).toDecimalPlaces(2);
    const taxRate = rate(line.taxRate);
    const lineTaxAmount = lineSubTotal.mul(taxRate).toDecimalPlaces(2);
    const totalAmount = lineSubTotal.plus(lineTaxAmount).toDecimalPlaces(2);

    subTotal = subTotal.plus(lineSubTotal);
    taxAmount = taxAmount.plus(lineTaxAmount);

    return {
      lineNumber: index + 1,
      invoiceLineId: line.invoiceLineId ?? null,
      description: line.description,
      quantity,
      unitPrice,
      taxRate,
      subTotal: lineSubTotal,
      taxAmount: lineTaxAmount,
      totalAmount,
      metadata: line.metadata ?? {},
    };
  });

  return {
    lines: calculated,
    subTotal: subTotal.toDecimalPlaces(2),
    taxAmount: taxAmount.toDecimalPlaces(2),
    totalAmount: subTotal.plus(taxAmount).toDecimalPlaces(2),
  };
}

export class CreditNoteService {
  async createCreditNote(input: CreateCreditNoteInput) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Credit note reason is required'), {
        statusCode: 400,
        code: 'CREDIT_NOTE_REASON_REQUIRED',
      });
    }

    return prisma.$transaction(async (tx) => {
      const invoice = delegate(tx, 'invoice');
      const creditNote = delegate(tx, 'creditNote');

      const existingInvoice = await invoice.findFirst({
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
        },
        include: { lines: true },
      });

      if (!existingInvoice) {
        throw Object.assign(new Error('Invoice not found'), {
          statusCode: 404,
          code: 'CREDIT_NOTE_INVOICE_NOT_FOUND',
        });
      }

      if (['CANCELLED', 'VOID'].includes(String(existingInvoice.status ?? '').toUpperCase())) {
        throw Object.assign(new Error('Cannot credit a cancelled or void invoice'), {
          statusCode: 409,
          code: 'CREDIT_NOTE_INVOICE_LOCKED',
        });
      }

      const sourceLines: CreditNoteLineInput[] = input.lines?.length
        ? input.lines
        : (existingInvoice.lines ?? []).map((line: any) => ({
            invoiceLineId: line.id,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate ?? 0,
            metadata: {
              sourceInvoiceLineId: line.id,
            },
          }));

      const calculated = calculateLines(sourceLines);
      const invoiceBalance = money(existingInvoice.balanceDue ?? existingInvoice.totalAmount ?? 0);

      if (calculated.totalAmount.gt(money(existingInvoice.totalAmount ?? calculated.totalAmount))) {
        throw Object.assign(new Error('Credit note cannot exceed invoice total'), {
          statusCode: 422,
          code: 'CREDIT_NOTE_EXCEEDS_INVOICE_TOTAL',
        });
      }

      const creditNoteNumber = await this.allocateCreditNoteNumber(tx, input.tenantId);

      const created = await creditNote.create({
        data: {
          tenantId: input.tenantId,
          clientId: existingInvoice.clientId ?? null,
          matterId: existingInvoice.matterId ?? null,
          invoiceId: existingInvoice.id,
          creditNoteNumber,
          creditDate: input.creditDate ?? new Date(),
          reason: input.reason,
          status: 'ISSUED',
          currency: existingInvoice.currency ?? 'KES',
          subTotal: calculated.subTotal,
          taxAmount: calculated.taxAmount,
          totalAmount: calculated.totalAmount,
          createdById: input.actorId,
          metadata: {
            ...(input.metadata ?? {}),
            sourceInvoiceNumber: existingInvoice.invoiceNumber ?? null,
            fiscalTreatment: 'Credit note reduces invoice receivable and VAT output where applicable.',
          },
          lines: {
            create: calculated.lines.map((line) => ({
              tenantId: input.tenantId,
              ...line,
            })),
          },
        },
        include: { lines: true },
      });

      const newBalance = Prisma.Decimal.max(
        invoiceBalance.minus(calculated.totalAmount),
        ZERO,
      ).toDecimalPlaces(2);

      await invoice.update({
        where: { id: existingInvoice.id },
        data: {
          creditedAmount: money(existingInvoice.creditedAmount).plus(calculated.totalAmount).toDecimalPlaces(2),
          balanceDue: newBalance,
          status: newBalance.eq(0) ? 'CREDITED' : existingInvoice.status,
          metadata: {
            ...asRecord(existingInvoice.metadata),
            lastCreditNoteId: created.id,
            lastCreditNoteNumber: created.creditNoteNumber,
            lastCreditNoteAt: new Date().toISOString(),
          },
        },
      });

      return created;
    });
  }

  async voidCreditNote(input: {
    tenantId: string;
    creditNoteId: string;
    actorId: string;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Void reason is required'), {
        statusCode: 400,
        code: 'CREDIT_NOTE_VOID_REASON_REQUIRED',
      });
    }

    return prisma.$transaction(async (tx) => {
      const invoice = delegate(tx, 'invoice');
      const creditNote = delegate(tx, 'creditNote');

      const existing = await creditNote.findFirst({
        where: {
          id: input.creditNoteId,
          tenantId: input.tenantId,
        },
      });

      if (!existing) {
        throw Object.assign(new Error('Credit note not found'), {
          statusCode: 404,
          code: 'CREDIT_NOTE_NOT_FOUND',
        });
      }

      if (String(existing.status) === 'VOID') return existing;

      if (existing.invoiceId) {
        const relatedInvoice = await invoice.findFirst({
          where: {
            id: existing.invoiceId,
            tenantId: input.tenantId,
          },
        });

        if (relatedInvoice) {
          await invoice.update({
            where: { id: relatedInvoice.id },
            data: {
              creditedAmount: Prisma.Decimal.max(
                money(relatedInvoice.creditedAmount).minus(money(existing.totalAmount)),
                ZERO,
              ),
              balanceDue: money(relatedInvoice.balanceDue).plus(money(existing.totalAmount)).toDecimalPlaces(2),
              status: String(relatedInvoice.status) === 'CREDITED'
                ? 'PARTIALLY_PAID'
                : relatedInvoice.status,
            },
          });
        }
      }

      return creditNote.update({
        where: { id: input.creditNoteId },
        data: {
          status: 'VOID',
          voidedAt: new Date(),
          voidedById: input.actorId,
          voidReason: input.reason,
        },
      });
    });
  }

  async listCreditNotes(input: {
    tenantId: string;
    clientId?: string;
    matterId?: string;
    invoiceId?: string;
    status?: string;
    take?: number;
    skip?: number;
  }) {
    const creditNote = delegate(prisma, 'creditNote');

    return creditNote.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.matterId ? { matterId: input.matterId } : {}),
        ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  async getCreditNoteById(tenantId: string, creditNoteId: string) {
    const creditNote = delegate(prisma, 'creditNote');

    const existing = await creditNote.findFirst({
      where: {
        id: creditNoteId,
        tenantId,
      },
      include: { lines: true },
    });

    if (!existing) {
      throw Object.assign(new Error('Credit note not found'), {
        statusCode: 404,
        code: 'CREDIT_NOTE_NOT_FOUND',
      });
    }

    return existing;
  }

  private async allocateCreditNoteNumber(tx: Prisma.TransactionClient, tenantId: string) {
    const year = new Date().getFullYear();
    const sequence = delegate(tx, 'numberSequence');

    const row = await sequence.upsert({
      where: {
        tenantId_key_year: {
          tenantId,
          key: 'CREDIT_NOTE',
          year,
        },
      },
      update: {
        nextValue: { increment: 1 },
      },
      create: {
        tenantId,
        key: 'CREDIT_NOTE',
        year,
        nextValue: 2,
      },
    });

    const current = Number(row.nextValue) - 1;

    return `CN-${year}-${String(current).padStart(6, '0')}`;
  }
}

export const creditNoteService = new CreditNoteService();

export default CreditNoteService;