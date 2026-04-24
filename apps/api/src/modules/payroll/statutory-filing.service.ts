// apps/api/src/modules/payroll/statutory-filing.service.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

type StatutoryFilingKind =
  | 'PAYE'
  | 'NSSF'
  | 'SHA_SHIF'
  | 'AFFORDABLE_HOUSING_LEVY'
  | 'NITA'
  | 'P9'
  | 'P10';

type StatutoryFilingInput = {
  tenantId: string;
  year: number;
  month?: number;
  payrollBatchId?: string;
  kind?: StatutoryFilingKind;
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

  const decimal = new Prisma.Decimal(value as any);

  if (!decimal.isFinite()) return ZERO;

  return decimal.toDecimalPlaces(2);
}

function makePeriodWhere(input: StatutoryFilingInput) {
  if (input.month) {
    const start = new Date(input.year, input.month - 1, 1);
    const end = new Date(input.year, input.month, 1);

    return {
      periodStart: {
        gte: start,
        lt: end,
      },
    };
  }

  const start = new Date(input.year, 0, 1);
  const end = new Date(input.year + 1, 0, 1);

  return {
    periodStart: {
      gte: start,
      lt: end,
    },
  };
}

export class StatutoryFilingService {
  async generateSummary(input: StatutoryFilingInput) {
    const payrollRecord = delegate(prisma, 'payrollRecord');

    const records = await payrollRecord.findMany({
      where: {
        tenantId: input.tenantId,
        status: {
          in: ['APPROVED', 'POSTED', 'PAID'],
        },
        ...(input.payrollBatchId ? { payrollBatchId: input.payrollBatchId } : {}),
        ...makePeriodWhere(input),
      },
      include: {
        employee: true,
      },
      orderBy: {
        employeeId: 'asc',
      },
    });

    const totals = records.reduce(
      (acc, record) => ({
        employeeCount: acc.employeeCount + 1,
        grossPay: acc.grossPay.plus(money(record.grossPay)),
        taxablePay: acc.taxablePay.plus(money(record.taxablePay)),
        paye: acc.paye.plus(money(record.paye)),
        nssfEmployee: acc.nssfEmployee.plus(money(record.nssfEmployee)),
        nssfEmployer: acc.nssfEmployer.plus(money(record.nssfEmployer)),
        sha: acc.sha.plus(money(record.sha)),
        housingLevyEmployee: acc.housingLevyEmployee.plus(money(record.housingLevyEmployee)),
        housingLevyEmployer: acc.housingLevyEmployer.plus(money(record.housingLevyEmployer)),
        nitaEmployer: acc.nitaEmployer.plus(money(record.nitaEmployer)),
        netPay: acc.netPay.plus(money(record.netPay)),
      }),
      {
        employeeCount: 0,
        grossPay: ZERO,
        taxablePay: ZERO,
        paye: ZERO,
        nssfEmployee: ZERO,
        nssfEmployer: ZERO,
        sha: ZERO,
        housingLevyEmployee: ZERO,
        housingLevyEmployer: ZERO,
        nitaEmployer: ZERO,
        netPay: ZERO,
      },
    );

    return {
      tenantId: input.tenantId,
      year: input.year,
      month: input.month ?? null,
      payrollBatchId: input.payrollBatchId ?? null,
      kind: input.kind ?? 'PAYE',
      totals,
      employeeLines: records.map((record) => ({
        employeeId: record.employeeId,
        staffNumber: record.employee?.staffNumber ?? null,
        employeeName:
          record.employee?.displayName ??
          record.employee?.fullName ??
          record.employee?.name ??
          record.employee?.email ??
          null,
        kraPin: record.employee?.kraPin ?? null,
        nssfNumber: record.employee?.nssfNumber ?? null,
        shaNumber: record.employee?.shaNumber ?? null,
        grossPay: money(record.grossPay),
        taxablePay: money(record.taxablePay),
        paye: money(record.paye),
        nssfEmployee: money(record.nssfEmployee),
        nssfEmployer: money(record.nssfEmployer),
        sha: money(record.sha),
        housingLevyEmployee: money(record.housingLevyEmployee),
        housingLevyEmployer: money(record.housingLevyEmployer),
        nitaEmployer: money(record.nitaEmployer),
        netPay: money(record.netPay),
      })),
      generatedAt: new Date(),
    };
  }

  async createFilingRecord(input: StatutoryFilingInput & {
    createdById: string;
    metadata?: Record<string, unknown>;
  }) {
    const summary = await this.generateSummary(input);
    const statutoryFiling = delegate(prisma, 'statutoryPayrollFiling');

    const existing = await statutoryFiling.findFirst({
      where: {
        tenantId: input.tenantId,
        year: input.year,
        month: input.month ?? null,
        kind: input.kind ?? 'PAYE',
        payrollBatchId: input.payrollBatchId ?? null,
        status: {
          not: 'CANCELLED',
        },
      },
    });

    if (existing) {
      throw Object.assign(new Error('Statutory payroll filing already exists for this period'), {
        statusCode: 409,
        code: 'STATUTORY_FILING_DUPLICATE',
      });
    }

    return statutoryFiling.create({
      data: {
        tenantId: input.tenantId,
        payrollBatchId: input.payrollBatchId ?? null,
        year: input.year,
        month: input.month ?? null,
        kind: input.kind ?? 'PAYE',
        status: 'DRAFT',
        employeeCount: summary.totals.employeeCount,
        grossPay: summary.totals.grossPay,
        taxablePay: summary.totals.taxablePay,
        paye: summary.totals.paye,
        nssfEmployee: summary.totals.nssfEmployee,
        nssfEmployer: summary.totals.nssfEmployer,
        sha: summary.totals.sha,
        housingLevyEmployee: summary.totals.housingLevyEmployee,
        housingLevyEmployer: summary.totals.housingLevyEmployer,
        nitaEmployer: summary.totals.nitaEmployer,
        payload: summary as any,
        metadata: input.metadata ?? {},
        createdById: input.createdById,
      },
    });
  }

  async markFiled(input: {
    tenantId: string;
    filingId: string;
    filedById: string;
    filingReference?: string | null;
    filedAt?: Date;
  }) {
    const statutoryFiling = delegate(prisma, 'statutoryPayrollFiling');

    const existing = await statutoryFiling.findFirst({
      where: {
        id: input.filingId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Statutory filing not found'), {
        statusCode: 404,
        code: 'STATUTORY_FILING_NOT_FOUND',
      });
    }

    if (existing.status === 'FILED') {
      return existing;
    }

    return statutoryFiling.update({
      where: {
        id: input.filingId,
      },
      data: {
        status: 'FILED',
        filedById: input.filedById,
        filedAt: input.filedAt ?? new Date(),
        filingReference: input.filingReference ?? null,
      },
    });
  }
}

export const statutoryFilingService = new StatutoryFilingService();

export default StatutoryFilingService;