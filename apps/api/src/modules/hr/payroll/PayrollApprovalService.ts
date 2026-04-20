import { Decimal } from '@prisma/client/runtime/library'; // 1. Added Missing Import
import { withAudit } from '../../utils/audit-wrapper';

export class PayrollApprovalService {
  private static readonly FIRM_THRESHOLD = new Decimal(500000); // 500k Kes

  static async approve(context: { actor: any; tenantId: string; req: any }, batchId: string) {
    const db = context.req.db;

    return await withAudit(async () => {
      return await db.$transaction(async (tx: any) => {
        // 2. Updated to INCLUDE payslips so the threshold calculation works
        const batch = await tx.payrollBatch.findUnique({
          where: { id: batchId, tenantId: context.tenantId },
          include: { payslips: true } 
        });

        if (!batch || batch.status !== 'DRAFT') {
          throw new Error('Batch not found or is not in DRAFT status.');
        }

        // 3. Calculate Total BEFORE updating status
        const totalAmount = batch.payslips.reduce(
          (sum: Decimal, p: any) => sum.add(p.netAmount || 0), 
          new Decimal(0)
        );

        // 4. CFO Threshold Check (Four-Eyes Principle)
        if (totalAmount.gt(this.FIRM_THRESHOLD) && context.actor.role === 'CFO') {
          await tx.payrollBatch.update({
            where: { id: batchId },
            data: { 
              status: 'PENDING_SENIOR_PARTNER',
              verifiedById: context.actor.id 
            }
          });
          return { 
            status: 'PENDING_SENIOR_PARTNER', 
            message: `Batch total (${totalAmount}) exceeds CFO approval limit. Routed to Senior Partner.` 
          };
        }

        // 5. Final Approval (If under threshold or approved by Partner)
        const approvedBatch = await tx.payrollBatch.update({
          where: { id: batchId },
          data: { 
            status: 'APPROVED', 
            approvedById: context.actor.id, 
            approvedAt: new Date() 
          }
        });

        // 6. Lock commissions to prevent double-claiming
        await tx.commissionRecord.updateMany({
          where: { 
            tenantId: context.tenantId, 
            month: batch.month, 
            year: batch.year 
          },
          data: { status: 'LOCKED' }
        });

        return approvedBatch;
      });
    }, context, { action: 'PAYROLL_BATCH_APPROVED', details: { batchId } });
  }
}