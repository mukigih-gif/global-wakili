import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class CorporateTaxService {
  static calculateCorporateTax(
    taxableProfit: Prisma.Decimal | string | number,
    rate: Prisma.Decimal | string | number = 0.3,
  ) {
    const profit = toDecimal(taxableProfit);
    const taxRate = toDecimal(rate);

    return {
      taxableProfit: profit,
      rate: taxRate,
      corporateTax: profit.mul(taxRate),
    };
  }

  static async generateCorporateTaxEstimate(
    db: any,
    params: {
      tenantId: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    const [incomeAggregate, expenseAggregate] = await Promise.all([
      db.journalLine.aggregate({
        where: {
          tenantId: params.tenantId,
          journalEntry: {
            date: {
              gte: params.startDate,
              lte: params.endDate,
            },
          },
          account: {
            category: 'REVENUE',
          },
        },
        _sum: {
          credit: true,
          debit: true,
        },
      }),
      db.journalLine.aggregate({
        where: {
          tenantId: params.tenantId,
          journalEntry: {
            date: {
              gte: params.startDate,
              lte: params.endDate,
            },
          },
          account: {
            category: 'EXPENSE',
          },
        },
        _sum: {
          debit: true,
          credit: true,
        },
      }),
    ]);

    const revenue = toDecimal(incomeAggregate._sum.credit).minus(
      toDecimal(incomeAggregate._sum.debit),
    );
    const expenses = toDecimal(expenseAggregate._sum.debit).minus(
      toDecimal(expenseAggregate._sum.credit),
    );
    const taxableProfit = revenue.minus(expenses);
    const tax = this.calculateCorporateTax(taxableProfit);

    return {
      periodStart: params.startDate,
      periodEnd: params.endDate,
      revenue,
      expenses,
      taxableProfit,
      rate: tax.rate,
      corporateTax: tax.corporateTax,
    };
  }
}