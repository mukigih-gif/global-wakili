import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class VATService {
  static async getOutputVAT(
    db: any,
    params: {
      tenantId: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    const aggregate = await db.invoice.aggregate({
      where: {
        tenantId: params.tenantId,
        status: {
          in: ['INVOICED', 'PARTIALLY_PAID', 'PAID'],
        },
        issuedDate: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
      _sum: {
        vatAmount: true,
        total: true,
        subTotal: true,
      },
    });

    return {
      outputVAT: toDecimal(aggregate._sum.vatAmount),
      taxableSupplies: toDecimal(aggregate._sum.subTotal),
      grossSupplies: toDecimal(aggregate._sum.total),
    };
  }

  static async getInputVAT(
    db: any,
    params: {
      tenantId: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    const aggregate = await db.vendorBill.aggregate({
      where: {
        tenantId: params.tenantId,
        status: {
          in: ['APPROVED', 'PARTIALLY_PAID', 'PAID'],
        },
        billDate: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
      _sum: {
        vatAmount: true,
        total: true,
        subTotal: true,
      },
    });

    return {
      inputVAT: toDecimal(aggregate._sum.vatAmount),
      taxablePurchases: toDecimal(aggregate._sum.subTotal),
      grossPurchases: toDecimal(aggregate._sum.total),
    };
  }

  static async generateVATSummary(
    db: any,
    params: {
      tenantId: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    const [output, input] = await Promise.all([
      this.getOutputVAT(db, params),
      this.getInputVAT(db, params),
    ]);

    const netVAT = output.outputVAT.minus(input.inputVAT);

    return {
      periodStart: params.startDate,
      periodEnd: params.endDate,
      outputVAT: output.outputVAT,
      inputVAT: input.inputVAT,
      netVAT,
      taxableSupplies: output.taxableSupplies,
      grossSupplies: output.grossSupplies,
      taxablePurchases: input.taxablePurchases,
      grossPurchases: input.grossPurchases,
      position: netVAT.gte(0) ? 'PAYABLE' : 'CREDIT',
    };
  }
}