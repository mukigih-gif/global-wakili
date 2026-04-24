import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

type AgingBucket = {
  bucket: 'CURRENT' | '1_30' | '31_60' | '61_90' | '90_PLUS';
  amount: Prisma.Decimal;
};

function diffInDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export class PayablesAgingService {
  static classify(daysOverdue: number): AgingBucket['bucket'] {
    if (daysOverdue <= 0) return 'CURRENT';
    if (daysOverdue <= 30) return '1_30';
    if (daysOverdue <= 60) return '31_60';
    if (daysOverdue <= 90) return '61_90';
    return '90_PLUS';
  }

  static async generate(
    db: any,
    params: {
      tenantId: string;
      asOf?: Date;
    },
  ) {
    const asOf = params.asOf ?? new Date();

    const bills = await db.vendorBill.findMany({
      where: {
        tenantId: params.tenantId,
        status: {
          in: ['APPROVED', 'PARTIALLY_PAID', 'SUBMITTED'],
        },
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }],
    });

    const buckets: Record<AgingBucket['bucket'], Prisma.Decimal> = {
      CURRENT: new Prisma.Decimal(0),
      '1_30': new Prisma.Decimal(0),
      '31_60': new Prisma.Decimal(0),
      '61_90': new Prisma.Decimal(0),
      '90_PLUS': new Prisma.Decimal(0),
    };

    const rows = bills.map((bill: any) => {
      const total = toDecimal(bill.total);
      const paid = toDecimal(bill.paidAmount);
      const outstanding = total.minus(paid);
      const dueDate = bill.dueDate ?? bill.billDate;
      const daysOverdue = diffInDays(dueDate, asOf);
      const bucket = this.classify(daysOverdue);

      buckets[bucket] = buckets[bucket].plus(outstanding.gt(0) ? outstanding : 0);

      return {
        id: bill.id,
        billNumber: bill.billNumber,
        vendorId: bill.vendorId,
        vendorName: bill.vendor?.name ?? null,
        billDate: bill.billDate,
        dueDate: bill.dueDate,
        status: bill.status,
        total,
        paidAmount: paid,
        outstanding: outstanding.gt(0) ? outstanding : new Prisma.Decimal(0),
        daysOverdue,
        bucket,
      };
    });

    return {
      asOf,
      totals: buckets,
      rows,
    };
  }
}