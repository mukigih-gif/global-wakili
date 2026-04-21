// apps/api/src/modules/payroll/PayrollApprovalService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

type PayrollApprovalInput = {
  tenantId: string;
  payrollBatchId: string;
  actorId: string;
  reason?: string | null;
};

type PayrollApprovalHistoryEntry = {
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  actorId: string;
  reason?: string | null;
  at: string;
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

function appendApprovalHistory(
  metadata: unknown,
  entry: PayrollApprovalHistoryEntry,
): Record<string, unknown> {
  const current = asRecord(metadata);
  const approvalHistory = Array.isArray(current.approvalHistory)
    ? current.approvalHistory
    : [];

  return {
    ...current,
    approvalHistory: [...approvalHistory, entry],
  };
}

export class PayrollApprovalService {
  async submitForApproval(input: PayrollApprovalInput) {
    return prisma.$transaction(async (tx) => {
      const payrollBatch = delegate(tx, 'payrollBatch');
      const payrollRecord = delegate(tx, 'payrollRecord');

      const batch = await payrollBatch.findFirst({
        where: {
          id: input.payrollBatchId,
          tenantId: input.tenantId,
        },
      });

      if (!batch) {
        throw Object.assign(new Error('Payroll batch not found'), {
          statusCode: 404,
          code: 'PAYROLL_BATCH_NOT_FOUND',
        });
      }

      if (batch.status !== 'DRAFT') {
        throw Object.assign(new Error('Only draft payroll batches can be submitted'), {
          statusCode: 409,
          code: 'PAYROLL_BATCH_INVALID_STATUS',
        });
      }

      const recordCount = await payrollRecord.count({
        where: {
          tenantId: input.tenantId,
          payrollBatchId: input.payrollBatchId,
          status: {
            not: 'CANCELLED',
          },
        },
      });

      if (recordCount < 1) {
        throw Object.assign(new Error('Cannot submit an empty payroll batch'), {
          statusCode: 422,
          code: 'PAYROLL_BATCH_EMPTY',
        });
      }

      await payrollRecord.updateMany({
        where: {
          tenantId: input.tenantId,
          payrollBatchId: input.payrollBatchId,
          status: 'CALCULATED',
        },
        data: {
          status: 'DRAFT',
        },
      });

      return payrollBatch.update({
        where: {
          id: input.payrollBatchId,
        },
        data: {
          status: 'PENDING_APPROVAL',
          submittedById: input.actorId,
          submittedAt: new Date(),
          metadata: appendApprovalHistory(batch.metadata, {
            action: 'SUBMITTED',
            actorId: input.actorId,
            reason: input.reason ?? null,
            at: new Date().toISOString(),
          }) as any,
        },
      });
    });
  }

  async approveBatch(input: PayrollApprovalInput) {
    return prisma.$transaction(async (tx) => {
      const payrollBatch = delegate(tx, 'payrollBatch');
      const payrollRecord = delegate(tx, 'payrollRecord');

      const batch = await payrollBatch.findFirst({
        where: {
          id: input.payrollBatchId,
          tenantId: input.tenantId,
        },
      });

      if (!batch) {
        throw Object.assign(new Error('Payroll batch not found'), {
          statusCode: 404,
          code: 'PAYROLL_BATCH_NOT_FOUND',
        });
      }

      if (batch.status !== 'PENDING_APPROVAL') {
        throw Object.assign(new Error('Only pending payroll batches can be approved'), {
          statusCode: 409,
          code: 'PAYROLL_BATCH_INVALID_STATUS',
        });
      }

      await payrollRecord.updateMany({
        where: {
          tenantId: input.tenantId,
          payrollBatchId: input.payrollBatchId,
          status: {
            in: ['DRAFT', 'CALCULATED'],
          },
        },
        data: {
          status: 'APPROVED',
          approvedById: input.actorId,
          approvedAt: new Date(),
        },
      });

      return payrollBatch.update({
        where: {
          id: input.payrollBatchId,
        },
        data: {
          status: 'APPROVED',
          approvedById: input.actorId,
          approvedAt: new Date(),
          rejectionReason: null,
          metadata: appendApprovalHistory(batch.metadata, {
            action: 'APPROVED',
            actorId: input.actorId,
            reason: input.reason ?? null,
            at: new Date().toISOString(),
          }) as any,
        },
      });
    });
  }

  async rejectBatch(input: PayrollApprovalInput) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Rejection reason is required'), {
        statusCode: 400,
        code: 'PAYROLL_REJECTION_REASON_REQUIRED',
      });
    }

    return prisma.$transaction(async (tx) => {
      const payrollBatch = delegate(tx, 'payrollBatch');
      const payrollRecord = delegate(tx, 'payrollRecord');

      const batch = await payrollBatch.findFirst({
        where: {
          id: input.payrollBatchId,
          tenantId: input.tenantId,
        },
      });

      if (!batch) {
        throw Object.assign(new Error('Payroll batch not found'), {
          statusCode: 404,
          code: 'PAYROLL_BATCH_NOT_FOUND',
        });
      }

      if (batch.status !== 'PENDING_APPROVAL') {
        throw Object.assign(new Error('Only pending payroll batches can be rejected'), {
          statusCode: 409,
          code: 'PAYROLL_BATCH_INVALID_STATUS',
        });
      }

      await payrollRecord.updateMany({
        where: {
          tenantId: input.tenantId,
          payrollBatchId: input.payrollBatchId,
          status: {
            notIn: ['POSTED', 'PAID', 'CANCELLED'],
          },
        },
        data: {
          status: 'DRAFT',
        },
      });

      return payrollBatch.update({
        where: {
          id: input.payrollBatchId,
        },
        data: {
          status: 'REJECTED',
          rejectedById: input.actorId,
          rejectedAt: new Date(),
          rejectionReason: input.reason,
          metadata: appendApprovalHistory(batch.metadata, {
            action: 'REJECTED',
            actorId: input.actorId,
            reason: input.reason,
            at: new Date().toISOString(),
          }) as any,
        },
      });
    });
  }

  async cancelBatch(input: PayrollApprovalInput) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Cancellation reason is required'), {
        statusCode: 400,
        code: 'PAYROLL_CANCELLATION_REASON_REQUIRED',
      });
    }

    return prisma.$transaction(async (tx) => {
      const payrollBatch = delegate(tx, 'payrollBatch');
      const payrollRecord = delegate(tx, 'payrollRecord');

      const batch = await payrollBatch.findFirst({
        where: {
          id: input.payrollBatchId,
          tenantId: input.tenantId,
        },
      });

      if (!batch) {
        throw Object.assign(new Error('Payroll batch not found'), {
          statusCode: 404,
          code: 'PAYROLL_BATCH_NOT_FOUND',
        });
      }

      if (['POSTED', 'PAID'].includes(String(batch.status))) {
        throw Object.assign(new Error('Posted or paid payroll batches cannot be cancelled here'), {
          statusCode: 409,
          code: 'PAYROLL_BATCH_LOCKED',
        });
      }

      await payrollRecord.updateMany({
        where: {
          tenantId: input.tenantId,
          payrollBatchId: input.payrollBatchId,
          status: {
            notIn: ['POSTED', 'PAID'],
          },
        },
        data: {
          status: 'CANCELLED',
          cancelledById: input.actorId,
          cancelledAt: new Date(),
          cancellationReason: input.reason,
        },
      });

      return payrollBatch.update({
        where: {
          id: input.payrollBatchId,
        },
        data: {
          status: 'CANCELLED',
          cancelledById: input.actorId,
          cancelledAt: new Date(),
          cancellationReason: input.reason,
          metadata: appendApprovalHistory(batch.metadata, {
            action: 'CANCELLED',
            actorId: input.actorId,
            reason: input.reason,
            at: new Date().toISOString(),
          }) as any,
        },
      });
    });
  }
}

export const payrollApprovalService = new PayrollApprovalService();

export default PayrollApprovalService;