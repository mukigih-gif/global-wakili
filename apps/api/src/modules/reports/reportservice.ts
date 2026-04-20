import { prisma } from '../../config/database';

export const getProfitAndLoss = async (tenantId: string) => {
  const income = await prisma.journalLine.aggregate({
    _sum: { credit: true },
    where: {
      tenantId,
      account: { type: 'INCOME' }
    }
  });

  const expenses = await prisma.journalLine.aggregate({
    _sum: { debit: true },
    where: {
      tenantId,
      account: { type: 'EXPENSE' }
    }
  });

  const revenue = Number(income._sum.credit || 0);
  const cost = Number(expenses._sum.debit || 0);

  return {
    revenue,
    expenses: cost,
    netProfit: revenue - cost
  };
};