import { Prisma } from '@global-wakili/database';
import { ExpenseService } from './ExpenseService';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export class RecurringExpenseService {
  static async createTemplate(
    db: any,
    tenantId: string,
    input: {
      title: string;
      description: string;
      amount: Prisma.Decimal | string | number;
      currency?: string | null;
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
      startDate: Date;
      endDate?: Date | null;
      expenseAccountId: string;
      vendorId?: string | null;
      branchId?: string | null;
      matterId?: string | null;
      notes?: string | null;
    },
  ) {
    const amount = toDecimal(input.amount);

    if (amount.lte(0)) {
      throw Object.assign(new Error('Recurring expense amount must be greater than zero'), {
        statusCode: 422,
        code: 'INVALID_RECURRING_EXPENSE_AMOUNT',
      });
    }

    return db.recurringExpenseTemplate.create({
      data: {
        tenantId,
        title: input.title.trim(),
        description: input.description.trim(),
        amount,
        currency: input.currency?.trim().toUpperCase() ?? 'KES',
        frequency: input.frequency,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        expenseAccountId: input.expenseAccountId,
        vendorId: input.vendorId ?? null,
        branchId: input.branchId ?? null,
        matterId: input.matterId ?? null,
        notes: input.notes?.trim() ?? null,
        isActive: true,
      },
    });
  }

  static async generateOccurrence(
    db: any,
    tenantId: string,
    recurringTemplateId: string,
    occurrenceDate: Date,
  ) {
    const template = await db.recurringExpenseTemplate.findFirst({
      where: {
        tenantId,
        id: recurringTemplateId,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        currency: true,
        expenseAccountId: true,
        vendorId: true,
        branchId: true,
        matterId: true,
        notes: true,
      },
    });

    if (!template) {
      throw Object.assign(new Error('Recurring expense template not found'), {
        statusCode: 404,
        code: 'RECURRING_EXPENSE_TEMPLATE_NOT_FOUND',
      });
    }

    return ExpenseService.create(db, tenantId, {
      description: template.description,
      expenseDate: occurrenceDate,
      amount: template.amount,
      currency: template.currency,
      expenseAccountId: template.expenseAccountId,
      vendorId: template.vendorId ?? null,
      branchId: template.branchId ?? null,
      matterId: template.matterId ?? null,
      notes: template.notes ?? null,
      isRecurring: true,
      recurringTemplateId: template.id,
      reference: `RECUR-${template.id}-${occurrenceDate.toISOString().slice(0, 10)}`,
    });
  }

  static async listActiveTemplates(db: any, tenantId: string) {
    return db.recurringExpenseTemplate.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: [{ startDate: 'desc' }],
    });
  }
}