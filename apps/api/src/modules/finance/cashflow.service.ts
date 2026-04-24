import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class CashflowService {
  static async getForPeriod(
    req: Request,
    range: { start: Date; end: Date },
  ) {
    const db = req.db;
    const tenantId = req.tenantId!;

    const lines = await db.journalLine.findMany({
      where: {
        tenantId,
        journal: {
          date: {
            gte: range.start,
            lte: range.end,
          },
          reversalOfId: null,
        },
        account: {
          subtype: {
            in: ['OFFICE_BANK', 'TRUST_BANK'],
          },
        },
      },
      select: {
        debit: true,
        credit: true,
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            subtype: true,
          },
        },
      },
    });

    const byAccount = new Map<
      string,
      {
        accountId: string;
        code: string;
        name: string;
        subtype: string | null;
        inflow: Prisma.Decimal;
        outflow: Prisma.Decimal;
        net: Prisma.Decimal;
      }
    >();

    for (const line of lines) {
      const key = line.account.id;
      const debit = toDecimal(line.debit);
      const credit = toDecimal(line.credit);

      if (!byAccount.has(key)) {
        byAccount.set(key, {
          accountId: line.account.id,
          code: line.account.code,
          name: line.account.name,
          subtype: line.account.subtype,
          inflow: new Prisma.Decimal(0),
          outflow: new Prisma.Decimal(0),
          net: new Prisma.Decimal(0),
        });
      }

      const row = byAccount.get(key)!;
      row.inflow = row.inflow.plus(debit);
      row.outflow = row.outflow.plus(credit);
      row.net = row.inflow.minus(row.outflow);
    }

    const rows = [...byAccount.values()];

    const totalInflow = rows.reduce(
      (acc, row) => acc.plus(row.inflow),
      new Prisma.Decimal(0),
    );
    const totalOutflow = rows.reduce(
      (acc, row) => acc.plus(row.outflow),
      new Prisma.Decimal(0),
    );
    const netCashflow = totalInflow.minus(totalOutflow);

    return {
      periodStart: range.start,
      periodEnd: range.end,
      totalInflow,
      totalOutflow,
      netCashflow,
      rows,
    };
  }
}