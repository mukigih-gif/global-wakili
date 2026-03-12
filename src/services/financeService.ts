import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const FinanceService = {
  /**
   * 1. UNIFIED LEDGER QUERY
   * Reconstructs a Matter's financial timeline for auditing.
   */
  async getMatterLedger(matterId: number) {
    const matter = await prisma.matter.findUnique({
      where: { id: matterId },
      include: {
        client: true,
        receipts: { orderBy: { date: 'asc' } },
        invoices: { 
          where: { status: { not: "DRAFT" } }, 
          orderBy: { date: 'asc' } 
        },
        expenses: { 
          where: { type: "DISBURSEMENT" }, 
          orderBy: { date: 'asc' } 
        }
      }
    });

    if (!matter) throw new Error("Matter not found");

    const entries = [
      ...matter.receipts.map(r => ({
        date: new Date(r.date),
        description: `Payment Received - Ref: ${r.reference}`,
        ref: r.reference,
        debit: 0,
        credit: Number(r.amount),
        type: 'RECEIPT'
      })),
      ...matter.invoices.map(i => ({
        date: new Date(i.date),
        description: `Professional Fees - Inv: ${i.invoiceNo}`,
        ref: i.invoiceNo,
        debit: Number(i.total),
        credit: 0,
        type: 'INVOICE'
      })),
      ...matter.expenses.map(e => ({
        date: new Date(e.date),
        description: `Disbursement: ${e.category}`,
        ref: "EXP",
        debit: Number(e.amount),
        credit: 0,
        type: 'EXPENSE'
      }))
    ];

    let currentBalance = 0;
    const ledger = entries
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(entry => {
        currentBalance += (entry.credit - entry.debit);
        return {
          ...entry,
          dateFormatted: entry.date.toLocaleDateString('en-KE'),
          runningBalance: currentBalance.toFixed(2)
        };
      });

    return {
      matterName: matter.title,
      clientName: matter.client.name,
      ledger,
      finalBalance: currentBalance.toFixed(2),
      isStatementClean: currentBalance >= 0 
    };
  },

  /**
   * 2. SECURE DRAWDOWN (The "Trust Guard")
   * Prevents accidental overdrawing of client funds.
   */
  async processDrawdown(invoiceId: number, trustAccountId: number, officeAccountId: number) {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      const trustAccount = await tx.account.findUnique({ where: { id: trustAccountId } });

      if (!invoice || !trustAccount) throw new Error("Financial records missing");

      // VALIDATION: Never spend more than what the client has in Trust
      if (Number(trustAccount.balance) < Number(invoice.total)) {
        throw new Error(`Insufficient Trust Funds for this Matter.`);
      }

      await tx.account.update({
        where: { id: trustAccountId },
        data: { balance: { decrement: invoice.total } }
      });

      await tx.account.update({
        where: { id: officeAccountId },
        data: { balance: { increment: invoice.total } }
      });

      return await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "FULLY_PAID" }
      });
    });
  }
};