import { Prisma } from '@global-wakili/database';
import { GeneralLedgerService } from '../finance/GeneralLedgerService';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export class ExpenseService {
  static async create(
    db: any,
    tenantId: string,
    input: {
      description: string;
      expenseDate: Date;
      amount: Prisma.Decimal | string | number;
      currency?: string | null;
      expenseAccountId: string;
      branchId?: string | null;
      matterId?: string | null;
      vendorId?: string | null;
      reference?: string | null;
      notes?: string | null;
      isRecurring?: boolean;
      recurringTemplateId?: string | null;
    },
  ) {
    const amount = toDecimal(input.amount);

    if (amount.lte(0)) {
      throw Object.assign(new Error('Expense amount must be greater than zero'), {
        statusCode: 422,
        code: 'INVALID_EXPENSE_AMOUNT',
      });
    }

    return db.expense.create({
      data: {
        tenantId,
        description: input.description.trim(),
        expenseDate: input.expenseDate,
        amount,
        currency: input.currency?.trim().toUpperCase() ?? 'KES',
        expenseAccountId: input.expenseAccountId,
        branchId: input.branchId ?? null,
        matterId: input.matterId ?? null,
        vendorId: input.vendorId ?? null,
        reference: input.reference?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
        isRecurring: input.isRecurring ?? false,
        recurringTemplateId: input.recurringTemplateId ?? null,
        status: 'POSTED',
      },
    });
  }

  static async postToGeneralLedger(
    req: any,
    params: {
      expenseId: string;
      bankAccountChartId: string;
    },
  ) {
    const expense = await req.db.expense.findFirst({
      where: {
        tenantId: req.tenantId!,
        id: params.expenseId,
      },
      select: {
        id: true,
        description: true,
        expenseDate: true,
        amount: true,
        currency: true,
        expenseAccountId: true,
        matterId: true,
        reference: true,
      },
    });

    if (!expense) {
      throw Object.assign(new Error('Expense not found'), {
        statusCode: 404,
        code: 'EXPENSE_NOT_FOUND',
      });
    }

    return GeneralLedgerService.postJournal(
      req,
      {
        reference: expense.reference ?? `EXP-${expense.id}`,
        description: expense.description,
        date: expense.expenseDate,
        currency: expense.currency,
        exchangeRate: 1,
        sourceModule: 'procurement',
        sourceEntityType: 'Expense',
        sourceEntityId: expense.id,
        lines: [
          {
            accountId: expense.expenseAccountId,
            debit: toDecimal(expense.amount),
            credit: new Prisma.Decimal(0),
            matterId: expense.matterId ?? null,
            reference: expense.reference ?? null,
            description: expense.description,
          },
          {
            accountId: params.bankAccountChartId,
            debit: new Prisma.Decimal(0),
            credit: toDecimal(expense.amount),
            matterId: expense.matterId ?? null,
            reference: expense.reference ?? null,
            description: `Cash/bank payment for expense ${expense.description}`,
          },
        ],
      },
      {
        enforcePeriodLock: true,
        allowMultiCurrency: false,
        expectedSourceModule: 'procurement',
      },
    );
  }
}