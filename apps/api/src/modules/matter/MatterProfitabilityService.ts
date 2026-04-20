import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export class MatterProfitabilityService {
  static async calculate(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
    },
  ) {
    const [matter, invoiceAgg, expenseAgg, timeAgg] = await Promise.all([
      db.matter.findFirst({
        where: {
          tenantId: params.tenantId,
          id: params.matterId,
        },
        select: {
          id: true,
          title: true,
          matterCode: true,
          metadata: true,
        },
      }),
      db.invoice.aggregate({
        where: {
          tenantId: params.tenantId,
          matterId: params.matterId,
        },
        _sum: {
          total: true,
          paidAmount: true,
        },
      }),
      db.expenseEntry.aggregate({
        where: {
          tenantId: params.tenantId,
          matterId: params.matterId,
        },
        _sum: {
          amount: true,
        },
      }),
      db.timeEntry.aggregate({
        where: {
          tenantId: params.tenantId,
          matterId: params.matterId,
          status: 'APPROVED',
        },
        _sum: {
          hours: true,
          amount: true,
        },
      }),
    ]);

    if (!matter) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    const totalBilled = toDecimal(invoiceAgg._sum.total);
    const totalCollected = toDecimal(invoiceAgg._sum.paidAmount);
    const totalExpenses = toDecimal(expenseAgg._sum.amount);
    const totalRecordedTimeValue = toDecimal(timeAgg._sum.amount);
    const totalHours = toDecimal(timeAgg._sum.hours);

    const writeOffs = Array.isArray(matter.metadata?.writeOffs)
      ? matter.metadata.writeOffs
      : [];

    const totalWriteOff = writeOffs.reduce(
      (acc: Prisma.Decimal, item: any) => acc.plus(toDecimal(item.amount)),
      new Prisma.Decimal(0),
    );

    // Cash-basis net revenue should be what has actually been collected.
    const netRevenue = totalCollected;

    // Gross margin should be cash received minus direct matter expenses.
    const grossMargin = netRevenue.minus(totalExpenses);

    // Realization shows collections efficiency against billed value.
    const realizationPercent =
      totalBilled.gt(0) ? totalCollected.div(totalBilled).mul(100) : new Prisma.Decimal(0);

    return {
      matter: {
        id: matter.id,
        title: matter.title,
        matterCode: matter.matterCode ?? null,
        originatorId: matter.metadata?.originatorId ?? null,
      },
      metrics: {
        totalBilled,
        totalCollected,
        totalExpenses,
        totalRecordedTimeValue,
        totalHours,
        totalWriteOff,
        netRevenue,
        grossMargin,
        realizationPercent,
      },
      generatedAt: new Date(),
    };
  }
}