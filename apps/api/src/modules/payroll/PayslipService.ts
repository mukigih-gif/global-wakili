// apps/api/src/modules/payroll/PayslipService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

type GeneratePayslipInput = {
  tenantId: string;
  payrollRecordId: string;
  generatedById: string;
  publish?: boolean;
};

type PublishPayslipInput = {
  tenantId: string;
  payslipId: string;
  actorId: string;
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

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function makePayslipNumber(record: any): string {
  const date = new Date(record.periodStart ?? new Date());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const employeeToken = String(record.employeeId ?? 'EMP').slice(-6).toUpperCase();
  const recordToken = String(record.id ?? Date.now()).slice(-6).toUpperCase();

  return `PS-${year}${month}-${employeeToken}-${recordToken}`;
}

export class PayslipService {
  async generatePayslip(input: GeneratePayslipInput) {
    return prisma.$transaction(async (tx) => {
      const payrollRecord = delegate(tx, 'payrollRecord');
      const payslip = delegate(tx, 'payslip');

      const record = await payrollRecord.findFirst({
        where: {
          id: input.payrollRecordId,
          tenantId: input.tenantId,
          status: {
            not: 'CANCELLED',
          },
        },
        include: {
          employee: true,
          payrollBatch: true,
        },
      });

      if (!record) {
        throw Object.assign(new Error('Payroll record not found'), {
          statusCode: 404,
          code: 'PAYROLL_RECORD_NOT_FOUND',
        });
      }

      if (!['APPROVED', 'POSTED', 'PAID'].includes(String(record.status))) {
        throw Object.assign(new Error('Payslip can only be generated for approved, posted, or paid payroll records'), {
          statusCode: 409,
          code: 'PAYSLIP_RECORD_NOT_READY',
        });
      }

      const existing = await payslip.findFirst({
        where: {
          tenantId: input.tenantId,
          payrollRecordId: input.payrollRecordId,
          status: {
            not: 'REVOKED',
          },
        },
      });

      if (existing) {
        return existing;
      }

      const payslipNumber = makePayslipNumber(record);
      const employee = record.employee ?? {};
      const batch = record.payrollBatch ?? {};

      const snapshot = {
        employee: {
          id: record.employeeId,
          staffNumber: employee.staffNumber ?? null,
          name:
            employee.displayName ??
            employee.fullName ??
            employee.name ??
            employee.email ??
            'Employee',
          kraPin: employee.kraPin ?? null,
          nssfNumber: employee.nssfNumber ?? null,
          shaNumber: employee.shaNumber ?? null,
          departmentId: record.departmentId ?? employee.departmentId ?? null,
          branchId: record.branchId ?? employee.branchId ?? null,
        },
        period: {
          periodStart: record.periodStart,
          periodEnd: record.periodEnd,
          paymentDate: record.paymentDate ?? batch.paymentDate ?? null,
          batchCode: batch.batchCode ?? null,
        },
        amounts: {
          currency: record.currency,
          basicPay: record.basicPay,
          grossPay: record.grossPay,
          taxablePay: record.taxablePay,
          paye: record.paye,
          nssfEmployee: record.nssfEmployee,
          sha: record.sha,
          housingLevyEmployee: record.housingLevyEmployee,
          totalDeductions: record.totalDeductions,
          netPay: record.netPay,
          employerCost: record.employerCost,
        },
        earnings: record.earnings ?? [],
        deductions: record.deductions ?? [],
        employerContributions: record.employerContributions ?? [],
        statutoryBreakdown: record.statutoryBreakdown ?? {},
      };

      return payslip.create({
        data: {
          tenantId: input.tenantId,
          payrollRecordId: record.id,
          employeeId: record.employeeId,
          payrollBatchId: record.payrollBatchId ?? null,
          payslipNumber,
          status: input.publish ? 'PUBLISHED' : 'GENERATED',
          generatedById: input.generatedById,
          generatedAt: new Date(),
          publishedById: input.publish ? input.generatedById : null,
          publishedAt: input.publish ? new Date() : null,
          snapshot: snapshot as any,
          metadata: {
            source: 'PAYROLL_SERVICE',
            generatedFromRecordStatus: record.status,
          },
        },
      });
    });
  }

  async publishPayslip(input: PublishPayslipInput) {
    const payslip = delegate(prisma, 'payslip');

    const existing = await payslip.findFirst({
      where: {
        id: input.payslipId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Payslip not found'), {
        statusCode: 404,
        code: 'PAYSLIP_NOT_FOUND',
      });
    }

    if (existing.status === 'REVOKED') {
      throw Object.assign(new Error('Revoked payslip cannot be published'), {
        statusCode: 409,
        code: 'PAYSLIP_REVOKED',
      });
    }

    return payslip.update({
      where: {
        id: input.payslipId,
      },
      data: {
        status: 'PUBLISHED',
        publishedById: input.actorId,
        publishedAt: new Date(),
      },
    });
  }

  async revokePayslip(input: PublishPayslipInput & { reason: string }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Revocation reason is required'), {
        statusCode: 400,
        code: 'PAYSLIP_REVOCATION_REASON_REQUIRED',
      });
    }

    const payslip = delegate(prisma, 'payslip');

    const existing = await payslip.findFirst({
      where: {
        id: input.payslipId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Payslip not found'), {
        statusCode: 404,
        code: 'PAYSLIP_NOT_FOUND',
      });
    }

    const metadata = asRecord(existing.metadata);

    return payslip.update({
      where: {
        id: input.payslipId,
      },
      data: {
        status: 'REVOKED',
        revokedById: input.actorId,
        revokedAt: new Date(),
        revocationReason: input.reason,
        metadata: {
          ...metadata,
          revoked: {
            actorId: input.actorId,
            reason: input.reason,
            at: new Date().toISOString(),
          },
        } as any,
      },
    });
  }

  async getPayslipById(tenantId: string, payslipId: string) {
    const payslip = delegate(prisma, 'payslip');

    const existing = await payslip.findFirst({
      where: {
        id: payslipId,
        tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Payslip not found'), {
        statusCode: 404,
        code: 'PAYSLIP_NOT_FOUND',
      });
    }

    return existing;
  }

  async listPayslips(input: {
    tenantId: string;
    employeeId?: string;
    payrollBatchId?: string;
    status?: string;
    take?: number;
    skip?: number;
  }) {
    const payslip = delegate(prisma, 'payslip');

    return payslip.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.employeeId ? { employeeId: input.employeeId } : {}),
        ...(input.payrollBatchId ? { payrollBatchId: input.payrollBatchId } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      orderBy: {
        generatedAt: 'desc',
      },
      take: Math.min(input.take ?? 50, 100),
      skip: input.skip ?? 0,
    });
  }
}

export const payslipService = new PayslipService();

export default PayslipService;