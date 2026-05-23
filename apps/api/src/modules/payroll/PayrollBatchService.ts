// apps/api/src/modules/payroll/PayrollBatchService.ts

import { Prisma, prisma } from '@global-wakili/database';
import { PAYROLL_DEFAULTS } from './payroll.types';
import type {
  CreatePayrollBatchDto,
  PayrollBatchListQueryDto,
} from './payroll.validators';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

type CreatePayrollBatchCommand = CreatePayrollBatchDto & {
  tenantId: string;
  userId?: string;
  createdById?: string;
};

type PayrollBatchListCommand = Omit<PayrollBatchListQueryDto, 'status'> & {
  tenantId: string;
  status?: string;
};

type PayrollBatchAndRecordsResult = {
  batch: unknown;
  records: unknown[];
  createdRecordCount: number;
  skippedEmployeeIds: string[];
};

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply Payroll schema before activating this workflow.`),
      { statusCode: 500, code: 'PAYROLL_SCHEMA_DELEGATE_MISSING', model: name },
    );
  }

  return modelDelegate;
}

function normalizeCreateBatchArgs(
  tenantOrCommand: string | CreatePayrollBatchCommand,
  userId?: string,
  input?: CreatePayrollBatchDto,
): CreatePayrollBatchCommand {
  if (typeof tenantOrCommand === 'string') {
    if (!input) {
      throw Object.assign(new Error('Payroll batch input is required'), {
        statusCode: 400,
        code: 'PAYROLL_BATCH_INPUT_REQUIRED',
      });
    }

    return {
      ...input,
      tenantId: tenantOrCommand,
      userId,
    };
  }

  return tenantOrCommand;
}

function normalizeListBatchArgs(
  tenantOrQuery: string | PayrollBatchListCommand,
  query?: PayrollBatchListQueryDto,
): PayrollBatchListCommand {
  if (typeof tenantOrQuery === 'string') {
    return {
      ...(query ?? {}),
      tenantId: tenantOrQuery,
    };
  }

  return tenantOrQuery;
}

function requireActorId(command: CreatePayrollBatchCommand): string {
  const actorId = command.createdById ?? command.userId;

  if (!actorId?.trim()) {
    throw Object.assign(new Error('Authenticated actor is required to create a payroll batch'), {
      statusCode: 401,
      code: 'PAYROLL_BATCH_ACTOR_REQUIRED',
    });
  }

  return actorId;
}

function uniqueEmployeeIds(employeeIds: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (employeeIds ?? [])
        .map((employeeId) => employeeId?.trim())
        .filter((employeeId): employeeId is string => Boolean(employeeId)),
    ),
  );
}

export class PayrollBatchService {
  async createBatch(
    tenantOrCommand: string | CreatePayrollBatchCommand,
    userId?: string,
    input?: CreatePayrollBatchDto,
  ) {
    const command = normalizeCreateBatchArgs(tenantOrCommand, userId, input);
    const actorId = requireActorId(command);
    const requestedEmployeeIds = uniqueEmployeeIds(command.employeeIds);

    return prisma.$transaction(async (tx) => {
      const payrollBatchDelegate = delegate(tx, 'payrollBatch');

      const existing = await payrollBatchDelegate.findFirst({
        where: {
          tenantId: command.tenantId,
          year: command.year,
          month: command.month,
          ...(command.branchId ? { branchId: command.branchId } : {}),
          ...(command.departmentId ? { departmentId: command.departmentId } : {}),
          status: { not: 'CANCELLED' },
        },
      });

      if (existing) {
        throw Object.assign(new Error('An active payroll batch already exists for this period'), {
          statusCode: 409,
          code: 'PAYROLL_BATCH_DUPLICATE',
        });
      }

      return payrollBatchDelegate.create({
        data: {
          tenantId: command.tenantId,
          title: command.title ?? `Payroll - ${command.month}/${command.year}`,
          description: command.description,
          year: command.year,
          month: command.month,
          periodStart: command.periodStart,
          periodEnd: command.periodEnd,
          paymentDate: command.paymentDate,
          frequency: command.frequency,
          currency: command.currency,
          status: 'DRAFT',
          createdById: actorId,
          branchId: command.branchId ?? null,
          departmentId: command.departmentId ?? null,
          metadata: {
            ...(command.metadata ?? {}),
            ...(requestedEmployeeIds.length
              ? {
                  requestedEmployeeIds,
                  requestedEmployeeCount: requestedEmployeeIds.length,
                }
              : {}),
          },
        },
      });
    });
  }

  async createBatchAndRecords(command: CreatePayrollBatchCommand): Promise<PayrollBatchAndRecordsResult> {
    const requestedEmployeeIds = uniqueEmployeeIds(command.employeeIds);

    if (requestedEmployeeIds.length > 0) {
      throw Object.assign(
        new Error('Automatic payroll record generation from employee IDs requires employee compensation profile integration before activation.'),
        {
          statusCode: 422,
          code: 'PAYROLL_BATCH_RECORD_AUTOGENERATION_NOT_CONFIGURED',
          details: {
            requestedEmployeeCount: requestedEmployeeIds.length,
            requestedEmployeeIds,
          },
        },
      );
    }

    const batch = await this.createBatch(command);

    return {
      batch,
      records: [],
      createdRecordCount: 0,
      skippedEmployeeIds: [],
    };
  }

  async listBatches(
    tenantOrQuery: string | PayrollBatchListCommand,
    query?: PayrollBatchListQueryDto,
  ) {
    const command = normalizeListBatchArgs(tenantOrQuery, query);
    const payrollBatchDelegate = delegate(prisma, 'payrollBatch');

    return payrollBatchDelegate.findMany({
      where: {
        tenantId: command.tenantId,
        ...(command.status ? { status: command.status } : {}),
        ...(command.year ? { year: command.year } : {}),
        ...(command.month ? { month: command.month } : {}),
        ...(command.branchId ? { branchId: command.branchId } : {}),
        ...(command.departmentId ? { departmentId: command.departmentId } : {}),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(
        command.take ?? PAYROLL_DEFAULTS.maxPayrollPageSize,
        PAYROLL_DEFAULTS.maxPayrollPageSize,
      ),
      skip: command.skip ?? 0,
    });
  }

  async getBatchById(tenantId: string, batchId: string) {
    const payrollBatchDelegate = delegate(prisma, 'payrollBatch');
    const batch = await payrollBatchDelegate.findFirst({
      where: { id: batchId, tenantId },
    });

    if (!batch) {
      throw Object.assign(new Error('Payroll batch not found'), {
        statusCode: 404,
        code: 'PAYROLL_BATCH_NOT_FOUND',
      });
    }

    return batch;
  }

  async updateBatchStatus(tenantId: string, batchId: string, newStatus: string) {
    const payrollBatchDelegate = delegate(prisma, 'payrollBatch');

    return payrollBatchDelegate.update({
      where: { id: batchId, tenantId },
      data: { status: newStatus },
    });
  }
}

export const payrollBatchService = new PayrollBatchService();

export default PayrollBatchService;

