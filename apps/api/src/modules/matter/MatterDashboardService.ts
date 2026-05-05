// apps/api/src/modules/matter/MatterDashboardService.ts

import { MatterWorkflowService } from './MatterWorkflowService';

type QueryArgs = Record<string, unknown>;

type MoneyLike = {
  toString(): string;
};

type ClientDashboardRecord = {
  id: string;
  name?: string | null;
  clientCode?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  kycStatus?: string | null;
  riskBand?: string | null;
  riskScore?: number | string | null;
  pepStatus?: string | null;
  sanctionsStatus?: string | null;
};

type LeadAdvocateRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type MatterCountRecord = {
  invoices?: number;
  trustTransactions?: number;
  expenseEntries?: number;
  documents?: number;
  calendarEvents?: number;
  tasks?: number;
};

type MatterDashboardMatterRecord = {
  id: string;
  tenantId?: string | null;
  branchId?: string | null;
  title: string;
  category?: string | null;
  description?: string | null;
  clientId?: string | null;
  leadAdvocateId?: string | null;
  status?: string | null;
  riskLevel?: string | null;
  openedDate?: Date | string | null;
  closedDate?: Date | string | null;
  archivedDate?: Date | string | null;
  statuteOfLimitationsDate?: Date | string | null;
  trustBalance?: unknown;
  wipValue?: unknown;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  deletedAt?: Date | string | null;
  client?: ClientDashboardRecord | null;
  leadAdvocate?: LeadAdvocateRecord | null;
  _count?: MatterCountRecord | null;
};

type InvoiceRecord = {
  id: string;
  invoiceNumber?: string | null;
  total?: unknown;
  paidAmount?: unknown;
  balanceDue?: unknown;
  status?: string | null;
  issuedDate?: Date | string | null;
  dueDate?: Date | string | null;
  createdAt?: Date | string | null;
};

type TrustTransactionRecord = {
  id: string;
  amount?: unknown;
  type?: string | null;
  status?: string | null;
  transactionDate?: Date | string | null;
  reference?: string | null;
  createdAt?: Date | string | null;
};

type ExpenseEntryRecord = {
  id: string;
  amount?: unknown;
  description?: string | null;
  expenseDate?: Date | string | null;
  status?: string | null;
  createdAt?: Date | string | null;
};

type DocumentRecord = {
  id: string;
  title?: string | null;
  category?: string | null;
  confidentiality?: string | null;
  isRestricted?: boolean | null;
  status?: string | null;
  version?: number | string | null;
  createdAt?: Date | string | null;
};

type CalendarEventRecord = {
  id: string;
  title?: string | null;
  type?: string | null;
  visibility?: string | null;
  isPrivate?: boolean | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
};

type MatterTaskRecord = {
  id: string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  dueDate?: Date | string | null;
  assignedTo?: string | null;
  createdAt?: Date | string | null;
};

type AggregateResult = {
  _sum?: Record<string, unknown> | null;
  _count?: { id?: number | null } | number | null;
};

