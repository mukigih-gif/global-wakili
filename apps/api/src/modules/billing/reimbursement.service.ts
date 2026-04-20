import { Decimal } from '@prisma/client/runtime/library';
import { withAudit } from '../../utils/audit-wrapper';
import { AuditSeverity } from '../../types/audit';
import { GeneralLedgerService } from './GeneralLedgerService';

export class ReimbursementService {
  /**
   * 📝 1. SUBMIT CLAIM
   * Staff member submits a receipt for out-of-pocket spending.
   */
  static async submitClaim(context: { actor: any; tenantId: string; req: any }, params: {
    matterId: string;
    amount: number;
    description: string;
    category: 'TRAVEL' | 'MEALS' | 'FILING_FEE' | 'STATIONERY';
    receiptUrl?: string;
  }) {
    return await withAudit(async () => {
      return await context.req.db.expenseEntry.create({
        data: {
          tenantId: context.tenantId,
          matterId: params.matterId,
          amount: new Decimal(params.amount),
          description: `Claim: ${params.description}`,
          category: params.category,
          source: 'OUT_OF_POCKET', // Staff's own money
          status: 'PENDING_APPROVAL',
          createdById: context.actor.id,
          attachments: params.receiptUrl ? [params.receiptUrl] : [],
        }
      });
    }, context, { action: 'REIMBURSEMENT_SUBMITTED', severity: AuditSeverity.INFO });
  }

  /**
   * ✅ 2. APPROVE & FUND CLAIM
   * Partner/Accountant approves. Hits the GL and queues for staff payout.
   */
  static async approveAndFund(context: { actor: any; tenantId: string; req: any }, expenseId: string) {
    const db = context.req.db;

    return await withAudit(async () => {
      const coaMap = await this.getTenantCoA(context);

      return await db.$transaction(async (tx: any) => {
        const expense = await tx.expenseEntry.findUnique({ where: { id: expenseId } });
        if (!expense || expense.status !== 'PENDING_APPROVAL') {
          throw new Error('Invalid expense state for approval.');
        }

        // 📒 GL POSTING: Recognize the firm's liability to the staff member
        // Debit: Disbursements Recoverable (Asset +) 
        // Credit: Accounts Payable - Staff (Liability +)
        await GeneralLedgerService.postJournalEntry({
          tenantId: context.tenantId,
          date: new Date(),
          reference: `REIMB-${expense.id}`,
          description: `Approved Staff Reimbursement: ${expense.description}`,
          postedById: context.actor.id,
          entries: [
            { accountId: coaMap.disbursementsRecoverableId, debit: expense.amount, credit: new Decimal(0), matterId: expense.matterId },
            { accountId: coaMap.accountsPayableStaffId, debit: new Decimal(0), credit: expense.amount, matterId: expense.matterId }
          ]
        }, tx);

        return await tx.expenseEntry.update({
          where: { id: expenseId },
          data: { status: 'UNBILLED', approvedById: context.actor.id, approvedAt: new Date() }
        });
      });
    }, context, { action: 'REIMBURSEMENT_APPROVED', severity: AuditSeverity.WARNING });
  }

  private static async getTenantCoA(context: any) {
    const settings = await context.req.db.tenantSettings.findUnique({ where: { tenantId: context.tenantId } });
    return {
      disbursementsRecoverableId: settings.disbursementsRecoverableId,
      accountsPayableStaffId: settings.accountsPayableStaffId
    };
  }
}