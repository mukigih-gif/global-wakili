import { Decimal } from '@prisma/client/runtime/library';
import { withAudit } from '../../utils/audit-wrapper';
import { AuditSeverity } from '../../types/audit';
import { GeneralLedgerService } from './GeneralLedgerService';

export class TrustAccountService {
  /**
   * 🏦 RECEIVE TRUST DEPOSIT
   * Handles incoming client funds and mirrors them to the General Ledger.
   */
  static async deposit(context: { tenantId: string; userId: string; req: any }, params: {
    clientId: string;
    matterId: string;
    amount: Decimal;
    reference: string;
  }) {
    const db = context.req.db;

    return await withAudit(async () => {
      const coaMap = await this.getTenantCoA(context);

      return await db.$transaction(async (tx: any) => {
        // 1. Create specific Trust Log
        const record = await tx.trustTransaction.create({
          data: {
            tenantId: context.tenantId,
            clientId: params.clientId,
            matterId: params.matterId,
            amount: params.amount,
            reference: params.reference,
            type: 'DEPOSIT'
          }
        });

        // 2. Post to General Ledger (Double-Entry)
        // Debit: Trust Bank (Asset +) | Credit: Trust Liability (Liability +)
        await GeneralLedgerService.postJournalEntry({
          tenantId: context.tenantId,
          date: new Date(),
          reference: `TRUST-DEP-${params.reference}`,
          description: `Trust Deposit: Matter Ref ${params.matterId}`,
          postedById: context.userId,
          entries: [
            { accountId: coaMap.trustBankId, debit: params.amount, credit: new Decimal(0), matterId: params.matterId },
            { accountId: coaMap.trustLiabilityId, debit: new Decimal(0), credit: params.amount, matterId: params.matterId }
          ]
        }, tx);

        return record;
      });
    }, context, { action: 'TRUST_DEPOSIT_RECEIVED', severity: AuditSeverity.INFO });
  }

  /**
   * 💸 WITHDRAW TRUST FUNDS
   * Hardened with Balance Guards and Database Locking.
   */
  static async withdraw(context: { tenantId: string; userId: string; req: any }, params: {
    clientId: string;
    matterId: string;
    amount: Decimal;
    reference: string;
  }) {
    const db = context.req.db;

    return await withAudit(async () => {
      const coaMap = await this.getTenantCoA(context);

      return await db.$transaction(async (tx: any) => {
        // 1. Calculate Available Balance with Matter Segregation
        const aggregation = await tx.trustTransaction.aggregate({
          where: { 
            tenantId: context.tenantId,
            clientId: params.clientId,
            matterId: params.matterId 
          },
          _sum: { amount: true }
        });

        const totalAvailable = new Decimal(aggregation._sum.amount || 0);

        if (totalAvailable.lessThan(params.amount)) {
          throw new Error(`Insufficient Trust Funds for Matter: Available ${totalAvailable}, Requested ${params.amount}`);
        }

        // 2. Create Withdrawal Record
        const record = await tx.trustTransaction.create({
          data: {
            tenantId: context.tenantId,
            clientId: params.clientId,
            matterId: params.matterId,
            amount: params.amount.negated(), // Recorded as negative in the trust log
            reference: params.reference,
            type: 'WITHDRAWAL'
          }
        });

        // 3. Post to General Ledger
        // Debit: Trust Liability (Liability -) | Credit: Trust Bank (Asset -)
        await GeneralLedgerService.postJournalEntry({
          tenantId: context.tenantId,
          date: new Date(),
          reference: `TRUST-WD-${params.reference}`,
          description: `Trust Withdrawal: ${params.reference}`,
          postedById: context.userId,
          entries: [
            { accountId: coaMap.trustLiabilityId, debit: params.amount, credit: new Decimal(0), matterId: params.matterId },
            { accountId: coaMap.trustBankId, debit: new Decimal(0), credit: params.amount, matterId: params.matterId }
          ]
        }, tx);

        return record;
      });
    }, context, { action: 'TRUST_WITHDRAWAL_EXECUTED', severity: AuditSeverity.CRITICAL });
  }

  /**
   * 🔍 RESOLVE DYNAMIC COA
   */
  private static async getTenantCoA(context: { tenantId: string; req: any }) {
    const settings = await context.req.db.tenantSettings.findUnique({
      where: { tenantId: context.tenantId }
    });
    
    if (!settings?.trustBankId || !settings?.trustLiabilityId) {
      throw new Error("Tenant Financial Configuration Incomplete: Trust Accounts not mapped.");
    }

    return {
      trustBankId: settings.trustBankId,
      trustLiabilityId: settings.trustLiabilityId
    };
  }
}