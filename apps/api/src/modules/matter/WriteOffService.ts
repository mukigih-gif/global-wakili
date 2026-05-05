// apps/api/src/modules/matter/WriteOffService.ts

import { Prisma } from '@global-wakili/database';

type WriteOffStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'POSTED'
  | 'REVERSED'
  | 'CANCELLED';

type WriteOffSource =
  | 'MANUAL'
  | 'INVOICE'
  | 'TIME_ENTRY'
  | 'DISBURSEMENT'
  | 'WIP'
  | 'OTHER';

type MoneyInput = Prisma.Decimal | string | number;

type QueryArgs = Record<string, unknown>;

type CreateWriteOffInput = {
  tenantId: string;
  matterId: string;
  amount: MoneyInput;
  currency?: string | null;
  sourceType?: WriteOffSource | string | null;
  sourceId?: string | null;
  invoiceId?: string | null;
  reason: string;
  requestedById?: string | null;
  approvedById?: string | null;
  metadata?: Record<string, unknown> | null;
};

type UpdateWriteOffInput = {
  amount?: MoneyInput | null;
  currency?: string | null;
  sourceType?: WriteOffSource | string | null;
  sourceId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
};

type WriteOffStatusSummary = Record<string, { count: number; amount: string }>;

type ClientSummary = {
  id: string;
  name?: string | null;
  clientCode?: string | null;
  email?: string | null;
};

type MatterSummary = {
  id: string;
  tenantId?: string | null;
  title?: string | null;
  category?: string | null;
  clientId?: string | null;
  leadAdvocateId?: string | null;
  status?: string | null;
  deletedAt?: Date | string | null;
  client?: ClientSummary | null;
};

type UserSummary = {
  id: string;
  name?: string | null;
  email?: string | null;
  tenantRole?: string | null;
  systemRole?: string | null;
  status?: string | null;
};

type WriteOffRecord = {
  id: string;
  tenantId: string;
  matterId: string;
  amount: MoneyInput;
  currency?: string | null;
  sourceType?: WriteOffSource | string | null;
  sourceId?: string | null;
  reason: string;
  status?: WriteOffStatus | string | null;
  requestedById?: string | null;
  approvedById?: string | null;
  requestedAt?: Date | string | null;
  approvedAt?: Date | string | null;
  rejectedAt?: Date | string | null;
  postedAt?: Date | string | null;
  reversedAt?: Date | string | null;
  journalEntryId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type WriteOffSummaryRow = {
  amount: MoneyInput;
  currency?: string | null;
  status?: WriteOffStatus | string | null;
};

type RelatedWriteOffRecords = {
  matter?: MatterSummary | null;
  requestedBy?: UserSummary | null;
  approvedBy?: UserSummary | null;
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

type WriteOffDelegate = FindFirstDelegate<WriteOffRecord> &
  FindManyDelegate<WriteOffRecord> &
  CreateDelegate<WriteOffRecord> &
  UpdateDelegate<WriteOffRecord>;

type MatterDelegate = FindFirstDelegate<MatterSummary>;

type UserDelegate = FindFirstDelegate<UserSummary>;

type WriteOffDbClient = {
  matter: MatterDelegate;
  user: UserDelegate;
  writeOff: WriteOffDelegate & {
    findMany(args: QueryArgs): Promise<WriteOffRecord[] | WriteOffSummaryRow[]>;
  };
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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toDecimal(value: MoneyInput | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(value);
}

function assertPositiveAmount(value: MoneyInput | null | undefined): Prisma.Decimal {
  const amount = toDecimal(value);

  if (amount.lte(0)) {
    throw serviceError(
      'Write-off amount must be greater than zero',
      422,
      'INVALID_WRITE_OFF_AMOUNT',
    );
  }

  return amount;
}

function normalizeCurrency(value: unknown): string {
  const currency = toNullableString(value)?.toUpperCase();

  if (!currency) return 'KES';

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw serviceError(
      'Currency must be a valid ISO-4217 code',
      422,
      'INVALID_WRITE_OFF_CURRENCY',
    );
  }

  return currency;
}

function normalizeSourceType(value: unknown): WriteOffSource {
  const normalized = toNullableString(value)?.toUpperCase();

  if (
    normalized === 'MANUAL' ||
    normalized === 'INVOICE' ||
    normalized === 'TIME_ENTRY' ||
    normalized === 'DISBURSEMENT' ||
    normalized === 'WIP' ||
    normalized === 'OTHER'
  ) {
    return normalized;
  }

  return 'MANUAL';
}

function normalizeStatus(value: unknown, fallback: WriteOffStatus = 'DRAFT'): WriteOffStatus {
  const normalized = toNullableString(value)?.toUpperCase();

  if (
    normalized === 'DRAFT' ||
    normalized === 'PENDING' ||
    normalized === 'PENDING_APPROVAL' ||
    normalized === 'APPROVED' ||
    normalized === 'REJECTED' ||
    normalized === 'POSTED' ||
    normalized === 'REVERSED' ||
    normalized === 'CANCELLED'
  ) {
    return normalized;
  }

  return fallback;
}

function assertStatus(
  actual: string | null | undefined,
  allowed: WriteOffStatus[],
  code: string,
  message: string,
): void {
  const normalized = normalizeStatus(actual, 'DRAFT');

  if (!allowed.includes(normalized)) {
    throw serviceError(message, 409, code);
  }
}

function normalizeDate(value: Date | string | null | undefined, label: string): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw serviceError(
      `Invalid write-off ${label} date`,
      422,
      `INVALID_WRITE_OFF_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_DATE`,
    );
  }

  return parsed;
}

