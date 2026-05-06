// apps/api/src/modules/billing/invoice-number.service.ts

export type AllocateInvoiceNumberInput = {
  tenantId: string;
  issuedDate?: Date | null;
};

export type InvoiceNumberAllocation = {
  invoiceNumber: string;
  sequence: number;
  year: number;
};

export class InvoiceNumberService {
  async allocateInvoiceNumber(
    tx: any,
    input: AllocateInvoiceNumberInput,
  ): Promise<InvoiceNumberAllocation> {
    const issuedDate = input.issuedDate ?? new Date();
    const year = issuedDate.getFullYear();

    const startOfYear = new Date(year, 0, 1);
    const startOfNextYear = new Date(year + 1, 0, 1);

    const count = await tx.invoice.count({
      where: {
        tenantId: input.tenantId,
        issuedDate: {
          gte: startOfYear,
          lt: startOfNextYear,
        },
      },
    });

    const sequence = count + 1;

    return {
      invoiceNumber: `INV-${year}-${String(sequence).padStart(6, '0')}`,
      sequence,
      year,
    };
  }
}

export const invoiceNumberService = new InvoiceNumberService();
export default InvoiceNumberService;