type GroupRow = {
  _count?: number | { id?: number | null } | null;
  status?: string | null;
  category?: string | null;
  riskLevel?: string | null;
  leadAdvocateId?: string | null;
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

type GroupByDelegate<TRow> = {
  groupBy(args: QueryArgs): Promise<TRow[]>;
};

type MatterDashboardDbClient = {
  matter: FindFirstDelegate<MatterDashboardMatterRecord> &
    FindManyDelegate<MatterDashboardMatterRecord> &
    CountDelegate &
    AggregateDelegate &
    GroupByDelegate<GroupRow>;

  invoice?: FindManyDelegate<InvoiceRecord> & AggregateDelegate;
  expenseEntry?: FindManyDelegate<ExpenseEntryRecord> & AggregateDelegate;
  trustTransaction?: FindManyDelegate<TrustTransactionRecord> & CountDelegate;
  document?: FindManyDelegate<DocumentRecord>;
  calendarEvent?: FindManyDelegate<CalendarEventRecord>;
  matterTask?: FindManyDelegate<MatterTaskRecord>;
  user?: FindManyDelegate<LeadAdvocateRecord>;
};

type MatterHealth = {
  score: number;
  rating: 'HEALTHY' | 'WATCH' | 'AT_RISK' | 'CRITICAL';
  riskRank: number;
  statuteDays: number | null;
};

type WorkloadRow = {
  leadAdvocateId: string | null;
  leadAdvocate: LeadAdvocateRecord | null;
  total: number;
  byStatus: Record<string, number>;
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

function normalizeUpper(value: unknown, fallback = 'GENERAL'): string {
  return toNullableString(value)?.toUpperCase() ?? fallback;
}

function isMoneyLike(value: unknown): value is MoneyLike {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { toString?: unknown };

  return typeof candidate.toString === 'function';
}

function toNumber(value: unknown): number {
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

  if (isMoneyLike(value)) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function money(value: unknown): string {
  return toNumber(value).toFixed(2);
}

function subtractMoney(left: unknown, right: unknown): string {
  return (toNumber(left) - toNumber(right)).toFixed(2);
}

function addMoney(...values: unknown[]): string {
  const total = values.reduce<number>(
    (sum: number, value: unknown) => sum + toNumber(value),
    0,
  );

  return total.toFixed(2);
}

function matterInclude() {
  return {
    client: {
      select: {
        id: true,
        name: true,
        clientCode: true,
        email: true,
        phoneNumber: true,
        kycStatus: true,
        riskBand: true,
        riskScore: true,
        pepStatus: true,
        sanctionsStatus: true,
      },
    },
    leadAdvocate: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    _count: {
      select: {
        invoices: true,
        trustTransactions: true,
        expenseEntries: true,
        documents: true,
        calendarEvents: true,
        tasks: true,
      },
    },
  };
}

function matterSelect() {
  return {
    id: true,
    tenantId: true,
    branchId: true,
    title: true,
    category: true,
    description: true,
    clientId: true,
    leadAdvocateId: true,
    status: true,
    riskLevel: true,
    openedDate: true,
    closedDate: true,
    archivedDate: true,
    statuteOfLimitationsDate: true,
    trustBalance: true,
    wipValue: true,
    createdAt: true,
    updatedAt: true,
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
  };
}

function compactMatter(matter: MatterDashboardMatterRecord) {
  const category = normalizeUpper(matter.category);
  const workflowTemplate = MatterWorkflowService.resolveWorkflowTemplate(category);

  return {
    id: matter.id,
    matterReference: matter.id,
    matterCode: matter.id,
    caseNumber: null,

    title: matter.title,
    category,
    matterType: category,
    workflowType: workflowTemplate.workflowType,

    status: matter.status,
    riskLevel: matter.riskLevel,

    clientId: matter.clientId,
    client: matter.client ?? null,

    branchId: matter.branchId,
    leadAdvocateId: matter.leadAdvocateId,
    leadAdvocate: matter.leadAdvocate ?? null,

    openedDate: matter.openedDate,
    closedDate: matter.closedDate,
    archivedDate: matter.archivedDate,
    statuteOfLimitationsDate: matter.statuteOfLimitationsDate,

    trustBalance: money(matter.trustBalance),
    wipValue: money(matter.wipValue),

    workflow: workflowTemplate,

    createdAt: matter.createdAt,
    updatedAt: matter.updatedAt,
    deletedAt: matter.deletedAt ?? null,
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

  return delegate.aggregate(args);
}

async function safeCount(
  delegate: CountDelegate | null | undefined,
  args: QueryArgs,
): Promise<number> {
  if (!delegate?.count) {
    return 0;
  }

  return delegate.count(args);
}

async function safeFindMany<TRecord>(
  delegate: FindManyDelegate<TRecord> | null | undefined,
  args: QueryArgs,
): Promise<TRecord[]> {
  if (!delegate?.findMany) {
    return [];
  }

  return delegate.findMany(args);
}

async function safeGroupBy<TRow extends GroupRow>(
  delegate: GroupByDelegate<TRow> | null | undefined,
  args: QueryArgs,
): Promise<TRow[]> {
  if (!delegate?.groupBy) {
    return [];
  }

  return delegate.groupBy(args);
}

function aggregateSumValue(
  aggregate: AggregateResult,
  field: string,
): unknown {
  return aggregate._sum?.[field] ?? 0;
}

function aggregateCountValue(aggregate: AggregateResult): number {
  const count = aggregate._count;

  if (typeof count === 'number') {
    return count;
  }

  if (typeof count?.id === 'number') {
    return count.id;
  }

  return 0;
}

function countValue(group: GroupRow): number {
  if (typeof group._count === 'number') {
    return group._count;
  }

  if (typeof group._count?.id === 'number') {
    return group._count.id;
  }

  return 0;
}

function groupFieldValue(row: GroupRow, field: string): string {
  switch (field) {
    case 'status':
      return String(row.status ?? 'UNKNOWN');
    case 'category':
      return String(row.category ?? 'UNKNOWN');
    case 'riskLevel':
      return String(row.riskLevel ?? 'UNKNOWN');
    case 'leadAdvocateId':
      return String(row.leadAdvocateId ?? 'UNASSIGNED');
    default:
      return 'UNKNOWN';
  }
}

function normalizeGroupRows(
  rows: GroupRow[],
  field: string,
): Array<{ key: string; count: number }> {
  return rows.map((row) => ({
    key: groupFieldValue(row, field),
    count: countValue(row),
  }));
}

function riskRank(riskLevel: unknown): number {
  switch (normalizeUpper(riskLevel, 'LOW')) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 3;
    case 'MEDIUM':
      return 2;
    case 'LOW':
    default:
      return 1;
  }
}

function isClosedStatus(status: unknown): boolean {
  return ['COMPLETED', 'CLOSED', 'ARCHIVED'].includes(
    normalizeUpper(status, 'ACTIVE'),
  );
}

function daysUntil(value: unknown): number | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function calculateHealth(matter: MatterDashboardMatterRecord): MatterHealth {
  const risk = riskRank(matter.riskLevel);
  const statuteDays = daysUntil(matter.statuteOfLimitationsDate);
  const isClosed = isClosedStatus(matter.status);

  let score = 100;

  if (risk >= 4) {
    score -= 30;
  }

  if (risk === 3) {
    score -= 20;
  }

  if (
    matter.client?.kycStatus &&
    String(matter.client.kycStatus).toUpperCase() !== 'APPROVED'
  ) {
    score -= 20;
  }

  if (
    matter.client?.sanctionsStatus &&
    String(matter.client.sanctionsStatus).toUpperCase() !== 'CLEAR'
  ) {
    score -= 30;
  }

  if (typeof statuteDays === 'number' && statuteDays <= 30 && !isClosed) {
    score -= 30;
  }

  if (typeof statuteDays === 'number' && statuteDays <= 7 && !isClosed) {
    score -= 20;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    rating:
      score >= 80
        ? 'HEALTHY'
        : score >= 60
          ? 'WATCH'
          : score >= 40
            ? 'AT_RISK'
            : 'CRITICAL',
    riskRank: risk,
    statuteDays,
  };
}

function invoiceSummary(invoiceAgg: AggregateResult) {
  const totalInvoiced = aggregateSumValue(invoiceAgg, 'total');
  const totalPaid = aggregateSumValue(invoiceAgg, 'paidAmount');
  const totalBalance = invoiceAgg._sum?.balanceDue ?? null;

  return {
    count: aggregateCountValue(invoiceAgg),
    totalInvoiced: money(totalInvoiced),
    totalPaid: money(totalPaid),
    outstanding:
      totalBalance !== null && totalBalance !== undefined
        ? money(totalBalance)
        : subtractMoney(totalInvoiced, totalPaid),
  };
}

function expenseSummary(expenseAgg: AggregateResult) {
  return {
    count: aggregateCountValue(expenseAgg),
    totalExpenses: money(aggregateSumValue(expenseAgg, 'amount')),
  };
}

function leadAdvocateIdsFromGroups(groups: GroupRow[]): string[] {
  return [
    ...new Set(
      groups
        .map((group) => toNullableString(group.leadAdvocateId))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

function leadAdvocateMapFromUsers(
  users: LeadAdvocateRecord[],
): Map<string, LeadAdvocateRecord> {
  return new Map(users.map((user) => [user.id, user]));
}

export class MatterDashboardService {
  static async getDashboard(
    db: MatterDashboardDbClient,
    params: {
      tenantId: string;
      matterId: string;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'MATTER_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      params.matterId,
      'Matter ID',
      'MATTER_ID_REQUIRED',
    );

    const matter = await db.matter.findFirst({
      where: {
        tenantId,
        id: matterId,
        deletedAt: null,
      },
      include: matterInclude(),
    });

    if (!matter) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    const [
      invoiceAgg,
      expenseAgg,
      trustTransactionCount,
      recentInvoices,
      recentTrustTransactions,
      recentExpenses,
      recentDocuments,
      upcomingCalendarEvents,
      openTasks,
    ] = await Promise.all([
      safeAggregate(
        db.invoice,
        {
          where: { tenantId, matterId },
          _sum: {
            total: true,
            paidAmount: true,
            balanceDue: true,
          },
          _count: { id: true },
        },
        {
          _sum: {
            total: 0,
            paidAmount: 0,
            balanceDue: 0,
          },
          _count: { id: 0 },
        },
      ),

      safeAggregate(
        db.expenseEntry,
        {
          where: { tenantId, matterId },
          _sum: { amount: true },
          _count: { id: true },
        },
        {
          _sum: { amount: 0 },
          _count: { id: 0 },
        },
      ),

      safeCount(db.trustTransaction, {
        where: { tenantId, matterId },
      }),

      safeFindMany(db.invoice, {
        where: { tenantId, matterId },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          paidAmount: true,
          balanceDue: true,
          status: true,
          issuedDate: true,
          dueDate: true,
          createdAt: true,
        },
        orderBy: [{ issuedDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: 10,
      }),

      safeFindMany(db.trustTransaction, {
        where: { tenantId, matterId },
        select: {
          id: true,
          amount: true,
          type: true,
          status: true,
          transactionDate: true,
          reference: true,
          createdAt: true,
        },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: 10,
      }),

      safeFindMany(db.expenseEntry, {
        where: { tenantId, matterId },
        select: {
          id: true,
          amount: true,
          description: true,
          expenseDate: true,
          status: true,
          createdAt: true,
        },
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: 10,
      }),

      safeFindMany(db.document, {
        where: {
          tenantId,
          matterId,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          category: true,
          confidentiality: true,
          isRestricted: true,
          status: true,
          version: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 10,
      }),

      safeFindMany(db.calendarEvent, {
        where: {
          tenantId,
          matterId,
          startTime: { gte: new Date() },
        },
        select: {
          id: true,
          title: true,
          type: true,
          visibility: true,
          isPrivate: true,
          startTime: true,
          endTime: true,
        },
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
        take: 10,
      }),

      safeFindMany(db.matterTask, {
        where: {
          tenantId,
          matterId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignedTo: true,
          createdAt: true,
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 10,
      }),
    ]);

    const compact = compactMatter(matter);
    const health = calculateHealth(matter);
    const invoices = invoiceSummary(invoiceAgg);
    const expenses = expenseSummary(expenseAgg);

    return {
      matter: compact,
      client: matter.client ?? null,
      leadAdvocate: matter.leadAdvocate ?? null,
      health,
      financials: {
        ...invoices,
        ...expenses,
        totalMatterExposure: addMoney(matter.trustBalance, matter.wipValue),
        trustBalance: money(matter.trustBalance),
        wipValue: money(matter.wipValue),
      },
      counts: {
        invoiceCount: matter._count?.invoices ?? invoices.count,
        trustTransactionCount:
          matter._count?.trustTransactions ?? trustTransactionCount,
        expenseCount: matter._count?.expenseEntries ?? expenses.count,
        documentCount: matter._count?.documents ?? recentDocuments.length,
        calendarEventCount:
          matter._count?.calendarEvents ?? upcomingCalendarEvents.length,
        taskCount: matter._count?.tasks ?? openTasks.length,
      },
      activity: {
        recentInvoices,
        recentTrustTransactions,
        recentExpenses,
        recentDocuments,
        upcomingCalendarEvents,
        openTasks,
      },
      generatedAt: new Date(),
    };
  }

  static async getPortfolioSummary(
    db: MatterDashboardDbClient,
    params: {
      tenantId: string;
      branchId?: string | null;
      leadAdvocateId?: string | null;
      category?: string | null;
      riskLevel?: string | null;
      includeArchived?: boolean;
      takeRecent?: number;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'MATTER_TENANT_REQUIRED',
    );
    const branchId = toNullableString(params.branchId);
    const leadAdvocateId = toNullableString(params.leadAdvocateId);
    const category = toNullableString(params.category)?.toUpperCase();
    const riskLevel = toNullableString(params.riskLevel)?.toUpperCase();
    const takeRecent = Math.min(Math.max(Number(params.takeRecent ?? 25), 1), 100);

    const where: Record<string, unknown> = {
      tenantId,
      ...(params.includeArchived === true ? {} : { deletedAt: null }),
      ...(branchId ? { branchId } : {}),
      ...(leadAdvocateId ? { leadAdvocateId } : {}),
      ...(category ? { category } : {}),
      ...(riskLevel ? { riskLevel } : {}),
    };

    const [
      totalMatters,
      openMatters,
      closedMatters,
      statusGroups,
      categoryGroups,
      riskGroups,
      leadAdvocateGroups,
      recentMatters,
      financialAgg,
    ] = await Promise.all([
      safeCount(db.matter, { where }),

      safeCount(db.matter, {
        where: {
          ...where,
          status: { in: ['ACTIVE', 'ON_HOLD'] },
        },
      }),

      safeCount(db.matter, {
        where: {
          ...where,
          status: { in: ['COMPLETED', 'CLOSED', 'ARCHIVED'] },
        },
      }),

      safeGroupBy(db.matter, {
        by: ['status'],
        where,
        _count: { id: true },
      }),

      safeGroupBy(db.matter, {
        by: ['category'],
        where,
        _count: { id: true },
      }),

      safeGroupBy(db.matter, {
        by: ['riskLevel'],
        where,
        _count: { id: true },
      }),

      safeGroupBy(db.matter, {
        by: ['leadAdvocateId'],
        where,
        _count: { id: true },
        orderBy: {
          _count: { id: 'desc' },
        },
        take: 10,
      }),

      safeFindMany(db.matter, {
        where,
        select: matterSelect(),
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: takeRecent,
      }),

      safeAggregate(
        db.matter,
        {
          where,
          _sum: {
            trustBalance: true,
            wipValue: true,
          },
          _count: { id: true },
        },
        {
          _sum: {
            trustBalance: 0,
            wipValue: 0,
          },
          _count: { id: 0 },
        },
      ),
    ]);

    const leadAdvocateIds = leadAdvocateIdsFromGroups(leadAdvocateGroups);

    const leadAdvocates = leadAdvocateIds.length
      ? await safeFindMany(db.user, {
          where: {
            tenantId,
            id: { in: leadAdvocateIds },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const leadAdvocateMap = leadAdvocateMapFromUsers(leadAdvocates);

    const atRiskMatters = recentMatters
      .map((matter) => ({
        matter: compactMatter(matter),
        health: calculateHealth(matter),
      }))
      .filter((item) => ['AT_RISK', 'CRITICAL'].includes(item.health.rating))
      .slice(0, 10);

    return {
      tenantId,
      filters: {
        branchId,
        leadAdvocateId,
        category,
        riskLevel,
        includeArchived: params.includeArchived === true,
      },
      totals: {
        totalMatters,
        openMatters,
        closedMatters,
        archivedExcluded: params.includeArchived !== true,
        trustBalance: money(aggregateSumValue(financialAgg, 'trustBalance')),
        wipValue: money(aggregateSumValue(financialAgg, 'wipValue')),
        totalExposure: addMoney(
          aggregateSumValue(financialAgg, 'trustBalance'),
          aggregateSumValue(financialAgg, 'wipValue'),
        ),
      },
      breakdowns: {
        byStatus: normalizeGroupRows(statusGroups, 'status'),
        byCategory: normalizeGroupRows(categoryGroups, 'category'),
        byRiskLevel: normalizeGroupRows(riskGroups, 'riskLevel'),
        byLeadAdvocate: leadAdvocateGroups.map((group) => ({
          leadAdvocateId: group.leadAdvocateId ?? null,
          leadAdvocate: group.leadAdvocateId
            ? leadAdvocateMap.get(group.leadAdvocateId) ?? null
            : null,
          matterCount: countValue(group),
        })),
      },
      recentMatters: recentMatters.map(compactMatter),
      riskWatchlist: atRiskMatters,
      generatedAt: new Date(),
    };
  }

  static async getLeadAdvocateWorkload(
    db: MatterDashboardDbClient,
    params: {
      tenantId: string;
      leadAdvocateId?: string | null;
      includeArchived?: boolean;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'MATTER_TENANT_REQUIRED',
    );
    const leadAdvocateId = toNullableString(params.leadAdvocateId);

    const where: Record<string, unknown> = {
      tenantId,
      ...(leadAdvocateId ? { leadAdvocateId } : {}),
      ...(params.includeArchived === true ? {} : { deletedAt: null }),
    };

    const groups = await safeGroupBy(db.matter, {
      by: ['leadAdvocateId', 'status'],
      where,
      _count: { id: true },
    });

    const leadAdvocateIds = leadAdvocateIdsFromGroups(groups);

    const users = leadAdvocateIds.length
      ? await safeFindMany(db.user, {
          where: {
            tenantId,
            id: { in: leadAdvocateIds },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const userMap = leadAdvocateMapFromUsers(users);
    const workload = new Map<string, WorkloadRow>();

    for (const group of groups) {
      const id = group.leadAdvocateId ?? 'UNASSIGNED';

      if (!workload.has(id)) {
        workload.set(id, {
          leadAdvocateId: group.leadAdvocateId ?? null,
          leadAdvocate: group.leadAdvocateId
            ? userMap.get(group.leadAdvocateId) ?? null
            : null,
          total: 0,
          byStatus: {},
        });
      }

      const row = workload.get(id);

      if (!row) {
        continue;
      }

      const count = countValue(group);
      const status = group.status ?? 'UNKNOWN';

      row.total += count;
      row.byStatus[status] = count;
    }

    return {
      tenantId,
      leadAdvocateId: leadAdvocateId ?? null,
      workload: Array.from(workload.values()).sort((a, b) => b.total - a.total),
      generatedAt: new Date(),
    };
  }
}

export default MatterDashboardService;