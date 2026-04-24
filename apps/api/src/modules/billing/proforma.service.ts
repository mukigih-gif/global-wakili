// apps/api/src/modules/billing/proforma.service.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);
const PROFORMA_DISCLAIMER = 'PROFORMA ONLY - NOT A TAX INVOICE';

export type ProformaLineInput = {
  description: string;
  quantity?: string | number | Prisma.Decimal;
  unitPrice: string | number | Prisma.Decimal;
  taxRate?: string | number | Prisma.Decimal | null;
  matterId?: string | null;
  timeEntryId?: string | null;
  expenseId?: string | null;
  metadata?: Record<string, unknown>;
};

export type CreateProformaInput = {
  tenantId: string;
  actorId: string;
  clientId: string;
  matterId?: string | null;
  currency?: string;
  issueDate?: Date | null;
  expiryDate?: Date | null;
  notes?: string | null;
  terms?: string | null;
  lines: ProformaLineInput[];
  metadata?: Record<string, unknown>;
};

export type UpdateProformaInput = Partial<CreateProformaInput> & {
  tenantId: string;
  actorId: string;
  proformaId: string;
};

export type ConvertProformaInput = {
  tenantId: string;
  actorId: string;
  proformaId: string;
  invoiceDate?: Date | null;
  dueDate?: Date | null;
  invoiceNumber?: string | null;
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
  if (value === null || value === undefined || value === '') {
    return new Prisma.Decimal(1);
  }

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite() || parsed.lte(0)) {
    throw Object.assign(new Error('Invalid quantity'), {
      statusCode: 422,
      code: 'INVALID_QUANTITY',
    });
  }

  return parsed.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
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

function calculateLines(lines: ProformaLineInput[]) {
  if (!lines.length) {
    throw Object.assign(new Error('Proforma requires at least one line'), {
      statusCode: 422,
      code: 'PROFORMA_LINES_REQUIRED',
    });
  }

  let subTotal = ZERO;
  let taxAmount = ZERO;

  const calculatedLines = lines.map((line, index) => {
    const quantity = qty(line.quantity);
    const unitPrice = money(line.unitPrice);
    const lineSubTotal = quantity.mul(unitPrice).toDecimalPlaces(2);
    const taxRate = rate(line.taxRate);
    const lineTaxAmount = lineSubTotal.mul(taxRate).toDecimalPlaces(2);
    const lineTotal = lineSubTotal.plus(lineTaxAmount).toDecimalPlaces(2);

    subTotal = subTotal.plus(lineSubTotal);
    taxAmount = taxAmount.plus(lineTaxAmount);

    return {
      lineNumber: index + 1,
      description: line.description,
      quantity,
      unitPrice,
      taxRate,
      subTotal: lineSubTotal,
      taxAmount: lineTaxAmount,
      totalAmount: lineTotal,
      matterId: line.matterId ?? null,
      timeEntryId: line.timeEntryId ?? null,
      expenseId: line.expenseId ?? null,
      metadata: {
        ...(line.metadata ?? {}),
        disclaimer: PROFORMA_DISCLAIMER,
      },
    };
  });

  return {
    lines: calculatedLines,
    subTotal: subTotal.toDecimalPlaces(2),
    taxAmount: taxAmount.toDecimalPlaces(2),
    totalAmount: subTotal.plus(taxAmount).toDecimalPlaces(2),
  };
}

export class ProformaService {
  async createProforma(input: CreateProformaInput) {
    return prisma.$transaction(async (tx) => {
      await this.assertClientMatter(tx, input.tenantId, input.clientId, input.matterId ?? null);

      const proformaInvoice = delegate(tx, 'proformaInvoice');
      const calculated = calculateLines(input.lines);
      const proformaNumber = await this.allocateProformaNumber(tx, input.tenantId);

      return proformaInvoice.create({
        data: {
          tenantId: input.tenantId,
          clientId: input.clientId,
          matterId: input.matterId ?? null,
          proformaNumber,
          currency: input.currency ?? 'KES',
          issueDate: input.issueDate ?? new Date(),
          expiryDate: input.expiryDate ?? null,
          status: 'DRAFT',
          subTotal: calculated.subTotal,
          taxAmount: calculated.taxAmount,
          totalAmount: calculated.totalAmount,
          balanceDue: calculated.totalAmount,
          notes: this.withDisclaimer(input.notes),
          terms: this.withDisclaimer(input.terms),
          createdById: input.actorId,
          metadata: {
            ...(input.metadata ?? {}),
            disclaimer: PROFORMA_DISCLAIMER,
            fiscalNotice: 'This proforma is not a tax invoice and must not be fiscalized.',
          },
          lines: {
            create: calculated.lines.map((line) => ({
              tenantId: input.tenantId,
              ...line,
            })),
          },
        },
      });
    });
  }

