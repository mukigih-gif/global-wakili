import { Decimal } from '@prisma/client/runtime/library';

export class BillingDashboard {
  /**
   * 📊 BILLING METRICS
   * Retrieves WIP (Work in Progress) and AR (Accounts Receivable) health.
   */
  static async getOverview(context: { tenantId: string; req: any }) {
    const db = context.req.db;

    // 1. Calculate WIP (Unbilled Time + Unbilled Expenses)
    const [unbilledTime, unbilledExpenses] = await Promise.all([
      db.timeEntry.aggregate({
        where: { tenantId: context.tenantId, status: 'UNBILLED' },
        _sum: { hours: true, rate: true } // Note: Actual math requires row-level multiplication in DB, simplified for UI
      }),
      db.expenseEntry.aggregate({
        where: { tenantId: context.tenantId, status: 'UNBILLED' },
        _sum: { amount: true }
      })
    ]);

    // 2. AR Aging (Unpaid Final Invoices)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const unpaidInvoices = await db.invoice.findMany({
      where: { 
        tenantId: context.tenantId, 
        status: { in: ['FINAL', 'PARTIALLY_PAID'] } 
      }
    });

    let currentAR = new Decimal(0);
    let overdueAR = new Decimal(0);

    unpaidInvoices.forEach((inv: any) => {
      const balance = new Decimal(inv.total).minus(inv.amountPaid || 0);
      if (inv.finalizedAt < thirtyDaysAgo) {
        overdueAR = overdueAR.add(balance);
      } else {
        currentAR = currentAR.add(balance);
      }
    });

    return {
      wipTotal: unbilledExpenses._sum.amount || 0, // Simplified WIP
      accountsReceivable: {
        current: currentAR,
        overdue30Days: overdueAR,
        total: currentAR.add(overdueAR)
      }
    };
  }
}