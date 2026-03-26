// src/services/BillingService.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class BillingService {
  /**
   * MASTER INVOICE GENERATOR
   * Generates a final, eTIMS-compliant invoice for a specific matter.
   * Merges Professional Fees (TimeEntry) and Disbursements (ExpenseEntry).
   * * @param matterId - The unique ID of the matter to bill
   * @param manualPaymentDetailId - Optional override for the firm's bank account (from dropdown)
   * @param feeEarnerId - Optional ID of the lead advocate responsible for this bill
   */
  static async createInvoice(
    matterId: string, 
    manualPaymentDetailId?: string,
    feeEarnerId?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      
      // 1. PAYMENT ACCOUNT RESOLUTION
      // Pulls selected account from dropdown or defaults to the firm's primary account
      let selectedAccountId = manualPaymentDetailId;

      if (!selectedAccountId) {
        const defaultAccount = await tx.firmPaymentDetail.findFirst({
          where: { isDefault: true }
        });
        selectedAccountId = defaultAccount?.id;
      }

      // 2. UNBILLED DATA RETRIEVAL
      // Pulls all pending items for this specific matter
      const [unbilledTime, unbilledExpenses] = await Promise.all([
        tx.timeEntry.findMany({ where: { matterId, status: 'UNBILLED' } }),
        tx.expenseEntry.findMany({ where: { matterId, status: 'UNBILLED' } })
      ]);

      // Guard: Ensure we don't generate empty invoices
      if (unbilledTime.length === 0 && unbilledExpenses.length === 0) {
        throw new Error("Billing Audit: No unbilled fees or expenses found for this matter.");
      }

      // 3. FINANCIAL CALCULATIONS (2026 Kenya Standards)
      const feesTotal = unbilledTime.reduce((sum, t) => sum + (t.duration * Number(t.rate)), 0);
      const expensesTotal = unbilledExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      
      const subTotal = feesTotal + expensesTotal;
      const vatAmount = subTotal * 0.16; // 16% VAT for legal services
      const grandTotal = subTotal + vatAmount;

      // 4. SEQUENTIAL INVOICE NUMBERING
      // Generates a unique reference (e.g., GW-2026-0042)
      const currentYear = new Date().getFullYear();
      const invoiceCount = await tx.invoice.count({
        where: { createdAt: { gte: new Date(`${currentYear}-01-01`) } }
      });
      const invoiceNumber = `GW-${currentYear}-${(invoiceCount + 1).toString().padStart(4, '0')}`;

      // 5. ATOMIC INVOICE CREATION
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          matterId,
          feeEarnerId, // Tracks revenue attribution per advocate
          subTotal,
          vatAmount,
          total: grandTotal,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Standard 14-day credit term
          paymentDetailId: selectedAccountId,
          status: 'ISSUED',
          
          // Link unbilled items to this specific invoice
          timeEntries: { connect: unbilledTime.map(t => ({ id: t.id })) },
          expenses: { connect: unbilledExpenses.map(e => ({ id: e.id })) }
        },
        include: {
          paymentDetail: true,
          matter: { include: { client: true } },
          feeEarner: { select: { name: true, email: true } }
        }
      });

      // 6. PREVENT DOUBLE BILLING
      // Mark all included items as 'BILLED' within the same transaction
      await Promise.all([
        tx.timeEntry.updateMany({
          where: { id: { in: unbilledTime.map(t => t.id) } },
          data: { status: 'BILLED' }
        }),
        tx.expenseEntry.updateMany({
          where: { id: { in: unbilledExpenses.map(e => e.id) } },
          data: { status: 'BILLED' }
        })
      ]);

      return invoice;
    });
  }

  /**
   * PULL DRAFT PREVIEW
   * Calculates potential invoice totals without creating a record or marking items as billed.
   */
  static async previewInvoice(matterId: string) {
    const [time, expenses] = await Promise.all([
      prisma.timeEntry.findMany({ where: { matterId, status: 'UNBILLED' } }),
      prisma.expenseEntry.findMany({ where: { matterId, status: 'UNBILLED' } })
    ]);

    const fees = time.reduce((sum, t) => sum + (t.duration * Number(t.rate)), 0);
    const disbursements = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const subTotal = fees + disbursements;

    return {
      fees,
      disbursements,
      subTotal,
      vat: subTotal * 0.16,
      total: subTotal * 1.16
    };
  }
}