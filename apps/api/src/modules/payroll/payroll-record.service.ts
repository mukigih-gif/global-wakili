// apps/api/src/modules/payroll/payroll-record.service.ts

import { Prisma, prisma } from '@global-wakili/database';

import PayrollService from './PayrollService';
import type {
  CreatePayrollRecordInput,
  PayrollRecordListInput,
} from './payroll.types';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

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

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

export class PayrollRecordService {
  private payroll = new PayrollService();

  async createRecord(input: CreatePayrollRecordInput) {
    return this.payroll.createPayrollRecord(input);
  }

  async recalculateRecord(input: {
    tenantId: string;
    payrollRecordId: string;
    actorId: string;
    overrides?: Partial<CreatePayrollRecordInput>;
  }) {
    return prisma.$transaction(async (tx) => {
      const payrollRecord = delegate(tx, 'payrollRecord');

      const existing = await payrollRecord.findFirst({
        where: {
          id: input.payrollRecordId,
          tenantId: input.tenantId,
        },
      });

      if (!existing) {
        throw Object.assign(new Error('Payroll record not found'), {
          statusCode: 404,
          code: 'PAYROLL_RECORD_NOT_FOUND',
        });
      }

      if (!['DRAFT', 'CALCULATED'].includes(String(existing.status))) {
        throw Object.assign(new Error('Only draft or calculated payroll records can be recalculated'), {
          statusCode: 409,
          code: 'PAYROLL_RECORD_LOCKED',
        });
      }

      const calculationInput: CreatePayrollRecordInput = {
        tenantId: input.tenantId,
        employeeId: existing.employeeId,
        payrollBatchId: existing.payrollBatchId ?? null,
        basicPay: String(input.overrides?.basicPay ?? existing.basicPay ?? '0'),
        allowances: input.overrides?.allowances ?? existing.earnings ?? [],
        benefits: input.overrides?.benefits ?? [],
        overtime: input.overrides?.overtime ?? [],
        bonuses: input.overrides?.bonuses ?? [],
        commissions: input.overrides?.commissions ?? [],
        reimbursements: input.overrides?.reimbursements ?? [],
        manualDeductions: input.overrides?.manualDeductions ?? existing.deductions ?? [],
        periodStart: input.overrides?.periodStart ?? existing.periodStart,
        periodEnd: input.overrides?.periodEnd ?? existing.periodEnd,
        paymentDate: input.overrides?.paymentDate ?? existing.paymentDate ?? null,
        branchId: input.overrides?.branchId ?? existing.branchId ?? null,
        departmentId: input.overrides?.departmentId ?? existing.departmentId ?? null,
        currency: input.overrides?.currency ?? existing.currency ?? 'KES',
        createdById: input.actorId,
        metadata: {
          ...asRecord(existing.metadata),
          ...(input.overrides?.metadata ?? {}),
          recalculatedById: input.actorId,
          recalculatedAt: new Date().toISOString(),
        },
      };

      const calculation = this.payroll.calculatePayroll(calculationInput);

      return payrollRecord.update({
        where: {
          id: input.payrollRecordId,
        },
        data: {
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

          earnings: calculation.earnings as any,
          deductions: calculation.manualDeductions as any,
          employerContributions: calculation.employerContributions as any,
          statutoryBreakdown: calculation.statutory as any,

          status: 'CALCULATED',
          metadata: calculationInput.metadata as any,
        },
      });
    });
  }

  async cancelRecord(input: {
    tenantId: string;
    payrollRecordId: string;
    actorId: string;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Cancellation reason is required'), {
        statusCode: 400,
        code: 'PAYROLL_RECORD_CANCELLATION_REASON_REQUIRED',
      });
    }

    const payrollRecord = delegate(prisma, 'payrollRecord');

    const existing = await payrollRecord.findFirst({
      where: {
        id: input.payrollRecordId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Payroll record not found'), {
        statusCode: 404,
        code: 'PAYROLL_RECORD_NOT_FOUND',
      });
    }

    if (['POSTED', 'PAID'].includes(String(existing.status))) {
      throw Object.assign(new Error('Posted or paid payroll records cannot be cancelled here'), {
        statusCode: 409,
        code: 'PAYROLL_RECORD_LOCKED',
      });
    }

    return payrollRecord.update({
      where: {
        id: input.payrollRecordId,
      },
      data: {
        status: 'CANCELLED',
        cancelledById: input.actorId,
        cancelledAt: new Date(),
        cancellationReason: input.reason,
      },
    });
  }

  async getRecordById(tenantId: string, payrollRecordId: string) {
    return this.payroll.getPayrollRecordById(tenantId, payrollRecordId);
  }

  async listRecords(input: PayrollRecordListInput) {
    return this.payroll.listPayrollRecords(input);
  }
}

export const payrollRecordService = new PayrollRecordService();

export default PayrollRecordService;