  async updateProforma(input: UpdateProformaInput) {
    return prisma.$transaction(async (tx) => {
      const proformaInvoice = delegate(tx, 'proformaInvoice');
      const proformaLine = delegate(tx, 'proformaLine');

      const existing = await proformaInvoice.findFirst({
        where: {
          id: input.proformaId,
          tenantId: input.tenantId,
        },
        include: { lines: true },
      });

      if (!existing) {
        throw Object.assign(new Error('Proforma not found'), {
          statusCode: 404,
          code: 'PROFORMA_NOT_FOUND',
        });
      }

      if (!['DRAFT', 'SENT'].includes(String(existing.status))) {
        throw Object.assign(new Error('Only draft or sent proformas can be updated'), {
          statusCode: 409,
          code: 'PROFORMA_LOCKED',
        });
      }

      if (input.clientId || input.matterId !== undefined) {
        await this.assertClientMatter(
          tx,
          input.tenantId,
          input.clientId ?? existing.clientId,
          input.matterId ?? existing.matterId ?? null,
        );
      }

      let totalsPatch: Record<string, any> = {};
      let newLines: any[] | null = null;

      if (input.lines) {
        const calculated = calculateLines(input.lines);

        await proformaLine.deleteMany({
          where: {
            tenantId: input.tenantId,
            proformaInvoiceId: input.proformaId,
          },
        });

        newLines = calculated.lines.map((line) => ({
          tenantId: input.tenantId,
          proformaInvoiceId: input.proformaId,
          ...line,
        }));

        await proformaLine.createMany({ data: newLines });

        totalsPatch = {
          subTotal: calculated.subTotal,
          taxAmount: calculated.taxAmount,
          totalAmount: calculated.totalAmount,
          balanceDue: calculated.totalAmount,
        };
      }

      return proformaInvoice.update({
        where: { id: input.proformaId },
        data: {
          ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
          ...(input.matterId !== undefined ? { matterId: input.matterId } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.issueDate !== undefined ? { issueDate: input.issueDate } : {}),
          ...(input.expiryDate !== undefined ? { expiryDate: input.expiryDate } : {}),
          ...(input.notes !== undefined ? { notes: this.withDisclaimer(input.notes) } : {}),
          ...(input.terms !== undefined ? { terms: this.withDisclaimer(input.terms) } : {}),
          ...totalsPatch,
          metadata: {
            ...asRecord(existing.metadata),
            ...(input.metadata ?? {}),
            disclaimer: PROFORMA_DISCLAIMER,
            updatedById: input.actorId,
            updatedAt: new Date().toISOString(),
          },
          updatedById: input.actorId,
          updatedAt: new Date(),
        },
        include: { lines: true },
      });
    });
  }

  async sendProforma(input: {
    tenantId: string;
    proformaId: string;
    actorId: string;
    sentAt?: Date;
  }) {
    const proformaInvoice = delegate(prisma, 'proformaInvoice');

    const existing = await proformaInvoice.findFirst({
      where: {
        id: input.proformaId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Proforma not found'), {
        statusCode: 404,
        code: 'PROFORMA_NOT_FOUND',
      });
    }

    if (!['DRAFT', 'SENT'].includes(String(existing.status))) {
      throw Object.assign(new Error('Only draft proformas can be sent'), {
        statusCode: 409,
        code: 'PROFORMA_CANNOT_SEND',
      });
    }

    return proformaInvoice.update({
      where: { id: input.proformaId },
      data: {
        status: 'SENT',
        sentAt: input.sentAt ?? new Date(),
        sentById: input.actorId,
      },
    });
  }

