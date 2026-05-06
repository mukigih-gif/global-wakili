// apps/api/src/modules/matter/TimeTrackingService.ts

import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@global-wakili/database';
import { RateCardService, type RateCardDatabase } from './RateCardService';

type QueryArgs = Record<string, unknown>;

type TimeEntryStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
type BillingModel = 'HOURLY' | 'FIXED_FEE' | 'CONTINGENCY' | 'CAPPED_FEE';

type MoneyInput = Prisma.Decimal | string | number | null | undefined;

type TimeEntryCreateInput = {
  tenantId: string;
  matterId: string;
  advocateId: string;
  branchId?: string | null;
  description?: string | null;
  entryDate?: Date | string | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  durationHours?: MoneyInput;
  durationMinutes?: number | null;
  appliedRate?: MoneyInput;
  isBillable?: boolean | null;
  status?: TimeEntryStatus | string | null;
  billingModel?: BillingModel | string | null;
  roleKey?: string | null;
};

type TimeEntryUpdateInput = Partial<
  Omit<TimeEntryCreateInput, 'tenantId' | 'matterId' | 'advocateId'>
> & {
  matterId?: string | null;
  advocateId?: string | null;
};

type TimeEntryListParams = {
  tenantId: string;
  matterId?: string | null;
  advocateId?: string | null;
  branchId?: string | null;
  status?: TimeEntryStatus | string | null;
  statuses?: Array<TimeEntryStatus | string> | null;
  isBillable?: boolean | null;
  isInvoiced?: boolean | null;
  from?: Date | string | null;
  to?: Date | string | null;
  search?: string | null;
  page?: number;
  limit?: number;
};

type TimeEntryDecisionParams = {
  tenantId: string;
  timeEntryId: string;
  actorId?: string | null;
  reason?: string | null;
};

type AuditAction = 'CREATE' | 'UPDATE' | 'APPROVE' | 'REJECT' | 'DELETE' | 'READ';

type MatterTimeRecord = {
  id: string;
  title?: string | null;
  category?: string | null;
  clientId?: string | null;
  leadAdvocateId?: string | null;
  branchId?: string | null;
  status?: string | null;
  deletedAt?: Date | string | null;
};

type AdvocateTimeRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
  defaultRate?: MoneyInput;
  branchId?: string | null;
};

type BranchTimeRecord = {
  id: string;
  name?: string | null;
};

type TimeEntryRecord = {
  id: string;
  tenantId: string;
  matterId: string;
  advocateId: string;
  branchId?: string | null;
  invoiceId?: string | null;
  billingRunId?: string | null;
  description?: string | null;
  entryDate?: Date | string | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  durationHours?: MoneyInput;
  durationMinutes?: number | string | null;
  appliedRate?: MoneyInput;
  billableAmount?: MoneyInput;
  isBillable?: boolean | null;
  isInvoiced?: boolean | null;
  status?: TimeEntryStatus | string | null;
  billingModel?: BillingModel | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  matter?: MatterTimeRecord | null;
  advocate?: AdvocateTimeRecord | null;
  branch?: BranchTimeRecord | null;
};

type TimeEntryAggregate = {
  _sum?: {
    durationHours?: MoneyInput;
    durationMinutes?: MoneyInput;
    billableAmount?: MoneyInput;
  } | null;
  _count?: {
    id?: number | null;
  } | number | null;
};

type TimeEntryStatusGroupRow = {
  status?: TimeEntryStatus | string | null;
  _count?: {
    id?: number | null;
  } | number | null;
  _sum?: {
    durationHours?: MoneyInput;
    billableAmount?: MoneyInput;
  } | null;
};

type TimeEntryAdvocateGroupRow = {
  advocateId?: string | null;
  _count?: {
    id?: number | null;
  } | number | null;
  _sum?: {
    durationHours?: MoneyInput;
    billableAmount?: MoneyInput;
  } | null;
};

type AuditHashRecord = {
  hash?: string | null;
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

type DeleteDelegate<TRecord> = {
  delete(args: QueryArgs): Promise<TRecord>;
};

type CountDelegate = {
  count(args: QueryArgs): Promise<number>;
};

type AggregateDelegate<TAggregate> = {
  aggregate(args: QueryArgs): Promise<TAggregate>;
};

type GroupByDelegate<TRow> = {
  groupBy(args: QueryArgs): Promise<TRow[]>;
};

type TimeEntryDelegate =
  FindFirstDelegate<TimeEntryRecord> &
  FindManyDelegate<TimeEntryRecord> &
  CreateDelegate<TimeEntryRecord> &
  UpdateDelegate<TimeEntryRecord> &
  DeleteDelegate<TimeEntryRecord> &
  CountDelegate &
  AggregateDelegate<TimeEntryAggregate> &
  GroupByDelegate<TimeEntryStatusGroupRow | TimeEntryAdvocateGroupRow>;

type TimeTrackingDbClient = RateCardDatabase & {
  timeEntry: TimeEntryDelegate;
  matter: FindFirstDelegate<MatterTimeRecord>;
  user: FindFirstDelegate<AdvocateTimeRecord> & FindManyDelegate<AdvocateTimeRecord>;
  branch: FindFirstDelegate<BranchTimeRecord>;
  auditLog?: FindFirstDelegate<AuditHashRecord> & CreateDelegate<unknown>;
};

function serviceError(message: string, statusCode: number, code: string): Error {
  return Object.assign(new Error(message), {
    statusCode,
    code,
  });
}

function requiredString(value: unknown, label: string, code: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw serviceError(`${label} is required`, 422, code);
  }

  return value.trim();
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'undefined') return null;
  if (trimmed.toLowerCase() === 'null') return null;

  return trimmed;
}

