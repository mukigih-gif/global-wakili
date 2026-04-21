// apps/api/src/modules/hr/employee-contract.service.ts

import { Prisma, prisma } from '@global-wakili/database';

import {
  HR_DEFAULTS,
  type CreateEmployeeContractInput,
  type EmployeeContractListInput,
  type EmployeeLifecycleEvent,
  type UpdateEmployeeContractInput,
} from './hr.types';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply HR schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'HR_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate;
}

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) {
    throw Object.assign(new Error('Invalid decimal value'), {
      statusCode: 422,
      code: 'INVALID_DECIMAL_VALUE',
    });
  }

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function decimal(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) {
    throw Object.assign(new Error('Invalid decimal value'), {
      statusCode: 422,
      code: 'INVALID_DECIMAL_VALUE',
    });
  }

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function appendEvent(
  metadata: unknown,
  event: EmployeeLifecycleEvent,
): Record<string, unknown> {
  const current = asRecord(metadata);
  const history = Array.isArray(current.history) ? current.history : [];

  return {
    ...current,
    history: [...history, event],
  };
}

function makeContractNumber(input: {
  employeeId: string;
  startDate: Date;
  contractNumber?: string | null;
}) {
  if (input.contractNumber?.trim()) return input.contractNumber.trim();

  const year = input.startDate.getFullYear();
  const employeeToken = input.employeeId.slice(-6).toUpperCase();

  return `CTR-${year}-${employeeToken}-${Date.now().toString().slice(-5)}`;
}

export class EmployeeContractService {
  async createContract(input: CreateEmployeeContractInput) {
    return prisma.$transaction(async (tx) => {
      const employee = delegate(tx, 'employee');
      const employeeContract = delegate(tx, 'employeeContract');

      const existingEmployee = await employee.findFirst({
        where: {
          id: input.employeeId,
          tenantId: input.tenantId,
        },
      });

      if (!existingEmployee) {
        throw Object.assign(new Error('Employee not found'), {
          statusCode: 404,
          code: 'EMPLOYEE_NOT_FOUND',
        });
      }

      const contractNumber = makeContractNumber({
        employeeId: input.employeeId,
        startDate: input.startDate,
        contractNumber: input.contractNumber,
      });

      const existingContract = await employeeContract.findFirst({
        where: {
          tenantId: input.tenantId,
          contractNumber,
        },
        select: { id: true },
      });

      if (existingContract) {
        throw Object.assign(new Error('Contract number already exists'), {
          statusCode: 409,
          code: 'EMPLOYEE_CONTRACT_NUMBER_DUPLICATE',
        });
      }

      if (input.status === 'ACTIVE') {
        await this.supersedeActiveContracts(tx, {
          tenantId: input.tenantId,
          employeeId: input.employeeId,
          actorId: input.userId,
        });
      }

      const now = new Date();

      const contract = await employeeContract.create({
        data: {
          tenantId: input.tenantId,
          employeeId: input.employeeId,
          contractNumber,
          title: input.title,
          employmentType: input.employmentType,
          status: input.status ?? HR_DEFAULTS.defaultContractStatus,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          probationEndDate: input.probationEndDate ?? null,

          jobTitle: input.jobTitle ?? null,
          departmentId: input.departmentId ?? null,
          branchId: input.branchId ?? null,
          reportingManagerId: input.reportingManagerId ?? null,

          basicPay: money(input.basicPay ?? 0),
          currency: input.currency ?? HR_DEFAULTS.currency,
          workingHoursPerWeek: decimal(
            input.workingHoursPerWeek ?? HR_DEFAULTS.defaultWorkingHoursPerWeek,
          ),
          leaveDaysPerYear: decimal(
            input.leaveDaysPerYear ?? HR_DEFAULTS.defaultLeaveDaysPerYear,
          ),

          noticePeriodDays: input.noticePeriodDays ?? null,
          confidentialityRequired: input.confidentialityRequired ?? true,
          nonCompeteRequired: input.nonCompeteRequired ?? false,

          documentId: input.documentId ?? null,
          signedByEmployeeAt: input.signedByEmployeeAt ?? null,
          signedByEmployerAt: input.signedByEmployerAt ?? null,

          terms: input.terms ?? {},
          metadata: appendEvent(input.metadata, {
            action: 'CONTRACT_CREATED',
            actorId: input.userId,
            at: now.toISOString(),
          }) as any,
          createdById: input.userId,
        },
      });

      if (contract.status === 'ACTIVE') {
        await this.applyContractToEmployee(tx, contract, input.userId);
      }

      return contract;
    });
  }

