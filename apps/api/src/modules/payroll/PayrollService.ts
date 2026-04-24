// apps/api/src/modules/payroll/PayrollService.ts

import { Prisma, prisma } from '@global-wakili/database';

import StatutoryService from './StatutoryService';
import {
  PAYROLL_DEFAULTS,
  type CreatePayrollRecordInput,
  type EmployerContributionInput,
  type PayrollCalculationInput,
  type PayrollCalculationResult,
  type PayrollRecordListInput,
  type PayrollBatchSummary,
} from './payroll.types';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);

function money(value: string | number | Prisma.Decimal | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const decimal = new Prisma.Decimal(value);

  if (!decimal.isFinite()) {
    throw Object.assign(new Error('Invalid decimal value'), {
      statusCode: 422,
      code: 'INVALID_DECIMAL_VALUE',
    });
  }

  return decimal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

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

export class PayrollService {
  calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
    const statutory = StatutoryService.calculate(input);

    const basicPay = money(input.basicPay);

    const earnings = [
      ...(input.allowances ?? []),
      ...(input.benefits ?? []),
      ...(input.overtime ?? []),
      ...(input.bonuses ?? []),
      ...(input.commissions ?? []),
      ...(input.reimbursements ?? []),
    ];

    const manualDeductions = input.manualDeductions ?? [];

    const totalVariableEarnings = earnings.reduce(
      (sum, item) => sum.plus(money(item.amount)),
      ZERO,
    );

    const totalEarnings = basicPay.plus(totalVariableEarnings).toDecimalPlaces(2);

    const totalTaxableEarnings = earnings
      .filter((item) => item.taxable !== false)
      .reduce((sum, item) => sum.plus(money(item.amount)), basicPay)
      .toDecimalPlaces(2);

    const totalManualDeductions = manualDeductions.reduce(
      (sum, item) => sum.plus(money(item.amount)),
      ZERO,
    ).toDecimalPlaces(2);

    const employerContributions: EmployerContributionInput[] = [
      {
        kind: 'NSSF_EMPLOYER',
        code: 'NSSF_ER',
        label: 'NSSF Employer Contribution',
        amount: statutory.nssfEmployer,
      },
      {
        kind: 'AFFORDABLE_HOUSING_LEVY_EMPLOYER',
        code: 'AHL_ER',
        label: 'Affordable Housing Levy Employer Contribution',
        amount: statutory.housingLevyEmployer,
      },
      {
        kind: 'NITA',
        code: 'NITA',
        label: 'NITA Employer Contribution',
        amount: statutory.nitaEmployer,
      },
    ];

    if (input.pensionEmployerContribution) {
      employerContributions.push({
        kind: 'PENSION_EMPLOYER',
        code: 'PENSION_ER',
        label: 'Employer Pension Contribution',
        amount: money(input.pensionEmployerContribution),
      });
    }

    const totalDeductions = statutory.totalEmployeeStatutoryDeductions
      .plus(totalManualDeductions)
      .plus(money(input.pensionEmployeeContribution))
      .toDecimalPlaces(2);

    const netPay = Prisma.Decimal.max(totalEarnings.minus(totalDeductions), ZERO).toDecimalPlaces(2);

    const employerCost = totalEarnings
      .plus(statutory.totalEmployerContributions)
      .plus(money(input.pensionEmployerContribution))
      .toDecimalPlaces(2);

    return {
      tenantId: input.tenantId,
      employeeId: input.employeeId,
      currency: input.currency ?? PAYROLL_DEFAULTS.currency,

      basicPay,
      grossPay: statutory.grossPay,
      taxablePay: statutory.taxablePay,
      pensionablePay: statutory.pensionablePay,

      earnings,
      manualDeductions,
      employerContributions,

      statutory,

      totalEarnings,
      totalTaxableEarnings,
      totalManualDeductions,
      totalDeductions,
      netPay,
      employerCost,

      metadata: input.metadata,
    };
  }

  async createPayrollRecord(input: CreatePayrollRecordInput) {
    return prisma.$transaction(async (tx) => {
      await this.assertEmployeeBelongsToTenant(tx, input.tenantId, input.employeeId);

      const calculation = this.calculatePayroll(input);

      const payrollRecordDelegate = delegate(tx, 'payrollRecord');

      const existing = await payrollRecordDelegate.findFirst({
        where: {
          tenantId: input.tenantId,
          employeeId: input.employeeId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          status: {
            not: 'CANCELLED',
          },
        },
        select: { id: true },
      });

      if (existing) {
        throw Object.assign(new Error('Payroll record already exists for this employee and period'), {
          statusCode: 409,
          code: 'PAYROLL_RECORD_DUPLICATE',
        });
      }

      return payrollRecordDelegate.create({
        data: {
          tenantId: input.tenantId,
          payrollBatchId: input.payrollBatchId ?? null,
          employeeId: input.employeeId,
          branchId: input.branchId ?? null,
          departmentId: input.departmentId ?? null,

          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          paymentDate: input.paymentDate ?? null,

          currency: calculation.currency,
          basicPay: calculation.basicPay,
          grossPay: calculation.grossPay,
          taxablePay: calculation.taxablePay,
          pensionablePay: calculation.pensionablePay,

          paye: calculation.statutory.paye,
          nssfEmployee: calculation.statutory.nssfEmployee,
          nssfEmployer: calculation.statutory.nssfEmployer,
          sha: calculation.statutory.sha,
          housingLevyEmployee: calculation.statutory.housingLevyEmployee,
          housingLevyEmployer: calculation.statutory.housingLevyEmployer,
          nitaEmployer: calculation.statutory.nitaEmployer,

          totalEarnings: calculation.totalEarnings,
          totalDeductions: calculation.totalDeductions,
          netPay: calculation.netPay,
          employerCost: calculation.employerCost,

          status: 'CALCULATED',
          createdById: input.createdById ?? null,

          earnings: calculation.earnings as any,
          deductions: calculation.manualDeductions as any,
          employerContributions: calculation.employerContributions as any,
          statutoryBreakdown: calculation.statutory as any,
          metadata: {
            ...(input.metadata ?? {}),
            calculation: {
              appliedRates: calculation.statutory.appliedRates,
            },
          },
        },
      });
    });
  }

  async listPayrollRecords(input: PayrollRecordListInput) {
    const payrollRecordDelegate = delegate(prisma, 'payrollRecord');

    return payrollRecordDelegate.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.payrollBatchId ? { payrollBatchId: input.payrollBatchId } : {}),
        ...(input.employeeId ? { employeeId: input.employeeId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.year || input.month
          ? {
              periodStart: {
                ...(input.year ? { gte: new Date(input.year, (input.month ?? 1) - 1, 1) } : {}),
              },
            }
          : {}),
      },
      orderBy: [
        { periodStart: 'desc' },
        { createdAt: 'desc' },
      ],
      take: Math.min(input.take ?? PAYROLL_DEFAULTS.maxPayrollPageSize, PAYROLL_DEFAULTS.maxPayrollPageSize),
      skip: input.skip ?? 0,
    });
  }

  async getPayrollRecordById(tenantId: string, payrollRecordId: string) {
    const payrollRecordDelegate = delegate(prisma, 'payrollRecord');

    const record = await payrollRecordDelegate.findFirst({
      where: {
        id: payrollRecordId,
        tenantId,
      },
    });

    if (!record) {
      throw Object.assign(new Error('Payroll record not found'), {
        statusCode: 404,
        code: 'PAYROLL_RECORD_NOT_FOUND',
      });
    }

    return record;
  }

  async summarizeBatch(tenantId: string, payrollBatchId: string): Promise<PayrollBatchSummary> {
    const payrollRecordDelegate = delegate(prisma, 'payrollRecord');

    const records = await payrollRecordDelegate.findMany({
      where: {
        tenantId,
        payrollBatchId,
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
        sha: true,
        housingLevyEmployee: true,
        totalDeductions: true,
        netPay: true,
        employerCost: true,
      },
    });

    return records.reduce(
      (summary, record) => ({
        ...summary,
        employeeCount: summary.employeeCount + 1,
        grossPay: summary.grossPay.plus(record.grossPay ?? 0),
        taxablePay: summary.taxablePay.plus(record.taxablePay ?? 0),
        paye: summary.paye.plus(record.paye ?? 0),
        nssfEmployee: summary.nssfEmployee.plus(record.nssfEmployee ?? 0),
        sha: summary.sha.plus(record.sha ?? 0),
        housingLevyEmployee: summary.housingLevyEmployee.plus(record.housingLevyEmployee ?? 0),
        totalDeductions: summary.totalDeductions.plus(record.totalDeductions ?? 0),
        netPay: summary.netPay.plus(record.netPay ?? 0),
        employerCost: summary.employerCost.plus(record.employerCost ?? 0),
      }),
      {
        payrollBatchId,
        tenantId,
        status: 'DRAFT',
        employeeCount: 0,
        grossPay: ZERO,
        taxablePay: ZERO,
        paye: ZERO,
        nssfEmployee: ZERO,
        sha: ZERO,
        housingLevyEmployee: ZERO,
        totalDeductions: ZERO,
        netPay: ZERO,
        employerCost: ZERO,
      },
    );
  }

  private async assertEmployeeBelongsToTenant(
    tx: Prisma.TransactionClient,
    tenantId: string,
    employeeId: string,
  ) {
    const employeeDelegate = delegate(tx, 'employee');

    const employee = await employeeDelegate.findFirst({
      where: {
        id: employeeId,
        tenantId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!employee) {
      throw Object.assign(new Error('Employee not found for payroll'), {
        statusCode: 404,
        code: 'PAYROLL_EMPLOYEE_NOT_FOUND',
      });
    }

    if (['TERMINATED', 'INACTIVE'].includes(String(employee.status ?? '').toUpperCase())) {
      throw Object.assign(new Error('Inactive or terminated employee cannot be processed for payroll'), {
        statusCode: 409,
        code: 'PAYROLL_EMPLOYEE_INACTIVE',
      });
    }
  }
}

export const payrollService = new PayrollService();

export default PayrollService;