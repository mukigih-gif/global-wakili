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

type P10EmployeeLine = {
  payrollRecordId: string;
  employeeId: string;
  staffNumber: string | null;
  employeeName: string | null;
  kraPin: string | null;
  periodStart: Date;
  periodEnd: Date;
  grossPay: Prisma.Decimal;
  taxablePay: Prisma.Decimal;
  personalRelief: Prisma.Decimal;
  insuranceRelief: Prisma.Decimal;
  payeGrossTax: Prisma.Decimal;
  paye: Prisma.Decimal;
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

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) return ZERO;

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export class P10ReportService {
  async generateP10(input: P10ReportInput) {
    const payslip = delegate(prisma, 'payslip');
    const tenantDelegate = delegate(prisma, 'tenant');

    const [tenant, slips] = await Promise.all([
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
      payslip.findMany({
        where: {
          tenantId: input.tenantId,
          ...(input.payrollBatchId ? { batchId: input.payrollBatchId } : {}),
          batch: {
            year: input.year,
            ...(input.month ? { month: input.month } : {}),
            status: {
              in: ['APPROVED', 'POSTED', 'PAID'],
            },
          },
        },
        include: {
          user: true,
          employeeProfile: true,
          batch: true,
        },
        orderBy: [
          { userId: 'asc' },
        ],
      }),
    ]);

    const employeeLines: P10EmployeeLine[] = (slips as any[]).map((slip: any): P10EmployeeLine => ({
      payrollRecordId: slip.id,
      employeeId: slip.employeeProfileId ?? slip.userId,
      staffNumber: slip.employeeProfile?.employeeNumber ?? null,
      employeeName: slip.user?.name ?? slip.user?.email ?? null,
      kraPin: slip.user?.kraPin ?? null,
      periodStart: new Date(slip.batch.year, slip.batch.month - 1, 1),
      periodEnd: new Date(slip.batch.year, slip.batch.month, 0),
      grossPay: money(slip.grossPay),
      taxablePay: money(slip.taxablePay),
      personalRelief: ZERO,
      insuranceRelief: ZERO,
      payeGrossTax: money(slip.paye),
      paye: money(slip.paye),
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
