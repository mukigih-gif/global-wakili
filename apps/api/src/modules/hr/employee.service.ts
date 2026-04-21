// apps/api/src/modules/hr/employee.service.ts

import { Prisma, prisma } from '@global-wakili/database';

import {
  HR_DEFAULTS,
  type CreateEmployeeInput,
  type EmployeeLifecycleEvent,
  type EmployeeListInput,
  type EmployeeStatusChangeInput,
  type TerminateEmployeeInput,
  type UpdateEmployeeInput,
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

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function appendLifecycleEvent(
  metadata: unknown,
  event: EmployeeLifecycleEvent,
): Record<string, unknown> {
  const current = asRecord(metadata);
  const lifecycle = Array.isArray(current.lifecycle) ? current.lifecycle : [];

  return {
    ...current,
    lifecycle: [...lifecycle, event],
  };
}

function displayNameFrom(input: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
}) {
  if (input.displayName?.trim()) return input.displayName.trim();

  return [input.firstName, input.middleName, input.lastName]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(' ');
}

function employeeSearchWhere(search?: string) {
  if (!search?.trim()) return {};

  const term = search.trim();

  return {
    OR: [
      { firstName: { contains: term, mode: 'insensitive' as const } },
      { middleName: { contains: term, mode: 'insensitive' as const } },
      { lastName: { contains: term, mode: 'insensitive' as const } },
      { displayName: { contains: term, mode: 'insensitive' as const } },
      { staffNumber: { contains: term, mode: 'insensitive' as const } },
      { email: { contains: term, mode: 'insensitive' as const } },
      { kraPin: { contains: term, mode: 'insensitive' as const } },
      { nationalId: { contains: term, mode: 'insensitive' as const } },
    ],
  };
}

export class EmployeeService {
  async createEmployee(input: CreateEmployeeInput) {
    return prisma.$transaction(async (tx) => {
      const employee = delegate(tx, 'employee');

      await this.assertUniqueEmployeeFields(tx, input);

      const displayName = displayNameFrom(input);
      const now = new Date();

      return employee.create({
        data: {
          tenantId: input.tenantId,
          staffNumber: input.staffNumber ?? null,
          userId: input.userId ?? null,

          firstName: input.firstName,
          middleName: input.middleName ?? null,
          lastName: input.lastName,
          displayName,

          email: input.email ?? null,
          phone: input.phone ?? null,
          personalEmail: input.personalEmail ?? null,

          gender: input.gender ?? null,
          maritalStatus: input.maritalStatus ?? null,
          dateOfBirth: input.dateOfBirth ?? null,

          nationalId: input.nationalId ?? null,
          passportNumber: input.passportNumber ?? null,
          kraPin: input.kraPin ?? null,
          nssfNumber: input.nssfNumber ?? null,
          shaNumber: input.shaNumber ?? null,
          nhifNumber: input.nhifNumber ?? null,

          branchId: input.branchId ?? null,
          departmentId: input.departmentId ?? null,
          roleId: input.roleId ?? null,
          jobTitle: input.jobTitle ?? null,
          employmentType: input.employmentType ?? HR_DEFAULTS.defaultEmploymentType,
          status: input.status ?? HR_DEFAULTS.defaultEmployeeStatus,

          startDate: input.startDate ?? now,
          probationEndDate: input.probationEndDate ?? null,
          reportingManagerId: input.reportingManagerId ?? null,

          basicPay: money(input.basicPay ?? input.salary ?? 0),
          salary: money(input.salary ?? input.basicPay ?? 0),
          currency: input.currency ?? HR_DEFAULTS.currency,
          payrollEligible: input.payrollEligible ?? true,

          emergencyContactName: input.emergencyContactName ?? null,
          emergencyContactPhone: input.emergencyContactPhone ?? null,
          emergencyContactRelationship: input.emergencyContactRelationship ?? null,

          addressLine1: input.addressLine1 ?? null,
          addressLine2: input.addressLine2 ?? null,
          city: input.city ?? null,
          county: input.county ?? null,
          country: input.country ?? HR_DEFAULTS.country,
          postalCode: input.postalCode ?? null,

          createdById: input.userId,
          metadata: appendLifecycleEvent(input.metadata, {
            action: 'CREATED',
            actorId: input.userId,
            at: now.toISOString(),
          }) as any,
        },
      });
    });
  }

