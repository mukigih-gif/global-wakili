// apps/api/src/services/finance/tax-service.ts

export const processLegalInvoice = async (context: any, invoiceData: any) => {
  // 1. Technical Handshake (Your Script)
  const kraResult = await signInvoiceWithETIMS(invoiceData); 

  // 2. Financial Record (The Transaction Engine)
  await executeJournalTransaction(context, {
    description: `Invoice ${invoiceData.number} - KRA Signed`,
    reference: kraResult.signature, // Use KRA signature as the idempotency key
    entries: [
      { accountId: '1002', debit: invoiceData.totalPlusVat }, // Office Bank
      { accountId: '4001', credit: invoiceData.subtotal },    // Legal Fees
      { accountId: '2101', credit: invoiceData.vatAmount }   // VAT Payable
    ]
  });

  return kraResult;
};