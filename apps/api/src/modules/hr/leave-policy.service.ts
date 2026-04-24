// apps/api/src/modules/hr/leave-policy.service.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type LeavePolicyStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type LeaveAccrualFrequency =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUALLY'
  | 'ON_EMPLOYMENT_ANNIVERSARY'
  | 'MANUAL';

export type LeavePolicyInput = {
  tenantId: string;
  userId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  leaveType: string;
  annualEntitlementDays: string | number | Prisma.Decimal;
  accrualFrequency?: LeaveAccrualFrequency;
  carryForwardAllowed?: boolean;
  maxCarryForwardDays?: string | number | Prisma.Decimal | null;
  encashmentAllowed?: boolean;
  requiresApproval?: boolean;
  approvalLevels?: number;
  appliesToEmploymentTypes?: string[];
  appliesToDepartmentIds?: string[];
  appliesToBranchIds?: string[];
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  metadata?: Record<string, unknown>;
};

export type LeavePolicyUpdateInput = Partial<LeavePolicyInput> & {
  tenantId: string;
  userId: string;
  leavePolicyId: string;
  status?: LeavePolicyStatus;
};

export type LeaveBalanceInput = {
  tenantId: string;
  employeeId: string;
  leavePolicyId: string;
  asOf?: Date;
};

export type LeaveAccrualInput = {
  tenantId: string;
  employeeId: string;
  leavePolicyId: string;
  periodStart: Date;
  periodEnd: Date;
  actorId: string;
};

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

function appendHistory(
  metadata: unknown,
  entry: Record<string, unknown>,
): Record<string, unknown> {
  const current = asRecord(metadata);
  const history = Array.isArray(current.history) ? current.history : [];

  return {
    ...current,
    history: [...history, entry],
  };
}

