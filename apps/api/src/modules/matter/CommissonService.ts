import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export type CommissionBasis =
  | 'BILLED'
  | 'COLLECTED';

export type CommissionRole =
  | 'ORIGINATOR'
  | 'WORKING_LAWYER'
  | 'SUPERVISING_PARTNER'
  | 'BRANCH';

export type PayoutStatus =
  | 'READY'
  | 'SUSPENSE';

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

export class CommissionService {
  static normalizeSplitRule(input?: Partial<CommissionSplitRule> | null): CommissionSplitRule {
    const rule: CommissionSplitRule = {
      originatorPercent: input?.originatorPercent ?? 30,
      workingLawyerPercent: input?.workingLawyerPercent ?? 40,
      supervisingPartnerPercent: input?.supervisingPartnerPercent ?? 20,
      branchPercent: input?.branchPercent ?? 10,
    };

    const total =
      rule.originatorPercent +
      rule.workingLawyerPercent +
      rule.supervisingPartnerPercent +
      rule.branchPercent;

    if (total !== 100) {
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
    const matter = await db.matter.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.matterId,
      },
      select: {
        id: true,
        title: true,
        matterCode: true,
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

    const billing = matter.metadata?.billing ?? {};
    const originatorId =
      billing.originatorId ??
      matter.metadata?.originatorId ??
      null;

    const commissionPlan = matter.metadata?.commissionPlan ?? {};
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

    return {
      matter,
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
      periodStart?: Date | null;
      periodEnd?: Date | null;
      includeWriteOffImpact?: boolean;
    },
  ) {
    const includeWriteOffImpact = params.includeWriteOffImpact ?? true;

    const context = await this.resolveMatterCommissionContext(db, {
      tenantId: params.tenantId,
      matterId: params.matterId,
    });

    const invoiceWhere: Record<string, unknown> = {
      tenantId: params.tenantId,
      matterId: params.matterId,
    };

    if (params.periodStart || params.periodEnd) {
      if (context.commissionBasis === 'BILLED') {
        invoiceWhere.issuedDate = {
          ...(params.periodStart ? { gte: params.periodStart } : {}),
          ...(params.periodEnd ? { lte: params.periodEnd } : {}),
        };
      } else {
        invoiceWhere.paidDate = {
          ...(params.periodStart ? { gte: params.periodStart } : {}),
          ...(params.periodEnd ? { lte: params.periodEnd } : {}),
        };
      }
    }

    const invoiceAgg = await db.invoice.aggregate({
      where: invoiceWhere,
      _sum: {
        total: true,
        paidAmount: true,
      },
      _count: {
        id: true,
      },
    });

    const totalBilled = toDecimal(invoiceAgg._sum.total);
    const totalCollected = toDecimal(invoiceAgg._sum.paidAmount);

    const writeOffs = Array.isArray(context.matter.metadata?.writeOffs)
      ? context.matter.metadata.writeOffs
      : [];

    const filteredWriteOffs = writeOffs.filter((item: any) => {
      const recordedAt = item.recordedAt ? new Date(item.recordedAt) : null;
      if (!recordedAt) return true;
      if (params.periodStart && recordedAt < params.periodStart) return false;
      if (params.periodEnd && recordedAt > params.periodEnd) return false;
      return true;
    });

    const totalWriteOff = filteredWriteOffs.reduce(
      (acc: Prisma.Decimal, item: any) => acc.plus(toDecimal(item.amount)),
      new Prisma.Decimal(0),
    );

    const baseGross =
      context.commissionBasis === 'BILLED'
        ? totalBilled
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

    const suspenseAmount = roundMoney(roundedCommissionPool.minus(totalReadyPayout));

    return {
      matter: {
        id: context.matter.id,
        title: context.matter.title,
        matterCode: context.matter.matterCode ?? null,
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
        totalBilled,
        totalCollected,
        totalWriteOff,
        adjustedBase,
        commissionPool: roundedCommissionPool,
        suspenseAmount: suspenseAmount.gt(0) ? suspenseAmount : new Prisma.Decimal(0),
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
      periodStart?: Date | null;
      periodEnd?: Date | null;
    },
  ) {
    const matters = await db.matter.findMany({
      where: {
        tenantId: params.tenantId,
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
          periodStart: params.periodStart ?? null,
          periodEnd: params.periodEnd ?? null,
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
}