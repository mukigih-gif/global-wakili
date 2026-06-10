// apps/api/src/modules/matter/CommissionService.ts

import { Prisma } from '@global-wakili/database';

type QueryArgs = Record<string, unknown>;

type MoneyInput = Prisma.Decimal | string | number;

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

type UserSummary = {
  id: string;
  name?: string | null;
  email?: string | null;
  tenantRole?: string | null;
  systemRole?: string | null;
  status?: string | null;
};

type ClientSummary = {
  id: string;
  name?: string | null;
  clientCode?: string | null;
  email?: string | null;
};

type MatterSummary = {
  id: string;
  title: string;
  category?: string | null;
  branchId?: string | null;
  clientId?: string | null;
  leadAdvocateId?: string | null;
  status?: string | null;
  deletedAt?: Date | string | null;
  createdAt?: Date | string | null;
  client?: ClientSummary | null;
  leadAdvocate?: UserSummary | null;
};

type MatterIdRecord = {
  id: string;
};

type MatterOriginatorRecord = {
  id: string;
  matterId: string;
  originatorId: string;
  commissionRate: Prisma.Decimal | string | number;
  isActive: boolean;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  originator?: UserSummary | null;
  matter?: MatterSummary | null;
};

type InvoiceAggregate = {
  _sum?: {
    subTotal?: MoneyInput | null;
    total?: MoneyInput | null;
    paidAmount?: MoneyInput | null;
  } | null;
  _count?: {
    id?: number | null;
  } | null;
};

type WriteOffAggregate = {
  _sum?: {
    amount?: MoneyInput | null;
  } | null;
};

type CommissionContext = {
  matter: {
    id: string;
    title: string;
    category: string;
    branchId: string | null;
    clientId: string | null;
    leadAdvocateId: string | null;
    status: string;
  };
  originator: {
    id: string;
    originatorId: string;
    commissionRate: Prisma.Decimal;
    isActive: boolean;
    user?: UserSummary | null;
  } | null;
  originatorId: string | null;
  leadAdvocateId: string | null;
  branchId: string | null;
  splitRule: CommissionSplitRule;
  commissionBasis: CommissionBasis;
  commissionRatePercent: Prisma.Decimal;
};

type MatterCommissionResult = {
  matter: {
    id: string;
    title: string;
    category: string;
    matterCode: null;
    caseNumber: null;
  };
  commissionContext: {
    originatorId: string | null;
    leadAdvocateId: string | null;
    branchId: string | null;
    basis: CommissionBasis;
    commissionRatePercent: Prisma.Decimal;
    splitRule: CommissionSplitRule;
  };
  financials: {
    invoiceCount: number;
    totalProfessionalFeesBilled: Prisma.Decimal;
    totalGrossBilled: Prisma.Decimal;
    totalCollected: Prisma.Decimal;
    totalWriteOff: Prisma.Decimal;
    adjustedBase: Prisma.Decimal;
    commissionPool: Prisma.Decimal;
    suspenseAmount: Prisma.Decimal;
  };
  payoutLines: CommissionPayoutLine[];
  generatedAt: Date;
};

type OriginatorPortfolioResult = {
  originatorId: string;
  matterCount: number;
  totalPayout: Prisma.Decimal;
  totalSuspense: Prisma.Decimal;
  matters: MatterCommissionResult[];
  generatedAt: Date;
};

type LawyerCommissionResult = {
  lawyerId: string;
  matterCount: number;
  totalPayout: Prisma.Decimal;
  matters: MatterCommissionResult[];
  generatedAt: Date;
};

type FindFirstDelegate<TRecord> = {
  findFirst(args: QueryArgs): Promise<TRecord | null>;
};

type FindManyDelegate<TRecord> = {
  findMany(args: QueryArgs): Promise<TRecord[]>;
};

type CreateDelegate<TRecord> = {
  create(args: QueryArgs): Promise<TRecord>;
};

type UpdateDelegate<TRecord> = {
  update(args: QueryArgs): Promise<TRecord>;
};