function normalizeDate(value: Date | string | null | undefined, label: string): Date | null {
  if (value === undefined || value === null || value === '') return null;

  const parsed = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw serviceError(
      `Invalid time-entry ${label}`,
      422,
      `INVALID_TIME_ENTRY_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    );
  }

  return parsed;
}

function normalizeBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }

  return fallback;
}

function normalizeStatus(
  value?: string | null,
  fallback: TimeEntryStatus = 'DRAFT',
): TimeEntryStatus {
  const normalized = toNullableString(value)?.toUpperCase();

  if (
    normalized === 'DRAFT' ||
    normalized === 'SUBMITTED' ||
    normalized === 'APPROVED' ||
    normalized === 'REJECTED'
  ) {
    return normalized;
  }

  return fallback;
}

function normalizeBillingModel(value?: string | null): BillingModel {
  const normalized = toNullableString(value)?.toUpperCase();

  if (
    normalized === 'HOURLY' ||
    normalized === 'FIXED_FEE' ||
    normalized === 'CONTINGENCY' ||
    normalized === 'CAPPED_FEE'
  ) {
    return normalized;
  }

  return 'HOURLY';
}

function normalizePositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;

  return Math.min(parsed, max);
}

function toDecimal(value: MoneyInput, fallback = '0'): Prisma.Decimal {
  if (value === undefined || value === null || value === '') {
    return new Prisma.Decimal(fallback);
  }

  const decimal = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);

  if (!decimal.isFinite() || decimal.lt(0)) {
    throw serviceError(
      'Time-entry numeric values must be non-negative finite decimals',
      422,
      'INVALID_TIME_ENTRY_DECIMAL',
    );
  }

  return decimal;
}

function money(value: MoneyInput): string {
  return toDecimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toString();
}

function durationToHours(minutes: number): Prisma.Decimal {
  return new Prisma.Decimal(minutes)
    .div(60)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function hoursToMinutes(hours: Prisma.Decimal): number {
  return Number(
    hours
      .mul(60)
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
      .toString(),
  );
}

function normalizeDuration(params: {
  startTime?: Date | null;
  endTime?: Date | null;
  durationHours?: MoneyInput;
  durationMinutes?: number | string | null;
}) {
  if (params.startTime && params.endTime) {
    if (params.startTime >= params.endTime) {
      throw serviceError(
        'Time-entry startTime must be before endTime',
        422,
        'INVALID_TIME_ENTRY_TIME_RANGE',
      );
    }

    const durationMs = params.endTime.getTime() - params.startTime.getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
    const durationHours = durationToHours(durationMinutes);

    return {
      durationHours,
      durationMinutes,
    };
  }

  const parsedMinutes =
    typeof params.durationMinutes === 'string'
      ? Number(params.durationMinutes)
      : params.durationMinutes;

  if (typeof parsedMinutes === 'number' && Number.isInteger(parsedMinutes)) {
    if (parsedMinutes <= 0) {
      throw serviceError(
        'durationMinutes must be greater than zero',
        422,
        'INVALID_TIME_ENTRY_DURATION_MINUTES',
      );
    }

    return {
      durationHours: durationToHours(parsedMinutes),
      durationMinutes: parsedMinutes,
    };
  }

  const durationHours = toDecimal(params.durationHours, '0');

  if (durationHours.lte(0)) {
    throw serviceError(
      'durationHours or start/end time is required',
      422,
      'TIME_ENTRY_DURATION_REQUIRED',
    );
  }

  return {
    durationHours: durationHours.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
    durationMinutes: hoursToMinutes(durationHours),
  };
}

function calculateBillableAmount(params: {
  durationHours: Prisma.Decimal;
  appliedRate: Prisma.Decimal;
  isBillable: boolean;
  billingModel: BillingModel;
}): Prisma.Decimal {
  if (!params.isBillable) {
    return new Prisma.Decimal(0);
  }

  if (params.billingModel !== 'HOURLY') {
    return new Prisma.Decimal(0);
  }

  return params.durationHours
    .mul(params.appliedRate)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function timeEntrySelect() {
  return {
    id: true,
    tenantId: true,
    matterId: true,
    advocateId: true,
    branchId: true,
    invoiceId: true,
    billingRunId: true,
    description: true,
    entryDate: true,
    startTime: true,
    endTime: true,
    durationHours: true,
    durationMinutes: true,
    appliedRate: true,
    billableAmount: true,
    isBillable: true,
    isInvoiced: true,
    status: true,
    billingModel: true,
    createdAt: true,
    updatedAt: true,
    matter: {
      select: {
        id: true,
        title: true,
        category: true,
        clientId: true,
        leadAdvocateId: true,
        status: true,
        deletedAt: true,
      },
    },
    advocate: {
      select: {
        id: true,
        name: true,
        email: true,
        defaultRate: true,
        branchId: true,
      },
    },
    branch: {
      select: {
        id: true,
        name: true,
      },
    },
  };
}

function compactTimeEntry(entry: TimeEntryRecord) {
  return {
    id: entry.id,
    tenantId: entry.tenantId,
    matterId: entry.matterId,
    matter: entry.matter ?? null,
    advocateId: entry.advocateId,
    advocate: entry.advocate ?? null,
    branchId: entry.branchId ?? null,
    branch: entry.branch ?? null,
    invoiceId: entry.invoiceId ?? null,
    billingRunId: entry.billingRunId ?? null,
    description: entry.description ?? null,
    entryDate: entry.entryDate,
    startTime: entry.startTime ?? null,
    endTime: entry.endTime ?? null,
    durationHours: money(entry.durationHours),
    durationMinutes: entry.durationMinutes ?? null,
    appliedRate: money(entry.appliedRate),
    billableAmount: money(entry.billableAmount),
    isBillable: entry.isBillable === true,
    isInvoiced: entry.isInvoiced === true,
    status: entry.status,
    billingModel: entry.billingModel,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function aggregateNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toString?: unknown }).toString === 'function'
  ) {
    const parsed = Number((value as { toString(): string }).toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';

  if (typeof value !== 'object') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const object = value as Record<string, unknown>;

  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(',')}}`;
}

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function jsonSafe(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) return value.map((item) => jsonSafe(item));

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = jsonSafe(nested);
    }

    return output;
  }

  return value;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readJsonField(value: unknown, key: string): unknown {
  return isJsonRecord(value) ? value[key] ?? null : null;
}

