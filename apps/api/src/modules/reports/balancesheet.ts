import { prisma } from '../../config/database';
import { Decimal } from '@prisma/client/runtime/library';

export const getTrialBalance = async (tenantId: string) => {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { tenantId },
    include: {
      journalLines: true
    }
  });

  const report = accounts.map((acc) => {
    let debit = new Decimal(0);
    let credit = new Decimal(0);

    for (const line of acc.journalLines) {
      debit = debit.plus(line.debit);
      credit = credit.plus(line.credit);
    }

    return {
      accountCode: acc.code,
      accountName: acc.name,
      debit,
      credit,
      balance: debit.minus(credit)
    };
  });

  const totalDebit = report.reduce((acc, r) => acc.plus(r.debit), new Decimal(0));
  const totalCredit = report.reduce((acc, r) => acc.plus(r.credit), new Decimal(0));

  if (!totalDebit.equals(totalCredit)) {
    throw new Error('🚨 Trial Balance mismatch — Ledger corruption detected');
  }

  return {
    accounts: report,
    totals: {
      debit: totalDebit,
      credit: totalCredit
    }
  };
};