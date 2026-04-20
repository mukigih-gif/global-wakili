import { ProcurementService } from './ProcurementService';
import { ProcurementApprovalService } from './procurement-approval.service';
import { AuditSeverity } from '../../types/audit';

export class ProcurementWrapper {
  /**
   * 🛡️ THE FOUR-EYES GATEKEEPER
   * Orchestrates the transition from Requisition to Settlement.
   */
  static async handleWorkflow(context: any, action: 'VERIFY' | 'APPROVE' | 'PAY', id: string, data?: any) {
    switch (action) {
      case 'VERIFY':
        // Action: Chief Accountant confirms eTIMS details are correct
        return await ProcurementService.verify(context, id);

      case 'APPROVE':
        // Action: CFO/Partner authorizes the verified request
        return await ProcurementApprovalService.approve(context, id);

      case 'PAY':
        // Action: Final release of funds and Ledger posting
        return await ProcurementService.pay(context, id, {
          bankAccountId: data.bankAccountId,
          reference: data.reference
        });

      default:
        throw new Error("Invalid Procurement Action");
    }
  }
}