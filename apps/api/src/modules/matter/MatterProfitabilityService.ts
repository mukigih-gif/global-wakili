// apps/api/src/modules/matter/MatterProfitabilityService.ts

type SnapshotType = 'AD_HOC' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'MATTER_CLOSING';

type ProfitabilityPeriod = {
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
};

type MatterProfitabilityParams = ProfitabilityPeriod & {
  tenantId: string;
  matterId: string;
  createdById?: string | null;
  persistSnapshot?: boolean;
  snapshotType?: SnapshotType;
};

type QueryArgs = Record<string, unknown>;
type MoneyInput = unknown;

type MoneyString = string;
type PercentageString = string;

type AggregateCount = {
  id?: number | null;
};

type AggregateSum = Record<string, unknown>;

type AggregateResult = {
  _sum?: AggregateSum | null;
  _count?: AggregateCount | number | null;
};

type ClientRecord = {
  id: string;
  name?: string | null;
  clientCode?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  kycStatus?: string | null;
  riskBand?: string | null;
};

type UserRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type MatterOriginatorRecord = {
  originatorId?: string | null;
  commissionRate?: MoneyInput;
  isActive?: boolean | null;
  originator?: UserRecord | null;
};

type MatterProfitabilityMatterRecord = {
  id: string;
  tenantId?: string | null;
  title: string;
  category?: string | null;
  status?: string | null;
  riskLevel?: string | null;
  clientId?: string | null;
  branchId?: string | null;
  leadAdvocateId?: string | null;
  trustBalance?: MoneyInput;
  wipValue?: MoneyInput;
  openedDate?: Date | string | null;
  closedDate?: Date | string | null;
  archivedDate?: Date | string | null;
  deletedAt?: Date | string | null;
  client?: ClientRecord | null;
  leadAdvocate?: UserRecord | null;
  originator?: MatterOriginatorRecord | null;
};

type InvoiceRecord = {
  id: string;
  invoiceNumber?: string | null;
  status?: string | null;
  total?: MoneyInput;
  paidAmount?: MoneyInput;
  balanceDue?: MoneyInput;
  issuedDate?: Date | string | null;
  dueDate?: Date | string | null;
  createdAt?: Date | string | null;
};

type WriteOffRecord = {
  id: string;
  amount?: MoneyInput;
  currency?: string | null;
  status?: string | null;
  reason?: string | null;
  requestedAt?: Date | string | null;
  approvedAt?: Date | string | null;
  postedAt?: Date | string | null;
};

type ProfitabilityMetrics = {
  billedAmount: MoneyString;
  collectedAmount: MoneyString;
  outstandingAmount: MoneyString;
  writeOffAmount: MoneyString;
  disbursementAmount: MoneyString;
  costAmount: MoneyString;
  approvedTimeValue: MoneyString;
  approvedHours: number;
  netRevenue: MoneyString;
  grossProfit: MoneyString;
  netProfit: MoneyString;
  realizationRate: PercentageString;
  collectionRate: PercentageString;
  profitMargin: PercentageString;
  wipValue: MoneyString;
  trustBalance: MoneyString;
};

type MatterProfitabilityResult = {
  matter: ReturnType<typeof compactMatter>;
  period: {
    periodStart: Date | null;
    periodEnd: Date | null;
  };
  metrics: ProfitabilityMetrics;
  counts: {
    invoiceCount: number;
    timeEntryCount: number;
    expenseCount: number;
    writeOffCount: number;
    disbursementCount: number;
  };
  ratings: {
    collectionEfficiency: string;
    marginHealth: string;
  };
  riskNotes: string[];
  activity: {
    recentInvoices: InvoiceRecord[];
    recentWriteOffs: WriteOffRecord[];
  };
  generatedAt: Date;
};

type ProfitabilityResultWithSnapshot = MatterProfitabilityResult & {
  snapshot: unknown | null;
};

