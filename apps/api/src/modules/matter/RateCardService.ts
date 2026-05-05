// apps/api/src/modules/matter/RateCardService.ts

export type RateCardStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type RateRole =
  | 'default'
  | 'partner'
  | 'senior'
  | 'associate'
  | 'trainee'
  | 'paralegal'
  | 'clerk';

interface RateCardDecimalLike {
  toString(): string;
  isFinite?(): boolean;
  lt?(n: number | string): boolean;
}

export type RateValue = RateCardDecimalLike | string | number | null | undefined;

export interface MatterRecord {
  id: string;
  title: string;
  category?: string | null;
  clientId?: string | null;
  leadAdvocateId?: string | null;
  status?: string | null;
  deletedAt?: Date | string | null;
}

export interface UserRecord {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface RateCardRecord {
  id: string;
  tenantId: string;
  matterId?: string | null;
  name: string;
  description?: string | null;
  status: RateCardStatus | string;
  currency: string;

  defaultHourlyRate?: RateValue;
  partnerRate?: RateValue;
  seniorRate?: RateValue;
  associateRate?: RateValue;
  traineeRate?: RateValue;
  paralegalRate?: RateValue;

  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  createdById?: string | null;
  metadata?: Record<string, unknown> | null;

  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;

  matter?: MatterRecord | null;
  createdBy?: UserRecord | null;
}

export type QueryArgs = Record<string, unknown>;

export interface RateCardDatabase {
  rateCard: {
    findFirst(args: QueryArgs): Promise<RateCardRecord | null>;
    findMany(args: QueryArgs): Promise<RateCardRecord[]>;
    create(args: QueryArgs): Promise<RateCardRecord>;
    update(args: QueryArgs): Promise<RateCardRecord>;
    count(args: QueryArgs): Promise<number>;
  };
  matter: {
    findFirst(args: QueryArgs): Promise<MatterRecord | null>;
  };
  user?: {
    findFirst(args: QueryArgs): Promise<UserRecord | null>;
  };
}

export type BaseRateCardInput = {
  tenantId: string;
  name?: string | null;
  description?: string | null;
  currency?: string | null;
  createdById?: string | null;
  originatorId?: string | null;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;

  defaultHourlyRate?: RateValue;
  partnerRate?: RateValue;
  seniorRate?: RateValue;
  associateRate?: RateValue;
  traineeRate?: RateValue;
  paralegalRate?: RateValue;

  clerkRate?: RateValue;
  customRates?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type UpsertMatterRateCardParams = BaseRateCardInput & {
  matterId: string;
};

export type CreateRateCardParams = BaseRateCardInput & {
  matterId?: string | null;
  status?: RateCardStatus | null;
};

export type ResolveApplicableRateParams = {
  tenantId: string;
  matterId: string;
  roleKey: string;
  asOf?: Date | string | null;
};

export type ListRateCardsParams = {
  tenantId: string;
  matterId?: string | null;
  includeGlobal?: boolean;
  status?: RateCardStatus | null;
  asOf?: Date | string | null;
  page?: number;
  limit?: number;
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

function normalizeCurrency(value: unknown): string {
  const currency = toNullableString(value)?.toUpperCase() ?? 'KES';

  if (!/^[A-Z]{3,8}$/.test(currency)) {
    throw serviceError(
      'Invalid rate-card currency',
      422,
      'INVALID_RATE_CARD_CURRENCY',
    );
  }

  return currency;
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
      `Invalid rate-card ${label}`,
      422,
      `INVALID_RATE_CARD_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    );
  }

  return parsed;
}

function assertValidEffectiveRange(effectiveFrom: Date, effectiveTo: Date | null): void {
  if (effectiveTo && effectiveFrom > effectiveTo) {
    throw serviceError(
      'Rate-card effectiveFrom cannot be after effectiveTo',
      422,
      'INVALID_RATE_CARD_EFFECTIVE_RANGE',
    );
  }
}

function normalizeStatus(value?: string | null): RateCardStatus {
  const status = toNullableString(value)?.toUpperCase();

  if (status === 'ACTIVE' || status === 'INACTIVE' || status === 'ARCHIVED') {
    return status;
  }

  return 'ACTIVE';
}

function isDecimalLike(value: unknown): value is RateCardDecimalLike {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { toString?: unknown };

  return typeof candidate.toString === 'function';
}

function toRateNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (isDecimalLike(value)) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeRate(value: unknown): string | null {
  const parsed = toRateNumber(value);

  if (parsed === null) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    throw serviceError(
      'Rate-card rates must be decimal-compatible values',
      422,
      'INVALID_RATE_CARD_RATE',
    );
  }

  if (parsed < 0) {
    throw serviceError(
      'Rate-card rates must be non-negative values',
      422,
      'INVALID_RATE_CARD_RATE',
    );
  }

  return parsed.toFixed(2);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeRole(roleKey: string): RateRole | string {
  const role = requiredString(roleKey, 'Role key', 'RATE_CARD_ROLE_REQUIRED')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

  const mappings: Record<string, RateRole> = {
    default: 'default',
    default_hourly: 'default',
    hourly: 'default',

    partner: 'partner',
    partner_rate: 'partner',

    senior: 'senior',
    senior_associate: 'senior',
    senior_rate: 'senior',

    associate: 'associate',
    lawyer: 'associate',
    advocate: 'associate',

    trainee: 'trainee',
    pupil: 'trainee',

    paralegal: 'paralegal',

    clerk: 'clerk',
    legal_clerk: 'clerk',
  };

  return mappings[role] ?? role;
}

function numberQuery(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function rateCardSelect() {
  return {
    id: true,
    tenantId: true,
    matterId: true,
    name: true,
    description: true,
    status: true,
    currency: true,
    defaultHourlyRate: true,
    partnerRate: true,
    seniorRate: true,
    associateRate: true,
    traineeRate: true,
    paralegalRate: true,
    effectiveFrom: true,
    effectiveTo: true,
    createdById: true,
    metadata: true,
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
      },
    },
    createdBy: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  };
}

function isEffectiveAt(rateCard: RateCardRecord, asOf: Date): boolean {
  const effectiveFrom = rateCard.effectiveFrom
    ? new Date(rateCard.effectiveFrom)
    : null;

  const effectiveTo = rateCard.effectiveTo
    ? new Date(rateCard.effectiveTo)
    : null;

  if (effectiveFrom && effectiveFrom > asOf) {
    return false;
  }

  if (effectiveTo && effectiveTo < asOf) {
    return false;
  }

  return true;
}

function effectiveWhere(asOf: Date): Record<string, unknown> {
  return {
    effectiveFrom: {
      lte: asOf,
    },
    OR: [
      {
        effectiveTo: null,
      },
      {
        effectiveTo: {
          gte: asOf,
        },
      },
    ],
  };
}

function rateForRole(rateCard: RateCardRecord, roleKey: string): string | null {
  const role = normalizeRole(roleKey);
  const metadata = asRecord(rateCard.metadata);
  const customRates = asRecord(metadata.customRates);

  let value: unknown = null;

  switch (role) {
    case 'default':
      value = rateCard.defaultHourlyRate;
      break;

    case 'partner':
      value = rateCard.partnerRate ?? rateCard.defaultHourlyRate;
      break;

    case 'senior':
      value = rateCard.seniorRate ?? rateCard.partnerRate ?? rateCard.defaultHourlyRate;
      break;

    case 'associate':
      value = rateCard.associateRate ?? rateCard.defaultHourlyRate;
      break;

    case 'trainee':
      value = rateCard.traineeRate ?? rateCard.associateRate ?? rateCard.defaultHourlyRate;
      break;

    case 'paralegal':
      value = rateCard.paralegalRate ?? rateCard.defaultHourlyRate;
      break;

    case 'clerk':
      value = customRates.clerk ?? rateCard.defaultHourlyRate;
      break;

    default:
      value = customRates[role] ?? rateCard.defaultHourlyRate;
      break;
  }

  return normalizeRate(value);
}

async function assertTenantMatter(
  db: RateCardDatabase,
  params: {
    tenantId: string;
    matterId: string;
  },
): Promise<MatterRecord> {
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
      status: true,
      deletedAt: true,
    },
  });

  if (!matter) {
    throw serviceError('Matter not found', 404, 'MISSING_MATTER');
  }

  return matter;
}

async function assertTenantUser(
  db: RateCardDatabase,
  params: {
    tenantId: string;
    userId?: string | null;
  },
): Promise<UserRecord | null> {
  const userId = toNullableString(params.userId);

  if (!userId) {
    return null;
  }

  if (!db.user?.findFirst) {
    throw serviceError(
      'User delegate is unavailable',
      500,
      'USER_DELEGATE_UNAVAILABLE',
    );
  }

  const user = await db.user.findFirst({
    where: {
      tenantId: params.tenantId,
      id: userId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw serviceError(
      'Rate-card creator not found or inactive',
      404,
      'RATE_CARD_CREATOR_NOT_FOUND',
    );
  }

  return user;
}

function normalizeCustomRates(params: {
  customRates?: Record<string, unknown> | null;
  clerkRate?: RateValue;
  existingMetadata?: Record<string, unknown> | null;
}): Record<string, string> {
  const existing = asRecord(asRecord(params.existingMetadata).customRates);
  const incoming = asRecord(params.customRates);
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(existing)) {
    const role = normalizeRole(key);
    const rate = normalizeRate(value);

    if (rate) {
      output[String(role)] = rate;
    }
  }

  for (const [key, value] of Object.entries(incoming)) {
    const role = normalizeRole(key);
    const rate = normalizeRate(value);

    if (rate) {
      output[String(role)] = rate;
    }
  }

  if (params.clerkRate !== undefined) {
    const clerk = normalizeRate(params.clerkRate);

    if (clerk) {
      output.clerk = clerk;
    } else {
      delete output.clerk;
    }
  }

  return output;
}

function normalizeMetadata(params: {
  inputMetadata?: Record<string, unknown> | null;
  existingMetadata?: Record<string, unknown> | null;
  customRates: Record<string, string>;
  originatorId?: string | null;
}) {
  return {
    ...asRecord(params.existingMetadata),
    ...asRecord(params.inputMetadata),
    customRates: params.customRates,
    originatorId:
      toNullableString(params.originatorId) ??
      toNullableString(asRecord(params.existingMetadata).originatorId) ??
      null,
    source: 'matter-rate-card-service',
    updatedAt: new Date().toISOString(),
  };
}

function compactRateCard(rateCard: RateCardRecord) {
  const metadata = asRecord(rateCard.metadata);

  return {
    id: rateCard.id,
    tenantId: rateCard.tenantId,
    matterId: rateCard.matterId ?? null,
    name: rateCard.name,
    description: rateCard.description ?? null,
    status: rateCard.status,
    currency: rateCard.currency,
    rates: {
      defaultHourlyRate: normalizeRate(rateCard.defaultHourlyRate),
      partnerRate: normalizeRate(rateCard.partnerRate),
      seniorRate: normalizeRate(rateCard.seniorRate),
      associateRate: normalizeRate(rateCard.associateRate),
      traineeRate: normalizeRate(rateCard.traineeRate),
      paralegalRate: normalizeRate(rateCard.paralegalRate),
      customRates: asRecord(metadata.customRates),
    },
    effectiveFrom: rateCard.effectiveFrom,
    effectiveTo: rateCard.effectiveTo ?? null,
    createdById: rateCard.createdById ?? null,
    originatorId: metadata.originatorId ?? null,
    matter: rateCard.matter ?? null,
    createdBy: rateCard.createdBy ?? null,
    metadata,
    createdAt: rateCard.createdAt,
    updatedAt: rateCard.updatedAt,
  };
}

export class RateCardService {
  static async upsertMatterRateCard(
    db: RateCardDatabase,
    params: UpsertMatterRateCardParams,
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'RATE_CARD_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      params.matterId,
      'Matter ID',
      'RATE_CARD_MATTER_REQUIRED',
    );

    const matter = await assertTenantMatter(db, { tenantId, matterId });
    await assertTenantUser(db, { tenantId, userId: params.createdById ?? null });

    const effectiveFrom = normalizeDate(params.effectiveFrom, 'effective from') ?? new Date();
    const effectiveTo = normalizeDate(params.effectiveTo, 'effective to');

    assertValidEffectiveRange(effectiveFrom, effectiveTo);

    const existing = await db.rateCard.findFirst({
      where: {
        tenantId,
        matterId,
        status: 'ACTIVE',
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      select: rateCardSelect(),
    });

    const customRates = normalizeCustomRates({
      customRates: params.customRates,
      clerkRate: params.clerkRate,
      existingMetadata: existing?.metadata ?? null,
    });

    const metadata = normalizeMetadata({
      inputMetadata: params.metadata,
      existingMetadata: existing?.metadata ?? null,
      customRates,
      originatorId: params.originatorId ?? null,
    });

    const data = {
      tenantId,
      matterId,
      name: toNullableString(params.name) ?? `Matter Rate Card - ${matter.title}`,
      description: toNullableString(params.description),
      status: 'ACTIVE' as RateCardStatus,
      currency: normalizeCurrency(params.currency ?? existing?.currency ?? 'KES'),

      defaultHourlyRate:
        params.defaultHourlyRate !== undefined
          ? normalizeRate(params.defaultHourlyRate)
          : normalizeRate(existing?.defaultHourlyRate),

      partnerRate:
        params.partnerRate !== undefined
          ? normalizeRate(params.partnerRate)
          : normalizeRate(existing?.partnerRate),

      seniorRate:
        params.seniorRate !== undefined
          ? normalizeRate(params.seniorRate)
          : normalizeRate(existing?.seniorRate),

      associateRate:
        params.associateRate !== undefined
          ? normalizeRate(params.associateRate)
          : normalizeRate(existing?.associateRate),

      traineeRate:
        params.traineeRate !== undefined
          ? normalizeRate(params.traineeRate)
          : normalizeRate(existing?.traineeRate),

      paralegalRate:
        params.paralegalRate !== undefined
          ? normalizeRate(params.paralegalRate)
          : normalizeRate(existing?.paralegalRate),

      effectiveFrom,
      effectiveTo,
      createdById: toNullableString(params.createdById) ?? existing?.createdById ?? null,
      metadata,
    };

    const saved = existing
      ? await db.rateCard.update({
          where: {
            id: existing.id,
          },
          data,
          select: rateCardSelect(),
        })
      : await db.rateCard.create({
          data,
          select: rateCardSelect(),
        });

    return compactRateCard(saved);
  }

  static async createRateCard(
    db: RateCardDatabase,
    params: CreateRateCardParams,
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'RATE_CARD_TENANT_REQUIRED',
    );
    const matterId = toNullableString(params.matterId);

    const matter = matterId
      ? await assertTenantMatter(db, { tenantId, matterId })
      : null;

    await assertTenantUser(db, { tenantId, userId: params.createdById ?? null });

    const effectiveFrom = normalizeDate(params.effectiveFrom, 'effective from') ?? new Date();
    const effectiveTo = normalizeDate(params.effectiveTo, 'effective to');

    assertValidEffectiveRange(effectiveFrom, effectiveTo);

    const customRates = normalizeCustomRates({
      customRates: params.customRates,
      clerkRate: params.clerkRate,
      existingMetadata: null,
    });

    const saved = await db.rateCard.create({
      data: {
        tenantId,
        matterId,
        name:
          toNullableString(params.name) ??
          (matter ? `Matter Rate Card - ${matter.title}` : 'Tenant Standard Rate Card'),
        description: toNullableString(params.description),
        status: normalizeStatus(params.status),
        currency: normalizeCurrency(params.currency),

        defaultHourlyRate: normalizeRate(params.defaultHourlyRate),
        partnerRate: normalizeRate(params.partnerRate),
        seniorRate: normalizeRate(params.seniorRate),
        associateRate: normalizeRate(params.associateRate),
        traineeRate: normalizeRate(params.traineeRate),
        paralegalRate: normalizeRate(params.paralegalRate),

        effectiveFrom,
        effectiveTo,
        createdById: toNullableString(params.createdById),
        metadata: normalizeMetadata({
          inputMetadata: params.metadata,
          customRates,
          originatorId: params.originatorId ?? null,
        }),
      },
      select: rateCardSelect(),
    });

    return compactRateCard(saved);
  }

  static async listRateCards(
    db: RateCardDatabase,
    params: ListRateCardsParams,
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'RATE_CARD_TENANT_REQUIRED',
    );
    const page = numberQuery(params.page, 1, 1000000);
    const limit = numberQuery(params.limit, 25, 100);
    const skip = (page - 1) * limit;

    const matterId = toNullableString(params.matterId);
    const asOf = normalizeDate(params.asOf, 'as of');
    const status = params.status ? normalizeStatus(params.status) : null;

    const where: Record<string, unknown> = {
      tenantId,
      ...(status ? { status } : {}),
    };

    if (matterId && params.includeGlobal === true) {
      where.OR = [{ matterId }, { matterId: null }];
    } else if (matterId) {
      where.matterId = matterId;
    } else if (params.includeGlobal !== true) {
      where.matterId = null;
    }

    if (asOf) {
      where.AND = [effectiveWhere(asOf)];
    }

    const [rows, total] = await Promise.all([
      db.rateCard.findMany({
        where,
        select: rateCardSelect(),
        orderBy: [{ matterId: 'desc' }, { effectiveFrom: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.rateCard.count({ where }),
    ]);

    return {
      data: rows.map(compactRateCard),
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

  static async resolveApplicableRate(
    db: RateCardDatabase,
    params: ResolveApplicableRateParams,
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'RATE_CARD_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      params.matterId,
      'Matter ID',
      'RATE_CARD_MATTER_REQUIRED',
    );
    const roleKey = requiredString(
      params.roleKey,
      'Role key',
      'RATE_CARD_ROLE_REQUIRED',
    );
    const asOf = normalizeDate(params.asOf, 'as of') ?? new Date();

    await assertTenantMatter(db, { tenantId, matterId });

    const rateCards = await db.rateCard.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [
          {
            matterId,
          },
          {
            matterId: null,
          },
        ],
        ...effectiveWhere(asOf),
      },
      select: rateCardSelect(),
      orderBy: [
        { matterId: 'desc' },
        { effectiveFrom: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });

    const matterSpecific = rateCards.find(
      (card) => card.matterId === matterId && isEffectiveAt(card, asOf),
    );
    const global = rateCards.find(
      (card) => !card.matterId && isEffectiveAt(card, asOf),
    );
    const selected = matterSpecific ?? global ?? null;

    if (!selected) {
      return {
        matterId,
        roleKey: normalizeRole(roleKey),
        rate: '0.00',
        rateAmount: '0.00',
        currency: 'KES',
        rateCardId: null,
        rateCard: null,
        source: 'NONE',
        asOf,
      };
    }

    const rateAmount = rateForRole(selected, roleKey) ?? '0.00';

    return {
      matterId,
      roleKey: normalizeRole(roleKey),
      rate: rateAmount,
      rateAmount,
      currency: selected.currency ?? 'KES',
      rateCardId: selected.id,
      rateCard: compactRateCard(selected),
      source: selected.matterId === matterId ? 'MATTER' : 'GLOBAL',
      asOf,
    };
  }

  static async archiveRateCard(
    db: RateCardDatabase,
    params: {
      tenantId: string;
      rateCardId: string;
      archivedById?: string | null;
      reason?: string | null;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'RATE_CARD_TENANT_REQUIRED',
    );
    const rateCardId = requiredString(
      params.rateCardId,
      'Rate card ID',
      'RATE_CARD_ID_REQUIRED',
    );

    const existing = await db.rateCard.findFirst({
      where: {
        tenantId,
        id: rateCardId,
      },
      select: rateCardSelect(),
    });

    if (!existing) {
      throw serviceError('Rate card not found', 404, 'RATE_CARD_NOT_FOUND');
    }

    const metadata = {
      ...asRecord(existing.metadata),
      archivedAt: new Date().toISOString(),
      archivedById: toNullableString(params.archivedById),
      archiveReason: toNullableString(params.reason),
    };

    const archived = await db.rateCard.update({
      where: {
        id: rateCardId,
      },
      data: {
        status: 'ARCHIVED',
        effectiveTo: existing.effectiveTo ?? new Date(),
        metadata,
      },
      select: rateCardSelect(),
    });

    return compactRateCard(archived);
  }

  static async getMatterRateCard(
    db: RateCardDatabase,
    params: {
      tenantId: string;
      matterId: string;
      asOf?: Date | string | null;
      includeGlobalFallback?: boolean;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'RATE_CARD_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      params.matterId,
      'Matter ID',
      'RATE_CARD_MATTER_REQUIRED',
    );
    const asOf = normalizeDate(params.asOf, 'as of') ?? new Date();

    await assertTenantMatter(db, { tenantId, matterId });

    const cards = await db.rateCard.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR:
          params.includeGlobalFallback === false
            ? [{ matterId }]
            : [{ matterId }, { matterId: null }],
        ...effectiveWhere(asOf),
      },
      select: rateCardSelect(),
      orderBy: [
        { matterId: 'desc' },
        { effectiveFrom: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 5,
    });

    const selected =
      cards.find((card) => card.matterId === matterId && isEffectiveAt(card, asOf)) ??
      (params.includeGlobalFallback === false
        ? null
        : cards.find((card) => !card.matterId && isEffectiveAt(card, asOf))) ??
      null;

    return selected ? compactRateCard(selected) : null;
  }
}

export default RateCardService;
