// apps/api/src/modules/payroll/payroll.dashboard.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);

type PayrollDashboardRecord = Record<string, any>;

type PayrollDashboardTotals = {
  employeeCount: number;
  grossPay: Prisma.Decimal;
  taxablePay: Prisma.Decimal;
  paye: Prisma.Decimal;
  nssfEmployee: Prisma.Decimal;
  nssfEmployer: Prisma.Decimal;
  sha: Prisma.Decimal;
  housingLevyEmployee: Prisma.Decimal;
  housingLevyEmployer: Prisma.Decimal;
  nitaEmployer: Prisma.Decimal;
  totalDeductions: Prisma.Decimal;
  netPay: Prisma.Decimal;
  employerCost: Prisma.Decimal;
};

export type PayrollDashboardInput = {
  tenantId: string;
  year?: number;
  month?: number;
  branchId?: string | null;
  departmentId?: string | null;
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

  return decimal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

// Period lives on PayrollBatch.year/month (no `periodStart` column exists). FINDING-008-005.
function getPeriodFilter(input: PayrollDashboardInput): { year?: number; month?: number } {
  return {
    ...(input.year ? { year: input.year } : {}),
    ...(input.month ? { month: input.month } : {}),
  };
}

export class PayrollDashboardService {
  async getDashboard(input: PayrollDashboardInput) {
    const payrollBatch = delegate(prisma, 'payrollBatch');
    const payslip = delegate(prisma, 'payslip');

    // PayrollBatch carries status/branch/period directly (no `departmentId` column). FINDING-008-005.
    const batchWhere = {
      tenantId: input.tenantId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      ...getPeriodFilter(input),
    };

    // Payslip carries the statutory amounts; filter it by period/branch via the batch
    // relation (Payslip has no branchId/year/month columns of its own). FINDING-008-005.
    const periodFilter = getPeriodFilter(input);
    const payslipWhere = {
      tenantId: input.tenantId,
      ...(input.branchId || input.year || input.month
        ? { batch: { ...(input.branchId ? { branchId: input.branchId } : {}), ...periodFilter } }
        : {}),
    };

    const [
      batchStatusBreakdown,
      payslips,
      recentBatches,
      pendingApprovalCount,
      approvedNotPostedCount,
      postedNotPaidCount,
    ] = await Promise.all([
      payrollBatch.groupBy({
        by: ['status'],
        where: batchWhere,
        _count: { id: true },
      }),
      payslip.findMany({
        where: payslipWhere,
        select: {
          grossPay: true,
          taxablePay: true,
          paye: true,
          shif: true,
          nssf: true,
          housingLevy: true,
          deductions: true,
          netPay: true,
          employerCost: true,
        },
      }),
      payrollBatch.findMany({
        where: batchWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // "Pending approval" = DRAFT (PayrollBatchStatus has no PENDING_APPROVAL). FINDING-008-005.
      payrollBatch.count({ where: { ...batchWhere, status: 'DRAFT' } }),
      payrollBatch.count({ where: { ...batchWhere, status: 'APPROVED' } }),
      payrollBatch.count({ where: { ...batchWhere, status: 'POSTED' } }),
    ]);

    // Map deployed Payslip columns onto the totals shape. Fields the schema never stored
    // (employer NSSF/housing split, NITA) stay 0. FINDING-008-005.
    const totals = (payslips as PayrollDashboardRecord[]).reduce(
      (acc: PayrollDashboardTotals, p: PayrollDashboardRecord): PayrollDashboardTotals => ({
        employeeCount: acc.employeeCount + 1,
        grossPay: acc.grossPay.plus(money(p.grossPay)),
        taxablePay: acc.taxablePay.plus(money(p.taxablePay)),
        paye: acc.paye.plus(money(p.paye)),
        nssfEmployee: acc.nssfEmployee.plus(money(p.nssf)),
        nssfEmployer: acc.nssfEmployer,
        sha: acc.sha.plus(money(p.shif)),
        housingLevyEmployee: acc.housingLevyEmployee.plus(money(p.housingLevy)),
        housingLevyEmployer: acc.housingLevyEmployer,
        nitaEmployer: acc.nitaEmployer,
        totalDeductions: acc.totalDeductions.plus(money(p.deductions)),
        netPay: acc.netPay.plus(money(p.netPay)),
        employerCost: acc.employerCost.plus(money(p.employerCost)),
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
        totalDeductions: ZERO,
        netPay: ZERO,
        employerCost: ZERO,
      },
    );

    return {
      tenantId: input.tenantId,
      filters: {
        year: input.year ?? null,
        month: input.month ?? null,
        branchId: input.branchId ?? null,
        departmentId: input.departmentId ?? null,
      },
      lifecycle: {
        pendingApprovalCount,
        approvedNotPostedCount,
        postedNotPaidCount,
      },
      totals,
      breakdowns: {
        batchStatus: batchStatusBreakdown,
        recordStatus: [], // PayrollRecord has no status column in deployed schema (FINDING-008-005)
        payslipStatus: [], // Payslip has no status column in deployed schema (FINDING-008-005)
      },
      recentBatches,
      generatedAt: new Date(),
    };
  }
}

export const payrollDashboardService = new PayrollDashboardService();

export default PayrollDashboardService;
