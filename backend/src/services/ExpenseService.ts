import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class ExpenseService {
  static async logMatterExpense(data: {
    matterId: string,
    userId: string,
    amount: number,
    description: string,
    etimsReceipt?: string
  }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create the Expense Entry
      const expense = await tx.expenseEntry.create({
        data: {
          ...data,
          category: 'DISBURSEMENT',
          amount: data.amount
        }
      });

      // 2. Auto-generate Journal Entry (Debit Matter Expenses / Credit Petty Cash)
      await tx.journalEntry.create({
        data: {
          reference: `EXP-${expense.id}`,
          description: `Disbursement: ${data.description}`,
          matterId: data.matterId,
          userId: data.userId,
          lines: {
            create: [
              { accountId: '5050', debit: data.amount, credit: 0 }, // Matter Disbursement Account
              { accountId: '1050', debit: 0, credit: data.amount }  // Office Petty Cash
            ]
          }
        }
      });

      return expense;
    });
  }
}