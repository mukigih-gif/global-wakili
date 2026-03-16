import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const TransactionController = {
  /**
   * POST /api/transactions
   * Create a new ledger entry (Deposit, Fee, or Disbursement)
   */
  async create(req: Request, res: Response) {
    try {
      const { 
        matterId, 
        description, 
        amount, 
        type, 
        accountType, 
        date 
      } = req.body;

      // 1. Start a transaction to ensure both Ledger and Account stay in sync
      const result = await prisma.$transaction(async (tx) => {
        // Create the Ledger Entry
        const newTransaction = await tx.transaction.create({
          data: {
            matterId: Number(matterId),
            description,
            amount: Number(amount),
            type, // "CREDIT" or "DEBIT"
            accountType, // "TRUST" or "OFFICE"
            date: date ? new Date(date) : new Date(),
          },
        });

        // 2. Update the Global Account Balance (Trust or Office)
        // Find the correct account to update
        const account = await tx.account.findFirst({
          where: { type: accountType }
        });

        if (account) {
          const adjustment = type === 'CREDIT' ? Number(amount) : -Number(amount);
          await tx.account.update({
            where: { id: account.id },
            data: { balance: { increment: adjustment } }
          });
        }

        return newTransaction;
      });

      res.status(201).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to record transaction" });
    }
  },

  /**
   * GET /api/transactions/matter/:matterId
   * Fetch raw transactions for a matter
   */
  async getByMatter(req: Request, res: Response) {
    try {
      const { matterId } = req.params;
      const transactions = await prisma.transaction.findMany({
        where: { matterId: Number(matterId) },
        orderBy: { date: 'desc' }
      });
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  }
};