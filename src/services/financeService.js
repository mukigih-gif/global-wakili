import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const FinanceService = {
  /**
   * 1. TIME BILLING & COSTING LOGIC
   * Automatically calculates subtotal, VAT, and total from unbilled entries.
   */
  async generateInvoiceData(matterId: number) {
    // Fetch unbilled time
    const unbilledTime = await prisma.timeEntry.findMany({
      where: { matterId, status: "UNBILLED" }
    });

    // Fetch unbilled disbursements
    const disbursements = await prisma.expense.findMany({
      where: { matterId, type: "DISBURSEMENT", status: "PENDING_REIMBURSEMENT" }
    });

    const timeTotal = unbilledTime.reduce((sum, entry) => sum + (entry.duration * entry.rate), 0);
    const disbursementTotal = disbursements.reduce((sum, exp) => sum + exp.amount, 0);

    const amount = timeTotal + disbursementTotal;
    const vat = amount * 0.16; // 16% VAT (Standard Kenyan Rate)
    const total = amount + vat;

    return { amount, vat, total, unbilledTime, disbursements };
  },

  /**
   * 2. DEPOSIT DRAWDOWN LOGIC
   * Moves funds from Trust Account to Office Account to pay an invoice.
   */
  async processDrawdown(invoiceId: number, trustAccountId: number, officeAccountId: number) {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new Error("Invoice not found");

      // 1. Decrease Trust Account Balance
      await tx.account.update({
        where: { id: trustAccountId },
        data: { balance: { decrement: invoice.total } }
      });

      // 2. Increase Office Account Balance
      await tx.account.update({
        where: { id: officeAccountId },
        data: { balance: { increment: invoice.total } }
      });

      // 3. Update Invoice Status to FULLY_PAID
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "FULLY_PAID" }
      });

      // 4. Record the internal movement as a Transaction
      await tx.transaction.create({
        data: {
          amount: invoice.total,
          description: `Internal Transfer: Trust to Office for Invoice #${invoice.invoiceNo}`,
          accountId: officeAccountId
        }
      });

      return updatedInvoice;
    });
  },

  /**
   * 3. INVOICE AGING REPORT LOGIC
   * Returns a breakdown of what is owed to the firm by age.
   */
  async getAgingReport() {
    const today = new Date();
    const invoices = await prisma.invoice.findMany({
      where: { status: { not: "FULLY_PAID" } }
    });

    const report = {
      current: 0,   // Due in the future
      thirty: 0,    // 1-30 days overdue
      sixty: 0,     // 31-60 days overdue
      ninetyPlus: 0 // 90+ days overdue
    };

    invoices.forEach(inv => {
      if (!inv.dueDate) return;
      const diffInDays = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24));

      if (diffInDays <= 0) report.current += inv.total;
      else if (diffInDays <= 30) report.thirty += inv.total;
      else if (diffInDays <= 60) report.sixty += inv.total;
      else report.ninetyPlus += inv.total;
    });

    return report;
  }
};