  async updateContract(input: UpdateEmployeeContractInput) {
    return prisma.$transaction(async (tx) => {
      const employeeContract = delegate(tx, 'employeeContract');

      const existing = await employeeContract.findFirst({
        where: {
          id: input.contractId,
          tenantId: input.tenantId,
        },
      });

      if (!existing) {
        throw Object.assign(new Error('Employee contract not found'), {
          statusCode: 404,
          code: 'EMPLOYEE_CONTRACT_NOT_FOUND',
        });
      }

      if (['TERMINATED', 'SUPERSEDED', 'CANCELLED'].includes(String(existing.status))) {
        throw Object.assign(new Error('Closed employee contracts cannot be updated'), {
          statusCode: 409,
          code: 'EMPLOYEE_CONTRACT_LOCKED',
        });
      }

      const now = new Date();

      const updated = await employeeContract.update({
        where: {
          id: input.contractId,
        },
        data: {
          ...(input.contractNumber !== undefined ? { contractNumber: input.contractNumber } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.employmentType !== undefined ? { employmentType: input.employmentType } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
          ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
          ...(input.probationEndDate !== undefined ? { probationEndDate: input.probationEndDate } : {}),

          ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
          ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
          ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
          ...(input.reportingManagerId !== undefined
            ? { reportingManagerId: input.reportingManagerId }
            : {}),

          ...(input.basicPay !== undefined ? { basicPay: money(input.basicPay) } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.workingHoursPerWeek !== undefined
            ? { workingHoursPerWeek: decimal(input.workingHoursPerWeek) }
            : {}),
          ...(input.leaveDaysPerYear !== undefined
            ? { leaveDaysPerYear: decimal(input.leaveDaysPerYear) }
            : {}),

          ...(input.noticePeriodDays !== undefined ? { noticePeriodDays: input.noticePeriodDays } : {}),
          ...(input.confidentialityRequired !== undefined
            ? { confidentialityRequired: input.confidentialityRequired }
            : {}),
          ...(input.nonCompeteRequired !== undefined
            ? { nonCompeteRequired: input.nonCompeteRequired }
            : {}),

          ...(input.documentId !== undefined ? { documentId: input.documentId } : {}),
          ...(input.signedByEmployeeAt !== undefined
            ? { signedByEmployeeAt: input.signedByEmployeeAt }
            : {}),
          ...(input.signedByEmployerAt !== undefined
            ? { signedByEmployerAt: input.signedByEmployerAt }
            : {}),

          ...(input.terms !== undefined ? { terms: input.terms as any } : {}),
          metadata: appendEvent(
            {
              ...asRecord(existing.metadata),
              ...(input.metadata ?? {}),
            },
            {
              action: 'CONTRACT_UPDATED',
              actorId: input.userId,
              at: now.toISOString(),
            },
          ) as any,
          updatedById: input.userId,
          updatedAt: now,
        },
      });

      if (updated.status === 'ACTIVE') {
        await this.supersedeActiveContracts(tx, {
          tenantId: input.tenantId,
          employeeId: updated.employeeId,
          actorId: input.userId,
          excludeContractId: updated.id,
        });

        await this.applyContractToEmployee(tx, updated, input.userId);
      }

      return updated;
    });
  }

  async activateContract(input: {
    tenantId: string;
    contractId: string;
    actorId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const employeeContract = delegate(tx, 'employeeContract');

      const existing = await employeeContract.findFirst({
        where: {
          id: input.contractId,
          tenantId: input.tenantId,
        },
      });

      if (!existing) {
        throw Object.assign(new Error('Employee contract not found'), {
          statusCode: 404,
          code: 'EMPLOYEE_CONTRACT_NOT_FOUND',
        });
      }

      if (['TERMINATED', 'CANCELLED'].includes(String(existing.status))) {
        throw Object.assign(new Error('Terminated or cancelled contracts cannot be activated'), {
          statusCode: 409,
          code: 'EMPLOYEE_CONTRACT_LOCKED',
        });
      }

      await this.supersedeActiveContracts(tx, {
        tenantId: input.tenantId,
        employeeId: existing.employeeId,
        actorId: input.actorId,
        excludeContractId: existing.id,
      });

      const now = new Date();

      const updated = await employeeContract.update({
        where: {
          id: input.contractId,
        },
        data: {
          status: 'ACTIVE',
          activatedAt: now,
          activatedById: input.actorId,
          metadata: appendEvent(existing.metadata, {
            action: 'CONTRACT_ACTIVATED',
            actorId: input.actorId,
            at: now.toISOString(),
          }) as any,
        },
      });

      await this.applyContractToEmployee(tx, updated, input.actorId);

      return updated;
    });
  }

