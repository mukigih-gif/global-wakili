import { BankReconciliationService } from './bank-reconciliation.service';
import { TrustReconciliationService } from './trust-reconciliation.service';
import { pushRealtimeFinance } from '../reports/realtime.service';
import { runFraudMonitor } from '../fraud/fraud-monitor.service';

export class ReconciliationService {

  static async runFullReconciliation(context: {
    tenantId: string;
    userId: string;
    req: any;
  }) {
    const db = context.req.db;

    return db.$transaction(async (tx: any) => {

      const record = await tx.reconciliation.create({
        data: {
          tenantId: context.tenantId,
          type: 'FULL',
          status: 'DRAFT',
          periodStart: new Date(),
          periodEnd: new Date(),
          createdBy: context.userId
        }
      });

      const bankMatches = await BankReconciliationService.autoMatch(context);
      const trustResult = await TrustReconciliationService.reconcile(context);

      await tx.reconciliation.update({
        where: { id: record.id },
        data: {
          status: trustResult.status === 'RECONCILED' ? 'COMPLETED' : 'DRAFT'
        }
      });

      // ⚡ SYSTEM HOOKS
      await pushRealtimeFinance(context.tenantId);
      await runFraudMonitor(context.tenantId);

      return {
        reconciliationId: record.id,
        bankMatches,
        trustResult
      };
    });
  }
}