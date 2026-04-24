// apps/api/src/modules/payroll/P10ReportService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type P10ReportInput = {
  tenantId: string;
  year: number;
  month?: number;
  payrollBatchId?: string;
};

const ZERO = new Prisma.Decimal(0);

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

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) return ZERO;

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function periodWhere(input: P10ReportInput) {
  if (input.month) {
    return {
      periodStart: {
        gte: new Date(input.year, input.month - 1, 1),
        lt: new Date(input.year, input.month, 1),
      },
    };
  }

  return {
    periodStart: {
      gte: new Date(input.year, 0, 1),
      lt: new Date(input.year + 1, 0, 1),
    },
  };
}

export class P10ReportService {
  async generateP10(input: P10ReportInput) {
    const payrollRecord = delegate(prisma, 'payrollRecord');
    const tenantDelegate = delegate(prisma, 'tenant');

    const [tenant, records] = await Promise.all([
      tenantDelegate.findFirst({
        where: {
          id: input.tenantId,
        },
        select: {
          id: true,
          name: true,
          kraPin: true,
        },
      }).catch(() => null),
      payrollRecord.findMany({
        where: {
          tenantId: input.tenantId,
          ...(input.payrollBatchId ? { payrollBatchId: input.payrollBatchId } : {}),
          status: {
            in: ['APPROVED', 'POSTED', 'PAID'],
          },
          ...periodWhere(input),
        },
        include: {
          employee: true,
        },
        orderBy: [
          { employeeId: 'asc' },
          { periodStart: 'asc' },
        ],
      }),
    ]);

    const employeeLines = records.map((record: any) => ({
      payrollRecordId: record.id,
      employeeId: record.employeeId,
      staffNumber: record.employee?.staffNumber ?? null,
      employeeName:
        record.employee?.displayName ??
        record.employee?.fullName ??
        record.employee?.name ??
        record.employee?.email ??
        null,
      kraPin: record.employee?.kraPin ?? null,
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      grossPay: money(record.grossPay),
      taxablePay: money(record.taxablePay),
      personalRelief: money(record.statutoryBreakdown?.personalRelief),
      insuranceRelief: money(record.statutoryBreakdown?.insuranceRelief),
      payeGrossTax: money(record.statutoryBreakdown?.payeGrossTax),
      paye: money(record.paye),
    }));

    const totals = employeeLines.reduce(
      (acc, line) => ({
        employeeCount: acc.employeeCount + 1,
        grossPay: acc.grossPay.plus(line.grossPay),
        taxablePay: acc.taxablePay.plus(line.taxablePay),
        personalRelief: acc.personalRelief.plus(line.personalRelief),
        insuranceRelief: acc.insuranceRelief.plus(line.insuranceRelief),
        payeGrossTax: acc.payeGrossTax.plus(line.payeGrossTax),
        paye: acc.paye.plus(line.paye),
      }),
      {
        employeeCount: 0,
        grossPay: ZERO,
        taxablePay: ZERO,
        personalRelief: ZERO,
        insuranceRelief: ZERO,
        payeGrossTax: ZERO,
        paye: ZERO,
      },
    );

    return {
      tenantId: input.tenantId,
      employer: {
        id: tenant?.id ?? input.tenantId,
        name: tenant?.name ?? null,
        kraPin: tenant?.kraPin ?? null,
      },
      year: input.year,
      month: input.month ?? null,
      payrollBatchId: input.payrollBatchId ?? null,
      reportType: 'P10',
      totals,
      employeeLines,
      generatedAt: new Date(),
    };
  }

  async generateMonthlyPayeSummary(input: P10ReportInput) {
    return this.generateP10(input);
  }
}

export const p10ReportService = new P10ReportService();

export default P10ReportService;