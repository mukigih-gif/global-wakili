import { Decimal } from '@prisma/client/runtime/library';
import { withAudit } from '../../utils/audit-wrapper';
import { AuditSeverity } from '../../types/audit';
import { GeneralLedgerService } from './GeneralLedgerService';

export class PettyCashService {
  /**
   * 🪙 RECORD PETTY CASH VOUCHER
   * Digitalizes the office physical cash tin.
   */
  static async recordVoucher(context: { actor: any; tenantId: string; req: any }, params: {
    amount: number;
    description: string;
    category: 'TRANSPORT' | 'OFFICE_SUPPLIES' | 'MEALS' | 'COMMUNICATION';
    matterId?: string; // Optional: If the cash was spent on a specific case
  }) {
    const db = context.req.db;

    return await withAudit(async () => {
      const coaMap = await this.getTenantCoA(context);

      return await db.$transaction(async (tx: any) => {
        // 1. Map category to actual Expense Account UUID
        const expenseAccountId = coaMap.expenseMapping[params.category];
        if (!expenseAccountId) throw new Error("CoA Mapping missing for this category.");

        // 2. Post to Ledger
        // DEBIT: Specific Expense Account (Increasing expense)
        // CREDIT: Petty Cash Asset (Decreasing physical cash)
        await GeneralLedgerService.postJournalEntry({
          tenantId: context.tenantId,
          date: new Date(),
          reference: `PCV-${Date.now().toString().slice(-6)}`, // Short reference for physical vouchers
          description: `Petty Cash: ${params.description}`,
          postedById: context.actor.id,
          entries: [
            { accountId: expenseAccountId, debit: new Decimal(params.amount), credit: new Decimal(0), matterId: params.matterId },
            { accountId: coaMap.pettyCashAssetId, debit: new Decimal(0), credit: new Decimal(params.amount), matterId: params.matterId }
          ]
        }, tx);

        // 3. Keep a simple, flat log for the Secretary/Clerk to view
        return await tx.expenseEntry.create({
          data: {
            tenantId: context.tenantId,
            matterId: params.matterId,
            amount: new Decimal(params.amount),
            description: params.description,
            category: params.category,
            source: 'PETTY_CASH',
            status: params.matterId ? 'UNBILLED' : 'BILLED', // If office expense, it's already "billed" to the firm
            createdById: context.actor.id
          }
        });
      });
    }, context, { action: 'PETTY_CASH_VOUCHER_RECORDED', severity: AuditSeverity.INFO });
  }

  /**
   * 📊 GET FLOAT STATUS
   * Checks the "Cash in Tin" against the authorized Imprest amount.
   */
  static async getFloatStatus(context: { tenantId: string; req: any }) {
    const db = context.req.db;
    
    const settings = await db.tenantSettings.findUnique({ where: { tenantId: context.tenantId } });
    if (!settings?.pettyCashAssetId) throw new Error("Petty Cash Account not configured.");

    const imprestLimit = new Decimal(settings.pettyCashImprestLimit || 50000); // Default to 50k KES if not set

    // The actual cash remaining in the GL Asset Account
    const cashAggregation = await db.journalLine.aggregate({
      where: { tenantId: context.tenantId, accountId: settings.pettyCashAssetId },
      _sum: { debit: true, credit: true }
    });

    const currentCashInTin = new Decimal(cashAggregation._sum.debit || 0).minus(cashAggregation._sum.credit || 0);
    const utilizationPercent = imprestLimit.minus(currentCashInTin).dividedBy(imprestLimit).mul(100);

    return {
      authorizedFloat: imprestLimit,
      currentCashInTin,
      spentAmount: imprestLimit.minus(currentCashInTin),
      utilizationPercent: utilizationPercent.toNumber(),
      replenishmentNeeded: currentCashInTin.lessThan(new Decimal(10000)) // Flag if below 10k KES
    };
  }

  private static async getTenantCoA(context: any) {
    const settings = await context.req.db.tenantSettings.findUnique({ where: { tenantId: context.tenantId } });
    return {
      pettyCashAssetId: settings.pettyCashAssetId,
      expenseMapping: {
        TRANSPORT: settings.transportExpenseId,
        OFFICE_SUPPLIES: settings.suppliesExpenseId,
        COMMUNICATION: settings.communicationExpenseId,
        MEALS: settings.mealsExpenseId
      }
    };
  }
}