function normalizeLimit(value: unknown, fallback = 50, max = 100): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function writeOffSelect() {
  return {
    id: true,
    tenantId: true,
    matterId: true,
    amount: true,
    currency: true,
    sourceType: true,
    sourceId: true,
    reason: true,
    status: true,
    requestedById: true,
    approvedById: true,
    requestedAt: true,
    approvedAt: true,
    rejectedAt: true,
    postedAt: true,
    reversedAt: true,
    journalEntryId: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
  };
}

function matterSelect() {
  return {
    id: true,
    tenantId: true,
    title: true,
    category: true,
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
  };
}

function relatedMatterSelect() {
  return {
    id: true,
    title: true,
    category: true,
    clientId: true,
    leadAdvocateId: true,
    status: true,
    client: {
      select: {
        id: true,
        name: true,
        clientCode: true,
        email: true,
      },
    },
  };
}

function userSelect() {
  return {
    id: true,
    name: true,
    email: true,
  };
}

function compactWriteOff(row: WriteOffRecord, related?: RelatedWriteOffRecords) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    matterId: row.matterId,
    amount: row.amount,
    currency: row.currency,
    sourceType: row.sourceType,
    sourceId: row.sourceId ?? null,
    reason: row.reason,
    status: row.status,
    requestedById: row.requestedById ?? null,
    approvedById: row.approvedById ?? null,
    requestedAt: row.requestedAt ?? null,
    approvedAt: row.approvedAt ?? null,
    rejectedAt: row.rejectedAt ?? null,
    postedAt: row.postedAt ?? null,
    reversedAt: row.reversedAt ?? null,
    journalEntryId: row.journalEntryId ?? null,
    metadata: row.metadata ?? null,
    matter: related?.matter ?? null,
    requestedBy: related?.requestedBy ?? null,
    approvedBy: related?.approvedBy ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertTenantMatter(
  db: WriteOffDbClient,
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
    select: matterSelect(),
  });

  if (!matter) {
    throw serviceError('Matter not found for write-off', 404, 'WRITE_OFF_MATTER_NOT_FOUND');
  }

  return matter;
}