function changedJsonFields(beforeData: unknown, afterData: unknown): string[] {
  if (!isJsonRecord(beforeData) || !isJsonRecord(afterData)) {
    return [];
  }

  const keys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);

  return [...keys].filter(
    (key) =>
      JSON.stringify(readJsonField(beforeData, key)) !==
      JSON.stringify(readJsonField(afterData, key)),
  );
}

async function assertTenantMatter(
  db: TimeTrackingDbClient,
  params: {
    tenantId: string;
    matterId: string;
  },
): Promise<MatterTimeRecord> {
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
      clientId: true,
      leadAdvocateId: true,
      branchId: true,
      status: true,
      deletedAt: true,
    },
  });

  if (!matter) {
    throw serviceError('Matter not found', 404, 'TIME_ENTRY_MATTER_NOT_FOUND');
  }

  return matter;
}

async function assertTenantAdvocate(
  db: TimeTrackingDbClient,
  params: {
    tenantId: string;
    advocateId: string;
  },
): Promise<AdvocateTimeRecord> {
  const advocate = await db.user.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.advocateId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      email: true,
      defaultRate: true,
      branchId: true,
    },
  });

  if (!advocate) {
    throw serviceError(
      'Advocate not found or inactive',
      404,
      'TIME_ENTRY_ADVOCATE_NOT_FOUND',
    );
  }

  return advocate;
}