type AggregateDelegate<TAggregate> = {
  aggregate(args: QueryArgs): Promise<TAggregate>;
};

type MatterOriginatorDelegate =
  FindFirstDelegate<MatterOriginatorRecord> &
  FindManyDelegate<MatterOriginatorRecord> &
  CreateDelegate<MatterOriginatorRecord> &
  UpdateDelegate<MatterOriginatorRecord>;

type MatterDelegate =
  FindFirstDelegate<MatterSummary> &
  FindManyDelegate<MatterIdRecord>;

type CommissionDbClient = {
  user: FindFirstDelegate<UserSummary>;
  matter: MatterDelegate;
  matterOriginator: MatterOriginatorDelegate;
  invoice: AggregateDelegate<InvoiceAggregate>;
  writeOff?: AggregateDelegate<WriteOffAggregate>;
};

function serviceError(message: string, statusCode: number, code: string, details?: unknown): Error {
  return Object.assign(new Error(message), {
    statusCode,
    code,
    ...(details !== undefined ? { details } : {}),
  });
}

function requiredString(value: unknown, label: string, code: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw serviceError(`${label} is required`, 400, code);
  }

  return value.trim();
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.toLowerCase() === 'undefined') {
    return null;
  }

  if (trimmed.toLowerCase() === 'null') {
    return null;
  }

  return trimmed;
}

function assertTenant(tenantId: unknown): string {
  return requiredString(tenantId, 'tenantId', 'TENANT_REQUIRED');
}

function assertUser(userId: unknown): string {
  return requiredString(userId, 'userId', 'USER_REQUIRED');
}

function toDecimal(value: MoneyInput | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return new Prisma.Decimal(0);
  }

  const decimal = new Prisma.Decimal(value);

  if (!decimal.isFinite()) {
    throw serviceError('Invalid decimal value', 422, 'INVALID_DECIMAL_VALUE');
  }

  return decimal;
}

function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function nonNegative(value: Prisma.Decimal): Prisma.Decimal {
  return value.lt(0) ? new Prisma.Decimal(0) : value;
}

function normalizePercent(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw serviceError(
      'Commission percent must be between 0 and 100',
      422,
      'INVALID_COMMISSION_PERCENT',
      { value },
    );
  }

  return parsed;
}

function toDate(value: Date | string | null | undefined, label = 'commission date'): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw serviceError(`Invalid ${label}`, 422, 'INVALID_COMMISSION_DATE');
  }

  return parsed;
}

function assertPeriod(periodStart: Date | null, periodEnd: Date | null): void {
  if (periodStart && periodEnd && periodStart > periodEnd) {
    throw serviceError(
      'Commission periodStart cannot be after periodEnd',
      422,
      'INVALID_COMMISSION_PERIOD',
    );
  }
}

function normalizeSplitRule(input?: Partial<CommissionSplitRule> | null): CommissionSplitRule {
  const rule: CommissionSplitRule = {
    originatorPercent: normalizePercent(input?.originatorPercent, 30),
    workingLawyerPercent: normalizePercent(input?.workingLawyerPercent, 70),
    supervisingPartnerPercent: normalizePercent(input?.supervisingPartnerPercent, 0),
    branchPercent: normalizePercent(input?.branchPercent, 0),
  };

  const total = new Prisma.Decimal(rule.originatorPercent)
    .plus(rule.workingLawyerPercent)
    .plus(rule.supervisingPartnerPercent)
    .plus(rule.branchPercent);

  if (!total.eq(100)) {
    throw serviceError(
      'Commission split rule must total 100%',
      422,
      'INVALID_COMMISSION_SPLIT',
      rule,
    );
  }

  return rule;
}

function splitFromOriginatorRate(originatorRate?: Prisma.Decimal | null): CommissionSplitRule {
  const originatorPercent =
    originatorRate && originatorRate.gte(0) && originatorRate.lte(100)
      ? Number(originatorRate.toString())
      : 30;

  return normalizeSplitRule({
    originatorPercent,
    workingLawyerPercent: 100 - originatorPercent,
    supervisingPartnerPercent: 0,
    branchPercent: 0,
  });
}

