import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export class PurchaseOrderService {
  static async createFromQuotation(
    db: any,
    tenantId: string,
    input: {
      quotationId: string;
      poNumber: string;
      issueDate: Date;
      expectedDeliveryDate?: Date | null;
      notes?: string | null;
      branchId?: string | null;
      matterId?: string | null;
    },
  ) {
    const quotation = await db.quotation.findFirst({
      where: {
        tenantId,
        id: input.quotationId,
      },
      include: {
        lines: true,
        vendor: true,
        rfq: true,
      },
    });

    if (!quotation) {
      throw Object.assign(new Error('Quotation not found'), {
        statusCode: 404,
        code: 'QUOTATION_NOT_FOUND',
      });
    }

    if (quotation.status !== 'SELECTED') {
      throw Object.assign(new Error('Only selected quotations can be converted to purchase orders'), {
        statusCode: 409,
        code: 'INVALID_QUOTATION_STATUS',
      });
    }

    const totalAmount = quotation.lines.reduce(
      (acc: Prisma.Decimal, line: any) => acc.plus(toDecimal(line.total)),
      new Prisma.Decimal(0),
    );

    return db.purchaseOrder.create({
      data: {
        tenantId,
        quotationId: quotation.id,
        vendorId: quotation.vendorId,
        poNumber: input.poNumber.trim(),
        issueDate: input.issueDate,
        expectedDeliveryDate: input.expectedDeliveryDate ?? null,
        notes: input.notes?.trim() ?? null,
        branchId: input.branchId ?? quotation.rfq?.branchId ?? null,
        matterId: input.matterId ?? quotation.rfq?.matterId ?? null,
        status: 'ISSUED',
        totalAmount,
        lines: {
          create: quotation.lines.map((line: any) => ({
            description: line.description,
            quantity: toDecimal(line.quantity),
            unitPrice: toDecimal(line.unitPrice),
            total: toDecimal(line.total),
          })),
        },
      },
      include: {
        lines: true,
        vendor: true,
      },
    });
  }

  static async markReceived(
    db: any,
    tenantId: string,
    purchaseOrderId: string,
  ) {
    const po = await db.purchaseOrder.findFirst({
      where: {
        tenantId,
        id: purchaseOrderId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!po) {
      throw Object.assign(new Error('Purchase order not found'), {
        statusCode: 404,
        code: 'PURCHASE_ORDER_NOT_FOUND',
      });
    }

    if (!['ISSUED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      throw Object.assign(new Error('Purchase order cannot be marked received from current status'), {
        statusCode: 409,
        code: 'INVALID_PURCHASE_ORDER_STATUS',
      });
    }

    return db.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: 'RECEIVED',
      },
    });
  }

  static async listOpen(db: any, tenantId: string) {
    return db.purchaseOrder.findMany({
      where: {
        tenantId,
        status: {
          in: ['ISSUED', 'PARTIALLY_RECEIVED'],
        },
      },
      include: {
        vendor: true,
        lines: true,
      },
      orderBy: [{ issueDate: 'desc' }],
    });
  }
}