async function assertTenantBranch(
  db: TimeTrackingDbClient,
  params: {
    tenantId: string;
    branchId?: string | null;
  },
): Promise<BranchTimeRecord | null> {
  const branchId = toNullableString(params.branchId);

  if (!branchId) return null;

  const branch = await db.branch.findFirst({
    where: {
      tenantId: params.tenantId,
      id: branchId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!branch) {
    throw serviceError('Branch not found', 404, 'TIME_ENTRY_BRANCH_NOT_FOUND');
  }

  return branch;
}

async function resolveAppliedRate(
  db: TimeTrackingDbClient,
  params: {
    tenantId: string;
    matterId: string;
    advocate: AdvocateTimeRecord;
    appliedRate?: MoneyInput;
    roleKey?: string | null;
    asOf?: Date | string | null;
  },
): Promise<Prisma.Decimal> {
  if (
    params.appliedRate !== undefined &&
    params.appliedRate !== null &&
    params.appliedRate !== ''
  ) {
    return toDecimal(params.appliedRate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  const resolved = await RateCardService.resolveApplicableRate(db, {
    tenantId: params.tenantId,
    matterId: params.matterId,
    roleKey: toNullableString(params.roleKey) ?? 'associate',
    asOf: params.asOf ?? new Date(),
  });

  const rateFromCard = toDecimal(resolved?.rateAmount ?? resolved?.rate ?? null);

  if (rateFromCard.gt(0)) {
    return rateFromCard.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  return toDecimal(params.advocate.defaultRate ?? 0).toDecimalPlaces(
    2,
    Prisma.Decimal.ROUND_HALF_UP,
  );
}

async function writeTimeAudit(
  db: TimeTrackingDbClient,
  params: {
    tenantId: string;
    userId?: string | null;
    action: AuditAction;
    eventCode: string;
    timeEntryId: string;
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
    reason?: string | null;
  },
) {
  if (!db.auditLog?.create || !db.auditLog?.findFirst) return null;

  const createdAt = new Date().toISOString();

  const previous = await db.auditLog.findFirst({
    where: {
      tenantId: params.tenantId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      hash: true,
    },
  });

  const previousHash =
    typeof previous?.hash === 'string' && previous.hash.trim()
      ? previous.hash
      : '0'.repeat(64);

  const beforeData = params.beforeData
    ? (jsonSafe(params.beforeData) as Record<string, unknown>)
    : null;

  const afterData = {
    ...(jsonSafe(params.afterData ?? {}) as Record<string, unknown>),
    eventCode: params.eventCode,
    domain: 'MATTER_TIME',
    timeEntryId: params.timeEntryId,
    timestamp: createdAt,
  };

  const changedFields = changedJsonFields(beforeData, afterData);

  const hash = hashPayload({
    tenantId: params.tenantId,
    userId: params.userId ?? null,
    action: params.action,
    entityType: 'TIME_ENTRY',
    entityId: params.timeEntryId,
    beforeData,
    afterData,
    changedFields,
    previousHash,
    createdAt,
    nonce: randomUUID(),
  });

  return db.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: params.action,
      severity:
        params.action === 'APPROVE' || params.action === 'REJECT'
          ? 'WARNING'
          : params.action === 'DELETE'
            ? 'HIGH'
            : 'INFO',
      entityType: 'TIME_ENTRY',
      entityId: params.timeEntryId,
      beforeData,
      afterData,
      changedFields,
      ipAddress: null,
      userAgent: null,
      hash,
      previousHash,
      success: true,
      failureReason: null,
      correlationId: null,
      reason: params.reason ?? null,
    },
  });
}

function buildListWhere(params: TimeEntryListParams) {
  const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIME_ENTRY_TENANT_REQUIRED');

  const where: Record<string, unknown> = {
    tenantId,
  };

  const matterId = toNullableString(params.matterId);
  if (matterId) where.matterId = matterId;

  const advocateId = toNullableString(params.advocateId);
  if (advocateId) where.advocateId = advocateId;

  const branchId = toNullableString(params.branchId);
  if (branchId) where.branchId = branchId;

  const statuses = Array.isArray(params.statuses)
    ? params.statuses
        .map((status) => normalizeStatus(String(status), 'DRAFT'))
        .filter(Boolean)
    : [];

  const singleStatus = toNullableString(params.status);

  if (statuses.length > 0) {
    where.status = {
      in: [...new Set(statuses)],
    };
  } else if (singleStatus) {
    where.status = normalizeStatus(singleStatus, 'DRAFT');
  }

  if (typeof params.isBillable === 'boolean') {
    where.isBillable = params.isBillable;
  }

  if (typeof params.isInvoiced === 'boolean') {
    where.isInvoiced = params.isInvoiced;
  }

  const from = normalizeDate(params.from, 'from');
  const to = normalizeDate(params.to, 'to');

  if (from || to) {
    where.entryDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const search = toNullableString(params.search);

  if (search) {
    where.AND = [
      {
        OR: [
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            matter: {
              is: {
                title: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            advocate: {
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
      },
    ];
  }

  return where;
}

function aggregateCount(aggregate: TimeEntryAggregate): number {
  if (typeof aggregate._count === 'number') return aggregate._count;
  return aggregate._count?.id ?? 0;
}

function groupCount(row: TimeEntryStatusGroupRow | TimeEntryAdvocateGroupRow): number {
  if (typeof row._count === 'number') return row._count;
  return row._count?.id ?? 0;
}

function uniqueAdvocateIds(rows: TimeEntryAdvocateGroupRow[]): string[] {
  return [
    ...new Set(
      rows
        .map((row) => toNullableString(row.advocateId))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

function buildAdvocateMap(advocates: AdvocateTimeRecord[]): Map<string, AdvocateTimeRecord> {
  return new Map(advocates.map((advocate) => [advocate.id, advocate]));
}

export class TimeTrackingService {
  /**
   * Creates a time entry under strict tenant, matter, advocate, branch, and rate-card validation.
   */
  static async createTimeEntry(db: TimeTrackingDbClient, input: TimeEntryCreateInput) {
    const tenantId = requiredString(input.tenantId, 'Tenant ID', 'TIME_ENTRY_TENANT_REQUIRED');
    const matterId = requiredString(input.matterId, 'Matter ID', 'TIME_ENTRY_MATTER_REQUIRED');
    const advocateId = requiredString(
      input.advocateId,
      'Advocate ID',
      'TIME_ENTRY_ADVOCATE_REQUIRED',
    );

    const entryDate = normalizeDate(input.entryDate, 'entry date') ?? new Date();
    const startTime = normalizeDate(input.startTime, 'start time');
    const endTime = normalizeDate(input.endTime, 'end time');
    const isBillable = normalizeBoolean(input.isBillable, true);
    const billingModel = normalizeBillingModel(input.billingModel);
    const status = normalizeStatus(input.status, 'DRAFT');

    const [matter, advocate] = await Promise.all([
      assertTenantMatter(db, { tenantId, matterId }),
      assertTenantAdvocate(db, { tenantId, advocateId }),
    ]);

    const branchId =
      toNullableString(input.branchId) ??
      toNullableString(matter.branchId) ??
      toNullableString(advocate.branchId);

    await assertTenantBranch(db, { tenantId, branchId });

    const duration = normalizeDuration({
      startTime,
      endTime,
      durationHours: input.durationHours,
      durationMinutes: input.durationMinutes,
    });

    const appliedRate = await resolveAppliedRate(db, {
      tenantId,
      matterId,
      advocate,
      appliedRate: input.appliedRate,
      roleKey: input.roleKey,
      asOf: entryDate,
    });

    const billableAmount = calculateBillableAmount({
      durationHours: duration.durationHours,
      appliedRate,
      isBillable,
      billingModel,
    });

    const created = await db.timeEntry.create({
      data: {
        tenantId,
        matterId,
        advocateId,
        branchId,
        description: toNullableString(input.description),
        entryDate,
        startTime,
        endTime,
        durationHours: duration.durationHours,
        durationMinutes: duration.durationMinutes,
        appliedRate,
        billableAmount,
        isBillable,
        isInvoiced: false,
        status,
        billingModel,
      },
      select: timeEntrySelect(),
    });

    await writeTimeAudit(db, {
      tenantId,
      userId: advocateId,
      action: 'CREATE',
      eventCode: 'TIME_ENTRY_CREATED',
      timeEntryId: created.id,
      afterData: compactTimeEntry(created),
    });

    return compactTimeEntry(created);
  }

  static async updateTimeEntry(
    db: TimeTrackingDbClient,
    params: {
      tenantId: string;
      timeEntryId: string;
      actorId?: string | null;
      input: TimeEntryUpdateInput;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIME_ENTRY_TENANT_REQUIRED');
    const timeEntryId = requiredString(
      params.timeEntryId,
      'Time entry ID',
      'TIME_ENTRY_ID_REQUIRED',
    );

    const existing = await db.timeEntry.findFirst({
      where: {
        tenantId,
        id: timeEntryId,
      },
      select: timeEntrySelect(),
    });

    if (!existing) {
      throw serviceError('Time entry not found', 404, 'TIME_ENTRY_NOT_FOUND');
    }

    if (existing.isInvoiced) {
      throw serviceError(
        'Invoiced time entries cannot be edited',
        409,
        'TIME_ENTRY_ALREADY_INVOICED',
      );
    }

    if (existing.status === 'APPROVED' && params.input.status === undefined) {
      throw serviceError(
        'Approved time entries require an approval workflow change before editing',
        409,
        'TIME_ENTRY_APPROVED_LOCKED',
      );
    }

    const matterId = toNullableString(params.input.matterId) ?? existing.matterId;
    const advocateId = toNullableString(params.input.advocateId) ?? existing.advocateId;

    const [matter, advocate] = await Promise.all([
      assertTenantMatter(db, { tenantId, matterId }),
      assertTenantAdvocate(db, { tenantId, advocateId }),
    ]);

    const branchId =
      params.input.branchId !== undefined
        ? toNullableString(params.input.branchId)
        : existing.branchId ?? matter.branchId ?? advocate.branchId ?? null;

    await assertTenantBranch(db, { tenantId, branchId });

    const entryDate =
      params.input.entryDate !== undefined
        ? normalizeDate(params.input.entryDate, 'entry date') ?? existing.entryDate
        : existing.entryDate;

    const startTime =
      params.input.startTime !== undefined
        ? normalizeDate(params.input.startTime, 'start time')
        : normalizeDate(existing.startTime ?? null, 'start time');

    const endTime =
      params.input.endTime !== undefined
        ? normalizeDate(params.input.endTime, 'end time')
        : normalizeDate(existing.endTime ?? null, 'end time');

    const duration = normalizeDuration({
      startTime,
      endTime,
      durationHours:
        params.input.durationHours !== undefined
          ? params.input.durationHours
          : existing.durationHours,
      durationMinutes:
        params.input.durationMinutes !== undefined
          ? params.input.durationMinutes
          : existing.durationMinutes,
    });

    const isBillable =
      params.input.isBillable !== undefined
        ? normalizeBoolean(params.input.isBillable, existing.isBillable === true)
        : existing.isBillable === true;

    const billingModel =
      params.input.billingModel !== undefined
        ? normalizeBillingModel(params.input.billingModel)
        : normalizeBillingModel(existing.billingModel);

    const appliedRate = await resolveAppliedRate(db, {
      tenantId,
      matterId,
      advocate,
      appliedRate:
        params.input.appliedRate !== undefined
          ? params.input.appliedRate
          : existing.appliedRate,
      roleKey: params.input.roleKey,
      asOf: entryDate,
    });

    const billableAmount = calculateBillableAmount({
      durationHours: duration.durationHours,
      appliedRate,
      isBillable,
      billingModel,
    });

    const updated = await db.timeEntry.update({
      where: {
        id: timeEntryId,
      },
      data: {
        matterId,
        advocateId,
        branchId,
        ...(params.input.description !== undefined
          ? { description: toNullableString(params.input.description) }
          : {}),
        entryDate,
        startTime,
        endTime,
        durationHours: duration.durationHours,
        durationMinutes: duration.durationMinutes,
        appliedRate,
        billableAmount,
        isBillable,
        ...(params.input.status !== undefined
          ? { status: normalizeStatus(params.input.status) }
          : {}),
        billingModel,
      },
      select: timeEntrySelect(),
    });

    await writeTimeAudit(db, {
      tenantId,
      userId: toNullableString(params.actorId) ?? advocateId,
      action: 'UPDATE',
      eventCode: 'TIME_ENTRY_UPDATED',
      timeEntryId,
      beforeData: compactTimeEntry(existing),
      afterData: compactTimeEntry(updated),
    });

    return compactTimeEntry(updated);
  }

  static async submitTimeEntry(db: TimeTrackingDbClient, params: TimeEntryDecisionParams) {
    return this.transitionStatus(db, {
      ...params,
      nextStatus: 'SUBMITTED',
      action: 'UPDATE',
      eventCode: 'TIME_ENTRY_SUBMITTED',
    });
  }

  static async approveTimeEntry(db: TimeTrackingDbClient, params: TimeEntryDecisionParams) {
    return this.transitionStatus(db, {
      ...params,
      nextStatus: 'APPROVED',
      action: 'APPROVE',
      eventCode: 'TIME_ENTRY_APPROVED',
    });
  }

  static async rejectTimeEntry(db: TimeTrackingDbClient, params: TimeEntryDecisionParams) {
    return this.transitionStatus(db, {
      ...params,
      nextStatus: 'REJECTED',
      action: 'REJECT',
      eventCode: 'TIME_ENTRY_REJECTED',
    });
  }

  private static async transitionStatus(
    db: TimeTrackingDbClient,
    params: TimeEntryDecisionParams & {
      nextStatus: TimeEntryStatus;
      action: 'UPDATE' | 'APPROVE' | 'REJECT';
      eventCode: string;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIME_ENTRY_TENANT_REQUIRED');
    const timeEntryId = requiredString(
      params.timeEntryId,
      'Time entry ID',
      'TIME_ENTRY_ID_REQUIRED',
    );

    const existing = await db.timeEntry.findFirst({
      where: {
        tenantId,
        id: timeEntryId,
      },
      select: timeEntrySelect(),
    });

    if (!existing) {
      throw serviceError('Time entry not found', 404, 'TIME_ENTRY_NOT_FOUND');
    }

    if (existing.isInvoiced) {
      throw serviceError(
        'Invoiced time entries cannot change approval status',
        409,
        'TIME_ENTRY_ALREADY_INVOICED',
      );
    }

    if (
      params.nextStatus === 'APPROVED' &&
      !['SUBMITTED', 'DRAFT', 'REJECTED'].includes(String(existing.status ?? ''))
    ) {
      throw serviceError(
        'Time entry is not eligible for approval',
        409,
        'TIME_ENTRY_APPROVAL_NOT_ALLOWED',
      );
    }

    const updated = await db.timeEntry.update({
      where: {
        id: timeEntryId,
      },
      data: {
        status: params.nextStatus,
      },
      select: timeEntrySelect(),
    });

    await writeTimeAudit(db, {
      tenantId,
      userId: toNullableString(params.actorId),
      action: params.action,
      eventCode: params.eventCode,
      timeEntryId,
      beforeData: compactTimeEntry(existing),
      afterData: {
        ...compactTimeEntry(updated),
        reason: toNullableString(params.reason),
      },
      reason: toNullableString(params.reason),
    });

    return compactTimeEntry(updated);
  }

  static async getTimeEntryById(
    db: TimeTrackingDbClient,
    params: {
      tenantId: string;
      timeEntryId: string;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIME_ENTRY_TENANT_REQUIRED');
    const timeEntryId = requiredString(
      params.timeEntryId,
      'Time entry ID',
      'TIME_ENTRY_ID_REQUIRED',
    );

    const entry = await db.timeEntry.findFirst({
      where: {
        tenantId,
        id: timeEntryId,
      },
      select: timeEntrySelect(),
    });

    if (!entry) {
      throw serviceError('Time entry not found', 404, 'TIME_ENTRY_NOT_FOUND');
    }

    return compactTimeEntry(entry);
  }

  static async listTimeEntries(db: TimeTrackingDbClient, params: TimeEntryListParams) {
    const page = normalizePositiveInt(params.page, 1, 1000000);
    const limit = normalizePositiveInt(params.limit, 25, 100);
    const skip = (page - 1) * limit;
    const where = buildListWhere(params);

    const [rows, total, aggregate] = await Promise.all([
      db.timeEntry.findMany({
        where,
        select: timeEntrySelect(),
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.timeEntry.count({ where }),
      db.timeEntry.aggregate({
        where,
        _sum: {
          durationHours: true,
          durationMinutes: true,
          billableAmount: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    return {
      data: rows.map(compactTimeEntry),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
      totals: {
        entryCount: aggregateCount(aggregate) || total,
        durationHours: aggregateNumber(aggregate._sum?.durationHours).toFixed(2),
        durationMinutes: aggregateNumber(aggregate._sum?.durationMinutes),
        billableAmount: aggregateNumber(aggregate._sum?.billableAmount).toFixed(2),
      },
    };
  }

  static async deleteDraftTimeEntry(
    db: TimeTrackingDbClient,
    params: {
      tenantId: string;
      timeEntryId: string;
      actorId?: string | null;
      reason?: string | null;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIME_ENTRY_TENANT_REQUIRED');
    const timeEntryId = requiredString(
      params.timeEntryId,
      'Time entry ID',
      'TIME_ENTRY_ID_REQUIRED',
    );

    const existing = await db.timeEntry.findFirst({
      where: {
        tenantId,
        id: timeEntryId,
      },
      select: timeEntrySelect(),
    });

    if (!existing) {
      throw serviceError('Time entry not found', 404, 'TIME_ENTRY_NOT_FOUND');
    }

    if (existing.status !== 'DRAFT') {
      throw serviceError(
        'Only draft time entries can be deleted',
        409,
        'TIME_ENTRY_DELETE_NOT_ALLOWED',
      );
    }

    if (existing.isInvoiced) {
      throw serviceError(
        'Invoiced time entries cannot be deleted',
        409,
        'TIME_ENTRY_ALREADY_INVOICED',
      );
    }

    await db.timeEntry.delete({
      where: {
        id: timeEntryId,
      },
    });

    await writeTimeAudit(db, {
      tenantId,
      userId: toNullableString(params.actorId) ?? existing.advocateId,
      action: 'DELETE',
      eventCode: 'TIME_ENTRY_DELETED',
      timeEntryId,
      beforeData: compactTimeEntry(existing),
      afterData: {
        deleted: true,
        reason: toNullableString(params.reason),
      },
      reason: toNullableString(params.reason),
    });

    return {
      deleted: true,
      timeEntryId,
    };
  }

  static async getMatterTimeSummary(
    db: TimeTrackingDbClient,
    params: {
      tenantId: string;
      matterId: string;
      from?: Date | string | null;
      to?: Date | string | null;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIME_ENTRY_TENANT_REQUIRED');
    const matterId = requiredString(params.matterId, 'Matter ID', 'TIME_ENTRY_MATTER_REQUIRED');

    await assertTenantMatter(db, { tenantId, matterId });

    const from = normalizeDate(params.from, 'from');
    const to = normalizeDate(params.to, 'to');

    const where = buildListWhere({
      tenantId,
      matterId,
      from,
      to,
    });

    const [aggregate, byStatus, byAdvocate, recentEntries] = await Promise.all([
      db.timeEntry.aggregate({
        where,
        _sum: {
          durationHours: true,
          durationMinutes: true,
          billableAmount: true,
        },
        _count: {
          id: true,
        },
      }),
      db.timeEntry.groupBy({
        by: ['status'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          durationHours: true,
          billableAmount: true,
        },
      }) as Promise<TimeEntryStatusGroupRow[]>,
      db.timeEntry.groupBy({
        by: ['advocateId'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          durationHours: true,
          billableAmount: true,
        },
      }) as Promise<TimeEntryAdvocateGroupRow[]>,
      db.timeEntry.findMany({
        where,
        select: timeEntrySelect(),
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),
    ]);

    const advocateIds = uniqueAdvocateIds(byAdvocate);
    const advocates = advocateIds.length
      ? await db.user.findMany({
          where: {
            tenantId,
            id: {
              in: advocateIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const advocateMap = buildAdvocateMap(advocates);

    return {
      tenantId,
      matterId,
      totals: {
        entryCount: aggregateCount(aggregate),
        durationHours: aggregateNumber(aggregate._sum?.durationHours).toFixed(2),
        durationMinutes: aggregateNumber(aggregate._sum?.durationMinutes),
        billableAmount: aggregateNumber(aggregate._sum?.billableAmount).toFixed(2),
      },
      byStatus: byStatus.map((row) => ({
        status: row.status,
        entryCount: groupCount(row),
        durationHours: aggregateNumber(row._sum?.durationHours).toFixed(2),
        billableAmount: aggregateNumber(row._sum?.billableAmount).toFixed(2),
      })),
      byAdvocate: byAdvocate.map((row) => ({
        advocateId: row.advocateId,
        advocate: row.advocateId ? advocateMap.get(row.advocateId) ?? null : null,
        entryCount: groupCount(row),
        durationHours: aggregateNumber(row._sum?.durationHours).toFixed(2),
        billableAmount: aggregateNumber(row._sum?.billableAmount).toFixed(2),
      })),
      recentEntries: recentEntries.map(compactTimeEntry),
      generatedAt: new Date(),
    };
  }

  static async calculateEntryAmount(
    db: TimeTrackingDbClient,
    params: {
      tenantId: string;
      matterId: string;
      advocateId: string;
      durationHours?: MoneyInput;
      durationMinutes?: number | null;
      appliedRate?: MoneyInput;
      roleKey?: string | null;
      isBillable?: boolean | null;
      billingModel?: BillingModel | string | null;
      asOf?: Date | string | null;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'TIME_ENTRY_TENANT_REQUIRED');
    const matterId = requiredString(params.matterId, 'Matter ID', 'TIME_ENTRY_MATTER_REQUIRED');
    const advocateId = requiredString(
      params.advocateId,
      'Advocate ID',
      'TIME_ENTRY_ADVOCATE_REQUIRED',
    );

    await assertTenantMatter(db, { tenantId, matterId });
    const advocate = await assertTenantAdvocate(db, { tenantId, advocateId });

    const duration = normalizeDuration({
      durationHours: params.durationHours,
      durationMinutes: params.durationMinutes,
    });

    const asOf = normalizeDate(params.asOf, 'as of') ?? new Date();

    const appliedRate = await resolveAppliedRate(db, {
      tenantId,
      matterId,
      advocate,
      appliedRate: params.appliedRate,
      roleKey: params.roleKey,
      asOf,
    });

    const billingModel = normalizeBillingModel(params.billingModel);
    const isBillable = normalizeBoolean(params.isBillable, true);

    const billableAmount = calculateBillableAmount({
      durationHours: duration.durationHours,
      appliedRate,
      isBillable,
      billingModel,
    });

    return {
      durationHours: duration.durationHours.toString(),
      durationMinutes: duration.durationMinutes,
      appliedRate: appliedRate.toString(),
      billingModel,
      isBillable,
      billableAmount: billableAmount.toString(),
    };
  }

  /**
   * Backward-compatible method aliases.
   */
  static async create(db: TimeTrackingDbClient, input: TimeEntryCreateInput) {
    return this.createTimeEntry(db, input);
  }

  static async update(
    db: TimeTrackingDbClient,
    params: {
      tenantId: string;
      timeEntryId: string;
      actorId?: string | null;
      input: TimeEntryUpdateInput;
    },
  ) {
    return this.updateTimeEntry(db, params);
  }

  static async list(db: TimeTrackingDbClient, params: TimeEntryListParams) {
    return this.listTimeEntries(db, params);
  }

  static async getById(
    db: TimeTrackingDbClient,
    params: {
      tenantId: string;
      timeEntryId: string;
    },
  ) {
    return this.getTimeEntryById(db, params);
  }

  static async approve(db: TimeTrackingDbClient, params: TimeEntryDecisionParams) {
    return this.approveTimeEntry(db, params);
  }

  static async reject(db: TimeTrackingDbClient, params: TimeEntryDecisionParams) {
    return this.rejectTimeEntry(db, params);
  }

  static async submit(db: TimeTrackingDbClient, params: TimeEntryDecisionParams) {
    return this.submitTimeEntry(db, params);
  }
}

export default TimeTrackingService;


