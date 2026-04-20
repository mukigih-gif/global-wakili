import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export class RFQService {
  static async create(
    db: any,
    tenantId: string,
    input: {
      title: string;
      description?: string | null;
      issueDate: Date;
      closingDate: Date;
      branchId?: string | null;
      matterId?: string | null;
      supplierIds?: string[];
      items: Array<{
        description: string;
        quantity: Prisma.Decimal | string | number;
        estimatedUnitPrice?: Prisma.Decimal | string | number | null;
      }>;
    },
  ) {
    if (input.closingDate < input.issueDate) {
      throw Object.assign(new Error('RFQ closing date cannot be before issue date'), {
        statusCode: 422,
        code: 'INVALID_RFQ_DATES',
      });
    }

    return db.requestForQuotation.create({
      data: {
        tenantId,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        issueDate: input.issueDate,
        closingDate: input.closingDate,
        branchId: input.branchId ?? null,
        matterId: input.matterId ?? null,
        status: 'OPEN',
        items: {
          create: input.items.map((item) => ({
            description: item.description.trim(),
            quantity: toDecimal(item.quantity),
            estimatedUnitPrice: toDecimal(item.estimatedUnitPrice),
          })),
        },
        suppliers: input.supplierIds?.length
          ? {
              create: input.supplierIds.map((supplierId) => ({
                vendorId: supplierId,
              })),
            }
          : undefined,
      },
      include: {
        items: true,
        suppliers: true,
      },
    });
  }

  static async close(
    db: any,
    tenantId: string,
    rfqId: string,
  ) {
    const rfq = await db.requestForQuotation.findFirst({
      where: {
        tenantId,
        id: rfqId,
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
      throw Object.assign(new Error('Only open RFQs can be closed'), {
        statusCode: 409,
        code: 'INVALID_RFQ_STATUS',
      });
    }

    return db.requestForQuotation.update({
      where: { id: rfqId },
      data: {
        status: 'CLOSED',
      },
    });
  }

  static async listOpen(db: any, tenantId: string) {
    return db.requestForQuotation.findMany({
      where: {
        tenantId,
        status: 'OPEN',
      },
      include: {
        items: true,
        suppliers: true,
      },
      orderBy: [{ closingDate: 'asc' }],
    });
  }
}