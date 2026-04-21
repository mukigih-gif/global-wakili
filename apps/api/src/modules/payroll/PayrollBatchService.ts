// apps/api/src/modules/payroll/PayrollBatchService.ts

import { Prisma, prisma } from '@global-wakili/database';
import {
  type CreatePayrollBatchDto,
  type PayrollBatchListQueryDto,
  PAYROLL_DEFAULTS
} from './payroll.types';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply Payroll schema before activating this workflow.`),
      { statusCode: 500, code: 'PAYROLL_SCHEMA_DELEGATE_MISSING', model: name }
    );
  }

  return modelDelegate;
}

export class PayrollBatchService {
  async createBatch(tenantId: string, userId: string, input: CreatePayrollBatchDto) {
    return prisma.$transaction(async (tx) => {
      const payrollBatchDelegate = delegate(tx, 'payrollBatch');

      // Prevent duplicate batches for the same period/branch/department
      const existing = await payrollBatchDelegate.findFirst({
        where: {
          tenantId,
          year: input.year,
          month: input.month,
          ...(input.branchId ? { branchId: input.branchId } : {}),
          ...(input.departmentId ? { departmentId: input.departmentId } : {}),
          status: { not: 'CANCELLED' }
        }
      });

      if (existing) {
        throw Object.assign(new Error('An active payroll batch already exists for this period'), {
          statusCode: 409,
          code: 'PAYROLL_BATCH_DUPLICATE'
        });
      }

      return payrollBatchDelegate.create({
        data: {
          tenantId,
          title: input.title ?? `Payroll - ${input.month}/${input.year}`,
          description: input.description,
          year: input.year,
          month: input.month,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          paymentDate: input.paymentDate,
          frequency: input.frequency,
          currency: input.currency,
          status: 'DRAFT',
          createdById: userId,
          branchId: input.branchId ?? null,
          departmentId: input.departmentId ?? null,
          metadata: input.metadata ?? {}
        }
      });
    });
  }

  async listBatches(tenantId: string, query: PayrollBatchListQueryDto) {
    const payrollBatchDelegate = delegate(prisma, 'payrollBatch');

    return payrollBatchDelegate.findMany({
      where: {
        tenantId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.year ? { year: query.year } : {}),
        ...(query.month ? { month: query.month } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(query.take ?? PAYROLL_DEFAULTS.maxPayrollPageSize, PAYROLL_DEFAULTS.maxPayrollPageSize),
      skip: query.skip ?? 0,
    });
  }

  async getBatchById(tenantId: string, batchId: string) {
    const payrollBatchDelegate = delegate(prisma, 'payrollBatch');
    const batch = await payrollBatchDelegate.findFirst({
      where: { id: batchId, tenantId }
    });

    if (!batch) {
      throw Object.assign(new Error('Payroll batch not found'), {
        statusCode: 404,
        code: 'PAYROLL_BATCH_NOT_FOUND'
      });
    }

    return batch;
  }

  async updateBatchStatus(tenantId: string, batchId: string, newStatus: string) {
    const payrollBatchDelegate = delegate(prisma, 'payrollBatch');
    
    // Add strict state machine validation here later if needed (e.g., DRAFT -> PENDING_APPROVAL)
    return payrollBatchDelegate.update({
      where: { id: batchId, tenantId },
      data: { status: newStatus }
    });
  }
}