import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const generateDraftInvoice = async (matterId: number) => {
  // 1. Pull all unbilled hours (Smart Timer entries)
  const timeEntries = await prisma.timeEntry.findMany({
    where: { matterId, isBilled: false }
  });

  // 2. Pull all approved expenses (DRNs)
  const expenses = await prisma.transaction.findMany({
    where: { matterId, status: 'APPROVED', accountType: 'OFFICE' }
  });

  const timeTotal = timeEntries.reduce((sum, entry) => sum + entry.totalValue, 0);
  const expenseTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const subTotal = timeTotal + expenseTotal;
  const vat = subTotal * 0.16; // Standard Kenya VAT 16%

  return {
    matterId,
    lineItems: { timeEntries, expenses },
    summary: {
      subTotal,
      vat,
      totalDue: subTotal + vat
    }
  };
};