type FindFirstDelegate<TRecord> = {
  findFirst(args: QueryArgs): Promise<TRecord | null>;
};

type FindManyDelegate<TRecord> = {
  findMany(args: QueryArgs): Promise<TRecord[]>;
};

type CountDelegate = {
  count(args: QueryArgs): Promise<number>;
};

type AggregateDelegate = {
  aggregate(args: QueryArgs): Promise<AggregateResult>;
};

type CreateDelegate<TRecord = unknown> = {
  create(args: QueryArgs): Promise<TRecord>;
};

type SnapshotDelegate = FindFirstDelegate<unknown> &
  FindManyDelegate<unknown> &
  CountDelegate &
  CreateDelegate<unknown>;

type MatterProfitabilityDbClient = {
  matter: FindFirstDelegate<MatterProfitabilityMatterRecord>;
  invoice?: AggregateDelegate & CountDelegate & FindManyDelegate<InvoiceRecord>;
  expenseEntry?: AggregateDelegate & CountDelegate;
  timeEntry?: AggregateDelegate & CountDelegate;
  writeOff?: AggregateDelegate & CountDelegate & FindManyDelegate<WriteOffRecord>;
  disbursement?: AggregateDelegate & CountDelegate;
  matterProfitabilitySnapshot?: SnapshotDelegate;
};

function requiredString(value: unknown, label: string, code: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error(`${label} is required`), {
      statusCode: 422,
      code,
    });
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

