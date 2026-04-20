import { prisma } from '../../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import { AppError } from '../../utils/AppError';
import { withAudit } from '../../utils/audit-wrapper';
import { AuditSeverity } from '../../types/audit';

/**
 * 🏦 BANK STATEMENT SERVICE v3
 * Unified: Idempotency, Status Tracking, Tenant Settings Integration, Historical Balances, Reconciliation Logging.
 */
export class BankStatementService {
  
  /**
   * 📥 IMPORT BANK STATEMENT
   * Hardened: Upsert logic prevents duplicate references (Idempotency).
   * Adds status tracking and reconciliation logging.
   */
  static async importBankStatement(
    context: { tenantId: string; actor: any; req?: any }, 
    transactions: {
      date: Date;
      description: string;
      amount: Decimal;
      reference: string;
      accountNumber: string;
    }[]
  ) {
    return await withAudit(async () => {
      if (!transactions.length) {
        throw new AppError('No transactions provided for import', 400, 'EMPTY_IMPORT');
      }

      const results = await Promise.all(
        transactions.map((tx) =>
          prisma.bankStatement.upsert({
            where: { 
              tenantId_reference: { 
                tenantId: context.tenantId, 
                reference: tx.reference 
              } 
            },
            update: {}, 
            create: {
              tenantId: context.tenantId,
              date: tx.date,
              description: tx.description,
              amount: new Decimal(tx.amount || 0),
              reference: tx.reference,
              accountNumber: tx.accountNumber,
              importedById: context.actor.id,
              status: 'UNMATCHED'
            }
          })
        )
      );

      // Immutable reconciliation log
      await prisma.reconciliationLog.create({
        data: {
          tenantId: context.tenantId,
          type: 'BANK_IMPORT',
          reconciledById: context.actor.id,
          status: 'IMPORTED',
          discrepancyTrustClient: new Decimal(0),
          discrepancyClientBank: new Decimal(0)
        }
      });

      return { count: results.length };
    }, context, { action: 'BANK_STATEMENT_IMPORT', severity: AuditSeverity.INFO });
  }

  /**
   * 💰 GET TRUST BANK BALANCE
   * Uses tenant settings to identify mapped Trust Bank account.
   * Supports historical "as of date" reconciliation.
   */
  static async getTrustBankBalance(tenantId: string, asOfDate?: Date) {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { trustBankAccountId: true }
    });

    if (!settings?.trustBankAccountId) {
      throw new AppError('No Trust Bank Account mapped in tenant settings.', 400, 'NO_TRUST_BANK_ACCOUNT');
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: settings.trustBankAccountId }
    });

    if (!bankAccount) {
      throw new AppError('Mapped Trust Bank Account not found.', 404, 'BANK_ACCOUNT_NOT_FOUND');
    }

    const aggregate = await prisma.bankStatement.aggregate({
      where: {
        tenantId,
        accountNumber: bankAccount.accountNumber,
        ...(asOfDate ? { date: { lte: asOfDate } } : {})
      },
      _sum: { amount: true }
    });

    return new Decimal(aggregate._sum.amount || 0);
  }

  /**
   * 🔍 AUTOMATED RECONCILIATION MATCHING
   * Matches bank transactions to journal entries by reference AND amount.
   * Updates status and logs reconciliation.
   */
  static async matchTransactions(context: { tenantId: string }) {
    return await withAudit(async () => {
      const unmatched = await prisma.bankStatement.findMany({
        where: { tenantId: context.tenantId, matchedJournalId: null, status: 'UNMATCHED' }
      });

      let matchedCount = 0;

      for (const tx of unmatched) {
        const match = await prisma.journalEntry.findFirst({
          where: {
            tenantId: context.tenantId,
            reference: tx.reference,
            amount: tx.amount
          }
        });

        if (match) {
          await prisma.bankStatement.update({
            where: { id: tx.id },
            data: { matchedJournalId: match.id, status: 'MATCHED' }
          });
          matchedCount++;
        }
      }

      await prisma.reconciliationLog.create({
        data: {
          tenantId: context.tenantId,
          type: 'BANK_MATCH',
          reconciledById: null,
          status: matchedCount > 0 ? 'MATCHED' : 'NO_MATCH',
          discrepancyTrustClient: new Decimal(0),
          discrepancyClientBank: new Decimal(0)
        }
      });

      return { matchedCount, pendingCount: unmatched.length - matchedCount };
    }, context, { action: 'BANK_TRANSACTION_MATCHING', severity: AuditSeverity.LOW });
  }
}
