// apps/api/src/modules/hr/department.service.ts

import { Prisma, prisma } from '@global-wakili/database';

import {
  type CreateDepartmentInput,
  type DepartmentListInput,
  type EmployeeLifecycleEvent,
  type UpdateDepartmentInput,
  HR_DEFAULTS,
} from './hr.types';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

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

function departmentSearchWhere(search?: string) {
  if (!search?.trim()) return {};

  const term = search.trim();

  return {
    OR: [
      { name: { contains: term, mode: 'insensitive' as const } },
      { code: { contains: term, mode: 'insensitive' as const } },
      { description: { contains: term, mode: 'insensitive' as const } },
      { costCenterCode: { contains: term, mode: 'insensitive' as const } },
    ],
  };
}

export class DepartmentService {
  async createDepartment(input: CreateDepartmentInput) {
    return prisma.$transaction(async (tx) => {
      const department = delegate(tx, 'department');

      await this.assertUniqueDepartment(tx, {
        tenantId: input.tenantId,
        name: input.name,
        code: input.code ?? null,
      });

      if (input.parentDepartmentId) {
        await this.assertDepartmentExists(tx, input.tenantId, input.parentDepartmentId);
      }

      if (input.managerEmployeeId) {
        await this.assertEmployeeExists(tx, input.tenantId, input.managerEmployeeId);
      }

      const now = new Date();

      return department.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          code: input.code ?? null,
          description: input.description ?? null,
          parentDepartmentId: input.parentDepartmentId ?? null,
          managerEmployeeId: input.managerEmployeeId ?? null,
          branchId: input.branchId ?? null,
          costCenterCode: input.costCenterCode ?? null,
          status: 'ACTIVE',
          createdById: input.userId,
          metadata: appendEvent(input.metadata, {
            action: 'CREATED',
            actorId: input.userId,
            at: now.toISOString(),
          }) as any,
        },
      });
    });
  }

  async updateDepartment(input: UpdateDepartmentInput) {
    return prisma.$transaction(async (tx) => {
      const department = delegate(tx, 'department');

      const existing = await department.findFirst({
        where: {
          id: input.departmentId,
          tenantId: input.tenantId,
        },
      });

      if (!existing) {
        throw Object.assign(new Error('Department not found'), {
          statusCode: 404,
          code: 'DEPARTMENT_NOT_FOUND',
        });
      }

      if (input.parentDepartmentId) {
        if (input.parentDepartmentId === input.departmentId) {
          throw Object.assign(new Error('Department cannot be its own parent'), {
            statusCode: 422,
            code: 'INVALID_DEPARTMENT_PARENT',
          });
        }

        await this.assertDepartmentExists(tx, input.tenantId, input.parentDepartmentId);
      }

      if (input.managerEmployeeId) {
        await this.assertEmployeeExists(tx, input.tenantId, input.managerEmployeeId);
      }

      await this.assertUniqueDepartment(
        tx,
        {
          tenantId: input.tenantId,
          name: input.name ?? existing.name,
          code: input.code ?? existing.code ?? null,
        },
        input.departmentId,
      );

      const now = new Date();

      return department.update({
        where: {
          id: input.departmentId,
        },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.parentDepartmentId !== undefined
            ? { parentDepartmentId: input.parentDepartmentId }
            : {}),
          ...(input.managerEmployeeId !== undefined
            ? { managerEmployeeId: input.managerEmployeeId }
            : {}),
          ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
          ...(input.costCenterCode !== undefined ? { costCenterCode: input.costCenterCode } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedById: input.userId,
          updatedAt: now,
          metadata: appendEvent(
            {
              ...asRecord(existing.metadata),
              ...(input.metadata ?? {}),
            },
            {
              action: 'UPDATED',
              actorId: input.userId,
              at: now.toISOString(),
            },
          ) as any,
        },
      });
    });
  }

  async listDepartments(input: DepartmentListInput) {
    const department = delegate(prisma, 'department');

    return department.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.branchId ? { branchId: input.branchId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...departmentSearchWhere(input.search),
      },
      orderBy: [
        { status: 'asc' },
        { name: 'asc' },
      ],
      take: Math.min(input.take ?? HR_DEFAULTS.maxPageSize, HR_DEFAULTS.maxPageSize),
      skip: input.skip ?? 0,
    });
  }

  async getDepartmentById(tenantId: string, departmentId: string) {
    const department = delegate(prisma, 'department');

    const existing = await department.findFirst({
      where: {
        id: departmentId,
        tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Department not found'), {
        statusCode: 404,
        code: 'DEPARTMENT_NOT_FOUND',
      });
    }

    return existing;
  }

  async archiveDepartment(input: {
    tenantId: string;
    departmentId: string;
    actorId: string;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Archive reason is required'), {
        statusCode: 400,
        code: 'DEPARTMENT_ARCHIVE_REASON_REQUIRED',
      });
    }

    return prisma.$transaction(async (tx) => {
      const department = delegate(tx, 'department');
      const employee = delegate(tx, 'employee');

      const existing = await department.findFirst({
        where: {
          id: input.departmentId,
          tenantId: input.tenantId,
        },
      });

      if (!existing) {
        throw Object.assign(new Error('Department not found'), {
          statusCode: 404,
          code: 'DEPARTMENT_NOT_FOUND',
        });
      }

      const activeEmployees = await employee.count({
        where: {
          tenantId: input.tenantId,
          departmentId: input.departmentId,
          status: {
            in: ['ACTIVE', 'ON_PROBATION', 'ON_LEAVE', 'SUSPENDED'],
          },
        },
      });

      if (activeEmployees > 0) {
        throw Object.assign(new Error('Department has active employees and cannot be archived'), {
          statusCode: 409,
          code: 'DEPARTMENT_HAS_ACTIVE_EMPLOYEES',
          activeEmployees,
        });
      }

      const now = new Date();

      return department.update({
        where: {
          id: input.departmentId,
        },
        data: {
          status: 'ARCHIVED',
          archivedAt: now,
          archivedById: input.actorId,
          archiveReason: input.reason,
          metadata: appendEvent(existing.metadata, {
            action: 'UPDATED',
            actorId: input.actorId,
            reason: input.reason,
            at: now.toISOString(),
          }) as any,
        },
      });
    });
  }

  private async assertDepartmentExists(
    tx: Prisma.TransactionClient,
    tenantId: string,
    departmentId: string,
  ) {
    const department = delegate(tx, 'department');

    const existing = await department.findFirst({
      where: {
        id: departmentId,
        tenantId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw Object.assign(new Error('Referenced department not found'), {
        statusCode: 404,
        code: 'REFERENCED_DEPARTMENT_NOT_FOUND',
      });
    }
  }

  private async assertEmployeeExists(
    tx: Prisma.TransactionClient,
    tenantId: string,
    employeeId: string,
  ) {
    const employee = delegate(tx, 'employee');

    const existing = await employee.findFirst({
      where: {
        id: employeeId,
        tenantId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw Object.assign(new Error('Referenced employee not found'), {
        statusCode: 404,
        code: 'REFERENCED_EMPLOYEE_NOT_FOUND',
      });
    }
  }

  private async assertUniqueDepartment(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      name: string;
      code?: string | null;
    },
    excludeDepartmentId?: string,
  ) {
    const department = delegate(tx, 'department');

    const existingByName = await department.findFirst({
      where: {
        tenantId: input.tenantId,
        name: input.name,
        ...(excludeDepartmentId ? { id: { not: excludeDepartmentId } } : {}),
      },
      select: { id: true },
    });

    if (existingByName) {
      throw Object.assign(new Error('Department name already exists'), {
        statusCode: 409,
        code: 'DEPARTMENT_NAME_DUPLICATE',
      });
    }

    if (input.code) {
      const existingByCode = await department.findFirst({
        where: {
          tenantId: input.tenantId,
          code: input.code,
          ...(excludeDepartmentId ? { id: { not: excludeDepartmentId } } : {}),
        },
        select: { id: true },
      });

      if (existingByCode) {
        throw Object.assign(new Error('Department code already exists'), {
          statusCode: 409,
          code: 'DEPARTMENT_CODE_DUPLICATE',
        });
      }
    }
  }
}

export const departmentService = new DepartmentService();

export default DepartmentService;