export class DisbursementService {
  /**
   * RECOVERABLE EXPENSE LOGGING
   * Logic: Ensures that when a Clerk spends money at Milimani, 
   * it is automatically added to the next Client Invoice.
   */
  static async logRecoverableExpense(matterId: string, amount: number, description: string, userId: string) {
    return await prisma.worklog.create({
      data: {
        matterId,
        userId,
        description: `DISBURSEMENT: ${description}`,
        durationMinutes: 0, // 0 because it's an expense, not time
        billableAmount: new Decimal(amount),
        status: 'PENDING_INVOICE' // This ensures it gets picked up by InvoicingService
      }
    });
  }
}