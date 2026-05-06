// apps/api/src/modules/matter/TimeApprovalService.ts

import { createHash, randomUUID } from 'crypto';

type QueryArgs = Record<string, unknown>;

type TimeEntryStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

type AuditAction = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'AUTHORIZE' | 'VERIFY';

type TimeApprovalDecision = {
  tenantId: string;
  timeEntryId: string;
  actorId: string;
  reason?: string | null;
};

type TimeBulkApprovalDecision = {
  tenantId: string;
  timeEntryIds: string[];
  actorId: string;
  reason?: string | null;
};

type TimeApprovalQueueParams = {
  tenantId: string;
  matterId?: string | null;
  advocateId?: string | null;
  branchId?: string | null;
  status?: TimeEntryStatus | string | null;
  statuses?: Array<TimeEntryStatus | string> | null;
  from?: Date | string | null;
  to?: Date | string | null;
  page?: number;
  limit?: number;
};

type TimeApprovalSummaryParams = {
  tenantId: string;
  matterId?: string | null;
  advocateId?: string | null;
  branchId?: string | null;
  from?: Date | string | null;
  to?: Date | string | null;
};

type MoneyLike = {
  toString(): string;
};

type ClientRecord = {
  id: string;
  name?: string | null;
  clientCode?: string | null;
  email?: string | null;
};

type MatterRecord = {
  id: string;
  title?: string | null;
  category?: string | null;
  clientId?: string | null;
  leadAdvocateId?: string | null;
  branchId?: string | null;
  status?: string | null;
  deletedAt?: Date | string | null;
  client?: ClientRecord | null;
};

type BranchRecord = {
  id: string;
  name?: string | null;
};

type UserRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
  branchId?: string | null;
  role?: string | null;
  systemRole?: string | null;
  tenantRole?: string | null;
};

type TimeEntryRecord = {
  id: string;
  tenantId: string;
  matterId?: string | null;
  advocateId?: string | null;
  branchId?: string | null;
  invoiceId?: string | null;
  billingRunId?: string | null;
  description?: string | null;
  entryDate?: Date | string | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  durationHours?: unknown;
  durationMinutes?: number | string | null;
  appliedRate?: unknown;
  billableAmount?: unknown;
  isBillable?: boolean | null;
  isInvoiced?: boolean | null;
  status?: TimeEntryStatus | string | null;
  billingModel?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  matter?: MatterRecord | null;
  advocate?: UserRecord | null;
  branch?: BranchRecord | null;
};

type CompactTimeEntry = ReturnType<typeof compactTimeEntry>;

type AuditHashRecord = {
  hash?: string | null;
};

type AggregateCount = {
  id?: number | null;
};

type AggregateSum = {
  durationHours?: unknown;
  durationMinutes?: unknown;
  billableAmount?: unknown;
};

type TimeEntryAggregate = {
  _sum?: AggregateSum | null;
  _count?: AggregateCount | number | null;
};

type TimeEntryStatusGroupRow = {
  status?: TimeEntryStatus | string | null;
  _sum?: AggregateSum | null;
  _count?: AggregateCount | number | null;
};

type TimeEntryAdvocateGroupRow = {
  advocateId?: string | null;
  _sum?: AggregateSum | null;
  _count?: AggregateCount | number | null;
};

type TimeEntryMatterGroupRow = {
  matterId?: string | null;
  _sum?: AggregateSum | null;
  _count?: AggregateCount | number | null;
};

type FailedBulkDecision = {
  timeEntryId: string;
  error: string;
  code?: string;
};

type FindFirstDelegate<TRecord> = {
  findFirst(args: QueryArgs): Promise<TRecord | null>;
};

type FindManyDelegate<TRecord> = {
  findMany(args: QueryArgs): Promise<TRecord[]>;
};

