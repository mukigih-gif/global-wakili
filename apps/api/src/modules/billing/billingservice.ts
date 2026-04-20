import { Decimal } from '@prisma/client/runtime/library';
import { GeneralLedgerService } from './GeneralLedgerService';

export class BillingService {
  /**
   * 📑 1. GENERATE PROFORMA
   * Creates a draft for client review. No GL impact.
   */
  static async generateProforma(context: { tenantId: string; req: any }, params: { clientId: string; matterId: string }) {
    const db = context.req.db;

    return await db.$transaction(async (tx: any) => {
      // Fetch all unbilled work and expenses
      const [timeEntries, expenses] = await Promise.all([
        tx.timeEntry.findMany({ where: { tenantId: context.tenantId, matterId: params.matterId, status: 'UNBILLED' } }),
        tx.expenseEntry.findMany({ where: { tenantId: context.tenantId, matterId: params.matterId, status: 'UNBILLED' } })
      ]);

      const feesTotal = timeEntries.reduce((acc: Decimal, t: any) => acc.add(new Decimal(t.hours).mul(t.rate)), new Decimal(0));
      const expensesTotal = expenses.reduce((acc: Decimal, e: any) => acc.add(e.amount), new Decimal(0));
      
      const subTotal = feesTotal.add(expensesTotal);
      const vat = subTotal.mul(0.16); // Standard Kenyan VAT

      const proforma = await tx.invoice.create({
        data: {
          tenantId: context.tenantId,
          clientId: params.clientId,
          matterId: params.matterId,
          status: 'PROFORMA',
          subTotal,
          vatAmount: vat,
          total: subTotal.add(vat),
          // Link items to prevent them being picked up by other drafts
          timeEntries: { connect: timeEntries.map((t: any) => ({ id: t.id })) },
          expenses: { connect: expenses.map((e: any) => ({ id: e.id })) }
        }
      });

      return proforma;
    });
  }

  /**
   * 🧾 2. FINALIZE INVOICE
   * Locks work, upgrades status, and posts to the General Ledger.
   */
  static async finalizeInvoice(context: { tenantId: string; userId: string; req: any }, invoiceId: string) {
    const db = context.req.db;

    return await db.$transaction(async (tx: any) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { timeEntries: true, expenses: true }
      });

      if (!invoice || invoice.status !== 'PROFORMA') {
        throw new Error('Invalid Invoice State: Only Proforma invoices can be finalized.');
      }

      const coaMap = await this.getTenantCoA(context);

      // 🔒 LOCK ITEMS: Mark as permanently BILLED
      await Promise.all([
        tx.timeEntry.updateMany({ where: { invoiceId: invoice.id }, data: { status: 'BILLED' } }),
        tx.expenseEntry.updateMany({ where: { invoiceId: invoice.id }, data: { status: 'BILLED' } })
      ]);

      // 📒 POST TO GENERAL LEDGER (Double-Entry)
      // Debit: Accounts Receivable (Asset +)
      // Credit: Legal Fees Revenue (Revenue +)
      // Credit: VAT Output Account (Liability +)
      await GeneralLedgerService.postJournalEntry({
        tenantId: context.tenantId,
        date: new Date(),
        reference: `INV-${invoice.id}`,
        description: `Finalized Invoice for Matter ${invoice.matterId}`,
        postedById: context.userId,
        entries: [
          { accountId: coaMap.arAccount, debit: invoice.total, credit: new Decimal(0), matterId: invoice.matterId },
          { accountId: coaMap.revenueAccount, debit: new Decimal(0), credit: invoice.subTotal, matterId: invoice.matterId },
          { accountId: coaMap.vatAccount, debit: new Decimal(0), credit: invoice.vatAmount, matterId: invoice.matterId }
        ]
      }, tx);

      // 🧾 UPDATE INVOICE STATUS
      return await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'FINAL', finalizedAt: new Date() }
      });
    });
  }

  private static async getTenantCoA(context: any) {
    const settings = await context.req.db.tenantSettings.findUnique({
      where: { tenantId: context.tenantId }
    });
    return {
      arAccount: settings.accountsReceivableId,
      revenueAccount: settings.legalFeesRevenueId,
      vatAccount: settings.vatOutputId
    };
  }
}