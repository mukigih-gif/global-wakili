import { Decimal } from '@prisma/client/runtime/library';
import { withAudit } from '../../utils/audit-wrapper';
import { AuditSeverity } from '../../types/audit';
import { GeneralLedgerService } from './GeneralLedgerService';

export class DisbursementService {
  /**
   * 💸 RECORD DISBURSEMENT
   * Handles the actual spending of money on behalf of a matter.
   */
  static async recordDisbursement(
    context: { actor: any; tenantId: string; req: any },
    params: {
      matterId: string;
      amount: Decimal;
      description: string;
      category: 'FILING_FEE' | 'TRANSPORT' | 'COMMUNICATION' | 'STAMP_DUTY';
      source: 'OFFICE' | 'TRUST'; // Critical: Where is the money coming from?
    }
  ) {
    const db = context.req.db;

    return await withAudit(async () => {
      const coaMap = await this.getTenantCoA(context);

      return await db.$transaction(async (tx: any) => {
        // 1. Create the Expense/Disbursement Entry
        const disbursement = await tx.expenseEntry.create({
          data: {
            tenantId: context.tenantId,
            matterId: params.matterId,
            amount: params.amount,
            description: params.description,
            category: params.category,
            status: 'UNBILLED',
            isTaxable: params.category !== 'FILING_FEE', // Filing fees are usually VAT exempt
            source: params.source,
            createdById: context.actor.id
          }
        });

        // 2. LOGIC BRANCH: OFFICE vs TRUST
        if (params.source === 'OFFICE') {
          // Debit: Disbursements Recoverable (Asset +) | Credit: Office Bank (Asset -)
          await GeneralLedgerService.postJournalEntry({
            tenantId: context.tenantId,
            date: new Date(),
            reference: `DISB-OFF-${disbursement.id}`,
            description: `Office Disbursement: ${params.description}`,
            postedById: context.actor.id,
            entries: [
              { accountId: coaMap.disbursementsRecoverableId, debit: params.amount, credit: new Decimal(0), matterId: params.matterId },
              { accountId: coaMap.officeBankId, debit: new Decimal(0), credit: params.amount, matterId: params.matterId }
            ]
          }, tx);
        } else {
          // Check Trust Balance first
          const balance = await tx.trustTransaction.aggregate({
            where: { matterId: params.matterId, tenantId: context.tenantId },
            _sum: { amount: true }
          });

          if (new Decimal(balance._sum.amount || 0).lessThan(params.amount)) {
            throw new Error('Insufficient Trust Funds to cover this disbursement.');
          }

          // Debit: Trust Liability (Liability -) | Credit: Trust Bank (Asset -)
          await GeneralLedgerService.postJournalEntry({
            tenantId: context.tenantId,
            date: new Date(),
            reference: `DISB-TRU-${disbursement.id}`,
            description: `Trust Disbursement: ${params.description}`,
            postedById: context.actor.id,
            entries: [
              { accountId: coaMap.trustLiabilityId, debit: params.amount, credit: new Decimal(0), matterId: params.matterId },
              { accountId: coaMap.trustBankId, debit: new Decimal(0), credit: params.amount, matterId: params.matterId }
            ]
          }, tx);
        }

        return disbursement;
      });
    }, context, { action: 'DISBURSEMENT_RECORDED', severity: AuditSeverity.INFO });
  }

  private static async getTenantCoA(context: any) {
    const settings = await context.req.db.tenantSettings.findUnique({
      where: { tenantId: context.tenantId }
    });
    return {
      officeBankId: settings.officeBankId,
      trustBankId: settings.trustBankId,
      trustLiabilityId: settings.trustLiabilityId,
      disbursementsRecoverableId: settings.disbursementsRecoverableId
    };
  }
}