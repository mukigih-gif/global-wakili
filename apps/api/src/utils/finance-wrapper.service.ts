import { ProcurementService } from '../procurement/procurement.service';
import { PayrollApprovalService } from '../hr/PayrollApprovalService';
import { withAudit } from '../../utils/audit-wrapper';
import { Decimal } from '@prisma/client/runtime/library';

export class FinanceWrapper {
  /**
   * 🛡️ CENTRAL FINANCIAL GATEKEEPER
   * Orchestrates multi-role workflows for sensitive transactions.
   */
  static async executeWorkflow(
    context: { actor: any; tenantId: string; req: any },
    params: { 
      module: 'PAYROLL' | 'PROCUREMENT'; 
      action: 'VERIFY' | 'APPROVE' | 'REJECT'; 
      targetId: string;
      notes?: string;
    }
  ) {
    return await withAudit(async () => {
      const { module, action, targetId } = params;

      // 1. PROCUREMENT WORKFLOW
      if (module === 'PROCUREMENT') {
        if (action === 'VERIFY') {
          // Chief Accountant check for eTIMS compliance
          return await ProcurementService.verify(context, targetId);
        }
        if (action === 'APPROVE') {
          // CFO/Partner final authorization
          return await ProcurementService.approve(context, targetId);
        }
      }

      // 2. PAYROLL WORKFLOW
      if (module === 'PAYROLL') {
        if (action === 'APPROVE') {
          // Handles the KES 500k threshold escalation to Senior Partners
          return await PayrollApprovalService.approve(context, targetId);
        }
      }

      if (action === 'REJECT') {
        return await this.handleRejection(context, module, targetId, params.notes);
      }

      throw new Error(`Unsupported workflow action: ${action} for ${module}`);
    }, context, { action: `FINANCE_WF_${params.module}_${params.action}` });
  }

  /**
   * ❌ REJECTION LOGIC
   * Returns the item to 'DRAFT' or 'REJECTED' with feedback for the staff.
   */
  private static async handleRejection(context: any, module: string, id: string, notes?: string) {
    const table = module === 'PAYROLL' ? 'payrollBatch' : 'procurement';
    return await context.req.db[table].update({
      where: { id, tenantId: context.tenantId },
      data: { 
        status: 'REJECTED', 
        rejectionNotes: notes,
        rejectedById: context.actor.id 
      }
    });
  }
}