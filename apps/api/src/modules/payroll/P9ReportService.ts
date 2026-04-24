// apps/api/src/modules/payroll/P9ReportService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type P9ReportInput = {
  tenantId: string;
  employeeId: string;
  year: number;
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

function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-KE', {
    month: 'long',
  });
}

export class P9ReportService {
  async generateEmployeeP9(input: P9ReportInput) {
    const payrollRecord = delegate(prisma, 'payrollRecord');
    const employeeDelegate = delegate(prisma, 'employee');
    const tenantDelegate = delegate(prisma, 'tenant');

    const [employee, tenant, records] = await Promise.all([
      employeeDelegate.findFirst({
        where: {
          id: input.employeeId,
          tenantId: input.tenantId,
        },
      }),
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
          employeeId: input.employeeId,
          status: {
            in: ['APPROVED', 'POSTED', 'PAID'],
          },
          periodStart: {
            gte: new Date(input.year, 0, 1),
            lt: new Date(input.year + 1, 0, 1),
          },
        },
        orderBy: {
          periodStart: 'asc',
        },
      }),
    ]);

    if (!employee) {
      throw Object.assign(new Error('Employee not found'), {
        statusCode: 404,
        code: 'PAYROLL_EMPLOYEE_NOT_FOUND',
      });
    }

    const monthlyRows = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const monthRecords = records.filter((record: any) => {
        const periodStart = new Date(record.periodStart);
        return periodStart.getMonth() + 1 === month;
      });

      const totals = monthRecords.reduce(
        (acc, record: any) => ({
          basicPay: acc.basicPay.plus(money(record.basicPay)),
          grossPay: acc.grossPay.plus(money(record.grossPay)),
          taxablePay: acc.taxablePay.plus(money(record.taxablePay)),
          pensionablePay: acc.pensionablePay.plus(money(record.pensionablePay)),
          payeGrossTax: acc.payeGrossTax.plus(
            money(record.statutoryBreakdown?.payeGrossTax),
          ),
          personalRelief: acc.personalRelief.plus(
            money(record.statutoryBreakdown?.personalRelief),
          ),
          insuranceRelief: acc.insuranceRelief.plus(
            money(record.statutoryBreakdown?.insuranceRelief),
          ),
          paye: acc.paye.plus(money(record.paye)),
          nssfEmployee: acc.nssfEmployee.plus(money(record.nssfEmployee)),
          sha: acc.sha.plus(money(record.sha)),
          housingLevyEmployee: acc.housingLevyEmployee.plus(
            money(record.housingLevyEmployee),
          ),
          netPay: acc.netPay.plus(money(record.netPay)),
        }),
        {
          basicPay: ZERO,
          grossPay: ZERO,
          taxablePay: ZERO,
          pensionablePay: ZERO,
          payeGrossTax: ZERO,
          personalRelief: ZERO,
          insuranceRelief: ZERO,
          paye: ZERO,
          nssfEmployee: ZERO,
          sha: ZERO,
          housingLevyEmployee: ZERO,
          netPay: ZERO,
        },
      );

      return {
        month,
        monthName: monthName(month),
        recordCount: monthRecords.length,
        ...totals,
      };
    });

    const annualTotals = monthlyRows.reduce(
      (acc, row) => ({
        basicPay: acc.basicPay.plus(row.basicPay),
        grossPay: acc.grossPay.plus(row.grossPay),
        taxablePay: acc.taxablePay.plus(row.taxablePay),
        pensionablePay: acc.pensionablePay.plus(row.pensionablePay),
        payeGrossTax: acc.payeGrossTax.plus(row.payeGrossTax),
        personalRelief: acc.personalRelief.plus(row.personalRelief),
        insuranceRelief: acc.insuranceRelief.plus(row.insuranceRelief),
        paye: acc.paye.plus(row.paye),
        nssfEmployee: acc.nssfEmployee.plus(row.nssfEmployee),
        sha: acc.sha.plus(row.sha),
        housingLevyEmployee: acc.housingLevyEmployee.plus(row.housingLevyEmployee),
        netPay: acc.netPay.plus(row.netPay),
      }),
      {
        basicPay: ZERO,
        grossPay: ZERO,
        taxablePay: ZERO,
        pensionablePay: ZERO,
        payeGrossTax: ZERO,
        personalRelief: ZERO,
        insuranceRelief: ZERO,
        paye: ZERO,
        nssfEmployee: ZERO,
        sha: ZERO,
        housingLevyEmployee: ZERO,
        netPay: ZERO,
      },
    );

    return {
      tenantId: input.tenantId,
      employer: {
        id: tenant?.id ?? input.tenantId,
        name: tenant?.name ?? null,
        kraPin: tenant?.kraPin ?? null,
      },
      employee: {
        id: employee.id,
        staffNumber: employee.staffNumber ?? null,
        name:
          employee.displayName ??
          employee.fullName ??
          employee.name ??
          employee.email ??
          null,
        kraPin: employee.kraPin ?? null,
        nssfNumber: employee.nssfNumber ?? null,
        shaNumber: employee.shaNumber ?? null,
      },
      year: input.year,
      monthlyRows,
      annualTotals,
      generatedAt: new Date(),
      reportType: 'P9',
    };
  }
}

export const p9ReportService = new P9ReportService();

export default P9ReportService;