async function assertTenantUser(
  db: WriteOffDbClient,
  params: {
    tenantId: string;
    userId?: string | null;
    label?: string;
    required?: boolean;
  },
): Promise<UserSummary | null> {
  const userId = toNullableString(params.userId);

  if (!userId) {
    if (params.required) {
      throw serviceError(
        `${params.label ?? 'User'} is required`,
        422,
        'WRITE_OFF_USER_REQUIRED',
      );
    }

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
      'WRITE_OFF_USER_NOT_FOUND',
    );
  }

  return user;
}

async function getWriteOffOrThrow(
  db: WriteOffDbClient,
  params: {
    tenantId: string;
    writeOffId: string;
  },
): Promise<WriteOffRecord> {
  const row = await db.writeOff.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.writeOffId,
      matter: {
        is: {
          tenantId: params.tenantId,
          deletedAt: null,
        },
      },
    },
    select: writeOffSelect(),
  });

  if (!row) {
    throw serviceError('Write-off not found', 404, 'WRITE_OFF_NOT_FOUND');
  }

  return row;
}

async function loadRelated(
  db: WriteOffDbClient,
  row: WriteOffRecord,
): Promise<RelatedWriteOffRecords> {
  const [matter, requestedBy, approvedBy] = await Promise.all([
    row.matterId
      ? db.matter.findFirst({
          where: {
            tenantId: row.tenantId,
            id: row.matterId,
            deletedAt: null,
          },
          select: relatedMatterSelect(),
        })
      : Promise.resolve(null),

    row.requestedById
      ? db.user.findFirst({
          where: {
            tenantId: row.tenantId,
            id: row.requestedById,
          },
          select: userSelect(),
        })
      : Promise.resolve(null),

    row.approvedById
      ? db.user.findFirst({
          where: {
            tenantId: row.tenantId,
            id: row.approvedById,
          },
          select: userSelect(),
        })
      : Promise.resolve(null),
  ]);

  return { matter, requestedBy, approvedBy };
}

async function compactWithRelated(db: WriteOffDbClient, row: WriteOffRecord) {
  return compactWriteOff(row, await loadRelated(db, row));
}

function isWriteOffRecord(row: WriteOffRecord | WriteOffSummaryRow): row is WriteOffRecord {
  return 'id' in row && 'matterId' in row && 'reason' in row;
}

function requireWriteOffRows(rows: Array<WriteOffRecord | WriteOffSummaryRow>): WriteOffRecord[] {
  return rows.filter(isWriteOffRecord);
}

function requireSummaryRows(rows: Array<WriteOffRecord | WriteOffSummaryRow>): WriteOffSummaryRow[] {
  return rows.map((row) => ({
    amount: row.amount,
    currency: row.currency ?? null,
    status: row.status ?? null,
  }));
}

export class WriteOffService {
  static async create(db: WriteOffDbClient, input: CreateWriteOffInput) {
    const tenantId = requiredString(input.tenantId, 'Tenant ID', 'WRITE_OFF_TENANT_REQUIRED');
    const matterId = requiredString(input.matterId, 'Matter ID', 'WRITE_OFF_MATTER_REQUIRED');
    const reason = requiredString(input.reason, 'Write-off reason', 'WRITE_OFF_REASON_REQUIRED');
    const amount = assertPositiveAmount(input.amount);
    const currency = normalizeCurrency(input.currency);
    const sourceType = normalizeSourceType(input.sourceType);
    const sourceId = toNullableString(input.sourceId ?? input.invoiceId ?? null);
    const requestedById = toNullableString(input.requestedById);
    const approvedById = toNullableString(input.approvedById);

    const [matter] = await Promise.all([
      assertTenantMatter(db, { tenantId, matterId }),
      assertTenantUser(db, {
        tenantId,
        userId: requestedById,
        label: 'Write-off requester',
      }),
      assertTenantUser(db, {
        tenantId,
        userId: approvedById,
        label: 'Write-off approver',
      }),
    ]);

    const created = await db.writeOff.create({
      data: {
        tenantId,
        matterId,
        amount,
        currency,
        sourceType,
        sourceId,
        reason,
        status: 'DRAFT',
        requestedById,
        approvedById: null,
        approvedAt: null,
        rejectedAt: null,
        postedAt: null,
        reversedAt: null,
        journalEntryId: null,
        metadata: {
          ...asRecord(input.metadata),
          source: 'matter-write-off-service',
          matterTitle: matter.title,
          lifecycle: 'DRAFT_CREATED',
          ignoredInitialApproverId: approvedById,
        },
      },
      select: writeOffSelect(),
    });

    return compactWithRelated(db, created);
  }

