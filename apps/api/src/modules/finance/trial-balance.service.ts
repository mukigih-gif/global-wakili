import type { Request } from 'express';
import { GeneralLedgerService } from './GeneralLedgerService';

export class TrialBalanceService {
  static async getCurrent(req: Request) {
    return GeneralLedgerService.getCurrentTrialBalance(req);
  }

  static async getAsOf(req: Request, asOfDate: Date) {
    return GeneralLedgerService.getHistoricalTrialBalance(req, asOfDate);
  }

  static async assertBalanced(req: Request, asOfDate?: Date) {
    const rows = asOfDate
      ? await this.getAsOf(req, asOfDate)
      : await this.getCurrent(req);

    const totals = rows.reduce(
      (acc: { debit: number; credit: number }, row: any) => {
        acc.debit += Number(row.debit);
        acc.credit += Number(row.credit);
        return acc;
      },
      { debit: 0, credit: 0 },
    );

    return {
      isBalanced: totals.debit === totals.credit,
      totalDebit: totals.debit,
      totalCredit: totals.credit,
      rows,
    };
  }
}