function compactMatter(matter: MatterSummary) {
  return {
    id: matter.id,
    title: matter.title,
    category: matter.category ?? 'GENERAL',
    clientId: matter.clientId ?? null,
    branchId: matter.branchId ?? null,
    leadAdvocateId: matter.leadAdvocateId ?? null,
    status: matter.status ?? null,
    client: matter.client ?? null,
    leadAdvocate: matter.leadAdvocate ?? null,
  };
}

function compactOriginator(originator: MatterOriginatorRecord | null) {
  if (!originator) {
    return null;
  }

  return {
    id: originator.id,
    matterId: originator.matterId,
    originatorId: originator.originatorId,
    commissionRate: toDecimal(originator.commissionRate),
    isActive: originator.isActive === true,
    originator: originator.originator ?? null,
    matter: originator.matter ?? null,
    createdAt: originator.createdAt ?? null,
    updatedAt: originator.updatedAt ?? null,
  };
}

async function assertTenantUser(
  db: CommissionDbClient,
  params: {
    tenantId: string;
    userId?: string | null;
    label?: string;
  },
): Promise<UserSummary | null> {
  const userId = toNullableString(params.userId);

  if (!userId) {
    return null;
  }

  const user = await db.user.findFirst({
    where: {
      tenantId: params.tenantId,
      id: userId,
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      tenantRole: true,
      systemRole: true,
      status: true,
    },
  });

  if (!user) {
    throw serviceError(
      `${params.label ?? 'User'} not found or inactive`,
      404,
      'COMMISSION_USER_NOT_FOUND',
    );
  }

  return user;
}

async function assertTenantMatter(
  db: CommissionDbClient,
  params: {
    tenantId: string;
    matterId: string;
  },
): Promise<MatterSummary> {
  const matter = await db.matter.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.matterId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      category: true,
      branchId: true,
      clientId: true,
      leadAdvocateId: true,
      status: true,
      deletedAt: true,
      client: {
        select: {
          id: true,
          name: true,
          clientCode: true,
          email: true,
        },
      },
      leadAdvocate: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!matter) {
    throw serviceError('Matter not found', 404, 'MISSING_MATTER');
  }

  return matter;
}

