// apps/api/src/modules/payroll/payroll.dashboard.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);

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

function getPeriodWhere(input: PayrollDashboardInput) {
  if (input.year && input.month) {
    return {
      periodStart: {
        gte: new Date(input.year, input.month - 1, 1),
        lt: new Date(input.year, input.month, 1),
      },
    };
  }

  if (input.year) {
    return {
      periodStart: {
        gte: new Date(input.year, 0, 1),
        lt: new Date(input.year + 1, 0, 1),
      },
    };
  }

  return {};
}

export class PayrollDashboardService {
  async getDashboard(input: PayrollDashboardInput) {
    const payrollBatch = delegate(prisma, 'payrollBatch');
    const payrollRecord = delegate(prisma, 'payrollRecord');
    const payslip = delegate(prisma, 'payslip');

    const where = {
      tenantId: input.tenantId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      ...getPeriodWhere(input),
    };

    const [
      batchStatusBreakdown,
      recordStatusBreakdown,
      records,
      payslipStatusBreakdown,
      recentBatches,
      pendingApprovalCount,
      approvedNotPostedCount,
      postedNotPaidCount,
    ] = await Promise.all([
      payrollBatch.groupBy({
        by: ['status'],
        where: {
          tenantId: input.tenantId,
          ...(input.branchId ? { branchId: input.branchId } : {}),
          ...(input.departmentId ? { departmentId: input.departmentId } : {}),
          ...(input.year ? { year: input.year } : {}),
          ...(input.month ? { month: input.month } : {}),
        },
        _count: { id: true },
      }),
      payrollRecord.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      payrollRecord.findMany({
        where: {
          ...where,
          status: {
            not: 'CANCELLED',
          },
        },
        select: {
          id: true,
          grossPay: true,
          taxablePay: true,
          paye: true,
          nssfEmployee: true,
          nssfEmployer: true,
          sha: true,
          housingLevyEmployee: true,
          housingLevyEmployer: true,
          nitaEmployer: true,
          totalDeductions: true,
          netPay: true,
          employerCost: true,
        },
      }),
      payslip.groupBy({
        by: ['status'],
        where: {
          tenantId: input.tenantId,
        },
        _count: { id: true },
      }),
      payrollBatch.findMany({
        where: {
          tenantId: input.tenantId,
          ...(input.branchId ? { branchId: input.branchId } : {}),
          ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
      payrollBatch.count({
        where: {
          tenantId: input.tenantId,
          status: 'PENDING_APPROVAL',
          ...(input.branchId ? { branchId: input.branchId } : {}),
          ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        },
      }),
      payrollBatch.count({
        where: {
          tenantId: input.tenantId,
          status: 'APPROVED',
          ...(input.branchId ? { branchId: input.branchId } : {}),
          ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        },
      }),
      payrollBatch.count({
        where: {
          tenantId: input.tenantId,
          status: 'POSTED',
          ...(input.branchId ? { branchId: input.branchId } : {}),
          ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        },
      }),
    ]);

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
        totalDeductions: acc.totalDeductions.plus(money(record.totalDeductions)),
        netPay: acc.netPay.plus(money(record.netPay)),
        employerCost: acc.employerCost.plus(money(record.employerCost)),
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
        recordStatus: recordStatusBreakdown,
        payslipStatus: payslipStatusBreakdown,
      },
      recentBatches,
      generatedAt: new Date(),
    };
  }
}

export const payrollDashboardService = new PayrollDashboardService();

export default PayrollDashboardService;