function normalizeDate(value: Date | string | null | undefined, label: string): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error(`Invalid profitability ${label}`), {
      statusCode: 422,
      code: `INVALID_PROFITABILITY_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    });
  }

  return parsed;
}

function assertValidPeriod(periodStart: Date | null, periodEnd: Date | null): void {
  if (periodStart && periodEnd && periodStart > periodEnd) {
    throw Object.assign(new Error('Profitability periodStart cannot be after periodEnd'), {
      statusCode: 422,
      code: 'INVALID_PROFITABILITY_PERIOD',
    });
  }
}

function isStringConvertible(value: unknown): value is { toString(): string } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { toString?: unknown };

  return typeof candidate.toString === 'function';
}

function toNumber(value: MoneyInput): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (isStringConvertible(value)) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function money(value: MoneyInput): MoneyString {
  return round2(toNumber(value)).toFixed(2);
}

function percent(numerator: MoneyInput, denominator: MoneyInput): PercentageString {
  const top = toNumber(numerator);
  const bottom = toNumber(denominator);

  if (bottom <= 0) {
    return '0.0000';
  }

  return round4((top / bottom) * 100).toFixed(4);
}

function normalizeSnapshotType(value?: string | null): SnapshotType {
  const normalized = toNullableString(value)?.toUpperCase();

  if (
    normalized === 'AD_HOC' ||
    normalized === 'MONTHLY' ||
    normalized === 'QUARTERLY' ||
    normalized === 'ANNUAL' ||
    normalized === 'MATTER_CLOSING'
  ) {
    return normalized;
  }

  return 'AD_HOC';
}

function periodWhere(
  fieldName: string,
  periodStart: Date | null,
  periodEnd: Date | null,
): Record<string, unknown> {
  if (!periodStart && !periodEnd) {
    return {};
  }

  return {
    [fieldName]: {
      ...(periodStart ? { gte: periodStart } : {}),
      ...(periodEnd ? { lte: periodEnd } : {}),
    },
  };
}

function matterSelect() {
  return {
    id: true,
    tenantId: true,
    title: true,
    category: true,
    status: true,
    riskLevel: true,
    clientId: true,
    branchId: true,
    leadAdvocateId: true,
    trustBalance: true,
    wipValue: true,
    openedDate: true,
    closedDate: true,
    archivedDate: true,
    deletedAt: true,
    client: {
      select: {
        id: true,
        name: true,
        clientCode: true,
        email: true,
        phoneNumber: true,
        kycStatus: true,
        riskBand: true,
      },
    },
    leadAdvocate: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    originator: {
      select: {
        originatorId: true,
        commissionRate: true,
        isActive: true,
        originator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    },
  };
}

async function safeAggregate(
  delegate: AggregateDelegate | null | undefined,
  args: QueryArgs,
  fallback: AggregateResult,
): Promise<AggregateResult> {
  if (!delegate?.aggregate) {
    return fallback;
  }

  try {
    return await delegate.aggregate(args);
  } catch {
    return fallback;
  }
}

async function safeCount(
  delegate: CountDelegate | null | undefined,
  args: QueryArgs,
): Promise<number> {
  if (!delegate?.count) {
    return 0;
  }

  try {
    return await delegate.count(args);
  } catch {
    return 0;
  }
}

async function safeFindMany<TRecord>(
  delegate: FindManyDelegate<TRecord> | null | undefined,
  args: QueryArgs,
): Promise<TRecord[]> {
  if (!delegate?.findMany) {
    return [];
  }

  try {
    return await delegate.findMany(args);
  } catch {
    return [];
  }
}

async function safeFindFirst<TRecord>(
  delegate: FindFirstDelegate<TRecord> | null | undefined,
  args: QueryArgs,
): Promise<TRecord | null> {
  if (!delegate?.findFirst) {
    return null;
  }

  try {
    return await delegate.findFirst(args);
  } catch {
    return null;
  }
}

async function safeCreate<TRecord>(
  delegate: CreateDelegate<TRecord> | null | undefined,
  args: QueryArgs,
): Promise<TRecord | null> {
  if (!delegate?.create) {
    return null;
  }

  try {
    return await delegate.create(args);
  } catch {
    return null;
  }
}

function buildInvoiceWhere(params: {
  tenantId: string;
  matterId: string;
  periodStart: Date | null;
  periodEnd: Date | null;
}) {
  return {
    tenantId: params.tenantId,
    matterId: params.matterId,
    ...periodWhere('issuedDate', params.periodStart, params.periodEnd),
  };
}

function buildTimeWhere(params: {
  tenantId: string;
  matterId: string;
  periodStart: Date | null;
  periodEnd: Date | null;
}) {
  return {
    tenantId: params.tenantId,
    matterId: params.matterId,
    status: 'APPROVED',
    ...periodWhere('entryDate', params.periodStart, params.periodEnd),
  };
}

function buildExpenseWhere(params: {
  tenantId: string;
  matterId: string;
  periodStart: Date | null;
  periodEnd: Date | null;
}) {
  return {
    tenantId: params.tenantId,
    matterId: params.matterId,
    ...periodWhere('expenseDate', params.periodStart, params.periodEnd),
  };
}

function buildWriteOffWhere(params: {
  tenantId: string;
  matterId: string;
  periodStart: Date | null;
  periodEnd: Date | null;
}) {
  return {
    tenantId: params.tenantId,
    matterId: params.matterId,
    status: {
      in: ['APPROVED', 'POSTED'],
    },
    ...periodWhere('postedAt', params.periodStart, params.periodEnd),
  };
}

function buildDisbursementWhere(params: {
  tenantId: string;
  matterId: string;
  periodStart: Date | null;
  periodEnd: Date | null;
}) {
  return {
    tenantId: params.tenantId,
    matterId: params.matterId,
    ...periodWhere('createdAt', params.periodStart, params.periodEnd),
  };
}

function collectionEfficiencyRating(collectionRate: string): string {
  const rate = Number(collectionRate);

  if (rate >= 95) {
    return 'EXCELLENT';
  }

  if (rate >= 80) {
    return 'GOOD';
  }

  if (rate >= 60) {
    return 'WATCH';
  }

  return 'POOR';
}

function marginRating(profitMargin: string): string {
  const margin = Number(profitMargin);

  if (margin >= 40) {
    return 'STRONG';
  }

  if (margin >= 20) {
    return 'HEALTHY';
  }

  if (margin >= 0) {
    return 'LOW';
  }

  return 'LOSS_MAKING';
}

function riskNotes(params: {
  collectionRate: string;
  profitMargin: string;
  netProfit: string;
  wipValue: string;
  trustBalance: string;
}): string[] {
  const notes: string[] = [];

  if (Number(params.collectionRate) < 60) {
    notes.push('Collection rate is below 60%; review debtor follow-up and billing discipline.');
  }

  if (Number(params.profitMargin) < 0) {
    notes.push('Matter is loss-making on the current calculation basis.');
  }

  if (Number(params.wipValue) > 0) {
    notes.push('Matter has unbilled WIP; review billing conversion.');
  }

  if (Number(params.trustBalance) > 0) {
    notes.push('Matter has trust/client funds balance; ensure trust ledger reconciliation before closure.');
  }

  if (Number(params.netProfit) < 0) {
    notes.push('Net profit is negative after costs, disbursements, and write-offs.');
  }

  return notes;
}

function aggregateSumValue(aggregate: AggregateResult, field: string): unknown {
  return aggregate._sum?.[field] ?? 0;
}

function compactMatter(matter: MatterProfitabilityMatterRecord) {
  return {
    id: matter.id,
    matterReference: matter.id,
    matterCode: matter.id,
    caseNumber: null,

    title: matter.title,
    category: matter.category ?? 'GENERAL',
    matterType: matter.category ?? 'GENERAL',
    status: matter.status,
    riskLevel: matter.riskLevel,

    clientId: matter.clientId,
    client: matter.client ?? null,

    branchId: matter.branchId,
    leadAdvocateId: matter.leadAdvocateId,
    leadAdvocate: matter.leadAdvocate ?? null,

    originatorId: matter.originator?.originatorId ?? null,
    originator: matter.originator?.originator ?? null,
    originatorCommissionRate: matter.originator?.commissionRate ?? null,

    openedDate: matter.openedDate,
    closedDate: matter.closedDate,
    archivedDate: matter.archivedDate,

    trustBalance: money(matter.trustBalance),
    wipValue: money(matter.wipValue),
  };
}

function buildProfitabilityResult(params: {
  matter: MatterProfitabilityMatterRecord;
  periodStart: Date | null;
  periodEnd: Date | null;
  invoiceAgg: AggregateResult;
  expenseAgg: AggregateResult;
  timeAgg: AggregateResult;
  writeOffAgg: AggregateResult;
  disbursementAgg: AggregateResult;
  invoiceCount: number;
  timeEntryCount: number;
  expenseCount: number;
  writeOffCount: number;
  disbursementCount: number;
  recentInvoices: InvoiceRecord[];
  recentWriteOffs: WriteOffRecord[];
}): MatterProfitabilityResult {
  const billedAmount = toNumber(aggregateSumValue(params.invoiceAgg, 'total'));
  const collectedAmount = toNumber(aggregateSumValue(params.invoiceAgg, 'paidAmount'));
  const rawBalanceDue = params.invoiceAgg._sum?.balanceDue;
  const balanceDueAmount =
    rawBalanceDue !== undefined && rawBalanceDue !== null
      ? toNumber(rawBalanceDue)
      : Math.max(0, billedAmount - collectedAmount);

  const approvedTimeValue = toNumber(aggregateSumValue(params.timeAgg, 'billableAmount'));
  const approvedHours = toNumber(aggregateSumValue(params.timeAgg, 'durationHours'));

  const costAmount = toNumber(aggregateSumValue(params.expenseAgg, 'amount'));
  const writeOffAmount = toNumber(aggregateSumValue(params.writeOffAgg, 'amount'));
  const disbursementAmount = toNumber(aggregateSumValue(params.disbursementAgg, 'amount'));

  const netRevenue = Math.max(0, collectedAmount - writeOffAmount);
  const grossProfit = netRevenue - disbursementAmount;
  const netProfit = grossProfit - costAmount;

  const realizationDenominator =
    approvedTimeValue > 0 ? approvedTimeValue : billedAmount + writeOffAmount;
  const realizationRate = percent(billedAmount, realizationDenominator);
  const collectionRate = percent(collectedAmount, billedAmount);
  const profitMargin = percent(netProfit, netRevenue);

  const trustBalance = money(params.matter.trustBalance);
  const wipValue = money(params.matter.wipValue);

  return {
    matter: compactMatter(params.matter),
    period: {
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
    },
    metrics: {
      billedAmount: money(billedAmount),
      collectedAmount: money(collectedAmount),
      outstandingAmount: money(balanceDueAmount),
      writeOffAmount: money(writeOffAmount),
      disbursementAmount: money(disbursementAmount),
      costAmount: money(costAmount),

      approvedTimeValue: money(approvedTimeValue),
      approvedHours: round2(approvedHours),

      netRevenue: money(netRevenue),
      grossProfit: money(grossProfit),
      netProfit: money(netProfit),

      realizationRate,
      collectionRate,
      profitMargin,

      wipValue,
      trustBalance,
    },
    counts: {
      invoiceCount: params.invoiceCount,
      timeEntryCount: params.timeEntryCount,
      expenseCount: params.expenseCount,
      writeOffCount: params.writeOffCount,
      disbursementCount: params.disbursementCount,
    },
    ratings: {
      collectionEfficiency: collectionEfficiencyRating(collectionRate),
      marginHealth: marginRating(profitMargin),
    },
    riskNotes: riskNotes({
      collectionRate,
      profitMargin,
      netProfit: money(netProfit),
      wipValue,
      trustBalance,
    }),
    activity: {
      recentInvoices: params.recentInvoices,
      recentWriteOffs: params.recentWriteOffs,
    },
    generatedAt: new Date(),
  };
}

function snapshotMetrics(metrics: ProfitabilityMetrics) {
  return {
    billedAmount: metrics.billedAmount ?? '0.00',
    collectedAmount: metrics.collectedAmount ?? '0.00',
    writeOffAmount: metrics.writeOffAmount ?? '0.00',
    disbursementAmount: metrics.disbursementAmount ?? '0.00',
    costAmount: metrics.costAmount ?? '0.00',

    netRevenue: metrics.netRevenue ?? '0.00',
    grossProfit: metrics.grossProfit ?? '0.00',
    netProfit: metrics.netProfit ?? '0.00',

    realizationRate: metrics.realizationRate ?? '0.0000',
    collectionRate: metrics.collectionRate ?? '0.0000',
    profitMargin: metrics.profitMargin ?? '0.0000',

    wipValue: metrics.wipValue ?? '0.00',
    trustBalance: metrics.trustBalance ?? '0.00',
  };
}

export class MatterProfitabilityService {
  /**
   * Calculates profitability for a single matter.
   *
   * Schema alignment:
   * - Matter has no matterCode/caseNumber/metadata profitability store.
   * - Matter financial base fields are trustBalance and wipValue.
   * - TimeEntry uses durationHours and billableAmount, not hours/amount.
   * - WriteOff is a first-class model.
   * - MatterProfitabilitySnapshot is a first-class model for persisted snapshots.
   */
  static async calculate(
    db: MatterProfitabilityDbClient,
    params: MatterProfitabilityParams,
  ): Promise<ProfitabilityResultWithSnapshot> {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'MATTER_PROFITABILITY_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      params.matterId,
      'Matter ID',
      'MATTER_PROFITABILITY_MATTER_REQUIRED',
    );
    const periodStart = normalizeDate(params.periodStart, 'period start');
    const periodEnd = normalizeDate(params.periodEnd, 'period end');

    assertValidPeriod(periodStart, periodEnd);

    const matter = await safeFindFirst(db.matter, {
      where: {
        tenantId,
        id: matterId,
        deletedAt: null,
      },
      select: matterSelect(),
    });

    if (!matter) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    const invoiceWhere = buildInvoiceWhere({ tenantId, matterId, periodStart, periodEnd });
    const timeWhere = buildTimeWhere({ tenantId, matterId, periodStart, periodEnd });
    const expenseWhere = buildExpenseWhere({ tenantId, matterId, periodStart, periodEnd });
    const writeOffWhere = buildWriteOffWhere({ tenantId, matterId, periodStart, periodEnd });
    const disbursementWhere = buildDisbursementWhere({
      tenantId,
      matterId,
      periodStart,
      periodEnd,
    });

    const [
      invoiceAgg,
      expenseAgg,
      timeAgg,
      writeOffAgg,
      disbursementAgg,
      invoiceCount,
      timeEntryCount,
      expenseCount,
      writeOffCount,
      disbursementCount,
      recentInvoices,
      recentWriteOffs,
    ] = await Promise.all([
      safeAggregate(
        db.invoice,
        {
          where: invoiceWhere,
          _sum: {
            total: true,
            paidAmount: true,
            balanceDue: true,
          },
          _count: {
            id: true,
          },
        },
        {
          _sum: {
            total: 0,
            paidAmount: 0,
            balanceDue: 0,
          },
          _count: {
            id: 0,
          },
        },
      ),

      safeAggregate(
        db.expenseEntry,
        {
          where: expenseWhere,
          _sum: {
            amount: true,
          },
          _count: {
            id: true,
          },
        },
        {
          _sum: {
            amount: 0,
          },
          _count: {
            id: 0,
          },
        },
      ),

      safeAggregate(
        db.timeEntry,
        {
          where: timeWhere,
          _sum: {
            durationHours: true,
            billableAmount: true,
          },
          _count: {
            id: true,
          },
        },
        {
          _sum: {
            durationHours: 0,
            billableAmount: 0,
          },
          _count: {
            id: 0,
          },
        },
      ),

      safeAggregate(
        db.writeOff,
        {
          where: writeOffWhere,
          _sum: {
            amount: true,
          },
          _count: {
            id: true,
          },
        },
        {
          _sum: {
            amount: 0,
          },
          _count: {
            id: 0,
          },
        },
      ),

      safeAggregate(
        db.disbursement,
        {
          where: disbursementWhere,
          _sum: {
            amount: true,
          },
          _count: {
            id: true,
          },
        },
        {
          _sum: {
            amount: 0,
          },
          _count: {
            id: 0,
          },
        },
      ),

      safeCount(db.invoice, { where: invoiceWhere }),
      safeCount(db.timeEntry, { where: timeWhere }),
      safeCount(db.expenseEntry, { where: expenseWhere }),
      safeCount(db.writeOff, { where: writeOffWhere }),
      safeCount(db.disbursement, { where: disbursementWhere }),

      safeFindMany(db.invoice, {
        where: invoiceWhere,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          paidAmount: true,
          balanceDue: true,
          issuedDate: true,
          dueDate: true,
          createdAt: true,
        },
        orderBy: [{ issuedDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: 10,
      }),

      safeFindMany(db.writeOff, {
        where: writeOffWhere,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          reason: true,
          requestedAt: true,
          approvedAt: true,
          postedAt: true,
        },
        orderBy: [{ postedAt: 'desc' }, { approvedAt: 'desc' }, { requestedAt: 'desc' }],
        take: 10,
      }),
    ]);

    const result = buildProfitabilityResult({
      matter,
      periodStart,
      periodEnd,
      invoiceAgg,
      expenseAgg,
      timeAgg,
      writeOffAgg,
      disbursementAgg,
      invoiceCount,
      timeEntryCount,
      expenseCount,
      writeOffCount,
      disbursementCount,
      recentInvoices,
      recentWriteOffs,
    });

    const snapshot =
      params.persistSnapshot === true
        ? await this.createSnapshotFromResult(db, {
            tenantId,
            matterId,
            createdById: params.createdById ?? null,
            snapshotType: normalizeSnapshotType(params.snapshotType),
            periodStart,
            periodEnd,
            result,
          })
        : null;

    return {
      ...result,
      snapshot,
    };
  }

  static async createSnapshotFromResult(
    db: MatterProfitabilityDbClient,
    params: {
      tenantId: string;
      matterId: string;
      createdById?: string | null;
      snapshotType?: SnapshotType;
      periodStart?: Date | null;
      periodEnd?: Date | null;
      result: MatterProfitabilityResult;
    },
  ): Promise<unknown | null> {
    const metrics = snapshotMetrics(params.result.metrics);

    return safeCreate(db.matterProfitabilitySnapshot, {
      data: {
        tenantId: params.tenantId,
        matterId: params.matterId,
        snapshotType: normalizeSnapshotType(params.snapshotType),
        snapshotDate: new Date(),
        periodStart: params.periodStart ?? null,
        periodEnd: params.periodEnd ?? null,

        billedAmount: metrics.billedAmount,
        collectedAmount: metrics.collectedAmount,
        writeOffAmount: metrics.writeOffAmount,
        disbursementAmount: metrics.disbursementAmount,
        costAmount: metrics.costAmount,

        netRevenue: metrics.netRevenue,
        grossProfit: metrics.grossProfit,
        netProfit: metrics.netProfit,

        realizationRate: metrics.realizationRate,
        collectionRate: metrics.collectionRate,
        profitMargin: metrics.profitMargin,

        wipValue: metrics.wipValue,
        trustBalance: metrics.trustBalance,

        createdById: toNullableString(params.createdById),
        metadata: {
          ratings: params.result.ratings,
          counts: params.result.counts,
          riskNotes: params.result.riskNotes,
          matter: params.result.matter,
        },
      },
    });
  }

  static async createSnapshot(
    db: MatterProfitabilityDbClient,
    params: MatterProfitabilityParams,
  ): Promise<ProfitabilityResultWithSnapshot> {
    return this.calculate(db, {
      ...params,
      persistSnapshot: true,
      snapshotType: params.snapshotType ?? 'AD_HOC',
    });
  }

  static async getLatestSnapshot(
    db: MatterProfitabilityDbClient,
    params: {
      tenantId: string;
      matterId: string;
    },
  ): Promise<unknown | null> {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'MATTER_PROFITABILITY_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      params.matterId,
      'Matter ID',
      'MATTER_PROFITABILITY_MATTER_REQUIRED',
    );

    return safeFindFirst(db.matterProfitabilitySnapshot, {
      where: {
        tenantId,
        matterId,
      },
      orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  static async listSnapshots(
    db: MatterProfitabilityDbClient,
    params: {
      tenantId: string;
      matterId?: string | null;
      snapshotType?: SnapshotType | null;
      page?: number;
      limit?: number;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'MATTER_PROFITABILITY_TENANT_REQUIRED',
    );
    const page = Math.max(Number(params.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(params.limit ?? 25), 1), 100);
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(params.matterId ? { matterId: params.matterId } : {}),
      ...(params.snapshotType ? { snapshotType: normalizeSnapshotType(params.snapshotType) } : {}),
    };

    const [data, total] = await Promise.all([
      safeFindMany(db.matterProfitabilitySnapshot, {
        where,
        orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      safeCount(db.matterProfitabilitySnapshot, { where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  static async calculateMatterProfitability(
    db: MatterProfitabilityDbClient,
    params: MatterProfitabilityParams,
  ): Promise<ProfitabilityResultWithSnapshot> {
    return this.calculate(db, params);
  }

  static async getMatterProfitability(
    db: MatterProfitabilityDbClient,
    params: MatterProfitabilityParams,
  ): Promise<ProfitabilityResultWithSnapshot> {
    return this.calculate(db, params);
  }
}

export default MatterProfitabilityService;