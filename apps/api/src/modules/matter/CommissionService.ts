// apps/api/src/modules/matter/CommissionService.ts

import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return new Prisma.Decimal(0);
  }

  const decimal = new Prisma.Decimal(value);

  if (!decimal.isFinite()) {
    throw Object.assign(new Error('Invalid decimal value'), {
      statusCode: 422,
      code: 'INVALID_DECIMAL_VALUE',
    });
  }

  return decimal;
}

function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid commission date'), {
      statusCode: 422,
      code: 'INVALID_COMMISSION_DATE',
    });
  }

  return parsed;
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, any>;
}

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('tenantId is required'), {
      statusCode: 400,
      code: 'TENANT_REQUIRED',
    });
  }
}

function assertMatter(matterId: string): void {
  if (!matterId?.trim()) {
    throw Object.assign(new Error('matterId is required'), {
      statusCode: 400,
      code: 'MATTER_REQUIRED',
    });
  }
}

function assertUser(userId: string): void {
  if (!userId?.trim()) {
    throw Object.assign(new Error('userId is required'), {
      statusCode: 400,
      code: 'USER_REQUIRED',
    });
  }
}

export type CommissionBasis = 'BILLED' | 'COLLECTED';

export type CommissionRole =
  | 'ORIGINATOR'
  | 'WORKING_LAWYER'
  | 'SUPERVISING_PARTNER'
  | 'BRANCH';

export type PayoutStatus = 'READY' | 'SUSPENSE';

export type CommissionSplitRule = {
  originatorPercent: number;
  workingLawyerPercent: number;
  supervisingPartnerPercent: number;
  branchPercent: number;
};

export type CommissionPayoutLine = {
  role: CommissionRole;
  userId?: string | null;
  branchId?: string | null;
  percent: Prisma.Decimal;
  baseAmount: Prisma.Decimal;
  payoutAmount: Prisma.Decimal;
  notes?: string | null;
  status: PayoutStatus;
};

export type CommissionSummaryInput = {
  tenantId: string;
  matterId?: string | null;
  lawyerId?: string | null;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  includeWriteOffImpact?: boolean;
};

export class CommissionService {
  static normalizeSplitRule(input?: Partial<CommissionSplitRule> | null): CommissionSplitRule {
    const rule: CommissionSplitRule = {
      originatorPercent: input?.originatorPercent ?? 30,
      workingLawyerPercent: input?.workingLawyerPercent ?? 40,
      supervisingPartnerPercent: input?.supervisingPartnerPercent ?? 20,
      branchPercent: input?.branchPercent ?? 10,
    };

    const total = new Prisma.Decimal(rule.originatorPercent)
      .plus(rule.workingLawyerPercent)
      .plus(rule.supervisingPartnerPercent)
      .plus(rule.branchPercent);

    if (!total.eq(100)) {
      throw Object.assign(new Error('Commission split rule must total 100%'), {
        statusCode: 422,
        code: 'INVALID_COMMISSION_SPLIT',
        details: rule,
      });
    }

    return rule;
  }

