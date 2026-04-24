export class TrustTransferService {
  /**
   * 💸 EXECUTE FEE EARNED TRANSFER
   * Triggered when an invoice is marked as PAID via Trust Funds.
   */
  static async transferTrustToOffice(tenantId: string, matterId: string, amount: Decimal) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify Matter Trust Balance
      const matter = await tx.matter.findUnique({ where: { id: matterId } });
      if (!matter || matter.trustBalance.lt(amount)) {
        throw new Error("LSK Violation: Insufficient trust funds for transfer.");
      }

      // 2. Debit Trust Sub-Ledger
      await tx.trustLedger.create({
        data: {
          tenantId,
          matterId,
          amount,
          type: 'TRANSFER_TO_OFFICE',
          reference: `TRF-FEES-${Date.now()}`,
          description: "Transfer of earned fees to office account"
        }
      });

      // 3. Post Journal Entry (Double-Entry)
      // Debit Trust Liability (Decreases liability) | Credit Revenue (Increases income)
      // Note: A corresponding physical bank transfer must be initiated.
      return await tx.matter.update({
        where: { id: matterId },
        data: { trustBalance: { decrement: amount } }
      });
    });
  }
}