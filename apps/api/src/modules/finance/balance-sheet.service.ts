import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { TrialBalanceService } from './trialbalanceservice';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class BalanceSheetService {
  static async getAsOf(req: Request, asOfDate: Date = new Date()) {
    const rows = await TrialBalanceService.getAsOf(req, asOfDate);

    let assets = new Prisma.Decimal(0);
    let liabilities = new Prisma.Decimal(0);
    let equity = new Prisma.Decimal(0);

    for (const row of rows) {
      const balance = toDecimal(row.netBalance);

      if (row.type === 'ASSET') {
        assets = assets.plus(balance);
      } else if (row.type === 'LIABILITY') {
        liabilities = liabilities.plus(balance.abs());
      } else if (row.type === 'EQUITY') {
        equity = equity.plus(balance.abs());
      }
    }

    return {
      asOfDate,
      assets,
      liabilities,
      equity,
      isBalanced: assets.equals(liabilities.plus(equity)),
    };
  }
}