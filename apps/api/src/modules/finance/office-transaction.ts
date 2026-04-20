import { Decimal } from '@prisma/client/runtime/library';
import { executeJournalTransaction } from './transaction-engine';

export const recordLegalFee = async (context: any, amount: number) => {
  return executeJournalTransaction(context, {
    description: 'Legal Fee Earned',
    entries: [
      {
        accountId: '1002', // Office Bank
        debit: new Decimal(amount),
      },
      {
        accountId: '4001', // Income
        credit: new Decimal(amount),
      },
    ],
  });
};