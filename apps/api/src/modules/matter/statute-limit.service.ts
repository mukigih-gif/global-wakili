// apps/api/src/modules/matter/statute-limit.service.ts

type QueryArgs = Record<string, unknown>;
type UnknownRecord = Record<string, unknown>;

type DelegateFindFirst = {
  findFirst(args: QueryArgs): Promise<unknown>;
};

type DelegateFindMany = {
  findMany(args: QueryArgs): Promise<unknown[]>;
};

type DelegateCreate = {
  create(args: QueryArgs): Promise<unknown>;
};

type DelegateUpdate = {
  update(args: QueryArgs): Promise<unknown>;
};

export type MatterStatuteDbClient = {
  matter: DelegateFindFirst & {
    update?: (args: QueryArgs) => Promise<unknown>;
  };
  statuteOfLimitations: DelegateFindFirst &
    DelegateFindMany &
    DelegateCreate &
    DelegateUpdate;
};

export type StatuteType =
  | 'CLAIM'
  | 'CONTRACT'
  | 'TORT'
  | 'CRIMINAL'
  | 'JUDGMENT'
  | 'PRESCRIPTION';

export type StatuteStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SATISFIED'
  | 'CANCELLED';

export type AttachMatterLimitationParams = {
  tenantId: string;
  matterId: string;
  causeDate: Date | string;
  limitationYears?: number | null;
  limitationPeriod?: number | null;
  statueType?: StatuteType | string | null;
  statuteType?: StatuteType | string | null;
  deadlineDate?: Date | string | null;
  notifyAt?: Date | string | null;
  status?: StatuteStatus | string | null;
  notes?: string | null;
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

  if (
    !trimmed ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null'
  ) {
    return null;
  }

  return trimmed;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function getString(record: UnknownRecord, key: string): string | null {
  return toNullableString(record[key]);
}

function getBoolean(record: UnknownRecord, key: string): boolean {
  return record[key] === true;
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
      `Invalid statute ${label}`,
      422,
      `INVALID_STATUTE_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    );
  }

  return parsed;
}

function normalizeRequiredDate(value: Date | string, label: string): Date {
  const parsed = normalizeDate(value, label);

  if (!parsed) {
    throw serviceError(
      `Statute ${label} is required`,
      422,
      `STATUTE_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_REQUIRED`,
    );
  }

  return parsed;
}

function normalizeStatuteType(value: unknown): StatuteType {
  const normalized = toNullableString(value)?.toUpperCase();

  const validTypes: StatuteType[] = [
    'CLAIM',
    'CONTRACT',
    'TORT',
    'CRIMINAL',
    'JUDGMENT',
    'PRESCRIPTION',
  ];

  return validTypes.includes(normalized as StatuteType)
    ? (normalized as StatuteType)
    : 'CLAIM';
}

function normalizeStatus(
  value: unknown,
  deadlineDate?: Date | null,
): StatuteStatus {
  const normalized = toNullableString(value)?.toUpperCase();
  const validStatuses: StatuteStatus[] = [
    'ACTIVE',
    'EXPIRED',
    'SATISFIED',
    'CANCELLED',
  ];

  if (validStatuses.includes(normalized as StatuteStatus)) {
    return normalized as StatuteStatus;
  }

  if (deadlineDate && deadlineDate < new Date()) {
    return 'EXPIRED';
  }

  return 'ACTIVE';
}

function defaultLimitationYears(statueType: StatuteType): number {
  switch (statueType) {
    case 'CONTRACT':
      return 6;
    case 'TORT':
      return 3;
    case 'JUDGMENT':
      return 12;
    case 'PRESCRIPTION':
      return 12;
    case 'CRIMINAL':
      return 0;
    case 'CLAIM':
    default:
      return 6;
  }
}

function normalizeLimitationPeriod(
  value: unknown,
  statueType: StatuteType,
): number {
  const parsed = Number(value);

  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 99) {
    return parsed;
  }

  return defaultLimitationYears(statueType);
}

function addYears(date: Date, years: number): Date {
  const deadline = new Date(date);
  deadline.setFullYear(deadline.getFullYear() + years);
  return deadline;
}

function defaultNotifyAt(deadlineDate: Date): Date {
  const notifyAt = new Date(deadlineDate);
  notifyAt.setDate(notifyAt.getDate() - 30);
  return notifyAt;
}

async function assertTenantMatter(
  db: MatterStatuteDbClient,
  params: { tenantId: string; matterId: string },
): Promise<UnknownRecord> {
  const matter = await db.matter.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.matterId,
      deletedAt: null,
    },
    select: {
      id: true,
      tenantId: true,
      title: true,
      category: true,
      clientId: true,
      leadAdvocateId: true,
      statuteOfLimitationsDate: true,
      deletedAt: true,
    },
  });

  if (!matter) {
    throw serviceError('Matter not found', 404, 'MISSING_MATTER');
  }

  return asRecord(matter);
}

function compactStatute(row: unknown, matter?: unknown) {
  if (!row) {
    return null;
  }

  const record = asRecord(row);

  return {
    id: record.id,
    matterId: record.matterId,
    statuteType: record.statueType,
    statueType: record.statueType,
    limitationPeriod: record.limitationPeriod,
    deadlineDate: record.deadlineDate,
    notifyAt: record.notifyAt,
    isNotified: getBoolean(record, 'isNotified'),
    status: record.status,
    matter: record.matter ?? matter ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class StatuteLimitService {
  static calculateLimitation(params: {
    causeDate: Date | string;
    limitationYears?: number | null;
    limitationPeriod?: number | null;
    statueType?: StatuteType | string | null;
    statuteType?: StatuteType | string | null;
  }) {
    const causeDate = normalizeRequiredDate(params.causeDate, 'cause date');
    const statueType = normalizeStatuteType(
      params.statueType ?? params.statuteType,
    );
    const limitationPeriod = normalizeLimitationPeriod(
      params.limitationPeriod ?? params.limitationYears,
      statueType,
    );

    const deadline = addYears(causeDate, limitationPeriod);

    return {
      causeDate,
      statuteType: statueType,
      statueType,
      limitationYears: limitationPeriod,
      limitationPeriod,
      deadline,
      deadlineDate: deadline,
      notifyAt: defaultNotifyAt(deadline),
    };
  }

  static async attachMatterLimitation(
    db: MatterStatuteDbClient,
    params: AttachMatterLimitationParams,
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'STATUTE_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      params.matterId,
      'Matter ID',
      'STATUTE_MATTER_REQUIRED',
    );

    const matter = await assertTenantMatter(db, { tenantId, matterId });

    const causeDate = normalizeRequiredDate(params.causeDate, 'cause date');
    const statueType = normalizeStatuteType(
      params.statueType ?? params.statuteType,
    );
    const limitationPeriod = normalizeLimitationPeriod(
      params.limitationPeriod ?? params.limitationYears,
      statueType,
    );

    const deadlineDate =
      normalizeDate(params.deadlineDate, 'deadline date') ??
      addYears(causeDate, limitationPeriod);

    const notifyAt =
      normalizeDate(params.notifyAt, 'notify at') ?? defaultNotifyAt(deadlineDate);

    const status = normalizeStatus(params.status, deadlineDate);

    const existing = await db.statuteOfLimitations.findFirst({
      where: { matterId },
    });

    const saved = existing
      ? await db.statuteOfLimitations.update({
          where: { matterId },
          data: {
            statueType,
            limitationPeriod,
            deadlineDate,
            notifyAt,
            status,
            isNotified: false,
          },
        })
      : await db.statuteOfLimitations.create({
          data: {
            matterId,
            statueType,
            limitationPeriod,
            deadlineDate,
            notifyAt,
            status,
            isNotified: false,
          },
        });

    if (db.matter.update) {
      await db.matter.update({
        where: { id: matterId },
        data: { statuteOfLimitationsDate: deadlineDate },
      });
    }

    return {
      ...compactStatute(saved, matter),
      causeDate,
      notes: toNullableString(params.notes),
    };
  }

  static async getMatterLimitation(
    db: MatterStatuteDbClient,
    params: { tenantId: string; matterId: string },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'STATUTE_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      params.matterId,
      'Matter ID',
      'STATUTE_MATTER_REQUIRED',
    );

    const matter = await assertTenantMatter(db, { tenantId, matterId });

    const row = await db.statuteOfLimitations.findFirst({
      where: { matterId },
    });

    return compactStatute(row, matter);
  }

  static async listUpcoming(
    db: MatterStatuteDbClient,
    params: {
      tenantId: string;
      from?: Date | string | null;
      to?: Date | string | null;
      status?: string | null;
      limit?: number;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'STATUTE_TENANT_REQUIRED',
    );
    const from = normalizeDate(params.from, 'from') ?? new Date();
    const to =
      normalizeDate(params.to, 'to') ??
      new Date(from.getTime() + 1000 * 60 * 60 * 24 * 90);
    const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), 100);

    const rows = await db.statuteOfLimitations.findMany({
      where: {
        ...(params.status ? { status: normalizeStatus(params.status) } : {}),
        deadlineDate: {
          gte: from,
          lte: to,
        },
        matter: {
          tenantId,
          deletedAt: null,
        },
      },
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            category: true,
            clientId: true,
            leadAdvocateId: true,
            status: true,
          },
        },
      },
      orderBy: [{ deadlineDate: 'asc' }],
      take: limit,
    });

    return rows.map((row) => compactStatute(row));
  }

  static async markNotified(
    db: MatterStatuteDbClient,
    params: { tenantId: string; matterId: string },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'STATUTE_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      params.matterId,
      'Matter ID',
      'STATUTE_MATTER_REQUIRED',
    );

    await assertTenantMatter(db, { tenantId, matterId });

    const existing = await db.statuteOfLimitations.findFirst({
      where: { matterId },
    });

    if (!existing) {
      throw serviceError(
        'Matter limitation not found',
        404,
        'STATUTE_LIMITATION_NOT_FOUND',
      );
    }

    const updated = await db.statuteOfLimitations.update({
      where: { matterId },
      data: { isNotified: true },
    });

    return compactStatute(updated);
  }

  static async cancelMatterLimitation(
    db: MatterStatuteDbClient,
    params: {
      tenantId: string;
      matterId: string;
      reason?: string | null;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'STATUTE_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      params.matterId,
      'Matter ID',
      'STATUTE_MATTER_REQUIRED',
    );

    await assertTenantMatter(db, { tenantId, matterId });

    const existing = await db.statuteOfLimitations.findFirst({
      where: { matterId },
    });

    if (!existing) {
      throw serviceError(
        'Matter limitation not found',
        404,
        'STATUTE_LIMITATION_NOT_FOUND',
      );
    }

    const updated = await db.statuteOfLimitations.update({
      where: { matterId },
      data: { status: 'CANCELLED' },
    });

    return {
      ...compactStatute(updated),
      reason: toNullableString(params.reason),
    };
  }

  static async refreshExpiredStatuses(
    db: MatterStatuteDbClient,
    params: { tenantId: string; asOf?: Date | string | null },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'STATUTE_TENANT_REQUIRED',
    );
    const asOf = normalizeDate(params.asOf, 'as of') ?? new Date();

    const rows = await db.statuteOfLimitations.findMany({
      where: {
        deadlineDate: { lt: asOf },
        status: 'ACTIVE',
        matter: {
          tenantId,
          deletedAt: null,
        },
      },
      select: { matterId: true },
    });

    const updated: unknown[] = [];

    for (const row of rows) {
      const rowRecord = asRecord(row);
      const matterId = requiredString(
        getString(rowRecord, 'matterId'),
        'Matter ID',
        'STATUTE_MATTER_REQUIRED',
      );

      updated.push(
        await db.statuteOfLimitations.update({
          where: { matterId },
          data: { status: 'EXPIRED' },
        }),
      );
    }

    return {
      updatedCount: updated.length,
      updated: updated.map((row) => compactStatute(row)),
    };
  }

  static async attach(
    db: MatterStatuteDbClient,
    params: AttachMatterLimitationParams,
  ) {
    return this.attachMatterLimitation(db, params);
  }

  static async get(
    db: MatterStatuteDbClient,
    params: { tenantId: string; matterId: string },
  ) {
    return this.getMatterLimitation(db, params);
  }
}

export default StatuteLimitService;