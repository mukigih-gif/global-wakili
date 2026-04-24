import axios from 'axios';
import { executeJournalTransaction } from '../finance/transaction-engine';
import { Decimal } from '@prisma/client/runtime/library';

export const postInvoiceToKRA = async (context: any, invoice: any) => {
  // 1. Send to KRA
  const response = await axios.post(
    'https://etims-api.kra.go.ke/invoice',
    invoice
  );

  const vatAmount = new Decimal(invoice.total * 0.16);

  // 2. Record accounting entry
  await executeJournalTransaction(context, {
    description: 'Invoice + VAT',
    entries: [
      {
        accountId: '1002',
        debit: new Decimal(invoice.total),
      },
      {
        accountId: '4001',
        credit: new Decimal(invoice.total).minus(vatAmount),
      },
      {
        accountId: '2101', // VAT payable
        credit: vatAmount,
      },
    ],
  });

  return response.data;
};