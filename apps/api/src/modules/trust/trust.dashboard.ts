import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { TrustViolationService } from './TrustViolationService';

const ZERO = new Prisma.Decimal(0);

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return ZERO;
  }

  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export class TrustDashboardService {
  static async getDashboard(req: Request) {
    const db = req.db;
    const tenantId = req.tenantId!;

    const [
      trustAccountsAggregate,
      trustAccountsCount,
      activeClientLedgers,
      latestReconciliations,
      violations,
    ] = await Promise.all([
      db.trustAccount.aggregate({
        where: { tenantId },
        _sum: { currentBalance: true },
      }),
      db.trustAccount.count({
        where: { tenantId },
      }),
      db.clientTrustLedger.count({
        where: { tenantId },
      }),
      db.trustReconciliation.findMany({
        where: { tenantId },
        distinct: ['trustAccountId'],
        orderBy: [{ trustAccountId: 'asc' }, { statementDate: 'desc' }],
        select: {
          trustAccountId: true,
          isCompleted: true,
        },
      }),
      TrustViolationService.getAllViolations(req),
    ]);

    const unreconciledAccounts = latestReconciliations.filter(
      (row) => !row.isCompleted,
    ).length;

    return {
      generatedAt: new Date(),
      totalTrustAccounts: trustAccountsCount,
      totalTrustBalance: toDecimal(trustAccountsAggregate._sum?.currentBalance),
      activeClientLedgers,
      unreconciledAccounts,
      totalViolations: violations.totalViolations,
      matterOverdraws: violations.matterOverdraws.length,
      trustAccountOverdraws: violations.trustOverdraws.length,
      ledgerMismatches: violations.ledgerMismatch.length,
    };
  }
}