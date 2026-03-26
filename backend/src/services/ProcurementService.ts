// src/services/ProcurementService.ts

export class ProcurementService {
  /**
   * THE EXECUTION GATE
   * Converts an approved procurement request into a permanent Ledger Entry.
   * Enforces the 2026 "No eTIMS, No Payment" rule.
   */
  static async approveSupplierPayment(procurementId: string, approverId: string) {
    // 1. Fetch the data with Supplier context
    const request = await prisma.procurement.findUnique({
      where: { id: procurementId },
      include: { supplier: true }
    });

    if (!request) throw new Error("Procurement record not found.");

    // 2. THE 2026 COMPLIANCE CHECK
    // Hard block to prevent non-deductible expenses in a KRA audit.
    if (!request.supplierInvoice) {
      throw new Error("Cannot approve payment: Missing eTIMS Invoice Number.");
    }

    // 3. THE ATOMIC HANDSHAKE
    // We use a $transaction so that the procurement status AND the 
    // ledger entries are updated together. If one fails, both roll back.
    return await prisma.$transaction([
      // A: Mark the procurement as SETTLED
      prisma.procurement.update({
        where: { id: procurementId },
        data: { status: 'PAID' }
      }),

      // B: Post to the General Ledger (Audit-Ready)
      prisma.journalEntry.create({
        data: {
          reference: `PAY-${request.supplierInvoice}`, // Using eTIMS No. as the primary reference
          description: `Payment to ${request.supplier.name} for ${request.description}`,
          userId: approverId,
          // Automated Double-Entry
          lines: {
            create: [
              { 
                accountId: '5100', // Expense Account (Office Supplies/General)
                debit: request.amount, 
                credit: 0 
              },
              { 
                accountId: '1000', // Asset Account (Office Bank Account)
                debit: 0, 
                credit: request.amount 
              }
            ]
          }
        }
      })
    ]);
  }
}