// apps/api/src/modules/matter/MatterQueryService.ts

import { MatterWorkflowService } from './MatterWorkflowService';

type SortDirection = 'asc' | 'desc';

type MatterSortField =
  | 'openedDate'
  | 'updatedAt'
  | 'createdAt'
  | 'title'
  | 'status'
  | 'riskLevel'
  | 'category';

type QueryArgs = Record<string, unknown>;

type ClientSummary = {
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

type AdvocateSummary = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type MatterLinkedCount = {
  invoices?: number | null;
  trustTransactions?: number | null;
  expenseEntries?: number | null;
  documents?: number | null;
  calendarEvents?: number | null;
  tasks?: number | null;
};

type MatterQueryRecord = {
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
  client?: ClientSummary | null;
  leadAdvocate?: AdvocateSummary | null;
  _count?: MatterLinkedCount | null;
};

type InvoiceSummary = {
  id: string;
  invoiceNumber?: string | null;
  status?: string | null;
  total?: unknown;
  paidAmount?: unknown;
  balanceDue?: unknown;
  issuedDate?: Date | string | null;
  dueDate?: Date | string | null;
  createdAt?: Date | string | null;
};

type TrustTransactionSummary = {
  id: string;
  amount?: unknown;
  type?: string | null;
  status?: string | null;
  reference?: string | null;
  transactionDate?: Date | string | null;
  createdAt?: Date | string | null;
};

type ExpenseSummary = {
  id: string;
  amount?: unknown;
  description?: string | null;
  status?: string | null;
  expenseDate?: Date | string | null;
  createdAt?: Date | string | null;
};

type DocumentSummary = {
  id: string;
  title?: string | null;
  category?: string | null;
  confidentiality?: string | null;
  isRestricted?: boolean | null;
  status?: string | null;
  version?: number | string | null;
  createdAt?: Date | string | null;
};

type CalendarEventSummary = {
  id: string;
  title?: string | null;
  type?: string | null;
  visibility?: string | null;
  isPrivate?: boolean | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
};

type TaskSummary = {
  id: string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  dueDate?: Date | string | null;
  assignedTo?: string | null;
  createdAt?: Date | string | null;
};

type GroupCount = {
  id?: number | null;
};

type MatterGroupRow = {
  status?: string | null;
  category?: string | null;
  riskLevel?: string | null;
  leadAdvocateId?: string | null;
  _count?: GroupCount | number | null;
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

type GroupByDelegate<TRecord> = {
  groupBy(args: QueryArgs): Promise<TRecord[]>;
};

type MatterQueryDbClient = {
  matter: FindFirstDelegate<MatterQueryRecord> &
    FindManyDelegate<MatterQueryRecord> &
    CountDelegate &
    GroupByDelegate<MatterGroupRow>;

  invoice?: FindManyDelegate<InvoiceSummary>;
  trustTransaction?: FindManyDelegate<TrustTransactionSummary>;
  expenseEntry?: FindManyDelegate<ExpenseSummary>;
  document?: FindManyDelegate<DocumentSummary>;
  calendarEvent?: FindManyDelegate<CalendarEventSummary>;
  matterTask?: FindManyDelegate<TaskSummary>;
  user?: FindManyDelegate<AdvocateSummary>;
};

export type MatterQueryListParams = {
  tenantId: string;
  page?: number;
  limit?: number;
  search?: string;
  statuses?: string[];
  clientId?: string | null;
  branchId?: string | null;
  leadAdvocateId?: string | null;

  /**
   * Backward-compatible API aliases.
   * Matter schema uses category, not matterType.
   */
  category?: string | null;
  matterType?: string | null;
  workflowType?: string | null;

  riskLevel?: string | null;
  openedFrom?: Date | string | null;
  openedTo?: Date | string | null;
  statuteFrom?: Date | string | null;
  statuteTo?: Date | string | null;
  includeArchived?: boolean;
  sortBy?: MatterSortField;
  sortDirection?: SortDirection;
};

export type MatterProfileParams = {
  tenantId: string;
  matterId: string;
  includeFinancials?: boolean;
  includeDocuments?: boolean;
  includeCalendar?: boolean;
  includeTasks?: boolean;
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

function normalizeUpper(value: unknown): string | null {
  return toNullableString(value)?.toUpperCase() ?? null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    const normalized = normalizeUpper(item);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function normalizeDate(
  value: Date | string | null | undefined,
  label: string,
): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error(`Invalid matter ${label}`), {
      statusCode: 422,
      code: `INVALID_MATTER_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    });
  }

  return parsed;
}

function normalizePositiveInt(value: unknown, fallback: number, max?: number): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return max ? Math.min(parsed, max) : parsed;
}

function normalizeSortField(value: unknown): MatterSortField {
  const normalized = toNullableString(value);

  const allowed: MatterSortField[] = [
    'openedDate',
    'updatedAt',
    'createdAt',
    'title',
    'status',
    'riskLevel',
    'category',
  ];

  return allowed.includes(normalized as MatterSortField)
    ? (normalized as MatterSortField)
    : 'openedDate';
}

function normalizeSortDirection(value: unknown): SortDirection {
  return normalizeUpper(value) === 'ASC' ? 'asc' : 'desc';
}

function workflowCategories(workflowType?: string | null): string[] {
  const normalized = normalizeUpper(workflowType);

  if (!normalized) {
    return [];
  }

  const workflow = MatterWorkflowService.resolveWorkflowType(normalized);

  switch (workflow) {
    case 'LITIGATION':
      return ['LITIGATION'];
    case 'CONVEYANCING':
      return ['CONVEYANCING'];
    case 'COMMERCIAL':
      return ['COMMERCIAL'];
    case 'FAMILY':
      return ['DIVORCE', 'FAMILY'];
    case 'PROBATE':
      return ['PROBATE'];
    case 'EMPLOYMENT':
      return ['EMPLOYMENT'];
    case 'TAX':
      return ['TAX'];
    case 'REGULATORY':
      return ['REGULATORY'];
    case 'IP':
      return ['IP'];
    case 'DEBT_RECOVERY':
      return ['DEBT_RECOVERY'];
    case 'ARBITRATION':
      return ['ARBITRATION'];
    default:
      return [];
  }
}

function normalizeCategoryFilter(params: {
  category?: string | null;
  matterType?: string | null;
  workflowType?: string | null;
}): string[] {
  const categories = new Set<string>();

  const directCategory = normalizeUpper(params.category);
  if (directCategory) {
    categories.add(directCategory);
  }

  const matterType = normalizeUpper(params.matterType);
  if (matterType) {
    categories.add(MatterWorkflowService.normalizeMatterType(matterType));
  }

  for (const category of workflowCategories(params.workflowType)) {
    categories.add(category);
  }

  return [...categories];
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

function matterProfileInclude() {
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

function compactMatter(matter: MatterQueryRecord) {
  const category = normalizeUpper(matter.category) ?? 'GENERAL';
  const workflowType = MatterWorkflowService.resolveWorkflowType(category);
  const workflowTemplate = MatterWorkflowService.resolveWorkflowTemplate(category);

  return {
    id: matter.id,

    /**
     * Backward-compatible aliases for older API consumers.
     * These are derived values; Matter schema does not have matterCode/caseNumber.
     */
    matterReference: matter.id,
    matterCode: matter.id,
    caseNumber: null,

    title: matter.title,
    category,
    matterType: category,
    workflowType,
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

    trustBalance: matter.trustBalance,
    wipValue: matter.wipValue,

    workflow: {
      matterType: workflowTemplate.matterType,
      workflowType: workflowTemplate.workflowType,
      recommendedStages: workflowTemplate.recommendedStages,
      requiredArtifacts: workflowTemplate.requiredArtifacts,
    },

    createdAt: matter.createdAt,
    updatedAt: matter.updatedAt,
    deletedAt: matter.deletedAt ?? null,
  };
}

function buildMatterWhere(params: MatterQueryListParams): Record<string, unknown> {
  const tenantId = requiredString(params.tenantId, 'Tenant ID', 'MATTER_TENANT_REQUIRED');
  const search = toNullableString(params.search);
  const statuses = normalizeStringArray(params.statuses);
  const categories = normalizeCategoryFilter(params);

  const openedFrom = normalizeDate(params.openedFrom, 'opened from');
  const openedTo = normalizeDate(params.openedTo, 'opened to');
  const statuteFrom = normalizeDate(params.statuteFrom, 'statute from');
  const statuteTo = normalizeDate(params.statuteTo, 'statute to');

  const where: Record<string, unknown> = {
    tenantId,
    ...(params.includeArchived === true ? {} : { deletedAt: null }),
  };

  if (statuses.length > 0) {
    where.status = {
      in: statuses,
    };
  }

  const clientId = toNullableString(params.clientId);
  if (clientId) {
    where.clientId = clientId;
  }

  const branchId = toNullableString(params.branchId);
  if (branchId) {
    where.branchId = branchId;
  }

  const leadAdvocateId = toNullableString(params.leadAdvocateId);
  if (leadAdvocateId) {
    where.leadAdvocateId = leadAdvocateId;
  }

  const riskLevel = normalizeUpper(params.riskLevel);
  if (riskLevel) {
    where.riskLevel = riskLevel;
  }

  if (categories.length === 1) {
    where.category = categories[0];
  }

  if (categories.length > 1) {
    where.category = {
      in: categories,
    };
  }

  const andFilters: Record<string, unknown>[] = [];

  if (search) {
    andFilters.push({
      OR: [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          category: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          client: {
            is: {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  clientCode: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  kraPin: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
        {
          leadAdvocate: {
            is: {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
      ],
    });
  }

  if (openedFrom || openedTo) {
    andFilters.push({
      openedDate: {
        ...(openedFrom ? { gte: openedFrom } : {}),
        ...(openedTo ? { lte: openedTo } : {}),
      },
    });
  }

  if (statuteFrom || statuteTo) {
    andFilters.push({
      statuteOfLimitationsDate: {
        ...(statuteFrom ? { gte: statuteFrom } : {}),
        ...(statuteTo ? { lte: statuteTo } : {}),
      },
    });
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
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

async function safeGroupBy<TRecord>(
  delegate: GroupByDelegate<TRecord> | null | undefined,
  args: QueryArgs,
): Promise<TRecord[]> {
  if (!delegate?.groupBy) {
    return [];
  }

  try {
    return await delegate.groupBy(args);
  } catch {
    return [];
  }
}

function groupCount(row: MatterGroupRow): number {
  if (typeof row._count === 'number') {
    return row._count;
  }

  if (typeof row._count?.id === 'number') {
    return row._count.id;
  }

  return 0;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values
        .map((value) => toNullableString(value))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

function leadAdvocateMap(users: AdvocateSummary[]): Map<string, AdvocateSummary> {
  return new Map(users.map((user) => [user.id, user]));
}

export class MatterQueryService {
  /**
   * Schema-aligned matter list query.
   *
   * Important:
   * - Matter schema uses `category`, not `matterType`.
   * - Matter schema does not have `matterCode` or `caseNumber`.
   * - Matter schema uses `leadAdvocateId`, not `partnerId` / `assignedLawyerId`.
   * - Client schema uses `phoneNumber`, not `phone`.
   */
  static async listMatters(
    db: MatterQueryDbClient,
    params: MatterQueryListParams,
  ) {
    const page = normalizePositiveInt(params.page, 1);
    const limit = normalizePositiveInt(params.limit, 50, 100);
    const skip = (page - 1) * limit;

    const where = buildMatterWhere(params);
    const sortBy = normalizeSortField(params.sortBy);
    const sortDirection = normalizeSortDirection(params.sortDirection);

    const [rows, total] = await Promise.all([
      db.matter.findMany({
        where,
        select: matterSelect(),
        orderBy: [{ [sortBy]: sortDirection }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.matter.count({ where }),
    ]);

    return {
      data: rows.map(compactMatter),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
      filters: {
        search: toNullableString(params.search),
        statuses: normalizeStringArray(params.statuses),
        clientId: toNullableString(params.clientId),
        branchId: toNullableString(params.branchId),
        leadAdvocateId: toNullableString(params.leadAdvocateId),
        category: normalizeUpper(params.category),
        matterType: normalizeUpper(params.matterType),
        workflowType: normalizeUpper(params.workflowType),
        riskLevel: normalizeUpper(params.riskLevel),
        includeArchived: params.includeArchived === true,
      },
    };
  }

  static async getMatterProfile(
    db: MatterQueryDbClient,
    params: MatterProfileParams,
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
      include: matterProfileInclude(),
    });

    if (!matter) {
      return null;
    }

    const [
      recentInvoices,
      recentTrustTransactions,
      recentExpenses,
      recentDocuments,
      upcomingEvents,
      openTasks,
    ] = await Promise.all([
      params.includeFinancials === false
        ? Promise.resolve([])
        : safeFindMany(db.invoice, {
            where: {
              tenantId,
              matterId,
            },
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
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 10,
          }),

      params.includeFinancials === false
        ? Promise.resolve([])
        : safeFindMany(db.trustTransaction, {
            where: {
              tenantId,
              matterId,
            },
            select: {
              id: true,
              amount: true,
              type: true,
              status: true,
              reference: true,
              transactionDate: true,
              createdAt: true,
            },
            orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
            take: 10,
          }),

      params.includeFinancials === false
        ? Promise.resolve([])
        : safeFindMany(db.expenseEntry, {
            where: {
              tenantId,
              matterId,
            },
            select: {
              id: true,
              amount: true,
              description: true,
              status: true,
              expenseDate: true,
              createdAt: true,
            },
            orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
            take: 10,
          }),

      params.includeDocuments === false
        ? Promise.resolve([])
        : safeFindMany(db.document, {
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

      params.includeCalendar === false
        ? Promise.resolve([])
        : safeFindMany(db.calendarEvent, {
            where: {
              tenantId,
              matterId,
              startTime: {
                gte: new Date(),
              },
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

      params.includeTasks === false
        ? Promise.resolve([])
        : safeFindMany(db.matterTask, {
            where: {
              tenantId,
              matterId,
              status: {
                in: ['TODO', 'IN_PROGRESS'],
              },
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

    return {
      ...compact,
      description: matter.description ?? null,
      client: matter.client ?? null,
      leadAdvocate: matter.leadAdvocate ?? null,
      counts: {
        invoiceCount: matter._count?.invoices ?? 0,
        trustTransactionCount: matter._count?.trustTransactions ?? 0,
        expenseCount: matter._count?.expenseEntries ?? 0,
        documentCount: matter._count?.documents ?? 0,
        calendarEventCount: matter._count?.calendarEvents ?? 0,
        taskCount: matter._count?.tasks ?? 0,
      },
      linkedRecords: {
        recentInvoices,
        recentTrustTransactions,
        recentExpenses,
        recentDocuments,
        upcomingEvents,
        openTasks,
      },
    };
  }

  static async getMatterSearchOptions(
    db: MatterQueryDbClient,
    params: {
      tenantId: string;
      includeArchived?: boolean;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'MATTER_TENANT_REQUIRED',
    );

    const where = {
      tenantId,
      ...(params.includeArchived === true ? {} : { deletedAt: null }),
    };

    const [statuses, categories, riskLevels, leadAdvocates] = await Promise.all([
      safeGroupBy(db.matter, {
        by: ['status'],
        where,
        _count: {
          id: true,
        },
      }),

      safeGroupBy(db.matter, {
        by: ['category'],
        where,
        _count: {
          id: true,
        },
      }),

      safeGroupBy(db.matter, {
        by: ['riskLevel'],
        where,
        _count: {
          id: true,
        },
      }),

      safeGroupBy(db.matter, {
        by: ['leadAdvocateId'],
        where,
        _count: {
          id: true,
        },
      }),
    ]);

    const leadAdvocateIds = uniqueStrings(
      leadAdvocates.map((item) => item.leadAdvocateId),
    );

    const users = leadAdvocateIds.length
      ? await safeFindMany(db.user, {
          where: {
            tenantId,
            id: {
              in: leadAdvocateIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const userMap = leadAdvocateMap(users);

    return {
      statuses,
      categories,
      riskLevels,
      leadAdvocates: leadAdvocates.map((item) => ({
        leadAdvocateId: item.leadAdvocateId ?? null,
        user: item.leadAdvocateId
          ? userMap.get(item.leadAdvocateId) ?? null
          : null,
        matterCount: groupCount(item),
      })),
    };
  }
}

export default MatterQueryService;