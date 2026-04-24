import { TrustReconciliationService } from './TrustReconciliationService';
import { Decimal } from '@prisma/client/runtime/library';

export class TrustDashboard {
  /**
   * 📊 TRUST OVERVIEW
   * Aggregates financial health markers for the firm's executive view.
   */
  static async overview(context: { tenantId: string; req: any }) {
    const db = context.req.db;

    // 1. Get current reconciliation status
    const recon = await TrustReconciliationService.reconcile(context);

    // 2. Aggregate Liquid Trust Assets (Bank Balance)
    const trustAssets = await db.journalLine.aggregate({
      where: { 
        tenantId: context.tenantId, 
        account: { isTrust: true, type: 'ASSET' } 
      },
      _sum: { debit: true, credit: true }
    });

    // 3. Aggregate Total Client Liabilities (The "Owed" to clients)
    const trustLiabilities = await db.trustTransaction.aggregate({
      where: { tenantId: context.tenantId },
      _sum: { amount: true }
    });

    return {
      reconciled: recon.summary.isBalanced,
      discrepancy: recon.summary.discrepancy,
      totalTrustCash: new Decimal(trustAssets._sum.debit || 0).minus(trustAssets._sum.credit || 0),
      totalClientObligations: trustLiabilities._sum.amount || 0,
      lastReconciledAt: new Date(),
      alerts: {
        unreconciledItems: !recon.summary.isBalanced,
        lowLiquidity: false // Logic for if bank < liabilities
      }
    };
  }
}