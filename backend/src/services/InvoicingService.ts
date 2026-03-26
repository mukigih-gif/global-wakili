import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class InvoicingService {
  /**
   * CONSOLIDATE WIP TO DRAFT INVOICE
   * Validated: Processes all PENDING_INVOICE logs for a matter into a single Bill.
   */
  static async createDraftFromWIP(matterId: string, authorId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch all pending billable worklogs
      const pendingLogs = await tx.worklog.findMany({
        where: { matterId, status: 'PENDING_INVOICE' }
      });

      if (pendingLogs.length === 0) throw new Error("No unbilled worklogs found.");

      // 2. Calculate Totals (Standard 16% VAT for Kenya)
      const subTotal = pendingLogs.reduce((acc, log) => acc.add(log.billableAmount), new Decimal(0));
      const vat = subTotal.mul(0.16); 
      const total = subTotal.add(vat);

      // 3. Create the Invoice
      const invoice = await tx.invoice.create({
        data: {
          matterId,
          invoiceNumber: `INV-2026-${Date.now().toString().slice(-6)}`,
          subTotal,
          vatAmount: vat,
          total,
          status: 'DRAFT',
          feeEarnerId: authorId,
          items: {
            create: pendingLogs.map(log => ({
              description: log.description,
              amount: log.billableAmount,
            }))
          }
        }
      });

      // 4. Update Worklogs to prevent double-billing
      await tx.worklog.updateMany({
        where: { id: { in: pendingLogs.map(l => l.id) } },
        data: { status: 'INVOICED' }
      });

      return invoice;
    });
  }
}