  async updateEmployee(input: UpdateEmployeeInput) {
    return prisma.$transaction(async (tx) => {
      const employee = delegate(tx, 'employee');

      const existing = await employee.findFirst({
        where: {
          id: input.employeeId,
          tenantId: input.tenantId,
        },
      });

      if (!existing) {
        throw Object.assign(new Error('Employee not found'), {
          statusCode: 404,
          code: 'EMPLOYEE_NOT_FOUND',
        });
      }

      await this.assertUniqueEmployeeFields(tx, input, input.employeeId);

      const now = new Date();
      const metadata = appendLifecycleEvent(
        {
          ...asRecord(existing.metadata),
          ...(input.metadata ?? {}),
        },
        {
          action: 'UPDATED',
          actorId: input.userId,
          at: now.toISOString(),
        },
      );

      return employee.update({
        where: {
          id: input.employeeId,
        },
        data: {
          ...(input.staffNumber !== undefined ? { staffNumber: input.staffNumber } : {}),
          ...(input.userId !== undefined ? { userId: input.userId } : {}),

          ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
          ...(input.middleName !== undefined ? { middleName: input.middleName } : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
          ...(input.displayName !== undefined
            ? { displayName: input.displayName }
            : input.firstName !== undefined || input.middleName !== undefined || input.lastName !== undefined
              ? {
                  displayName: displayNameFrom({
                    firstName: input.firstName ?? existing.firstName,
                    middleName: input.middleName ?? existing.middleName,
                    lastName: input.lastName ?? existing.lastName,
                    displayName: existing.displayName,
                  }),
                }
              : {}),

          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.personalEmail !== undefined ? { personalEmail: input.personalEmail } : {}),

          ...(input.gender !== undefined ? { gender: input.gender } : {}),
          ...(input.maritalStatus !== undefined ? { maritalStatus: input.maritalStatus } : {}),
          ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),

          ...(input.nationalId !== undefined ? { nationalId: input.nationalId } : {}),
          ...(input.passportNumber !== undefined ? { passportNumber: input.passportNumber } : {}),
          ...(input.kraPin !== undefined ? { kraPin: input.kraPin } : {}),
          ...(input.nssfNumber !== undefined ? { nssfNumber: input.nssfNumber } : {}),
          ...(input.shaNumber !== undefined ? { shaNumber: input.shaNumber } : {}),
          ...(input.nhifNumber !== undefined ? { nhifNumber: input.nhifNumber } : {}),

          ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
          ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
          ...(input.roleId !== undefined ? { roleId: input.roleId } : {}),
          ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
          ...(input.employmentType !== undefined ? { employmentType: input.employmentType } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),

          ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
          ...(input.probationEndDate !== undefined ? { probationEndDate: input.probationEndDate } : {}),
          ...(input.reportingManagerId !== undefined ? { reportingManagerId: input.reportingManagerId } : {}),

          ...(input.basicPay !== undefined ? { basicPay: money(input.basicPay) } : {}),
          ...(input.salary !== undefined ? { salary: money(input.salary) } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.payrollEligible !== undefined ? { payrollEligible: input.payrollEligible } : {}),

          ...(input.emergencyContactName !== undefined ? { emergencyContactName: input.emergencyContactName } : {}),
          ...(input.emergencyContactPhone !== undefined ? { emergencyContactPhone: input.emergencyContactPhone } : {}),
          ...(input.emergencyContactRelationship !== undefined
            ? { emergencyContactRelationship: input.emergencyContactRelationship }
            : {}),

          ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
          ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2 } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.county !== undefined ? { county: input.county } : {}),
          ...(input.country !== undefined ? { country: input.country } : {}),
          ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),

          metadata: metadata as any,
          updatedById: input.userId,
          updatedAt: now,
        },
      });
    });
  }

  async listEmployees(input: EmployeeListInput) {
    const employee = delegate(prisma, 'employee');

    return employee.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.branchId ? { branchId: input.branchId } : {}),
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.employmentType ? { employmentType: input.employmentType } : {}),
        ...(input.payrollEligible !== undefined ? { payrollEligible: input.payrollEligible } : {}),
        ...employeeSearchWhere(input.search),
      },
      orderBy: [
        { status: 'asc' },
        { displayName: 'asc' },
      ],
      take: Math.min(input.take ?? HR_DEFAULTS.maxPageSize, HR_DEFAULTS.maxPageSize),
      skip: input.skip ?? 0,
    });
  }

  async getEmployeeById(tenantId: string, employeeId: string) {
    const employee = delegate(prisma, 'employee');

    const existing = await employee.findFirst({
      where: {
        id: employeeId,
        tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Employee not found'), {
        statusCode: 404,
        code: 'EMPLOYEE_NOT_FOUND',
      });
    }

    return existing;
  }

  async changeEmployeeStatus(input: EmployeeStatusChangeInput) {
    const employee = delegate(prisma, 'employee');

    const existing = await employee.findFirst({
      where: {
        id: input.employeeId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Employee not found'), {
        statusCode: 404,
        code: 'EMPLOYEE_NOT_FOUND',
      });
    }

    const now = new Date();

    return employee.update({
      where: {
        id: input.employeeId,
      },
      data: {
        status: input.status,
        statusChangedAt: input.effectiveDate ?? now,
        statusChangeReason: input.reason,
        metadata: appendLifecycleEvent(
          {
            ...asRecord(existing.metadata),
            ...(input.metadata ?? {}),
          },
          {
            action: 'STATUS_CHANGED',
            actorId: input.userId,
            reason: input.reason,
            effectiveDate: (input.effectiveDate ?? now).toISOString(),
            at: now.toISOString(),
          },
        ) as any,
        updatedById: input.userId,
        updatedAt: now,
      },
    });
  }

  async terminateEmployee(input: TerminateEmployeeInput) {
    const employee = delegate(prisma, 'employee');

    const existing = await employee.findFirst({
      where: {
        id: input.employeeId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Employee not found'), {
        statusCode: 404,
        code: 'EMPLOYEE_NOT_FOUND',
      });
    }

    if (String(existing.status) === 'TERMINATED') {
      throw Object.assign(new Error('Employee is already terminated'), {
        statusCode: 409,
        code: 'EMPLOYEE_ALREADY_TERMINATED',
      });
    }

    const now = new Date();

    return employee.update({
      where: {
        id: input.employeeId,
      },
      data: {
        status: 'TERMINATED',
        terminationDate: input.terminationDate,
        terminationReason: input.reason,
        payrollEligible: false,
        eligibleForRehire: input.eligibleForRehire ?? false,
        finalPayNotes: input.finalPayNotes ?? null,
        metadata: appendLifecycleEvent(
          {
            ...asRecord(existing.metadata),
            ...(input.metadata ?? {}),
          },
          {
            action: 'TERMINATED',
            actorId: input.userId,
            reason: input.reason,
            effectiveDate: input.terminationDate.toISOString(),
            at: now.toISOString(),
            metadata: {
              eligibleForRehire: input.eligibleForRehire ?? false,
              finalPayNotes: input.finalPayNotes ?? null,
            },
          },
        ) as any,
        updatedById: input.userId,
        updatedAt: now,
      },
    });
  }

  private async assertUniqueEmployeeFields(
    tx: Prisma.TransactionClient,
    input: Partial<CreateEmployeeInput | UpdateEmployeeInput> & { tenantId: string },
    excludeEmployeeId?: string,
  ) {
    const employee = delegate(tx, 'employee');

    const checks = [
      input.staffNumber ? { field: 'staffNumber', value: input.staffNumber } : null,
      input.email ? { field: 'email', value: input.email } : null,
      input.nationalId ? { field: 'nationalId', value: input.nationalId } : null,
      input.kraPin ? { field: 'kraPin', value: input.kraPin } : null,
    ].filter(Boolean) as Array<{ field: string; value: string }>;

    for (const check of checks) {
      const existing = await employee.findFirst({
        where: {
          tenantId: input.tenantId,
          [check.field]: check.value,
          ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}),
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        throw Object.assign(new Error(`Employee ${check.field} already exists`), {
          statusCode: 409,
          code: 'EMPLOYEE_UNIQUE_CONSTRAINT',
          field: check.field,
        });
      }
    }
  }
}

export const employeeService = new EmployeeService();

export default EmployeeService;