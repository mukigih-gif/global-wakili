// apps/api/src/modules/trust/TrustReportService.ts

import { Prisma } from '@global-wakili/database';
import { TrustLedgerService } from './TrustLedgerService';
import { TrustReconciliationService } from './TrustReconciliationService';

const ZERO = new Prisma.Decimal(0);

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  const parsed = new Prisma.Decimal(value as any);
  return parsed.isFinite() ? parsed.toDecimalPlaces(2) : ZERO;
}

export class TrustReportService {
  static async getClientTrustBalances(req: any, filters: {
    clientId?: string;
    matterId?: string;
    trustAccountId?: string;
  } = {}) {
    return TrustLedgerService.getLedgerSummary(req, filters);
  }

  static async getTrustAccountBalances(req: any) {
    const accounts = await req.db.trustAccount.findMany({
      where: {
        tenantId: req.tenantId,
      },
      include: {
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = accounts.reduce(
      (sum: Prisma.Decimal, account: any) => sum.plus(money(account.balance)),
      ZERO,
    );

    return {
      tenantId: req.tenantId,
      accountCount: accounts.length,
      totalTrustBalance: total.toDecimalPlaces(2),
      accounts,
      generatedAt: new Date(),
    };
  }

  static async getReconciliationReport(req: any, filters: {
    trustAccountId?: string;
  } = {}) {
    const reconciliations = await TrustReconciliationService.listReconciliations(
      req,
      filters.trustAccountId,
    );

    const balanced = reconciliations.filter((row: any) => row.isBalanced).length;
    const exceptions = reconciliations.length - balanced;

    return {
      tenantId: req.tenantId,
      trustAccountId: filters.trustAccountId ?? null,
      reconciliationCount: reconciliations.length,
      balancedCount: balanced,
      exceptionCount: exceptions,
      reconciliations,
      generatedAt: new Date(),
    };
  }
}

export default TrustReportService;