  async terminateContract(input: {
    tenantId: string;
    contractId: string;
    actorId: string;
    reason: string;
    terminationDate: Date;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Contract termination reason is required'), {
        statusCode: 400,
        code: 'CONTRACT_TERMINATION_REASON_REQUIRED',
      });
    }

    const employeeContract = delegate(prisma, 'employeeContract');

    const existing = await employeeContract.findFirst({
      where: {
        id: input.contractId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Employee contract not found'), {
        statusCode: 404,
        code: 'EMPLOYEE_CONTRACT_NOT_FOUND',
      });
    }

    if (String(existing.status) === 'TERMINATED') {
      return existing;
    }

    const now = new Date();

    return employeeContract.update({
      where: {
        id: input.contractId,
      },
      data: {
        status: 'TERMINATED',
        terminatedAt: input.terminationDate,
        terminatedById: input.actorId,
        terminationReason: input.reason,
        metadata: appendEvent(existing.metadata, {
          action: 'CONTRACT_TERMINATED',
          actorId: input.actorId,
          reason: input.reason,
          effectiveDate: input.terminationDate.toISOString(),
          at: now.toISOString(),
        }) as any,
      },
    });
  }

  async listContracts(input: EmployeeContractListInput) {
    const employeeContract = delegate(prisma, 'employeeContract');

    return employeeContract.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.employeeId ? { employeeId: input.employeeId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.employmentType ? { employmentType: input.employmentType } : {}),
      },
      orderBy: [
        { status: 'asc' },
        { startDate: 'desc' },
      ],
      take: Math.min(input.take ?? HR_DEFAULTS.maxPageSize, HR_DEFAULTS.maxPageSize),
      skip: input.skip ?? 0,
    });
  }

  async getContractById(tenantId: string, contractId: string) {
    const employeeContract = delegate(prisma, 'employeeContract');

    const existing = await employeeContract.findFirst({
      where: {
        id: contractId,
        tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Employee contract not found'), {
        statusCode: 404,
        code: 'EMPLOYEE_CONTRACT_NOT_FOUND',
      });
    }

    return existing;
  }

  private async supersedeActiveContracts(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      employeeId: string;
      actorId: string;
      excludeContractId?: string;
    },
  ) {
    const employeeContract = delegate(tx, 'employeeContract');

    await employeeContract.updateMany({
      where: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        status: 'ACTIVE',
        ...(input.excludeContractId ? { id: { not: input.excludeContractId } } : {}),
      },
      data: {
        status: 'SUPERSEDED',
        supersededAt: new Date(),
        supersededById: input.actorId,
      },
    });
  }

  private async applyContractToEmployee(
    tx: Prisma.TransactionClient,
    contract: any,
    actorId: string,
  ) {
    const employee = delegate(tx, 'employee');

    const existingEmployee = await employee.findFirst({
      where: {
        id: contract.employeeId,
        tenantId: contract.tenantId,
      },
    });

    if (!existingEmployee) return;

    const now = new Date();

    await employee.update({
      where: {
        id: contract.employeeId,
      },
      data: {
        employmentType: contract.employmentType,
        jobTitle: contract.jobTitle,
        branchId: contract.branchId,
        departmentId: contract.departmentId,
        reportingManagerId: contract.reportingManagerId,
        probationEndDate: contract.probationEndDate,
        basicPay: contract.basicPay,
        salary: contract.basicPay,
        currency: contract.currency,
        metadata: appendEvent(existingEmployee.metadata, {
          action: 'CONTRACT_ACTIVATED',
          actorId,
          at: now.toISOString(),
          metadata: {
            contractId: contract.id,
            contractNumber: contract.contractNumber,
          },
        }) as any,
        updatedById: actorId,
        updatedAt: now,
      },
    });
  }
}

export const employeeContractService = new EmployeeContractService();

export default EmployeeContractService;