  static async recordWriteOff(
    db: WriteOffDbClient,
    params: {
      tenantId: string;
      matterId: string;
      invoiceId?: string | null;
      amount: MoneyInput;
      reason: string;
      approvedById: string;
    },
  ) {
    return this.create(db, {
      tenantId: params.tenantId,
      matterId: params.matterId,
      invoiceId: params.invoiceId ?? null,
      sourceType: params.invoiceId ? 'INVOICE' : 'MANUAL',
      sourceId: params.invoiceId ?? null,
      amount: params.amount,
      reason: params.reason,
      approvedById: params.approvedById,
      metadata: {
        compatibilityMethod: 'recordWriteOff',
        note: 'recordWriteOff now creates a DRAFT write-off. Use submitForApproval() and approve() for lifecycle progression.',
      },
    });
  }

  static async update(
    db: WriteOffDbClient,
    params: {
      tenantId: string;
      writeOffId: string;
      input: UpdateWriteOffInput;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'WRITE_OFF_TENANT_REQUIRED');
    const writeOffId = requiredString(
      params.writeOffId,
      'Write-off ID',
      'WRITE_OFF_ID_REQUIRED',
    );

    const existing = await getWriteOffOrThrow(db, { tenantId, writeOffId });

    assertStatus(
      existing.status,
      ['DRAFT', 'REJECTED'],
      'WRITE_OFF_NOT_EDITABLE',
      'Only draft or rejected write-offs can be edited',
    );

    const data: Record<string, unknown> = {};

    if (params.input.amount !== undefined && params.input.amount !== null) {
      data.amount = assertPositiveAmount(params.input.amount);
    }

    if (params.input.currency !== undefined) {
      data.currency = normalizeCurrency(params.input.currency);
    }

    if (params.input.sourceType !== undefined) {
      data.sourceType = normalizeSourceType(params.input.sourceType);
    }

    if (params.input.sourceId !== undefined) {
      data.sourceId = toNullableString(params.input.sourceId);
    }

    if (params.input.reason !== undefined) {
      data.reason = requiredString(
        params.input.reason,
        'Write-off reason',
        'WRITE_OFF_REASON_REQUIRED',
      );
    }

    if (params.input.metadata !== undefined) {
      data.metadata = {
        ...asRecord(existing.metadata),
        ...asRecord(params.input.metadata),
        updatedBy: 'matter-write-off-service',
        updatedAt: new Date().toISOString(),
      };
    }

    if (existing.status === 'REJECTED') {
      data.status = 'DRAFT';
      data.rejectedAt = null;
      data.metadata = {
        ...asRecord(existing.metadata),
        ...asRecord(data.metadata),
        lifecycle: 'REJECTED_EDITED_BACK_TO_DRAFT',
        updatedAt: new Date().toISOString(),
      };
    }

    const updated = await db.writeOff.update({
      where: {
        id: writeOffId,
      },
      data,
      select: writeOffSelect(),
    });

    return compactWithRelated(db, updated);
  }

