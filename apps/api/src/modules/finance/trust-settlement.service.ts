import { Decimal } from '@prisma/client/runtime/library';
import { withAudit } from '../../utils/audit-wrapper';
import { AuditSeverity } from '../../types/audit';
import { GeneralLedgerService } from './GeneralLedgerService';

export class TrustSettlementService {
  /**
   * ⚖️ AUTOMATED TRUST-TO-OFFICE TRANSFER
   * Clears an unpaid invoice using available trust funds for the specific matter.
   */
  static async settleInvoiceFromTrust(context: { actor: any; tenantId: string; req: any }, invoiceId: string) {
    const db = context.req.db;

    return await withAudit(async () => {
      const coaMap = await this.getTenantCoA(context);

      return await db.$transaction(async (tx: any) => {
        // 1. Fetch Invoice
        const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice || ['PROFORMA', 'PAID', 'CANCELLED'].includes(invoice.status)) {
          throw new Error('Invoice not eligible for settlement.');
        }

        const balanceDue = new Decimal(invoice.total).minus(invoice.amountPaid || 0);

        // 2. Check Matter Trust Balance
        const trustAggregation = await tx.trustTransaction.aggregate({
          where: { tenantId: context.tenantId, matterId: invoice.matterId },
          _sum: { amount: true }
        });
        const trustBalance = new Decimal(trustAggregation._sum.amount || 0);

        if (trustBalance.lessThanOrEqualTo(0)) {
          throw new Error('No trust funds available for this matter.');
        }

        // 3. Determine Transfer Amount (We can only take up to the balance due)
        const transferAmount = trustBalance.greaterThanOrEqualTo(balanceDue) ? balanceDue : trustBalance;

        // 4. Update Trust Log (Decrease Trust)
        await tx.trustTransaction.create({
          data: {
            tenantId: context.tenantId,
            clientId: invoice.clientId,
            matterId: invoice.matterId,
            amount: transferAmount.negated(),
            reference: `SETTLE-INV-${invoice.id}`,
            type: 'WITHDRAWAL'
          }
        });

        // 5. FOUR-WAY LEDGER POSTING
        // Leg 1: Move money out of Trust Bank
        // Debit: Trust Liability (Liability -) | Credit: Trust Bank (Asset -)
        await GeneralLedgerService.postJournalEntry({
          tenantId: context.tenantId,
          date: new Date(),
          reference: `TRU-OUT-${invoice.id}`,
          description: `Trust transfer out for Invoice #${invoice.id}`,
          postedById: context.actor.id,
          entries: [
            { accountId: coaMap.trustLiabilityId, debit: transferAmount, credit: new Decimal(0), matterId: invoice.matterId },
            { accountId: coaMap.trustBankId, debit: new Decimal(0), credit: transferAmount, matterId: invoice.matterId }
          ]
        }, tx);

        // Leg 2: Move money into Office Bank and Clear AR
        // Debit: Office Bank (Asset +) | Credit: Accounts Receivable (Asset -)
        await GeneralLedgerService.postJournalEntry({
          tenantId: context.tenantId,
          date: new Date(),
          reference: `OFF-IN-${invoice.id}`,
          description: `Office receipt from Trust for Invoice #${invoice.id}`,
          postedById: context.actor.id,
          entries: [
            { accountId: coaMap.officeBankId, debit: transferAmount, credit: new Decimal(0), matterId: invoice.matterId },
            { accountId: coaMap.accountsReceivableId, debit: new Decimal(0), credit: transferAmount, matterId: invoice.matterId }
          ]
        }, tx);

        // 6. Update Invoice Status
        const newAmountPaid = new Decimal(invoice.amountPaid || 0).add(transferAmount);
        const newStatus = newAmountPaid.greaterThanOrEqualTo(invoice.total) ? 'PAID' : 'PARTIALLY_PAID';

        return await tx.invoice.update({
          where: { id: invoiceId },
          data: { amountPaid: newAmountPaid, status: newStatus }
        });
      });
    }, context, { action: 'TRUST_TO_OFFICE_SETTLEMENT', severity: AuditSeverity.CRITICAL });
  }

  private static async getTenantCoA(context: any) {
    const settings = await context.req.db.tenantSettings.findUnique({ where: { tenantId: context.tenantId } });
    return {
      trustBankId: settings.trustBankId,
      trustLiabilityId: settings.trustLiabilityId,
      officeBankId: settings.officeBankId,
      accountsReceivableId: settings.accountsReceivableId
    };
  }
}