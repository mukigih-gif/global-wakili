import { Decimal } from '@prisma/client/runtime/library';
import { GeneralLedgerService } from '../finance/GeneralLedgerService';
import { pushRealtimeFinance } from '../finance/realtime-finance.service';
import { runFraudMonitor } from '../fraud/fraud-monitor.service';

export class VendorService {
  /**
   * 🧾 RECORD VENDOR BILL (HARDENED)
   */
  static async recordBill(context: {
    tenantId: string;
    userId: string;
    req: any;
  }, params: {
    vendorId: string;
    amount: Decimal;
    dueDate: Date;
    isRecoverable: boolean;
    matterId?: string;
  }) {

    const db = context.req.db; // ✅ TENANT-SCOPED CLIENT

    return db.$transaction(async (tx: any) => {

      // 🔒 IDEMPOTENCY CHECK
      const existing = await tx.vendorBill.findFirst({
        where: {
          tenantId: context.tenantId,
          vendorId: params.vendorId,
          amount: params.amount,
          dueDate: params.dueDate
        }
      });

      if (existing) return existing;

      // 🔐 LOAD CHART OF ACCOUNTS (DB DRIVEN)
      const coa = await this.getTenantCoA(tx, context.tenantId);

      // 🧾 CREATE BILL
      const bill = await tx.vendorBill.create({
        data: {
          tenantId: context.tenantId,
          vendorId: params.vendorId,
          amount: params.amount,
          dueDate: params.dueDate,
          isRecoverable: params.isRecoverable,
          matterId: params.matterId,
          status: 'UNPAID'
        }
      });

      // 🧠 ACCOUNT LOGIC
      const debitAccount = params.isRecoverable
        ? coa.disbursementAssetId
        : coa.expenseAccountId;

      const entries = [
        {
          accountId: debitAccount,
          debit: params.amount,
          credit: new Decimal(0),
          matterId: params.matterId
        },
        {
          accountId: coa.accountsPayableId,
          debit: new Decimal(0),
          credit: params.amount
        }
      ];

      // ⚖️ VALIDATE BALANCE
      const totalDebit = entries.reduce((acc, e) => acc.add(e.debit), new Decimal(0));
      const totalCredit = entries.reduce((acc, e) => acc.add(e.credit), new Decimal(0));

      if (!totalDebit.equals(totalCredit)) {
        throw new Error('🚨 Vendor Bill Journal not balanced');
      }

      // 📒 POST LEDGER ENTRY
      await GeneralLedgerService.postJournalEntry({
        tenantId: context.tenantId,
        date: new Date(),
        reference: `BILL-${context.tenantId}-${bill.id}`,
        description: `Vendor Bill: ${params.vendorId}`,
        postedById: context.userId,
        entries
      }, tx);

      // ⚡ REALTIME + FRAUD
      await pushRealtimeFinance(context.tenantId, context.req);
      await runFraudMonitor(context.tenantId);

      return bill;
    });
  }

  /**
   * 📊 AGING REPORT (DECIMAL SAFE)
   */
  static async getAgingReport(context: {
    tenantId: string;
    req: any;
  }) {
    const db = context.req.db;

    const bills = await db.vendorBill.findMany({
      where: {
        tenantId: context.tenantId,
        status: 'UNPAID'
      }
    });

    const now = new Date();

    const report = {
      current: new Decimal(0),
      thirtyDays: new Decimal(0),
      sixtyDays: new Decimal(0),
      ninetyPlus: new Decimal(0)
    };

    for (const bill of bills) {
      const diffDays = Math.ceil(
        (now.getTime() - new Date(bill.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      const amount = new Decimal(bill.amount);

      if (diffDays <= 0) report.current = report.current.add(amount);
      else if (diffDays <= 30) report.thirtyDays = report.thirtyDays.add(amount);
      else if (diffDays <= 60) report.sixtyDays = report.sixtyDays.add(amount);
      else report.ninetyPlus = report.ninetyPlus.add(amount);
    }

    return report;
  }

  /**
   * 🔐 DYNAMIC CHART OF ACCOUNTS
   */
  private static async getTenantCoA(tx: any, tenantId: string) {
    const accounts = await tx.chartOfAccount.findMany({
      where: { tenantId }
    });

    const find = (code: string) => {
      const acc = accounts.find((a: any) => a.code === code);
      if (!acc) throw new Error(`Missing CoA: ${code}`);
      return acc.id;
    };

    return {
      disbursementAssetId: find('DISBURSEMENT_ASSET'),
      expenseAccountId: find('GENERAL_EXPENSE'),
      accountsPayableId: find('ACCOUNTS_PAYABLE')
    };
  }
}
