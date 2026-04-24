import { PrismaClient, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class TrustLedgerService {
  /**
   * ⚖️ RECORD TRUST DEPOSIT
   * Ensures money is tagged to a specific matter and client immediately.
   */
  static async recordDeposit(tenantId: string, data: {
    matterId: string,
    clientId: string,
    amount: Decimal,
    reference: string,
    description: string,
    userId: string
  }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create the immutable Trust Record
      const record = await tx.trustLedger.create({
        data: {
          tenantId,
          ...data,
          type: 'DEPOSIT'
        }
      });

      // 2. Increment the Matter's aggregate trustBalance for quick lookups
      await tx.matter.update({
        where: { id: data.matterId },
        data: { trustBalance: { increment: data.amount } }
      });

      return record;
    });
  }

  /**
   * 🛡️ SAFE TRUST WITHDRAWAL
   * Hardened Check: Prevents withdrawal if the specific matter has insufficient funds.
   */
  static async safeWithdrawal(tenantId: string, data: {
    matterId: string,
    amount: Decimal,
    reference: string,
    description: string,
    userId: string
  }) {
    return await prisma.$transaction(async (tx) => {
      const matter = await tx.matter.findUnique({
        where: { id: data.matterId },
        select: { trustBalance: true }
      });

      if (!matter || new Decimal(matter.trustBalance).lt(data.amount)) {
        throw new Error("LSK COMPLIANCE ERROR: Insufficient trust funds for this specific matter.");
      }

      // Record withdrawal
      const record = await tx.trustLedger.create({
        data: {
          tenantId,
          ...data,
          clientId: 'EXTRACTED_FROM_MATTER', // Logic to fetch client
          type: 'WITHDRAWAL'
        }
      });

      // Update aggregate
      await tx.matter.update({
        where: { id: data.matterId },
        data: { trustBalance: { decrement: data.amount } }
      });

      return record;
    });
  }
}