  static async submitForApproval(
    db: WriteOffDbClient,
    params: {
      tenantId: string;
      writeOffId: string;
      requestedById?: string | null;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'WRITE_OFF_TENANT_REQUIRED');
    const writeOffId = requiredString(
      params.writeOffId,
      'Write-off ID',
      'WRITE_OFF_ID_REQUIRED',
    );

    const existing = await getWriteOffOrThrow(db, { tenantId, writeOffId });

    assertStatus(
      existing.status,
      ['DRAFT', 'REJECTED'],
      'WRITE_OFF_NOT_SUBMITTABLE',
      'Only draft or rejected write-offs can be submitted for approval',
    );

    const requestedById = toNullableString(params.requestedById) ?? existing.requestedById ?? null;

    await assertTenantUser(db, {
      tenantId,
      userId: requestedById,
      label: 'Write-off requester',
    });

    const updated = await db.writeOff.update({
      where: {
        id: writeOffId,
      },
      data: {
        status: 'PENDING_APPROVAL',
        requestedById,
        requestedAt: new Date(),
        approvedById: null,
        approvedAt: null,
        rejectedAt: null,
        metadata: {
          ...asRecord(existing.metadata),
          lifecycle: 'SUBMITTED_FOR_APPROVAL',
          submittedAt: new Date().toISOString(),
        },
      },
      select: writeOffSelect(),
    });

    return compactWithRelated(db, updated);
  }

  static async approve(
    db: WriteOffDbClient,
    params: {
      tenantId: string;
      writeOffId: string;
      approvedById: string;
      note?: string | null;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'WRITE_OFF_TENANT_REQUIRED');
    const writeOffId = requiredString(
      params.writeOffId,
      'Write-off ID',
      'WRITE_OFF_ID_REQUIRED',
    );
    const approvedById = requiredString(
      params.approvedById,
      'Approver ID',
      'WRITE_OFF_APPROVER_REQUIRED',
    );

    const existing = await getWriteOffOrThrow(db, { tenantId, writeOffId });

    assertStatus(
      existing.status,
      ['PENDING_APPROVAL'],
      'WRITE_OFF_NOT_APPROVABLE',
      'Only pending approval write-offs can be approved',
    );

    await assertTenantUser(db, {
      tenantId,
      userId: approvedById,
      label: 'Write-off approver',
      required: true,
    });

    const updated = await db.writeOff.update({
      where: {
        id: writeOffId,
      },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
        rejectedAt: null,
        metadata: {
          ...asRecord(existing.metadata),
          lifecycle: 'APPROVED',
          approvalNote: toNullableString(params.note),
          approvedAt: new Date().toISOString(),
        },
      },
      select: writeOffSelect(),
    });

