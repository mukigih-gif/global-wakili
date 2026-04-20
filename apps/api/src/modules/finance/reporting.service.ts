import type { Request } from 'express';
import { TrialBalanceService } from './trialbalanceservice';
import { BalanceSheetService } from './balancesheetservice';
import { CashflowService } from './cashflowservice';

export class ReportingService {
  static async getTrialBalanceReport(req: Request, asOfDate?: Date) {
    if (asOfDate) {
      return TrialBalanceService.getAsOf(req, asOfDate);
    }

    return TrialBalanceService.getCurrent(req);
  }

  static async getBalanceSheetReport(req: Request, asOfDate?: Date) {
    return BalanceSheetService.getAsOf(req, asOfDate ?? new Date());
  }

  static async getCashflowReport(
    req: Request,
    range: { start: Date; end: Date },
  ) {
    return CashflowService.getForPeriod(req, range);
  }

  static async getDashboardSnapshot(req: Request) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [trialBalance, balanceSheet, cashflow] = await Promise.all([
      TrialBalanceService.getCurrent(req),
      BalanceSheetService.getAsOf(req, now),
      CashflowService.getForPeriod(req, {
        start: monthStart,
        end: now,
      }),
    ]);

    return {
      generatedAt: now,
      trialBalance,
      balanceSheet,
      cashflow,
    };
  }
}