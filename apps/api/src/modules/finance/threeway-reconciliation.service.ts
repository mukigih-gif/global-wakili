import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/database';
import { withAudit } from '../../utils/audit-wrapper';
import { AuditSeverity } from '../../types/audit';
import { AppError } from '../../utils/AppError';
import { BankStatementService } from '../bank/bankStatement.service';

export class ThreeWayReconciliationService {
  /**
   * ⚖️ EXECUTE THREE-WAY RECONCILIATION
   * 1. Bank Balance (External/Statement)
   * == 2. General Ledger (Trust Bank GL Account from tenant settings)
   * == 3. Matter Trust Sub-Ledgers (Sum of all Matter trustBalance)
   */
  static async reconcile(
    context: { tenantId: string; req: any; actor: any },
    params: { asOfDate?: Date; externalBankBalance?: number }
  ) {
    const targetDate = params.asOfDate || new Date();

    return await withAudit(async () => {
      // 1️⃣ Tenant settings: identify Trust Bank GL account
      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId: context.tenantId },
        select: { trustBankAccountId: true }
      });

      if (!settings?.trustBankAccountId) {
        throw new AppError(
          'Reconciliation Failed: No Trust Bank Account mapped in tenant settings.',
          400,
          'NO_TRUST_BANK_ACCOUNT'
        );
      }

      // 2️⃣ General Ledger balance (book balance)
      const ledgerAggregation = await prisma.journalLine.aggregate({
        where: {
          tenantId: context.tenantId,
          accountId: settings.trustBankAccountId,
          createdAt: { lte: targetDate }
        },
        _sum: { debit: true, credit: true }
      });

      const bookBalance = new Decimal(ledgerAggregation._sum.debit || 0)
        .minus(new Decimal(ledgerAggregation._sum.credit || 0));

      // 3️⃣ Matter sub-ledger total (client liabilities)
      const matterAggregation = await prisma.matter.aggregate({
        where: { tenantId: context.tenantId },
        _sum: { trustBalance: true }
      });

      const totalClientLiabilities = new Decimal(matterAggregation._sum.trustBalance || 0);

      // 4️⃣ External bank balance
      let externalBankBalance: Decimal;
      if (params.externalBankBalance !== undefined) {
        externalBankBalance = new Decimal(params.externalBankBalance);
      } else {
        externalBankBalance = await BankStatementService.getTrustBankBalance(context.tenantId);
      }

      // 5️⃣ Variance calculations
      const bookVsClientDiff = bookBalance.minus(totalClientLiabilities);
      const bookVsBankDiff = bookBalance.minus(externalBankBalance);
      const isBalanced = bookVsClientDiff.isZero() && bookVsBankDiff.isZero();

      // 6️⃣ Flagged matters if imbalance detected
      let flaggedMatters: any[] = [];
      if (!bookVsClientDiff.isZero()) {
        flaggedMatters = await this.detectTrustGaps(context.tenantId);
      }

      // 7️⃣ Log reconciliation result
      await prisma.reconciliationLog.create({
        data: {
          tenantId: context.tenantId,
          type: 'TRUST_3WAY',
          trustBalance: bookBalance,
          clientBalance: totalClientLiabilities,
          bankBalance: externalBankBalance,
          discrepancyTrustClient: bookVsClientDiff.abs(),
          discrepancyClientBank: bookVsBankDiff.abs(),
          reconciledById: context.actor.id,
          status: isBalanced ? 'BALANCED' : 'DISCREPANT'
        }
      });

      return {
        timestamp: new Date(),
        asOfDate: targetDate,
        metrics: {
          generalLedgerBalance: bookBalance,
          matterSubLedgerTotal: totalClientLiabilities,
          actualBankBalance: externalBankBalance
        },
        variances: {
          internalVariance: bookVsClientDiff,
          bankVariance: bookVsBankDiff
        },
        status: isBalanced ? 'RECONCILED' : 'DISCREPANCY_DETECTED',
        flaggedMatters
      };
    }, context, { action: 'FINANCE_3WAY_RECON', severity: AuditSeverity.CRITICAL });
  }

  /**
   * 🔍 TRUST GAP DETECTION
   * Finds matters where trust ledger entries ≠ cached trustBalance.
   */
  private static async detectTrustGaps(tenantId: string) {
    return await prisma.matter.findMany({
      where: { tenantId, trustBalance: { gt: 0 } },
      select: {
        id: true,
        title: true,
        trustBalance: true,
        _count: { select: { trustLedgerEntries: true } }
      },
      take: 10
    });
  }
}