  async approveProforma(input: {
    tenantId: string;
    proformaId: string;
    actorId: string;
    approvedAt?: Date;
  }) {
    const proformaInvoice = delegate(prisma, 'proformaInvoice');

    const existing = await proformaInvoice.findFirst({
      where: {
        id: input.proformaId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Proforma not found'), {
        statusCode: 404,
        code: 'PROFORMA_NOT_FOUND',
      });
    }

    if (String(existing.status) === 'CONVERTED') {
      throw Object.assign(new Error('Converted proforma cannot be approved again'), {
        statusCode: 409,
        code: 'PROFORMA_ALREADY_CONVERTED',
      });
    }

    return proformaInvoice.update({
      where: { id: input.proformaId },
      data: {
        status: 'APPROVED',
        approvedAt: input.approvedAt ?? new Date(),
        approvedById: input.actorId,
      },
    });
  }

  async cancelProforma(input: {
    tenantId: string;
    proformaId: string;
    actorId: string;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Cancellation reason is required'), {
        statusCode: 400,
        code: 'PROFORMA_CANCEL_REASON_REQUIRED',
      });
    }

    const proformaInvoice = delegate(prisma, 'proformaInvoice');

    const existing = await proformaInvoice.findFirst({
      where: {
        id: input.proformaId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Proforma not found'), {
        statusCode: 404,
        code: 'PROFORMA_NOT_FOUND',
      });
    }

    if (String(existing.status) === 'CONVERTED') {
      throw Object.assign(new Error('Converted proforma cannot be cancelled'), {
        statusCode: 409,
        code: 'PROFORMA_ALREADY_CONVERTED',
      });
    }

    return proformaInvoice.update({
      where: { id: input.proformaId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: input.actorId,
        cancellationReason: input.reason,
      },
    });
  }

  async convertToInvoice(input: ConvertProformaInput) {
    return prisma.$transaction(async (tx) => {
      const proformaInvoice = delegate(tx, 'proformaInvoice');
      const invoice = delegate(tx, 'invoice');

      const proforma = await proformaInvoice.findFirst({
        where: {
          id: input.proformaId,
          tenantId: input.tenantId,
        },
        include: { lines: true },
      });

      if (!proforma) {
        throw Object.assign(new Error('Proforma not found'), {
          statusCode: 404,
          code: 'PROFORMA_NOT_FOUND',
        });
      }

      if (String(proforma.status) === 'CONVERTED') {
        throw Object.assign(new Error('Proforma is already converted'), {
          statusCode: 409,
          code: 'PROFORMA_ALREADY_CONVERTED',
        });
      }

      if (!['APPROVED', 'SENT'].includes(String(proforma.status))) {
        throw Object.assign(new Error('Only approved or sent proformas can be converted'), {
          statusCode: 409,
          code: 'PROFORMA_NOT_CONVERTIBLE',
        });
      }

      const invoiceNumber = input.invoiceNumber ?? await this.allocateInvoiceNumber(tx, input.tenantId);

      const createdInvoice = await invoice.create({
        data: {
          tenantId: input.tenantId,
          clientId: proforma.clientId,
          matterId: proforma.matterId ?? null,
          invoiceNumber,
          currency: proforma.currency ?? 'KES',
          invoiceDate: input.invoiceDate ?? new Date(),
          dueDate: input.dueDate ?? null,
          status: 'DRAFT',
          subTotal: money(proforma.subTotal),
          taxAmount: money(proforma.taxAmount),
          totalAmount: money(proforma.totalAmount),
          balanceDue: money(proforma.totalAmount),
          sourceType: 'PROFORMA',
          sourceId: proforma.id,
          notes: proforma.notes ?? null,
          terms: proforma.terms ?? null,
          createdById: input.actorId,
          metadata: {
            convertedFromProformaId: proforma.id,
            convertedFromProformaNumber: proforma.proformaNumber ?? null,
          },
          lines: {
            create: (proforma.lines ?? []).map((line: any) => ({
              tenantId: input.tenantId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              taxRate: line.taxRate ?? 0,
              subTotal: line.subTotal,
              taxAmount: line.taxAmount,
              totalAmount: line.totalAmount,
              matterId: line.matterId ?? proforma.matterId ?? null,
              timeEntryId: line.timeEntryId ?? null,
              expenseId: line.expenseId ?? null,
              metadata: {
                ...asRecord(line.metadata),
                sourceProformaLineId: line.id,
              },
            })),
          },
        },
      });

      await proformaInvoice.update({
        where: { id: proforma.id },
        data: {
          status: 'CONVERTED',
          convertedAt: new Date(),
          convertedById: input.actorId,
          invoiceId: createdInvoice.id,
        },
      });

      return createdInvoice;
    });
  }

  async listProformas(input: {
    tenantId: string;
    clientId?: string;
    matterId?: string;
    status?: string;
    take?: number;
    skip?: number;
  }) {
    const proformaInvoice = delegate(prisma, 'proformaInvoice');

    return proformaInvoice.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.matterId ? { matterId: input.matterId } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  async getProformaById(tenantId: string, proformaId: string) {
    const proformaInvoice = delegate(prisma, 'proformaInvoice');

    const existing = await proformaInvoice.findFirst({
      where: {
        id: proformaId,
        tenantId,
      },
      include: { lines: true },
    });

    if (!existing) {
      throw Object.assign(new Error('Proforma not found'), {
        statusCode: 404,
        code: 'PROFORMA_NOT_FOUND',
      });
    }

    return existing;
  }

  private withDisclaimer(value?: string | null): string {
    const cleaned = value?.trim();

    if (!cleaned) return PROFORMA_DISCLAIMER;

    if (cleaned.includes(PROFORMA_DISCLAIMER)) return cleaned;

    return `${PROFORMA_DISCLAIMER}\n\n${cleaned}`;
  }

  private async assertClientMatter(
    tx: Prisma.TransactionClient,
    tenantId: string,
    clientId: string,
    matterId?: string | null,
  ) {
    const client = await delegate(tx, 'client').findFirst({
      where: { id: clientId, tenantId },
      select: { id: true },
    });

    if (!client) {
      throw Object.assign(new Error('Client not found for proforma'), {
        statusCode: 404,
        code: 'PROFORMA_CLIENT_NOT_FOUND',
      });
    }

    if (matterId) {
      const matter = await delegate(tx, 'matter').findFirst({
        where: { id: matterId, tenantId, clientId },
        select: { id: true },
      });

      if (!matter) {
        throw Object.assign(new Error('Matter not found for proforma'), {
          statusCode: 404,
          code: 'PROFORMA_MATTER_NOT_FOUND',
        });
      }
    }
  }

  private async allocateProformaNumber(tx: Prisma.TransactionClient, tenantId: string) {
    const year = new Date().getFullYear();
    const sequence = delegate(tx, 'numberSequence');

    const row = await sequence.upsert({
      where: {
        tenantId_key_year: {
          tenantId,
          key: 'PROFORMA',
          year,
        },
      },
      update: {
        nextValue: { increment: 1 },
      },
      create: {
        tenantId,
        key: 'PROFORMA',
        year,
        nextValue: 2,
      },
    });

    const current = Number(row.nextValue) - 1;

    return `PRO-${year}-${String(current).padStart(6, '0')}`;
  }

  private async allocateInvoiceNumber(tx: Prisma.TransactionClient, tenantId: string) {
    const year = new Date().getFullYear();
    const sequence = delegate(tx, 'numberSequence');

    const row = await sequence.upsert({
      where: {
        tenantId_key_year: {
          tenantId,
          key: 'INVOICE',
          year,
        },
      },
      update: {
        nextValue: { increment: 1 },
      },
      create: {
        tenantId,
        key: 'INVOICE',
        year,
        nextValue: 2,
      },
    });

    const current = Number(row.nextValue) - 1;

    return `INV-${year}-${String(current).padStart(6, '0')}`;
  }
}

export const proformaService = new ProformaService();

export default ProformaService;