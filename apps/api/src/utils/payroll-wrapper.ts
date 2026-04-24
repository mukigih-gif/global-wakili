import { PayrollService } from './payrollservice.ts';
import { PayrollApprovalService } from './PayrollApprovalService';
import { Decimal } from '@prisma/client/runtime/library';

export class PayrollWrapper {
  /**
   * 🏛️ ENTERPRISE PAYROLL ORCHESTRATOR
   * Ensures that high-value payroll batches are escalated to Senior Partners.
   */
  static async processBatchWorkflow(context: any, batchId: string) {
    const db = context.req.db;

    // 1. Fetch batch total for threshold check
    const batch = await db.payrollBatch.findUnique({
      where: { id: batchId },
      include: { payslips: true }
    });

    const totalNetPay = batch.payslips.reduce(
      (sum: Decimal, p: any) => sum.add(p.netAmount), 
      new Decimal(0)
    );

    // 2. Delegate to Approval Service (which handles the CFO Threshold)
    const result = await PayrollApprovalService.approve(context, batchId);

    // 3. Post-Approval: Trigger Bank File Generation if fully approved
    if (result.status === 'APPROVED') {
       // logic to trigger bank CSV export
    }

    return result;
  }
}