type UpdateDelegate<TRecord> = {
  update(args: QueryArgs): Promise<TRecord>;
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

type CreateDelegate<TRecord> = {
  create(args: QueryArgs): Promise<TRecord>;
};

type TimeEntryDelegate = FindFirstDelegate<TimeEntryRecord> &
  FindManyDelegate<TimeEntryRecord> &
  UpdateDelegate<TimeEntryRecord> &
  CountDelegate &
  AggregateDelegate<TimeEntryAggregate> &
  GroupByDelegate<TimeEntryStatusGroupRow | TimeEntryAdvocateGroupRow | TimeEntryMatterGroupRow>;

type TimeApprovalDbClient = {
  timeEntry: TimeEntryDelegate;
  user: FindFirstDelegate<UserRecord> & FindManyDelegate<UserRecord>;
  matter: FindManyDelegate<MatterRecord>;
  auditLog?: FindFirstDelegate<AuditHashRecord> & CreateDelegate<unknown>;
  $transaction?: <T>(callback: (tx: TimeApprovalDbClient) => Promise<T>) => Promise<T>;
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

function normalizeStatus(
  value: unknown,
  fallback: TimeEntryStatus = 'SUBMITTED',
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

function normalizeStatusArray(value: unknown): TimeEntryStatus[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<TimeEntryStatus>();
  const output: TimeEntryStatus[] = [];

  for (const item of value) {
    const status = normalizeStatus(item, 'SUBMITTED');

    if (seen.has(status)) {
      continue;
    }

    seen.add(status);
    output.push(status);
  }

  return output;
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
    throw serviceError(
      `Invalid time approval ${label}`,
      422,
      `INVALID_TIME_APPROVAL_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    );
  }

  return parsed;
}

function normalizePositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
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

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

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
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => jsonSafe(item));
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = jsonSafe(nested);
    }

    return output;
  }

  return value;
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
        branchId: true,
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
      },
    },
    advocate: {
      select: {
        id: true,
        name: true,
        email: true,
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
    matterId: entry.matterId ?? null,
    matter: entry.matter ?? null,
    advocateId: entry.advocateId ?? null,
    advocate: entry.advocate ?? null,
    branchId: entry.branchId ?? null,
    branch: entry.branch ?? null,
    invoiceId: entry.invoiceId ?? null,
    billingRunId: entry.billingRunId ?? null,
    description: entry.description ?? null,
    entryDate: entry.entryDate ?? null,
    startTime: entry.startTime ?? null,
    endTime: entry.endTime ?? null,
    durationHours: money(entry.durationHours),
    durationMinutes: entry.durationMinutes ?? null,
    appliedRate: money(entry.appliedRate),
    billableAmount: money(entry.billableAmount),
    isBillable: entry.isBillable === true,
    isInvoiced: entry.isInvoiced === true,
    status: entry.status ?? null,
    billingModel: entry.billingModel ?? null,
    createdAt: entry.createdAt ?? null,
    updatedAt: entry.updatedAt ?? null,
  };
}

function buildApprovalWhere(params: TimeApprovalQueueParams | TimeApprovalSummaryParams) {
  const tenantId = requiredString(
    params.tenantId,
    'Tenant ID',
    'TIME_APPROVAL_TENANT_REQUIRED',
  );

  const where: Record<string, unknown> = {
    tenantId,
  };

  const matterId = toNullableString(params.matterId);
  if (matterId) {
    where.matterId = matterId;
  }

  const advocateId = toNullableString(params.advocateId);
  if (advocateId) {
    where.advocateId = advocateId;
  }

  const branchId = toNullableString(params.branchId);
  if (branchId) {
    where.branchId = branchId;
  }

  const statuses = 'statuses' in params ? normalizeStatusArray(params.statuses) : [];
  const status = 'status' in params ? toNullableString(params.status) : null;

  if (statuses.length > 0) {
    where.status = {
      in: statuses,
    };
  } else if (status) {
    where.status = normalizeStatus(status);
  }

  const from = normalizeDate(params.from, 'from');
  const to = normalizeDate(params.to, 'to');

  if (from || to) {
    where.entryDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  return where;
}

async function assertTenantUser(
  db: TimeApprovalDbClient,
  params: {
    tenantId: string;
    userId: string;
    label?: string;
  },
): Promise<UserRecord> {
  const user = await db.user.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.userId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      email: true,
      branchId: true,
      role: true,
      systemRole: true,
      tenantRole: true,
    },
  });

  if (!user) {
    throw serviceError(
      `${params.label ?? 'User'} not found or inactive`,
      404,
      'TIME_APPROVAL_USER_NOT_FOUND',
    );
  }

  return user;
}

async function getTimeEntryOrThrow(
  db: TimeApprovalDbClient,
  params: {
    tenantId: string;
    timeEntryId: string;
  },
): Promise<TimeEntryRecord> {
  const entry = await db.timeEntry.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.timeEntryId,
    },
    select: timeEntrySelect(),
  });

  if (!entry) {
    throw serviceError('Time entry not found', 404, 'TIME_ENTRY_NOT_FOUND');
  }

  return entry;
}

function assertApprovalEligibility(entry: TimeEntryRecord): void {
  if (entry.isInvoiced === true || entry.invoiceId || entry.billingRunId) {
    throw serviceError(
      'Invoiced time entries cannot be approved or rejected',
      409,
      'TIME_ENTRY_ALREADY_INVOICED',
    );
  }

  if (!['DRAFT', 'SUBMITTED', 'REJECTED'].includes(String(entry.status ?? '').toUpperCase())) {
    throw serviceError(
      'Time entry is not eligible for approval',
      409,
      'TIME_ENTRY_APPROVAL_NOT_ALLOWED',
    );
  }
}

function assertRejectionEligibility(entry: TimeEntryRecord): void {
  if (entry.isInvoiced === true || entry.invoiceId || entry.billingRunId) {
    throw serviceError(
      'Invoiced time entries cannot be rejected',
      409,
      'TIME_ENTRY_ALREADY_INVOICED',
    );
  }

  if (!['DRAFT', 'SUBMITTED', 'APPROVED'].includes(String(entry.status ?? '').toUpperCase())) {
    throw serviceError(
      'Time entry is not eligible for rejection',
      409,
      'TIME_ENTRY_REJECTION_NOT_ALLOWED',
    );
  }
}

function assertSubmissionEligibility(entry: TimeEntryRecord): void {
  if (entry.isInvoiced === true || entry.invoiceId || entry.billingRunId) {
    throw serviceError(
      'Invoiced time entries cannot be submitted',
      409,
      'TIME_ENTRY_ALREADY_INVOICED',
    );
  }

  if (!['DRAFT', 'REJECTED'].includes(String(entry.status ?? '').toUpperCase())) {
    throw serviceError(
      'Only draft or rejected time entries can be submitted',
      409,
      'TIME_ENTRY_SUBMISSION_NOT_ALLOWED',
    );
  }
}

function canApproveActor(actor: UserRecord, entry: TimeEntryRecord): boolean {
  const roleValues = [actor.role, actor.systemRole, actor.tenantRole]
    .filter((role): role is string => Boolean(role))
    .map((role) => role.toUpperCase());

  if (
    roleValues.some((role) =>
      [
        'SUPER_ADMIN',
        'SYSTEM_ADMIN',
        'FIRM_ADMIN',
        'MANAGING_PARTNER',
        'PARTNER',
        'PRACTICE_MANAGER',
        'FINANCE_MANAGER',
        'APPROVER',
      ].includes(role),
    )
  ) {
    return true;
  }

  return Boolean(entry.matter?.leadAdvocateId && entry.matter.leadAdvocateId === actor.id);
}

function assertActorCanApprove(actor: UserRecord, entry: TimeEntryRecord): void {
  if (!canApproveActor(actor, entry)) {
    throw serviceError(
      'You are not allowed to approve or reject this time entry',
      403,
      'TIME_APPROVAL_FORBIDDEN',
    );
  }
}

function changedFields(
  beforeData: Record<string, unknown> | null,
  afterData: Record<string, unknown>,
): string[] {
  if (!beforeData) {
    return [];
  }

  const keys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
  const changed: string[] = [];

  for (const key of keys) {
    const beforeValue = JSON.stringify(beforeData[key] ?? null);
    const afterValue = JSON.stringify(afterData[key] ?? null);

    if (beforeValue !== afterValue) {
      changed.push(key);
    }
  }

  return changed;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === 'string' ? code : undefined;
}

async function writeApprovalAudit(
  db: TimeApprovalDbClient,
  params: {
    tenantId: string;
    actorId?: string | null;
    auditAction: AuditAction;
    eventCode: string;
    timeEntryId: string;
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
    reason?: string | null;
    success?: boolean;
    failureReason?: string | null;
  },
) {
  if (!db.auditLog?.create || !db.auditLog?.findFirst) {
    return null;
  }

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

  const beforeData = params.beforeData ? toRecord(jsonSafe(params.beforeData)) : null;

  const afterData = {
    ...toRecord(jsonSafe(params.afterData ?? {})),
    eventCode: params.eventCode,
    domain: 'MATTER_TIME_APPROVAL',
    timeEntryId: params.timeEntryId,
    timestamp: createdAt,
  };

  const fields = changedFields(beforeData, afterData);

  const hash = hashPayload({
    tenantId: params.tenantId,
    userId: params.actorId ?? null,
    action: params.auditAction,
    entityType: 'TIME_ENTRY',
    entityId: params.timeEntryId,
    beforeData,
    afterData,
    changedFields: fields,
    previousHash,
    createdAt,
    nonce: randomUUID(),
  });

  return db.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.actorId ?? null,
      action: params.auditAction,
      severity:
        params.eventCode === 'TIME_ENTRY_APPROVED'
          ? 'WARNING'
          : params.eventCode === 'TIME_ENTRY_REJECTED'
            ? 'WARNING'
            : 'INFO',
      entityType: 'TIME_ENTRY',
      entityId: params.timeEntryId,
      beforeData,
      afterData,
      changedFields: fields,
      ipAddress: null,
      userAgent: null,
      hash,
      previousHash,
      success: params.success ?? true,
      failureReason: params.failureReason ?? null,
      correlationId: null,
      reason: toNullableString(params.reason),
    },
  });
}

async function runInTransaction<T>(
  db: TimeApprovalDbClient,
  callback: (tx: TimeApprovalDbClient) => Promise<T>,
): Promise<T> {
  if (typeof db.$transaction === 'function') {
    return db.$transaction(callback);
  }

  return callback(db);
}

async function transitionTimeEntryStatus(
  db: TimeApprovalDbClient,
  params: {
    tenantId: string;
    timeEntryId: string;
    actorId: string;
    nextStatus: TimeEntryStatus;
    eventCode: string;
    auditAction: AuditAction;
    reason?: string | null;
    eligibility: (entry: TimeEntryRecord) => void;
    requireApprovalAuthority?: boolean;
  },
): Promise<CompactTimeEntry> {
  const tenantId = requiredString(
    params.tenantId,
    'Tenant ID',
    'TIME_APPROVAL_TENANT_REQUIRED',
  );
  const timeEntryId = requiredString(
    params.timeEntryId,
    'Time entry ID',
    'TIME_ENTRY_ID_REQUIRED',
  );
  const actorId = requiredString(
    params.actorId,
    'Actor ID',
    'TIME_APPROVAL_ACTOR_REQUIRED',
  );

  return runInTransaction(db, async (tx) => {
    const [entry, actor] = await Promise.all([
      getTimeEntryOrThrow(tx, { tenantId, timeEntryId }),
      assertTenantUser(tx, {
        tenantId,
        userId: actorId,
        label: 'Approval actor',
      }),
    ]);

    params.eligibility(entry);

    if (params.requireApprovalAuthority === true) {
      assertActorCanApprove(actor, entry);
    }

    const before = compactTimeEntry(entry);

    const updated = await tx.timeEntry.update({
      where: {
        id: timeEntryId,
      },
      data: {
        status: params.nextStatus,
      },
      select: timeEntrySelect(),
    });

    const after = {
      ...compactTimeEntry(updated),
      decision: {
        actorId,
        reason: toNullableString(params.reason),
        decidedAt: new Date().toISOString(),
      },
    };

    await writeApprovalAudit(tx, {
      tenantId,
      actorId,
      auditAction: params.auditAction,
      eventCode: params.eventCode,
      timeEntryId,
      beforeData: before,
      afterData: after,
      reason: params.reason ?? null,
    });

    return compactTimeEntry(updated);
  });
}

function aggregateCount(aggregate: TimeEntryAggregate): number {
  if (typeof aggregate._count === 'number') {
    return aggregate._count;
  }

  if (typeof aggregate._count?.id === 'number') {
    return aggregate._count.id;
  }

  return 0;
}

function groupCount(
  row: TimeEntryStatusGroupRow | TimeEntryAdvocateGroupRow | TimeEntryMatterGroupRow,
): number {
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

function userMap(users: UserRecord[]): Map<string, UserRecord> {
  return new Map(users.map((user) => [user.id, user]));
}

function matterMap(matters: MatterRecord[]): Map<string, MatterRecord> {
  return new Map(matters.map((matter) => [matter.id, matter]));
}

export class TimeApprovalService {
  static async submitTimeEntry(db: TimeApprovalDbClient, params: TimeApprovalDecision) {
    return transitionTimeEntryStatus(db, {
      ...params,
      nextStatus: 'SUBMITTED',
      eventCode: 'TIME_ENTRY_SUBMITTED_FOR_APPROVAL',
      auditAction: 'UPDATE',
      eligibility: assertSubmissionEligibility,
      requireApprovalAuthority: false,
    });
  }

  static async approveTimeEntry(db: TimeApprovalDbClient, params: TimeApprovalDecision) {
    return transitionTimeEntryStatus(db, {
      ...params,
      nextStatus: 'APPROVED',
      eventCode: 'TIME_ENTRY_APPROVED',
      auditAction: 'AUTHORIZE',
      eligibility: assertApprovalEligibility,
      requireApprovalAuthority: true,
    });
  }

  static async rejectTimeEntry(db: TimeApprovalDbClient, params: TimeApprovalDecision) {
    return transitionTimeEntryStatus(db, {
      ...params,
      nextStatus: 'REJECTED',
      eventCode: 'TIME_ENTRY_REJECTED',
      auditAction: 'UPDATE',
      eligibility: assertRejectionEligibility,
      requireApprovalAuthority: true,
    });
  }

  static async bulkApproveTimeEntries(
    db: TimeApprovalDbClient,
    params: TimeBulkApprovalDecision,
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'TIME_APPROVAL_TENANT_REQUIRED',
    );
    const actorId = requiredString(
      params.actorId,
      'Actor ID',
      'TIME_APPROVAL_ACTOR_REQUIRED',
    );

    const ids = [
      ...new Set(
        (params.timeEntryIds ?? []).filter(
          (id): id is string => typeof id === 'string' && Boolean(id.trim()),
        ),
      ),
    ];

    if (ids.length === 0) {
      throw serviceError(
        'At least one timeEntryId is required',
        422,
        'TIME_APPROVAL_IDS_REQUIRED',
      );
    }

    const approved: CompactTimeEntry[] = [];
    const failed: FailedBulkDecision[] = [];

    for (const timeEntryId of ids) {
      try {
        approved.push(
          await this.approveTimeEntry(db, {
            tenantId,
            actorId,
            timeEntryId,
            reason: params.reason ?? null,
          }),
        );
      } catch (error: unknown) {
        failed.push({
          timeEntryId,
          error: getErrorMessage(error, 'Approval failed'),
          code: getErrorCode(error),
        });
      }
    }

    return {
      approvedCount: approved.length,
      failedCount: failed.length,
      approved,
      failed,
    };
  }

  static async bulkRejectTimeEntries(
    db: TimeApprovalDbClient,
    params: TimeBulkApprovalDecision,
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'TIME_APPROVAL_TENANT_REQUIRED',
    );
    const actorId = requiredString(
      params.actorId,
      'Actor ID',
      'TIME_APPROVAL_ACTOR_REQUIRED',
    );

    const ids = [
      ...new Set(
        (params.timeEntryIds ?? []).filter(
          (id): id is string => typeof id === 'string' && Boolean(id.trim()),
        ),
      ),
    ];

    if (ids.length === 0) {
      throw serviceError(
        'At least one timeEntryId is required',
        422,
        'TIME_REJECTION_IDS_REQUIRED',
      );
    }

    const rejected: CompactTimeEntry[] = [];
    const failed: FailedBulkDecision[] = [];

    for (const timeEntryId of ids) {
      try {
        rejected.push(
          await this.rejectTimeEntry(db, {
            tenantId,
            actorId,
            timeEntryId,
            reason: params.reason ?? null,
          }),
        );
      } catch (error: unknown) {
        failed.push({
          timeEntryId,
          error: getErrorMessage(error, 'Rejection failed'),
          code: getErrorCode(error),
        });
      }
    }

    return {
      rejectedCount: rejected.length,
      failedCount: failed.length,
      rejected,
      failed,
    };
  }

  static async getApprovalQueue(
    db: TimeApprovalDbClient,
    params: TimeApprovalQueueParams,
  ) {
    const page = normalizePositiveInt(params.page, 1, 1000000);
    const limit = normalizePositiveInt(params.limit, 25, 100);
    const skip = (page - 1) * limit;

    const where = buildApprovalWhere({
      ...params,
      status: params.status ?? 'SUBMITTED',
    });

    const [rows, total, aggregate] = await Promise.all([
      db.timeEntry.findMany({
        where,
        select: timeEntrySelect(),
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
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
        durationHours: toNumber(aggregate._sum?.durationHours).toFixed(2),
        durationMinutes: toNumber(aggregate._sum?.durationMinutes),
        billableAmount: toNumber(aggregate._sum?.billableAmount).toFixed(2),
      },
    };
  }

  static async getApprovalSummary(
    db: TimeApprovalDbClient,
    params: TimeApprovalSummaryParams,
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'TIME_APPROVAL_TENANT_REQUIRED',
    );

    const where = buildApprovalWhere(params);

    const [byStatus, byAdvocate, byMatter, aggregate] = await Promise.all([
      db.timeEntry.groupBy({
        by: ['status'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          durationHours: true,
          durationMinutes: true,
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

      db.timeEntry.groupBy({
        by: ['matterId'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          durationHours: true,
          billableAmount: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      }) as Promise<TimeEntryMatterGroupRow[]>,

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

    const advocateIds = uniqueStrings(byAdvocate.map((row) => row.advocateId));
    const matterIds = uniqueStrings(byMatter.map((row) => row.matterId));

    const [advocates, matters] = await Promise.all([
      advocateIds.length
        ? db.user.findMany({
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
        : Promise.resolve([]),

      matterIds.length
        ? db.matter.findMany({
            where: {
              tenantId,
              id: {
                in: matterIds,
              },
            },
            select: {
              id: true,
              title: true,
              category: true,
              clientId: true,
              leadAdvocateId: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const advocatesById = userMap(advocates);
    const mattersById = matterMap(matters);

    return {
      tenantId,
      filters: {
        matterId: toNullableString(params.matterId),
        advocateId: toNullableString(params.advocateId),
        branchId: toNullableString(params.branchId),
        from: normalizeDate(params.from, 'from'),
        to: normalizeDate(params.to, 'to'),
      },
      totals: {
        entryCount: aggregateCount(aggregate),
        durationHours: toNumber(aggregate._sum?.durationHours).toFixed(2),
        durationMinutes: toNumber(aggregate._sum?.durationMinutes),
        billableAmount: toNumber(aggregate._sum?.billableAmount).toFixed(2),
      },
      byStatus: byStatus.map((row) => ({
        status: row.status ?? null,
        entryCount: groupCount(row),
        durationHours: toNumber(row._sum?.durationHours).toFixed(2),
        durationMinutes: toNumber(row._sum?.durationMinutes),
        billableAmount: toNumber(row._sum?.billableAmount).toFixed(2),
      })),
      byAdvocate: byAdvocate.map((row) => ({
        advocateId: row.advocateId ?? null,
        advocate: row.advocateId ? advocatesById.get(row.advocateId) ?? null : null,
        entryCount: groupCount(row),
        durationHours: toNumber(row._sum?.durationHours).toFixed(2),
        billableAmount: toNumber(row._sum?.billableAmount).toFixed(2),
      })),
      byMatter: byMatter.map((row) => ({
        matterId: row.matterId ?? null,
        matter: row.matterId ? mattersById.get(row.matterId) ?? null : null,
        entryCount: groupCount(row),
        durationHours: toNumber(row._sum?.durationHours).toFixed(2),
        billableAmount: toNumber(row._sum?.billableAmount).toFixed(2),
      })),
      generatedAt: new Date(),
    };
  }

  static async approve(db: TimeApprovalDbClient, params: TimeApprovalDecision) {
    return this.approveTimeEntry(db, params);
  }

  static async reject(db: TimeApprovalDbClient, params: TimeApprovalDecision) {
    return this.rejectTimeEntry(db, params);
  }

  static async submit(db: TimeApprovalDbClient, params: TimeApprovalDecision) {
    return this.submitTimeEntry(db, params);
  }

  static async bulkApprove(db: TimeApprovalDbClient, params: TimeBulkApprovalDecision) {
    return this.bulkApproveTimeEntries(db, params);
  }

  static async bulkReject(db: TimeApprovalDbClient, params: TimeBulkApprovalDecision) {
    return this.bulkRejectTimeEntries(db, params);
  }

  static async queue(db: TimeApprovalDbClient, params: TimeApprovalQueueParams) {
    return this.getApprovalQueue(db, params);
  }

  static async summary(db: TimeApprovalDbClient, params: TimeApprovalSummaryParams) {
    return this.getApprovalSummary(db, params);
  }
}

export default TimeApprovalService;