async function getMatterOriginator(
  db: CommissionDbClient,
  params: {
    matterId: string;
  },
): Promise<MatterOriginatorRecord | null> {
  return db.matterOriginator.findFirst({
    where: {
      matterId: params.matterId,
      isActive: true,
    },
    select: {
      id: true,
      matterId: true,
      originatorId: true,
      commissionRate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      originator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

async function aggregateInvoices(
  db: CommissionDbClient,
  params: {
    tenantId: string;
    matterId: string;
    commissionBasis: CommissionBasis;
    periodStart: Date | null;
    periodEnd: Date | null;
  },
): Promise<InvoiceAggregate> {
  const invoiceWhere: Record<string, unknown> = {
    tenantId: params.tenantId,
    matterId: params.matterId,
    status: {
      not: 'CANCELLED',
    },
  };

  if (params.periodStart || params.periodEnd) {
    if (params.commissionBasis === 'BILLED') {
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

  return db.invoice.aggregate({
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
}

async function aggregateWriteOffs(
  db: CommissionDbClient,
  params: {
    tenantId: string;
    matterId: string;
    periodStart: Date | null;
    periodEnd: Date | null;
  },
): Promise<Prisma.Decimal> {
  if (!db.writeOff?.aggregate) {
    return new Prisma.Decimal(0);
  }

  const where: Record<string, unknown> = {
    tenantId: params.tenantId,
    matterId: params.matterId,
    status: {
      notIn: ['REJECTED', 'REVERSED'],
    },
  };

  if (params.periodStart || params.periodEnd) {
    where.createdAt = {
      ...(params.periodStart ? { gte: params.periodStart } : {}),
      ...(params.periodEnd ? { lte: params.periodEnd } : {}),
    };
  }

  const aggregate = await db.writeOff.aggregate({
    where,
    _sum: {
      amount: true,
    },
  });

  return toDecimal(aggregate._sum?.amount);
}

function buildPayoutLine(params: {
  role: CommissionRole;
  percentValue: number;
  userId?: string | null;
  branchId?: string | null;
  baseAmount: Prisma.Decimal;
  commissionPool: Prisma.Decimal;
  missingNote?: string;
}): CommissionPayoutLine {
  const percent = new Prisma.Decimal(params.percentValue);
  const rawPayout = params.commissionPool.mul(percent).div(100);
  const payoutAmount = roundMoney(rawPayout);
  const hasRecipient =
    params.role === 'BRANCH' ? Boolean(params.branchId) : Boolean(params.userId);

  return {
    role: params.role,
    userId: params.userId ?? null,
    branchId: params.branchId ?? null,
    percent,
    baseAmount: params.baseAmount,
    payoutAmount: hasRecipient ? payoutAmount : new Prisma.Decimal(0),
    notes: hasRecipient ? null : params.missingNote ?? 'Missing payout recipient',
    status: hasRecipient ? 'READY' : 'SUSPENSE',
  };
}

function invoiceCount(aggregate: InvoiceAggregate): number {
  return aggregate._count?.id ?? 0;
}

function matterSelectForId() {
  return {
    id: true,
  };
}

function totalLinePayoutForUser(
  result: MatterCommissionResult,
  userId: string,
): Prisma.Decimal {
  return result.payoutLines
    .filter((line) => line.userId === userId)
    .reduce(
      (lineAcc, line) => lineAcc.plus(line.payoutAmount),
      new Prisma.Decimal(0),
    );
}

function normalizeRoleFilter(value: unknown): CommissionRole | null {
  const normalized = toNullableString(value)?.toUpperCase();

  if (
    normalized === 'ORIGINATOR' ||
    normalized === 'WORKING_LAWYER' ||
    normalized === 'SUPERVISING_PARTNER' ||
    normalized === 'BRANCH'
  ) {
    return normalized;
  }

  return null;
}

function normalizePayoutStatusFilter(value: unknown): PayoutStatus | null {
  const normalized = toNullableString(value)?.toUpperCase();

  if (normalized === 'READY' || normalized === 'SUSPENSE') {
    return normalized;
  }

  return null;
}

export class CommissionService {
  static normalizeSplitRule(input?: Partial<CommissionSplitRule> | null): CommissionSplitRule {
    return normalizeSplitRule(input);
  }

  static async resolveMatterCommissionContext(
    db: CommissionDbClient,
    params: {
      tenantId: string;
      matterId: string;
      commissionBasis?: CommissionBasis | string | null;
      commissionRatePercent?: MoneyInput | null;
      splitRule?: Partial<CommissionSplitRule> | null;
    },
  ): Promise<CommissionContext> {
    const tenantId = requiredString(params.tenantId, 'tenantId', 'TENANT_REQUIRED');
    const matterId = requiredString(params.matterId, 'matterId', 'MATTER_REQUIRED');

    const [matter, originator] = await Promise.all([
      assertTenantMatter(db, { tenantId, matterId }),
      getMatterOriginator(db, { matterId }),
    ]);

    const commissionBasis: CommissionBasis =
      String(params.commissionBasis ?? 'COLLECTED').toUpperCase() === 'BILLED'
        ? 'BILLED'
        : 'COLLECTED';

    const commissionRatePercent = toDecimal(params.commissionRatePercent ?? 100);

    if (commissionRatePercent.lt(0) || commissionRatePercent.gt(100)) {
      throw serviceError(
        'Commission rate percent must be between 0 and 100',
        422,
        'INVALID_COMMISSION_RATE',
      );
    }

    const normalizedOriginator = compactOriginator(originator);

    const splitRule = params.splitRule
      ? normalizeSplitRule(params.splitRule)
      : splitFromOriginatorRate(normalizedOriginator?.commissionRate ?? null);

    const compactedMatter = compactMatter(matter);

    return {
      matter: {
        id: compactedMatter.id,
        title: compactedMatter.title,
        category: compactedMatter.category,
        branchId: compactedMatter.branchId,
        clientId: compactedMatter.clientId,
        leadAdvocateId: compactedMatter.leadAdvocateId,
        status: String(compactedMatter.status ?? 'UNKNOWN'),
      },
      originator: normalizedOriginator
        ? {
            id: normalizedOriginator.id,
            originatorId: normalizedOriginator.originatorId,
            commissionRate: normalizedOriginator.commissionRate,
            isActive: normalizedOriginator.isActive,
            user: normalizedOriginator.originator ?? null,
          }
        : null,
      originatorId: normalizedOriginator?.originatorId ?? null,
      leadAdvocateId: compactedMatter.leadAdvocateId ?? null,
      branchId: compactedMatter.branchId ?? null,
      splitRule,
      commissionBasis,
      commissionRatePercent,
    };
  }

  static async setMatterOriginator(
    db: CommissionDbClient,
    params: {
      tenantId: string;
      matterId: string;
      originatorId: string;
      commissionRate?: MoneyInput | null;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'tenantId', 'TENANT_REQUIRED');
    const matterId = requiredString(params.matterId, 'matterId', 'MATTER_REQUIRED');
    const originatorId = requiredString(params.originatorId, 'originatorId', 'USER_REQUIRED');

    await Promise.all([
      assertTenantMatter(db, { tenantId, matterId }),
      assertTenantUser(db, {
        tenantId,
        userId: originatorId,
        label: 'Commission originator',
      }),
    ]);

    const commissionRate = toDecimal(params.commissionRate ?? 30);

    if (commissionRate.lt(0) || commissionRate.gt(100)) {
      throw serviceError(
        'Matter originator commission rate must be between 0 and 100',
        422,
        'INVALID_ORIGINATOR_COMMISSION_RATE',
      );
    }

    const existing = await db.matterOriginator.findFirst({
      where: {
        matterId,
      },
      select: {
        id: true,
        matterId: true,
        originatorId: true,
        commissionRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        originator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const saved = existing
      ? await db.matterOriginator.update({
          where: {
            id: existing.id,
          },
          data: {
            originatorId,
            commissionRate,
            isActive: true,
          },
          select: {
            id: true,
            matterId: true,
            originatorId: true,
            commissionRate: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            originator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })
      : await db.matterOriginator.create({
          data: {
            matterId,
            originatorId,
            commissionRate,
            isActive: true,
          },
          select: {
            id: true,
            matterId: true,
            originatorId: true,
            commissionRate: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            originator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

    return compactOriginator(saved);
  }

  static async deactivateMatterOriginator(
    db: CommissionDbClient,
    params: {
      tenantId: string;
      matterId: string;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'tenantId', 'TENANT_REQUIRED');
    const matterId = requiredString(params.matterId, 'matterId', 'MATTER_REQUIRED');

    await assertTenantMatter(db, { tenantId, matterId });

    const existing = await db.matterOriginator.findFirst({
      where: {
        matterId,
        isActive: true,
      },
      select: {
        id: true,
        matterId: true,
        originatorId: true,
        commissionRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        originator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!existing) {
      return null;
    }

    const updated = await db.matterOriginator.update({
      where: {
        id: existing.id,
      },
      data: {
        isActive: false,
      },
      select: {
        id: true,
        matterId: true,
        originatorId: true,
        commissionRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        originator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return compactOriginator(updated);
  }

  static async calculateMatterCommission(
    db: CommissionDbClient,
    params: {
      tenantId: string;
      matterId: string;
      commissionBasis?: CommissionBasis | string | null;
      commissionRatePercent?: MoneyInput | null;
      splitRule?: Partial<CommissionSplitRule> | null;
      periodStart?: Date | string | null;
      periodEnd?: Date | string | null;
      includeWriteOffImpact?: boolean;
    },
  ): Promise<MatterCommissionResult> {
    const periodStart = toDate(params.periodStart, 'periodStart');
    const periodEnd = toDate(params.periodEnd, 'periodEnd');
    assertPeriod(periodStart, periodEnd);

    const context = await this.resolveMatterCommissionContext(db, {
      tenantId: params.tenantId,
      matterId: params.matterId,
      commissionBasis: params.commissionBasis,
      commissionRatePercent: params.commissionRatePercent,
      splitRule: params.splitRule,
    });

    const includeWriteOffImpact = params.includeWriteOffImpact !== false;

    const [invoiceAgg, totalWriteOff] = await Promise.all([
      aggregateInvoices(db, {
        tenantId: params.tenantId,
        matterId: params.matterId,
        commissionBasis: context.commissionBasis,
        periodStart,
        periodEnd,
      }),
      includeWriteOffImpact
        ? aggregateWriteOffs(db, {
            tenantId: params.tenantId,
            matterId: params.matterId,
            periodStart,
            periodEnd,
          })
        : Promise.resolve(new Prisma.Decimal(0)),
    ]);

    const totalProfessionalFeesBilled = toDecimal(invoiceAgg._sum?.subTotal);
    const totalGrossBilled = toDecimal(invoiceAgg._sum?.total);
    const totalCollected = toDecimal(invoiceAgg._sum?.paidAmount);

    const baseGross =
      context.commissionBasis === 'BILLED'
        ? totalProfessionalFeesBilled
        : totalCollected;

    const adjustedBase =
      includeWriteOffImpact && context.commissionBasis === 'BILLED'
        ? nonNegative(baseGross.minus(totalWriteOff))
        : baseGross;

    const commissionPool = adjustedBase.mul(context.commissionRatePercent).div(100);
    const roundedCommissionPool = roundMoney(commissionPool);

    const split = context.splitRule;

    const payoutLines: CommissionPayoutLine[] = [
      buildPayoutLine({
        role: 'ORIGINATOR',
        percentValue: split.originatorPercent,
        userId: context.originatorId,
        baseAmount: adjustedBase,
        commissionPool,
        missingNote: 'No originator assigned',
      }),
      buildPayoutLine({
        role: 'WORKING_LAWYER',
        percentValue: split.workingLawyerPercent,
        userId: context.leadAdvocateId,
        baseAmount: adjustedBase,
        commissionPool,
        missingNote: 'No lead advocate set',
      }),
      buildPayoutLine({
        role: 'SUPERVISING_PARTNER',
        percentValue: split.supervisingPartnerPercent,
        userId: null,
        baseAmount: adjustedBase,
        commissionPool,
        missingNote: 'No supervising partner field exists on Matter schema',
      }),
      buildPayoutLine({
        role: 'BRANCH',
        percentValue: split.branchPercent,
        branchId: context.branchId,
        baseAmount: adjustedBase,
        commissionPool,
        missingNote: 'No branch assigned',
      }),
    ];

    const totalReadyPayout = payoutLines.reduce(
      (acc, line) => acc.plus(line.payoutAmount),
      new Prisma.Decimal(0),
    );

    const suspenseAmount = roundMoney(nonNegative(roundedCommissionPool.minus(totalReadyPayout)));

    return {
      matter: {
        id: context.matter.id,
        title: context.matter.title,
        category: context.matter.category,
        matterCode: null,
        caseNumber: null,
      },
      commissionContext: {
        originatorId: context.originatorId,
        leadAdvocateId: context.leadAdvocateId,
        branchId: context.branchId,
        basis: context.commissionBasis,
        commissionRatePercent: context.commissionRatePercent,
        splitRule: context.splitRule,
      },
      financials: {
        invoiceCount: invoiceCount(invoiceAgg),
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
    db: CommissionDbClient,
    params: {
      tenantId: string;
      originatorId: string;
      periodStart?: Date | string | null;
      periodEnd?: Date | string | null;
    },
  ): Promise<OriginatorPortfolioResult> {
    const tenantId = assertTenant(params.tenantId);
    const originatorId = assertUser(params.originatorId);

    const periodStart = toDate(params.periodStart);
    const periodEnd = toDate(params.periodEnd);
    assertPeriod(periodStart, periodEnd);

    const matters = await db.matter.findMany({
      where: {
        tenantId,
        deletedAt: null,
        originator: {
          is: {
            originatorId,
            isActive: true,
          },
        },
      },
      select: matterSelectForId(),
    });

    const results = await Promise.all(
      matters.map((matter) =>
        this.calculateMatterCommission(db, {
          tenantId,
          matterId: matter.id,
          periodStart,
          periodEnd,
          includeWriteOffImpact: true,
        }),
      ),
    );

    const totalPayout = results.reduce((acc, item) => {
      const originatorLine = item.payoutLines.find(
        (line) => line.role === 'ORIGINATOR',
      );

      return acc.plus(originatorLine?.payoutAmount ?? new Prisma.Decimal(0));
    }, new Prisma.Decimal(0));

    const totalSuspense = results.reduce(
      (acc, item) => acc.plus(item.financials.suspenseAmount),
      new Prisma.Decimal(0),
    );

    return {
      originatorId,
      matterCount: results.length,
      totalPayout: roundMoney(totalPayout),
      totalSuspense: roundMoney(totalSuspense),
      matters: results,
      generatedAt: new Date(),
    };
  }

  static async getMatterCommissionSummary(
    db: CommissionDbClient,
    input: CommissionSummaryInput,
  ) {
    if (!input.matterId) {
      throw serviceError(
        'matterId is required for matter commission summary',
        400,
        'MATTER_REQUIRED',
      );
    }

    return this.calculateMatterCommission(db, {
      tenantId: input.tenantId,
      matterId: input.matterId,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      includeWriteOffImpact: input.includeWriteOffImpact ?? true,
    });
  }

  static async getLawyerCommissionSummary(
    db: CommissionDbClient,
    input: CommissionSummaryInput,
  ): Promise<LawyerCommissionResult> {
    const tenantId = assertTenant(input.tenantId);

    if (!input.lawyerId) {
      throw serviceError(
        'lawyerId is required for lawyer commission summary',
        400,
        'LAWYER_REQUIRED',
      );
    }

    const lawyerId = input.lawyerId;

    const matters = await db.matter.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { leadAdvocateId: lawyerId },
          {
            originator: {
              is: {
                originatorId: lawyerId,
                isActive: true,
              },
            },
          },
        ],
      },
      select: matterSelectForId(),
      take: 500,
    });

    const results = await Promise.all(
      matters.map((matter) =>
        this.calculateMatterCommission(db, {
          tenantId,
          matterId: matter.id,
          periodStart: input.periodStart ?? null,
          periodEnd: input.periodEnd ?? null,
          includeWriteOffImpact: input.includeWriteOffImpact ?? true,
        }),
      ),
    );

    const totalPayout = results.reduce(
      (acc, item) => acc.plus(totalLinePayoutForUser(item, lawyerId)),
      new Prisma.Decimal(0),
    );

    return {
      lawyerId,
      matterCount: results.length,
      totalPayout: roundMoney(totalPayout),
      matters: results,
      generatedAt: new Date(),
    };
  }

  static async getCommissionDashboard(db: CommissionDbClient, input: CommissionSummaryInput) {
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

  static async listMatterOriginators(
    db: CommissionDbClient,
    params: {
      tenantId: string;
      matterId?: string | null;
      originatorId?: string | null;
      activeOnly?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const tenantId = assertTenant(params.tenantId);
    const matterId = toNullableString(params.matterId);
    const originatorId = toNullableString(params.originatorId);
    const page = Math.max(Number(params.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), 100);
    const skip = (page - 1) * limit;

    if (matterId) {
      await assertTenantMatter(db, { tenantId, matterId });
    }

    if (originatorId) {
      await assertTenantUser(db, {
        tenantId,
        userId: originatorId,
        label: 'Commission originator',
      });
    }

    const rows = await db.matterOriginator.findMany({
      where: {
        ...(matterId ? { matterId } : {}),
        ...(originatorId ? { originatorId } : {}),
        ...(params.activeOnly === false ? {} : { isActive: true }),
        matter: {
          is: {
            tenantId,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        matterId: true,
        originatorId: true,
        commissionRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        originator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        matter: {
          select: {
            id: true,
            title: true,
            category: true,
            branchId: true,
            clientId: true,
            leadAdvocateId: true,
            status: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit,
    });

    return {
      data: rows.map(compactOriginator),
      meta: {
        page,
        limit,
        count: rows.length,
        hasNextPage: rows.length === limit,
        hasPreviousPage: page > 1,
      },
    };
  }

  static async listCommissionPayouts(
    db: CommissionDbClient,
    input: CommissionSummaryInput & {
      role?: CommissionRole | string | null;
      status?: PayoutStatus | string | null;
      userId?: string | null;
      limit?: number;
    },
  ) {
    const roleFilter = normalizeRoleFilter(input.role);
    const statusFilter = normalizePayoutStatusFilter(input.status);
    const userIdFilter = toNullableString(input.userId);
    const limit = Math.min(Math.max(Number(input.limit ?? 100), 1), 500);

    const matterResults = await this.listMatterCommissions(db, {
      ...input,
      lawyerId: input.lawyerId ?? userIdFilter ?? null,
    });

    const payoutLines = matterResults.flatMap((matterResult) =>
      matterResult.payoutLines
        .filter((line) => {
          const roleMatches = roleFilter ? line.role === roleFilter : true;
          const statusMatches = statusFilter ? line.status === statusFilter : true;
          const userMatches = userIdFilter ? line.userId === userIdFilter : true;

          return roleMatches && statusMatches && userMatches;
        })
        .map((line) => ({
          matterId: matterResult.matter.id,
          matterTitle: matterResult.matter.title,
          matterCategory: matterResult.matter.category,
          role: line.role,
          userId: line.userId ?? null,
          branchId: line.branchId ?? null,
          percent: line.percent,
          baseAmount: line.baseAmount,
          payoutAmount: line.payoutAmount,
          notes: line.notes ?? null,
          status: line.status,
          generatedAt: matterResult.generatedAt,
        })),
    );

    const totalPayout = payoutLines.reduce(
      (acc, line) => acc.plus(line.payoutAmount),
      new Prisma.Decimal(0),
    );

    const totalSuspense = payoutLines
      .filter((line) => line.status === 'SUSPENSE')
      .reduce(
        (acc, line) => acc.plus(line.payoutAmount),
        new Prisma.Decimal(0),
      );

    const limitedPayoutLines = payoutLines.slice(0, limit);

    return {
      data: limitedPayoutLines,
      summary: {
        count: limitedPayoutLines.length,
        totalAvailable: payoutLines.length,
        totalPayout: roundMoney(totalPayout),
        totalSuspense: roundMoney(totalSuspense),
      },
      generatedAt: new Date(),
    };
  }

  static async getCommissionOverview(db: CommissionDbClient, input: CommissionSummaryInput) {
    return this.getCommissionDashboard(db, input);
  }

  static async listMatterCommissions(db: CommissionDbClient, input: CommissionSummaryInput) {
    if (input.matterId) {
      return [await this.getMatterCommissionSummary(db, input)];
    }

    const tenantId = assertTenant(input.tenantId);

    const matters = await db.matter.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: matterSelectForId(),
      take: 100,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Promise.all(
      matters.map((matter) =>
        this.calculateMatterCommission(db, {
          tenantId,
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

