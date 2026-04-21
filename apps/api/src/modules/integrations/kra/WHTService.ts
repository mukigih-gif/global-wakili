import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class WHTService {
  static calculateWHT(
    taxableAmount: Prisma.Decimal | string | number,
    rate: Prisma.Decimal | string | number,
  ) {
    const amount = toDecimal(taxableAmount);
    const percentage = toDecimal(rate);

    return {
      taxableAmount: amount,
      rate: percentage,
      withholdingTax: amount.mul(percentage),
    };
  }

  static async generateWHTSummary(
    db: any,
    params: {
      tenantId: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    const vendorBills = await db.vendorBill.findMany({
      where: {
        tenantId: params.tenantId,
        billDate: {
          gte: params.startDate,
          lte: params.endDate,
        },
        whtAmount: {
          gt: 0,
        },
      },
      select: {
        id: true,
        billNumber: true,
        vendorId: true,
        subTotal: true,
        whtRate: true,
        whtAmount: true,
        billDate: true,
      },
    });

    const totalWHT = vendorBills.reduce(
      (acc: Prisma.Decimal, bill: any) => acc.plus(toDecimal(bill.whtAmount)),
      new Prisma.Decimal(0),
    );

    return {
      periodStart: params.startDate,
      periodEnd: params.endDate,
      totalWHT,
      billCount: vendorBills.length,
      rows: vendorBills,
    };
  }
}