    return compactWithRelated(db, updated);
  }

  static async reject(
    db: WriteOffDbClient,
    params: {
      tenantId: string;
      writeOffId: string;
      rejectedById?: string | null;
      reason: string;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'WRITE_OFF_TENANT_REQUIRED');
    const writeOffId = requiredString(
      params.writeOffId,
      'Write-off ID',
      'WRITE_OFF_ID_REQUIRED',
    );
    const rejectionReason = requiredString(
      params.reason,
      'Rejection reason',
      'WRITE_OFF_REJECTION_REASON_REQUIRED',
    );

    const existing = await getWriteOffOrThrow(db, { tenantId, writeOffId });

    assertStatus(
      existing.status,
      ['PENDING_APPROVAL'],
      'WRITE_OFF_NOT_REJECTABLE',
      'Only pending approval write-offs can be rejected',
    );

    const rejectedById = toNullableString(params.rejectedById);

    await assertTenantUser(db, {
      tenantId,
      userId: rejectedById,
      label: 'Write-off rejector',
    });

    const updated = await db.writeOff.update({
      where: {
        id: writeOffId,
      },
      data: {
        status: 'REJECTED',
        approvedById: null,
        approvedAt: null,
        rejectedAt: new Date(),
        metadata: {
          ...asRecord(existing.metadata),
          lifecycle: 'REJECTED',
          rejectedById,
          rejectionReason,
          rejectedAt: new Date().toISOString(),
        },
      },
      select: writeOffSelect(),
    });

    return compactWithRelated(db, updated);
  }

  static async markPosted(
    db: WriteOffDbClient,
    params: {
      tenantId: string;
      writeOffId: string;
      journalEntryId?: string | null;
      postedById?: string | null;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'WRITE_OFF_TENANT_REQUIRED');
    const writeOffId = requiredString(
      params.writeOffId,
      'Write-off ID',
      'WRITE_OFF_ID_REQUIRED',
    );

    const existing = await getWriteOffOrThrow(db, { tenantId, writeOffId });

    assertStatus(
      existing.status,
      ['APPROVED'],
      'WRITE_OFF_NOT_POSTABLE',
      'Only approved write-offs can be posted',
    );

    const postedById = toNullableString(params.postedById);

    await assertTenantUser(db, {
      tenantId,
      userId: postedById,
      label: 'Write-off poster',
    });

    const updated = await db.writeOff.update({
      where: {
        id: writeOffId,
      },
      data: {
        status: 'POSTED',
        postedAt: new Date(),
        journalEntryId: toNullableString(params.journalEntryId),
        metadata: {
          ...asRecord(existing.metadata),
          lifecycle: 'POSTED',
          postedById,
          postedAt: new Date().toISOString(),
        },
      },
      select: writeOffSelect(),
    });

    return compactWithRelated(db, updated);
  }

  static async reverse(
    db: WriteOffDbClient,
    params: {
      tenantId: string;
      writeOffId: string;
      reversedById?: string | null;
      reason: string;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'WRITE_OFF_TENANT_REQUIRED');
    const writeOffId = requiredString(
      params.writeOffId,
      'Write-off ID',
      'WRITE_OFF_ID_REQUIRED',
    );
    const reversalReason = requiredString(
      params.reason,
      'Reversal reason',
      'WRITE_OFF_REVERSAL_REASON_REQUIRED',
    );

    const existing = await getWriteOffOrThrow(db, { tenantId, writeOffId });

    assertStatus(
      existing.status,
      ['POSTED'],
      'WRITE_OFF_NOT_REVERSIBLE',
      'Only posted write-offs can be reversed',
    );

    const reversedById = toNullableString(params.reversedById);

    await assertTenantUser(db, {
      tenantId,
      userId: reversedById,
      label: 'Write-off reverser',
    });

    const updated = await db.writeOff.update({
      where: {
        id: writeOffId,
      },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        metadata: {
          ...asRecord(existing.metadata),
          lifecycle: 'REVERSED',
          reversedById,
          reversalReason,
          reversedAt: new Date().toISOString(),
        },
      },
      select: writeOffSelect(),
    });

    return compactWithRelated(db, updated);
  }

  static async cancel(
    db: WriteOffDbClient,
    params: {
      tenantId: string;
      writeOffId: string;
      cancelledById?: string | null;
      reason: string;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'WRITE_OFF_TENANT_REQUIRED');
    const writeOffId = requiredString(
      params.writeOffId,
      'Write-off ID',
      'WRITE_OFF_ID_REQUIRED',
    );
    const cancelReason = requiredString(
      params.reason,
      'Cancellation reason',
      'WRITE_OFF_CANCEL_REASON_REQUIRED',
    );

    const existing = await getWriteOffOrThrow(db, { tenantId, writeOffId });

    assertStatus(
      existing.status,
      ['DRAFT', 'PENDING_APPROVAL', 'REJECTED'],
      'WRITE_OFF_NOT_CANCELLABLE',
      'Only draft, pending approval, or rejected write-offs can be cancelled',
    );

    const cancelledById = toNullableString(params.cancelledById);

    await assertTenantUser(db, {
      tenantId,
      userId: cancelledById,
      label: 'Write-off canceller',
    });

    const updated = await db.writeOff.update({
      where: {
        id: writeOffId,
      },
      data: {
        status: 'CANCELLED',
        metadata: {
          ...asRecord(existing.metadata),
          lifecycle: 'CANCELLED',
          cancelledById,
          cancelReason,
          cancelledAt: new Date().toISOString(),
        },
      },
      select: writeOffSelect(),
    });

    return compactWithRelated(db, updated);
  }

  static async getById(
    db: WriteOffDbClient,
    params: {
      tenantId: string;
      writeOffId: string;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'WRITE_OFF_TENANT_REQUIRED');
    const writeOffId = requiredString(
      params.writeOffId,
      'Write-off ID',
      'WRITE_OFF_ID_REQUIRED',
    );

    const row = await getWriteOffOrThrow(db, { tenantId, writeOffId });

    return compactWithRelated(db, row);
  }

  static async listMatterWriteOffs(
    db: WriteOffDbClient,
    params: {
      tenantId: string;
      matterId: string;
      status?: string | null;
      limit?: number;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'WRITE_OFF_TENANT_REQUIRED');
    const matterId = requiredString(params.matterId, 'Matter ID', 'WRITE_OFF_MATTER_REQUIRED');

    await assertTenantMatter(db, { tenantId, matterId });

    const limit = normalizeLimit(params.limit);
    const status = params.status ? normalizeStatus(params.status) : null;

    const rows = requireWriteOffRows(
      await db.writeOff.findMany({
        where: {
          tenantId,
          matterId,
          ...(status ? { status } : {}),
        },
        select: writeOffSelect(),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
      }),
    );

    return Promise.all(rows.map((row) => compactWithRelated(db, row)));
  }

  static async list(
    db: WriteOffDbClient,
    params: {
      tenantId: string;
      matterId?: string | null;
      status?: string | null;
      from?: Date | string | null;
      to?: Date | string | null;
      limit?: number;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'WRITE_OFF_TENANT_REQUIRED');
    const matterId = toNullableString(params.matterId);
    const status = params.status ? normalizeStatus(params.status) : null;
    const limit = normalizeLimit(params.limit);
    const from = normalizeDate(params.from, 'from');
    const to = normalizeDate(params.to, 'to');

    if (matterId) {
      await assertTenantMatter(db, { tenantId, matterId });
    }

    const rows = requireWriteOffRows(
      await db.writeOff.findMany({
        where: {
          tenantId,
          ...(matterId ? { matterId } : {}),
          ...(status ? { status } : {}),
          ...(from || to
            ? {
                createdAt: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
          matter: {
            is: {
              tenantId,
              deletedAt: null,
            },
          },
        },
        select: writeOffSelect(),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
      }),
    );

    return Promise.all(rows.map((row) => compactWithRelated(db, row)));
  }

  static async summary(
    db: WriteOffDbClient,
    params: {
      tenantId: string;
      matterId?: string | null;
    },
  ) {
    const tenantId = requiredString(params.tenantId, 'Tenant ID', 'WRITE_OFF_TENANT_REQUIRED');
    const matterId = toNullableString(params.matterId);

    if (matterId) {
      await assertTenantMatter(db, { tenantId, matterId });
    }

    const rows = requireSummaryRows(
      await db.writeOff.findMany({
        where: {
          tenantId,
          ...(matterId ? { matterId } : {}),
          matter: {
            is: {
              tenantId,
              deletedAt: null,
            },
          },
        },
        select: {
          amount: true,
          currency: true,
          status: true,
        },
      }),
    );

    const byStatus = rows.reduce<WriteOffStatusSummary>((acc, row) => {
      const status = String(row.status ?? 'UNKNOWN');
      const current = acc[status] ?? { count: 0, amount: '0' };
      const nextAmount = new Prisma.Decimal(current.amount).plus(toDecimal(row.amount));

      acc[status] = {
        count: current.count + 1,
        amount: nextAmount.toFixed(2),
      };

      return acc;
    }, {});

    const total = rows.reduce(
      (sum, row) => sum.plus(toDecimal(row.amount)),
      new Prisma.Decimal(0),
    );

    return {
      tenantId,
      matterId: matterId ?? null,
      count: rows.length,
      amount: total.toFixed(2),
      byStatus,
    };
  }
}

export default WriteOffService;