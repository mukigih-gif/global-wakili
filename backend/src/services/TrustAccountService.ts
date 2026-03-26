// src/services/TrustAccountService.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TrustAccountService {
  /**
   * DEPOSIT FUNDS: When a client pays a retainer or disbursement deposit.
   */
  static async depositToTrust(matterId: string, amount: number, reference: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Log the Activity
      await tx.activityLog.create({
        data: {
          matterId,
          action: "TRUST_DEPOSIT",
          details: `Deposit of KES ${amount.toLocaleString()} received. Ref: ${reference}`,
          userId: "SYSTEM" // or the Accountant's ID
        }
      });

      // 2. Update the Matter Balance
      return await tx.matter.update({
        where: { id: matterId },
        data: {
          trustBalance: { increment: amount }
        }
      });
    });
  }

  /**
   * PAY FROM TRUST: Transfers money from Trust to Office Account to settle an invoice.
   */
  static async payInvoiceFromTrust(invoiceId: string) {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { matter: true }
      });

      if (!invoice || Number(invoice.matter.trustBalance) < Number(invoice.total)) {
        throw new Error("Insufficient trust funds to cover this invoice.");
      }

      // 1. Deduct from Matter Trust
      await tx.matter.update({
        where: { id: invoice.matterId },
        data: { trustBalance: { decrement: invoice.total } }
      });

      // 2. Mark Invoice as Paid
      return await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'FULLY_PAID', paidAt: new Date() }
      });
    });
  }
}