import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export class QuotationService {
  static async submit(
    db: any,
    tenantId: string,
    input: {
      rfqId: string;
      vendorId: string;
      quoteDate: Date;
      validUntil?: Date | null;
      notes?: string | null;
      lines: Array<{
        rfqItemId?: string | null;
        description: string;
        quantity: Prisma.Decimal | string | number;
        unitPrice: Prisma.Decimal | string | number;
        total?: Prisma.Decimal | string | number | null;
      }>;
    },
  ) {
    const rfq = await db.requestForQuotation.findFirst({
      where: {
        tenantId,
        id: input.rfqId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!rfq) {
      throw Object.assign(new Error('RFQ not found'), {
        statusCode: 404,
        code: 'RFQ_NOT_FOUND',
      });
    }

    if (rfq.status !== 'OPEN') {
      throw Object.assign(new Error('Quotations can only be submitted to open RFQs'), {
        statusCode: 409,
        code: 'INVALID_RFQ_STATUS',
      });
    }

    return db.quotation.create({
      data: {
        tenantId,
        rfqId: input.rfqId,
        vendorId: input.vendorId,
        quoteDate: input.quoteDate,
        validUntil: input.validUntil ?? null,
        notes: input.notes?.trim() ?? null,
        status: 'SUBMITTED',
        lines: {
          create: input.lines.map((line) => {
            const quantity = toDecimal(line.quantity);
            const unitPrice = toDecimal(line.unitPrice);
            return {
              rfqItemId: line.rfqItemId ?? null,
              description: line.description.trim(),
              quantity,
              unitPrice,
              total: line.total ? toDecimal(line.total) : quantity.mul(unitPrice),
            };
          }),
        },
      },
      include: {
        lines: true,
        vendor: true,
      },
    });
  }

  static async markSelected(
    db: any,
    tenantId: string,
    quotationId: string,
  ) {
    const quotation = await db.quotation.findFirst({
      where: {
        tenantId,
        id: quotationId,
      },
      select: {
        id: true,
        rfqId: true,
      },
    });

    if (!quotation) {
      throw Object.assign(new Error('Quotation not found'), {
        statusCode: 404,
        code: 'QUOTATION_NOT_FOUND',
      });
    }

    await db.quotation.updateMany({
      where: {
        tenantId,
        rfqId: quotation.rfqId,
      },
      data: {
        status: 'REJECTED',
      },
    });

    return db.quotation.update({
      where: { id: quotationId },
      data: {
        status: 'SELECTED',
      },
    });
  }

  static async listForRFQ(
    db: any,
    tenantId: string,
    rfqId: string,
  ) {
    return db.quotation.findMany({
      where: {
        tenantId,
        rfqId,
      },
      include: {
        lines: true,
        vendor: true,
      },
      orderBy: [{ quoteDate: 'asc' }],
    });
  }
}