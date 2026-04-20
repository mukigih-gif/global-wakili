import { Decimal } from '@prisma/client/runtime/library';
import { withAudit } from '../../utils/audit-wrapper';
import { GeneralLedgerService } from '../finance/GeneralLedgerService';
import { PayrollCalculator } from './payroll-calculator.service';
import { NotificationService } from '../notifications/notification.service';
import { AppError } from '../../utils/AppError';

export class PayrollMasterService {
  /**
   * 🚀 RUN MONTHLY PAYROLL BATCH
   * Integrates Billing (Commissions) + HR (Salary) + Finance (Ledger)
   * Sends notifications when batch is processed.
   */
  static async processBatch(
    context: { actor: any; tenantId: string; req: any },
    month: number,
    year: number
  ) {
    const db = context.req.db;

    return await withAudit(async () => {
      const coa = await db.tenantSettings.findUnique({ where: { tenantId: context.tenantId } });
      const employees = await db.user.findMany({
        where: { tenantId: context.tenantId, status: 'ACTIVE' },
        include: { staffLoans: { where: { status: 'ACTIVE' } } }
      });

      return await db.$transaction(async (tx: any) => {
        const batch = await tx.payrollBatch.create({
          data: {
            tenantId: context.tenantId,
            month,
            year,
            status: 'DRAFT',
            createdById: context.actor.id
          }
        });

        const journalEntries: any[] = [];
        let totalGross = new Decimal(0);
        let totalNet = new Decimal(0);

        for (const emp of employees) {
          const commissions = await this.calculateFeeEarnerCommissions(
            tx,
            emp.id,
            context.tenantId,
            month,
            year
          );

          const loanRepayment = emp.staffLoans.reduce(
            (sum: Decimal, l: any) => sum.add(l.monthlyInstallment),
            new Decimal(0)
          );

          const res = PayrollCalculator.calculate({
            baseSalary: new Decimal(emp.salary || 0),
            commissions,
            taxableAllowances: new Decimal(0),
            loanRepayment,
            otherDeductions: new Decimal(emp.fixedDeductions || 0)
          });

          await tx.payslip.create({
            data: {
              batchId: batch.id,
              userId: emp.id,
              tenantId: context.tenantId,
              grossAmount: res.grossTaxable,
              netAmount: res.netPay,
              payeAmount: res.statutory.paye,
              nssfAmount: res.statutory.nssf,
              shifAmount: res.statutory.shif,
              housingLevyAmount: res.statutory.housingLevy,
              loanDeduction: loanRepayment,
              commissionAmount: commissions
            }
          });

          totalGross = totalGross.add(res.grossTaxable);
          totalNet = totalNet.add(res.netPay);

          journalEntries.push(
            { accountId: coa.salaryExpenseId, debit: res.grossTaxable, credit: 0 },
            { accountId: coa.netSalaryPayableId, debit: 0, credit: res.netPay },
            { accountId: coa.payeLiabilityId, debit: 0, credit: res.statutory.paye },
            { accountId: coa.nssfLiabilityId, debit: 0, credit: res.statutory.nssf },
            { accountId: coa.shifLiabilityId, debit: 0, credit: res.statutory.shif },
            { accountId: coa.housingLevyLiabilityId, debit: 0, credit: res.statutory.housingLevy },
            { accountId: coa.loanAssetId, debit: 0, credit: loanRepayment }
          );
        }

        await GeneralLedgerService.postJournalEntry(
          {
            tenantId: context.tenantId,
            date: new Date(),
            reference: `PAY-BATCH-${batch.id}`,
            description: `Consolidated Payroll: ${month}/${year}`,
            postedById: context.actor.id,
            entries: journalEntries
          },
          tx
        );

        // 🔔 Notification Hook (Processed)
        await NotificationService.sendAlert(context.tenantId, {
          subject: `Payroll Batch Processed - ${month}/${year}`,
          message: `Payroll batch ${batch.id} has been processed.\n
Total Gross: ${totalGross.toFixed(2)}\n
Total Net: ${totalNet.toFixed(2)}\n
Employees: ${employees.length}\n
Status: DRAFT (awaiting approval)`
        });

        return batch;
      });
    }, context, { action: 'PAYROLL_MASTER_BATCH_RUN' });
  }

  /**
   * ✅ APPROVE & FINALIZE PAYROLL
   * Locks the batch and notifies stakeholders.
   */
  static async approveBatch(context: { actor: any; tenantId: string; req: any }, batchId: string) {
    const db = context.req.db;

    return await withAudit(async () => {
      const batch = await db.payrollBatch.findUnique({ where: { id: batchId } });
      if (!batch) throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');
      if (batch.status !== 'DRAFT') {
        throw new AppError('Batch not in approvable state', 400, 'INVALID_BATCH_STATE');
      }

      const finalized = await db.payrollBatch.update({
        where: { id: batchId },
        data: { status: 'FINAL', approvedById: context.actor.id }
      });

      // 🔔 Notification Hook (Finalized)
      await NotificationService.sendAlert(context.tenantId, {
        subject: `Payroll Batch Finalized - ${finalized.month}/${finalized.year}`,
        message: `Payroll batch ${finalized.id} has been finalized and locked.\n
Status: FINAL\n
Approved By: ${context.actor.id}\n
Disbursement can now proceed.`
      });

      return finalized;
    }, context, { action: 'PAYROLL_MASTER_BATCH_APPROVE' });
  }

  private static async calculateFeeEarnerCommissions(
    tx: any,
    userId: string,
    tenantId: string,
    month: number,
    year: number
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const invoices = await tx.invoice.findMany({
      where: {
        tenantId,
        status: 'PAID',
        paidAt: { gte: startDate, lte: endDate },
        OR: [{ matter: { originatorId: userId } }, { matter: { assignedToId: userId } }]
      },
      include: { matter: true }
    });

    return invoices.reduce((total: Decimal, inv: any) => {
      const fee = new Decimal(inv.subTotal);
      let share = new Decimal(0);
      if (inv.matter.originatorId === userId)
        share = share.add(fee.mul(inv.matter.originatorRate || 0.1));
      if (inv.matter.assignedToId === userId)
        share = share.add(fee.mul(inv.matter.assigneeRate || 0.2));
      return total.add(share);
    }, new Decimal(0));
  }
}
