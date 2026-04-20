import { prisma } from '../../config/database';

export const getCashFlow = async (tenantId: string) => {
  const cashAccounts = await prisma.chartOfAccount.findMany({
    where: {
      tenantId,
      subtype: 'BANK'
    }
  });

  const accountIds = cashAccounts.map(a => a.id);

  const flows = await prisma.journalLine.findMany({
    where: {
      tenantId,
      accountId: { in: accountIds }
    }
  });

  let inflow = 0;
  let outflow = 0;

  for (const f of flows) {
    inflow += Number(f.debit || 0);
    outflow += Number(f.credit || 0);
  }

  return {
    inflow,
    outflow,
    netCashFlow: inflow - outflow
  };
};