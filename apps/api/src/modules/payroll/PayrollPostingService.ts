// apps/api/src/modules/payroll/PayrollPostingService.ts

import {
  AccountSubtype,
  AccountType,
  BalanceSide,
  Prisma,
  prisma,
} from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);

type PostingInput = {
  tenantId: string;
  payrollBatchId: string;
  postedById: string;
  postingDate?: Date;
};

type PayrollPostingLine = {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountSubtype: AccountSubtype;
  normalBalance: BalanceSide;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
};

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply Payroll schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'PAYROLL_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate;
}

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const decimal = new Prisma.Decimal(value as any);

  if (!decimal.isFinite()) return ZERO;

  return decimal.toDecimalPlaces(2);
}

export class PayrollPostingService {
  async postPayrollBatch(input: PostingInput) {
    return prisma.$transaction(async (tx) => {
      const payrollBatch = delegate(tx, 'payrollBatch');
      const payrollRecord = delegate(tx, 'payrollRecord');
      const journalEntry = delegate(tx, 'journalEntry');

      const batch = await payrollBatch.findFirst({
        where: {
          id: input.payrollBatchId,
          tenantId: input.tenantId,
        },
      });

      if (!batch) {
        throw Object.assign(new Error('Payroll batch not found'), {
          statusCode: 404,
          code: 'PAYROLL_BATCH_NOT_FOUND',
        });
      }

      if (batch.status !== 'APPROVED') {
        throw Object.assign(new Error('Only approved payroll batches can be posted'), {
          statusCode: 409,
          code: 'PAYROLL_BATCH_NOT_APPROVED',
        });
      }

      const existingJournal = await journalEntry.findFirst({
        where: {
          tenantId: input.tenantId,
          sourceType: 'PAYROLL',
          sourceId: input.payrollBatchId,
          reversedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (existingJournal) {
        throw Object.assign(new Error('Payroll batch has already been posted'), {
          statusCode: 409,
          code: 'PAYROLL_BATCH_ALREADY_POSTED',
        });
      }

      const records = await payrollRecord.findMany({
        where: {
          tenantId: input.tenantId,
          payrollBatchId: input.payrollBatchId,
          status: 'APPROVED',
        },
      });

      if (!records.length) {
        throw Object.assign(new Error('Approved payroll batch has no approved records'), {
          statusCode: 422,
          code: 'PAYROLL_BATCH_NO_APPROVED_RECORDS',
        });
      }

      const totals = records.reduce(
        (acc, record) => ({
          grossPay: acc.grossPay.plus(money(record.grossPay)),
          employerCost: acc.employerCost.plus(money(record.employerCost)),
          netPay: acc.netPay.plus(money(record.netPay)),
          paye: acc.paye.plus(money(record.paye)),
          nssfEmployee: acc.nssfEmployee.plus(money(record.nssfEmployee)),
          nssfEmployer: acc.nssfEmployer.plus(money(record.nssfEmployer)),
          sha: acc.sha.plus(money(record.sha)),
          housingLevyEmployee: acc.housingLevyEmployee.plus(money(record.housingLevyEmployee)),
          housingLevyEmployer: acc.housingLevyEmployer.plus(money(record.housingLevyEmployer)),
          nitaEmployer: acc.nitaEmployer.plus(money(record.nitaEmployer)),
          totalDeductions: acc.totalDeductions.plus(money(record.totalDeductions)),
        }),
        {
          grossPay: ZERO,
          employerCost: ZERO,
          netPay: ZERO,
          paye: ZERO,
          nssfEmployee: ZERO,
          nssfEmployer: ZERO,
          sha: ZERO,
          housingLevyEmployee: ZERO,
          housingLevyEmployer: ZERO,
          nitaEmployer: ZERO,
          totalDeductions: ZERO,
        },
      );

      const employerContributionExpense = totals.nssfEmployer
        .plus(totals.housingLevyEmployer)
        .plus(totals.nitaEmployer)
        .toDecimalPlaces(2);

      const lines: PayrollPostingLine[] = [
        {
          accountCode: '6100',
          accountName: 'Salaries and Wages Expense',
          accountType: AccountType.EXPENSE,
          accountSubtype: AccountSubtype.OPERATING_EXPENSE,
          normalBalance: BalanceSide.DEBIT,
          debit: totals.grossPay,
          credit: ZERO,
        },
        {
          accountCode: '6110',
          accountName: 'Employer Payroll Contributions Expense',
          accountType: AccountType.EXPENSE,
          accountSubtype: AccountSubtype.OPERATING_EXPENSE,
          normalBalance: BalanceSide.DEBIT,
          debit: employerContributionExpense,
          credit: ZERO,
        },
        {
          accountCode: '2300',
          accountName: 'Net Payroll Payable',
          accountType: AccountType.LIABILITY,
          accountSubtype: AccountSubtype.CURRENT_LIABILITY,
          normalBalance: BalanceSide.CREDIT,
          debit: ZERO,
          credit: totals.netPay,
        },
        {
          accountCode: '2310',
          accountName: 'PAYE Payable',
          accountType: AccountType.LIABILITY,
          accountSubtype: AccountSubtype.TAX_PAYABLE,
          normalBalance: BalanceSide.CREDIT,
          debit: ZERO,
          credit: totals.paye,
        },
        {
          accountCode: '2320',
          accountName: 'NSSF Payable',
          accountType: AccountType.LIABILITY,
          accountSubtype: AccountSubtype.STATUTORY_PAYABLE,
          normalBalance: BalanceSide.CREDIT,
          debit: ZERO,
          credit: totals.nssfEmployee.plus(totals.nssfEmployer).toDecimalPlaces(2),
        },
        {
          accountCode: '2330',
          accountName: 'SHA/SHIF Payable',
          accountType: AccountType.LIABILITY,
          accountSubtype: AccountSubtype.STATUTORY_PAYABLE,
          normalBalance: BalanceSide.CREDIT,
          debit: ZERO,
          credit: totals.sha,
        },
        {
          accountCode: '2340',
          accountName: 'Affordable Housing Levy Payable',
          accountType: AccountType.LIABILITY,
          accountSubtype: AccountSubtype.STATUTORY_PAYABLE,
          normalBalance: BalanceSide.CREDIT,
          debit: ZERO,
          credit: totals.housingLevyEmployee.plus(totals.housingLevyEmployer).toDecimalPlaces(2),
        },
        {
          accountCode: '2350',
          accountName: 'NITA Payable',
          accountType: AccountType.LIABILITY,
          accountSubtype: AccountSubtype.STATUTORY_PAYABLE,
          normalBalance: BalanceSide.CREDIT,
          debit: ZERO,
          credit: totals.nitaEmployer,
        },
      ].filter((line) => line.debit.gt(0) || line.credit.gt(0));

      const debitTotal = lines.reduce((sum, line) => sum.plus(line.debit), ZERO).toDecimalPlaces(2);
      const creditTotal = lines.reduce((sum, line) => sum.plus(line.credit), ZERO).toDecimalPlaces(2);

      if (!debitTotal.eq(creditTotal)) {
        throw Object.assign(new Error('Payroll posting is not balanced'), {
          statusCode: 422,
          code: 'PAYROLL_POSTING_NOT_BALANCED',
          debitTotal,
          creditTotal,
        });
      }

      const journalLines = [];

      for (const line of lines) {
        const account = await this.ensureSystemAccount(tx, input.tenantId, line);

        journalLines.push({
          tenantId: input.tenantId,
          accountId: account.id,
          description: line.accountName,
          debit: line.debit,
          credit: line.credit,
        });
      }

      const journal = await journalEntry.create({
        data: {
          tenantId: input.tenantId,
          reference: `PAYROLL-${input.payrollBatchId}`,
          sourceType: 'PAYROLL',
          sourceId: input.payrollBatchId,
          description: `Payroll posting for batch ${batch.batchCode ?? input.payrollBatchId}`,
          entryDate: input.postingDate ?? new Date(),
          postedById: input.postedById,
          status: 'POSTED',
          totalDebit: debitTotal,
          totalCredit: creditTotal,
          lines: {
            create: journalLines,
          },
        },
      });

      await payrollRecord.updateMany({
        where: {
          tenantId: input.tenantId,
          payrollBatchId: input.payrollBatchId,
          status: 'APPROVED',
        },
        data: {
          status: 'POSTED',
          postedById: input.postedById,
          postedAt: new Date(),
        },
      });

      await payrollBatch.update({
        where: {
          id: input.payrollBatchId,
        },
        data: {
          status: 'POSTED',
          postedById: input.postedById,
          postedAt: new Date(),
          journalEntryId: journal.id,
        },
      });

      return {
        journal,
        debitTotal,
        creditTotal,
      };
    });
  }

  private async ensureSystemAccount(
    tx: Prisma.TransactionClient,
    tenantId: string,
    line: PayrollPostingLine,
  ) {
    const chartOfAccount = delegate(tx, 'chartOfAccount');

    const existing = await chartOfAccount.findFirst({
      where: {
        tenantId,
        code: line.accountCode,
      },
      select: {
        id: true,
        isSystem: true,
      },
    });

    if (existing) {
      if (existing.isSystem) {
        await chartOfAccount.update({
          where: {
            id: existing.id,
          },
          data: {
            type: line.accountType,
            subtype: line.accountSubtype,
            normalBalance: line.normalBalance,
            isActive: true,
          },
        });
      }

      return existing;
    }

    return chartOfAccount.create({
      data: {
        tenantId,
        code: line.accountCode,
        name: line.accountName,
        type: line.accountType,
        subtype: line.accountSubtype,
        normalBalance: line.normalBalance,
        isSystem: true,
        isActive: true,
        allowManualPosting: false,
      },
      select: {
        id: true,
        isSystem: true,
      },
    });
  }
}

export const payrollPostingService = new PayrollPostingService();

export default PayrollPostingService;