  static async resolveMatterCommissionContext(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
    },
  ) {
    assertTenant(params.tenantId);
    assertMatter(params.matterId);

    const matter = await db.matter.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.matterId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        matterCode: true,
        caseNumber: true,
        branchId: true,
        partnerId: true,
        assignedLawyerId: true,
        metadata: true,
      },
    });

    if (!matter) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    const metadata = asRecord(matter.metadata);
    const billing = asRecord(metadata.billing);
    const commissionPlan = asRecord(metadata.commissionPlan);

    const originatorId =
      billing.originatorId ??
      metadata.originatorId ??
      null;

    const splitRule = this.normalizeSplitRule({
      originatorPercent:
        commissionPlan.originatorPercent !== undefined
          ? Number(commissionPlan.originatorPercent)
          : undefined,
      workingLawyerPercent:
        commissionPlan.workingLawyerPercent !== undefined
          ? Number(commissionPlan.workingLawyerPercent)
          : undefined,
      supervisingPartnerPercent:
        commissionPlan.supervisingPartnerPercent !== undefined
          ? Number(commissionPlan.supervisingPartnerPercent)
          : undefined,
      branchPercent:
        commissionPlan.branchPercent !== undefined
          ? Number(commissionPlan.branchPercent)
          : undefined,
    });

    const commissionBasis: CommissionBasis =
      String(commissionPlan.basis ?? 'COLLECTED').toUpperCase() === 'BILLED'
        ? 'BILLED'
        : 'COLLECTED';

    const commissionRatePercent = toDecimal(
      commissionPlan.commissionRatePercent ?? 100,
    );

    if (commissionRatePercent.lt(0) || commissionRatePercent.gt(100)) {
      throw Object.assign(new Error('Commission rate percent must be between 0 and 100'), {
        statusCode: 422,
        code: 'INVALID_COMMISSION_RATE',
      });
    }

    return {
      matter,
      metadata,
      originatorId,
      partnerId: matter.partnerId ?? null,
      assignedLawyerId: matter.assignedLawyerId ?? null,
      branchId: matter.branchId ?? null,
      splitRule,
      commissionBasis,
      commissionRatePercent,
    };
  }

  static async calculateMatterCommission(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
      periodStart?: Date | string | null;
      periodEnd?: Date | string | null;
      includeWriteOffImpact?: boolean;
    },
  ) {
    assertTenant(params.tenantId);
    assertMatter(params.matterId);

    const periodStart = toDate(params.periodStart);
    const periodEnd = toDate(params.periodEnd);

    if (periodStart && periodEnd && periodStart > periodEnd) {
      throw Object.assign(new Error('Commission periodStart cannot be after periodEnd'), {
        statusCode: 422,
        code: 'INVALID_COMMISSION_PERIOD',
      });
    }

    const includeWriteOffImpact = params.includeWriteOffImpact ?? true;

    const context = await this.resolveMatterCommissionContext(db, {
      tenantId: params.tenantId,
      matterId: params.matterId,
    });

    const invoiceWhere: Record<string, unknown> = {
      tenantId: params.tenantId,
      matterId: params.matterId,
      status: {
        not: 'CANCELLED',
      },
    };

    if (periodStart || periodEnd) {
      if (context.commissionBasis === 'BILLED') {
        invoiceWhere.issuedDate = {
          ...(periodStart ? { gte: periodStart } : {}),
          ...(periodEnd ? { lte: periodEnd } : {}),
        };
      } else {
        invoiceWhere.paidDate = {
          ...(periodStart ? { gte: periodStart } : {}),
          ...(periodEnd ? { lte: periodEnd } : {}),
        };
      }
    }

    const invoiceAgg = await db.invoice.aggregate({
      where: invoiceWhere,
      _sum: {
        subTotal: true,
        total: true,
        paidAmount: true,
      },
      _count: {
        id: true,
      },
    });

    const totalProfessionalFeesBilled = toDecimal(invoiceAgg._sum.subTotal);
    const totalGrossBilled = toDecimal(invoiceAgg._sum.total);
    const totalCollected = toDecimal(invoiceAgg._sum.paidAmount);

    const writeOffs = Array.isArray(context.metadata.writeOffs)
      ? context.metadata.writeOffs
      : [];

    const filteredWriteOffs = writeOffs.filter((item: any) => {
      const recordedAt = item?.recordedAt ? new Date(item.recordedAt) : null;

      if (!recordedAt || Number.isNaN(recordedAt.getTime())) return true;
      if (periodStart && recordedAt < periodStart) return false;
      if (periodEnd && recordedAt > periodEnd) return false;

      return true;
    });

    const totalWriteOff = filteredWriteOffs.reduce(
      (acc: Prisma.Decimal, item: any) => acc.plus(toDecimal(item?.amount)),
      new Prisma.Decimal(0),
    );

    const baseGross =
      context.commissionBasis === 'BILLED'
        ? totalProfessionalFeesBilled
        : totalCollected;

    const adjustedBase =
      includeWriteOffImpact && context.commissionBasis === 'BILLED'
        ? Prisma.Decimal.max(baseGross.minus(totalWriteOff), new Prisma.Decimal(0))
        : baseGross;

    const commissionPool = adjustedBase.mul(context.commissionRatePercent).div(100);
    const roundedCommissionPool = roundMoney(commissionPool);

    const split = context.splitRule;

    const buildLine = (
      role: CommissionRole,
      percentValue: number,
      userId?: string | null,
      branchId?: string | null,
      missingNote?: string,
    ): CommissionPayoutLine => {
      const percent = new Prisma.Decimal(percentValue);
      const rawPayout = commissionPool.mul(percentValue).div(100);
      const payoutAmount = roundMoney(rawPayout);
      const hasRecipient = role === 'BRANCH' ? Boolean(branchId) : Boolean(userId);

      return {
        role,
        userId: userId ?? null,
        branchId: branchId ?? null,
        percent,
        baseAmount: adjustedBase,
        payoutAmount: hasRecipient ? payoutAmount : new Prisma.Decimal(0),
        notes: hasRecipient ? null : missingNote ?? 'Missing payout recipient',
        status: hasRecipient ? 'READY' : 'SUSPENSE',
      };
    };

    const payoutLines: CommissionPayoutLine[] = [
      buildLine(
        'ORIGINATOR',
        split.originatorPercent,
        context.originatorId,
        null,
        'No originator assigned',
      ),
      buildLine(
        'WORKING_LAWYER',
        split.workingLawyerPercent,
        context.assignedLawyerId,
        null,
        'No assigned lawyer set',
      ),
      buildLine(
        'SUPERVISING_PARTNER',
        split.supervisingPartnerPercent,
        context.partnerId,
        null,
        'No supervising partner set',
      ),
      buildLine(
        'BRANCH',
        split.branchPercent,
        null,
        context.branchId,
        'No branch assigned',
      ),
    ];

    const totalReadyPayout = payoutLines.reduce(
      (acc, line) => acc.plus(line.payoutAmount),
      new Prisma.Decimal(0),
    );

    const suspenseAmount = roundMoney(
      Prisma.Decimal.max(roundedCommissionPool.minus(totalReadyPayout), new Prisma.Decimal(0)),
    );

    return {
      matter: {
        id: context.matter.id,
        title: context.matter.title,
        matterCode: context.matter.matterCode ?? null,
        caseNumber: context.matter.caseNumber ?? null,
      },
      commissionContext: {
        originatorId: context.originatorId,
        partnerId: context.partnerId,
        assignedLawyerId: context.assignedLawyerId,
        branchId: context.branchId,
        basis: context.commissionBasis,
        commissionRatePercent: context.commissionRatePercent,
        splitRule: context.splitRule,
      },
      financials: {
        invoiceCount: invoiceAgg._count.id,
        totalProfessionalFeesBilled,
        totalGrossBilled,
        totalCollected,
        totalWriteOff,
        adjustedBase: roundMoney(adjustedBase),
        commissionPool: roundedCommissionPool,
        suspenseAmount,
      },
      payoutLines,
      generatedAt: new Date(),
    };
  }

  static async calculateOriginatorPortfolioPayout(
    db: any,
    params: {
      tenantId: string;
      originatorId: string;
      periodStart?: Date | string | null;
      periodEnd?: Date | string | null;
    },
  ) {
    assertTenant(params.tenantId);
    assertUser(params.originatorId);

    const periodStart = toDate(params.periodStart);
    const periodEnd = toDate(params.periodEnd);

    if (periodStart && periodEnd && periodStart > periodEnd) {
      throw Object.assign(new Error('Commission periodStart cannot be after periodEnd'), {
        statusCode: 422,
        code: 'INVALID_COMMISSION_PERIOD',
      });
    }

    const matters = await db.matter.findMany({
      where: {
        tenantId: params.tenantId,
        deletedAt: null,
        OR: [
          {
            metadata: {
              path: ['originatorId'],
              equals: params.originatorId,
            },
          },
          {
            metadata: {
              path: ['billing', 'originatorId'],
              equals: params.originatorId,
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    const results = await Promise.all(
      matters.map((matter: { id: string }) =>
        this.calculateMatterCommission(db, {
          tenantId: params.tenantId,
          matterId: matter.id,
          periodStart,
          periodEnd,
          includeWriteOffImpact: true,
        }),
      ),
    );

    const totalPayout = results.reduce(
      (acc: Prisma.Decimal, item: any) => {
        const originatorLine = item.payoutLines.find(
          (line: CommissionPayoutLine) => line.role === 'ORIGINATOR',
        );

        return acc.plus(originatorLine?.payoutAmount ?? new Prisma.Decimal(0));
      },
      new Prisma.Decimal(0),
    );

    const totalSuspense = results.reduce(
      (acc: Prisma.Decimal, item: any) =>
        acc.plus(toDecimal(item.financials?.suspenseAmount)),
      new Prisma.Decimal(0),
    );

    return {
      originatorId: params.originatorId,
      matterCount: results.length,
      totalPayout: roundMoney(totalPayout),
      totalSuspense: roundMoney(totalSuspense),
      matters: results,
      generatedAt: new Date(),
    };
  }

  static async getMatterCommissionSummary(db: any, input: CommissionSummaryInput) {
    if (!input.matterId) {
      throw Object.assign(new Error('matterId is required for matter commission summary'), {
        statusCode: 400,
        code: 'MATTER_REQUIRED',
      });
    }

    return this.calculateMatterCommission(db, {
      tenantId: input.tenantId,
      matterId: input.matterId,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      includeWriteOffImpact: input.includeWriteOffImpact ?? true,
    });
  }

  static async getLawyerCommissionSummary(db: any, input: CommissionSummaryInput) {
    assertTenant(input.tenantId);

    if (!input.lawyerId) {
      throw Object.assign(new Error('lawyerId is required for lawyer commission summary'), {
        statusCode: 400,
        code: 'LAWYER_REQUIRED',
      });
    }

    const matters = await db.matter.findMany({
      where: {
        tenantId: input.tenantId,
        deletedAt: null,
        OR: [
          { assignedLawyerId: input.lawyerId },
          { partnerId: input.lawyerId },
          {
            metadata: {
              path: ['originatorId'],
              equals: input.lawyerId,
            },
          },
          {
            metadata: {
              path: ['billing', 'originatorId'],
              equals: input.lawyerId,
            },
          },
        ],
      },
      select: {
        id: true,
      },
      take: 500,
    });

    const results = await Promise.all(
      matters.map((matter: { id: string }) =>
        this.calculateMatterCommission(db, {
          tenantId: input.tenantId,
          matterId: matter.id,
          periodStart: input.periodStart ?? null,
          periodEnd: input.periodEnd ?? null,
          includeWriteOffImpact: input.includeWriteOffImpact ?? true,
        }),
      ),
    );

    const totalPayout = results.reduce(
      (acc: Prisma.Decimal, item: any) =>
        acc.plus(
          item.payoutLines
            .filter((line: CommissionPayoutLine) => line.userId === input.lawyerId)
            .reduce(
              (lineAcc: Prisma.Decimal, line: CommissionPayoutLine) =>
                lineAcc.plus(line.payoutAmount),
              new Prisma.Decimal(0),
            ),
        ),
      new Prisma.Decimal(0),
    );

    return {
      lawyerId: input.lawyerId,
      matterCount: results.length,
      totalPayout: roundMoney(totalPayout),
      matters: results,
      generatedAt: new Date(),
    };
  }

  static async getCommissionDashboard(db: any, input: CommissionSummaryInput) {
    if (input.matterId) {
      const summary = await this.getMatterCommissionSummary(db, input);

      return {
        scope: 'matter',
        summary,
        generatedAt: new Date(),
      };
    }

    if (input.lawyerId) {
      const summary = await this.getLawyerCommissionSummary(db, input);

      return {
        scope: 'lawyer',
        summary,
        generatedAt: new Date(),
      };
    }

    return {
      scope: 'tenant',
      message:
        'Provide matterId or lawyerId for commission dashboard. Tenant-wide commission dashboard will be finalized with payroll commission posting.',
      generatedAt: new Date(),
    };
  }

  static async getCommissionOverview(db: any, input: CommissionSummaryInput) {
    return this.getCommissionDashboard(db, input);
  }

  static async listMatterCommissions(db: any, input: CommissionSummaryInput) {
    if (input.matterId) {
      return [await this.getMatterCommissionSummary(db, input)];
    }

    assertTenant(input.tenantId);

    const matters = await db.matter.findMany({
      where: {
        tenantId: input.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
      take: 100,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Promise.all(
      matters.map((matter: { id: string }) =>
        this.calculateMatterCommission(db, {
          tenantId: input.tenantId,
          matterId: matter.id,
          periodStart: input.periodStart ?? null,
          periodEnd: input.periodEnd ?? null,
          includeWriteOffImpact: input.includeWriteOffImpact ?? true,
        }),
      ),
    );
  }
}

export const commissionService = CommissionService;

export default CommissionService;