export class LeavePolicyService {
  async createLeavePolicy(input: LeavePolicyInput) {
    return prisma.$transaction(async (tx) => {
      const leavePolicy = delegate(tx, 'leavePolicy');

      await this.assertUniquePolicy(tx, {
        tenantId: input.tenantId,
        name: input.name,
        code: input.code ?? null,
      });

      return leavePolicy.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          code: input.code ?? null,
          description: input.description ?? null,
          leaveType: input.leaveType,
          annualEntitlementDays: decimal(input.annualEntitlementDays),
          accrualFrequency: input.accrualFrequency ?? 'MONTHLY',
          carryForwardAllowed: input.carryForwardAllowed ?? true,
          maxCarryForwardDays: decimal(input.maxCarryForwardDays ?? 0),
          encashmentAllowed: input.encashmentAllowed ?? false,
          requiresApproval: input.requiresApproval ?? true,
          approvalLevels: input.approvalLevels ?? 1,
          appliesToEmploymentTypes: input.appliesToEmploymentTypes ?? [],
          appliesToDepartmentIds: input.appliesToDepartmentIds ?? [],
          appliesToBranchIds: input.appliesToBranchIds ?? [],
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo ?? null,
          status: 'ACTIVE',
          createdById: input.userId,
          metadata: appendHistory(input.metadata, {
            action: 'LEAVE_POLICY_CREATED',
            actorId: input.userId,
            at: new Date().toISOString(),
          }) as any,
        },
      });
    });
  }

  async updateLeavePolicy(input: LeavePolicyUpdateInput) {
    return prisma.$transaction(async (tx) => {
      const leavePolicy = delegate(tx, 'leavePolicy');

      const existing = await leavePolicy.findFirst({
        where: {
          id: input.leavePolicyId,
          tenantId: input.tenantId,
        },
      });

      if (!existing) {
        throw Object.assign(new Error('Leave policy not found'), {
          statusCode: 404,
          code: 'LEAVE_POLICY_NOT_FOUND',
        });
      }

      if (input.name || input.code) {
        await this.assertUniquePolicy(
          tx,
          {
            tenantId: input.tenantId,
            name: input.name ?? existing.name,
            code: input.code ?? existing.code ?? null,
          },
          input.leavePolicyId,
        );
      }

      return leavePolicy.update({
        where: {
          id: input.leavePolicyId,
        },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.leaveType !== undefined ? { leaveType: input.leaveType } : {}),
          ...(input.annualEntitlementDays !== undefined
            ? { annualEntitlementDays: decimal(input.annualEntitlementDays) }
            : {}),
          ...(input.accrualFrequency !== undefined ? { accrualFrequency: input.accrualFrequency } : {}),
          ...(input.carryForwardAllowed !== undefined
            ? { carryForwardAllowed: input.carryForwardAllowed }
            : {}),
          ...(input.maxCarryForwardDays !== undefined
            ? { maxCarryForwardDays: decimal(input.maxCarryForwardDays) }
            : {}),
          ...(input.encashmentAllowed !== undefined
            ? { encashmentAllowed: input.encashmentAllowed }
            : {}),
          ...(input.requiresApproval !== undefined ? { requiresApproval: input.requiresApproval } : {}),
          ...(input.approvalLevels !== undefined ? { approvalLevels: input.approvalLevels } : {}),
          ...(input.appliesToEmploymentTypes !== undefined
            ? { appliesToEmploymentTypes: input.appliesToEmploymentTypes }
            : {}),
          ...(input.appliesToDepartmentIds !== undefined
            ? { appliesToDepartmentIds: input.appliesToDepartmentIds }
            : {}),
          ...(input.appliesToBranchIds !== undefined
            ? { appliesToBranchIds: input.appliesToBranchIds }
            : {}),
          ...(input.effectiveFrom !== undefined ? { effectiveFrom: input.effectiveFrom } : {}),
          ...(input.effectiveTo !== undefined ? { effectiveTo: input.effectiveTo } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          metadata: appendHistory(
            {
              ...asRecord(existing.metadata),
              ...(input.metadata ?? {}),
            },
            {
              action: 'LEAVE_POLICY_UPDATED',
              actorId: input.userId,
              at: new Date().toISOString(),
            },
          ) as any,
          updatedById: input.userId,
          updatedAt: new Date(),
        },
      });
    });
  }

  async listLeavePolicies(input: {
    tenantId: string;
    status?: LeavePolicyStatus | string;
    leaveType?: string;
    take?: number;
    skip?: number;
  }) {
    const leavePolicy = delegate(prisma, 'leavePolicy');

    return leavePolicy.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.status ? { status: input.status } : {}),
        ...(input.leaveType ? { leaveType: input.leaveType } : {}),
      },
      orderBy: [
        { status: 'asc' },
        { name: 'asc' },
      ],
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  async getLeavePolicyById(tenantId: string, leavePolicyId: string) {
    const leavePolicy = delegate(prisma, 'leavePolicy');

    const existing = await leavePolicy.findFirst({
      where: {
        id: leavePolicyId,
        tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Leave policy not found'), {
        statusCode: 404,
        code: 'LEAVE_POLICY_NOT_FOUND',
      });
    }

    return existing;
  }

  async getEmployeeLeaveBalance(input: LeaveBalanceInput) {
    const leaveBalance = delegate(prisma, 'leaveBalance');

    const existing = await leaveBalance.findFirst({
      where: {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        leavePolicyId: input.leavePolicyId,
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    if (existing) return existing;

    const leavePolicy = await this.getLeavePolicyById(input.tenantId, input.leavePolicyId);

    return {
      tenantId: input.tenantId,
      employeeId: input.employeeId,
      leavePolicyId: input.leavePolicyId,
      leaveType: leavePolicy.leaveType,
      entitledDays: decimal(leavePolicy.annualEntitlementDays),
      accruedDays: ZERO,
      usedDays: ZERO,
      pendingDays: ZERO,
      carriedForwardDays: ZERO,
      availableDays: ZERO,
      effectiveFrom: input.asOf ?? new Date(),
      status: 'DERIVED_EMPTY_BALANCE',
    };
  }

  async accrueLeave(input: LeaveAccrualInput) {
    return prisma.$transaction(async (tx) => {
      const leavePolicy = delegate(tx, 'leavePolicy');
      const leaveBalance = delegate(tx, 'leaveBalance');

      const policy = await leavePolicy.findFirst({
        where: {
          id: input.leavePolicyId,
          tenantId: input.tenantId,
          status: 'ACTIVE',
        },
      });

      if (!policy) {
        throw Object.assign(new Error('Active leave policy not found'), {
          statusCode: 404,
          code: 'LEAVE_POLICY_NOT_FOUND',
        });
      }

      const annualEntitlement = decimal(policy.annualEntitlementDays);
      const monthlyAccrual = annualEntitlement.div(12).toDecimalPlaces(2);

      const existing = await leaveBalance.findFirst({
        where: {
          tenantId: input.tenantId,
          employeeId: input.employeeId,
          leavePolicyId: input.leavePolicyId,
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
      });

      const accruedDays = decimal(existing?.accruedDays).plus(monthlyAccrual).toDecimalPlaces(2);
      const carriedForwardDays = decimal(existing?.carriedForwardDays);
      const usedDays = decimal(existing?.usedDays);
      const pendingDays = decimal(existing?.pendingDays);
      const availableDays = accruedDays
        .plus(carriedForwardDays)
        .minus(usedDays)
        .minus(pendingDays)
        .toDecimalPlaces(2);

      return leaveBalance.upsert({
        where: existing
          ? { id: existing.id }
          : {
              tenantId_employeeId_leavePolicyId: {
                tenantId: input.tenantId,
                employeeId: input.employeeId,
                leavePolicyId: input.leavePolicyId,
              },
            },
        update: {
          accruedDays,
          availableDays,
          lastAccruedAt: new Date(),
          metadata: appendHistory(existing?.metadata, {
            action: 'LEAVE_ACCRUED',
            actorId: input.actorId,
            periodStart: input.periodStart.toISOString(),
            periodEnd: input.periodEnd.toISOString(),
            days: monthlyAccrual.toString(),
            at: new Date().toISOString(),
          }) as any,
        },
        create: {
          tenantId: input.tenantId,
          employeeId: input.employeeId,
          leavePolicyId: input.leavePolicyId,
          leaveType: policy.leaveType,
          entitledDays: annualEntitlement,
          accruedDays,
          usedDays,
          pendingDays,
          carriedForwardDays,
          availableDays,
          effectiveFrom: input.periodStart,
          lastAccruedAt: new Date(),
          metadata: {
            history: [
              {
                action: 'LEAVE_ACCRUED',
                actorId: input.actorId,
                periodStart: input.periodStart.toISOString(),
                periodEnd: input.periodEnd.toISOString(),
                days: monthlyAccrual.toString(),
                at: new Date().toISOString(),
              },
            ],
          },
        },
      });
    });
  }

  private async assertUniquePolicy(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      name: string;
      code?: string | null;
    },
    excludeId?: string,
  ) {
    const leavePolicy = delegate(tx, 'leavePolicy');

    const existingByName = await leavePolicy.findFirst({
      where: {
        tenantId: input.tenantId,
        name: input.name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existingByName) {
      throw Object.assign(new Error('Leave policy name already exists'), {
        statusCode: 409,
        code: 'LEAVE_POLICY_NAME_DUPLICATE',
      });
    }

    if (input.code) {
      const existingByCode = await leavePolicy.findFirst({
        where: {
          tenantId: input.tenantId,
          code: input.code,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });

      if (existingByCode) {
        throw Object.assign(new Error('Leave policy code already exists'), {
          statusCode: 409,
          code: 'LEAVE_POLICY_CODE_DUPLICATE',
        });
      }
    }
  }
}

export const leavePolicyService = new LeavePolicyService();

export default LeavePolicyService;