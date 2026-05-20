// apps/api/src/modules/matter/MatterConflictService.ts

type QueryArgs = Record<string, unknown>;

type ConflictLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type ConflictMatchType =
  | 'CLIENT'
  | 'MATTER'
  | 'ADVERSE_PARTY'
  | 'RELATED_ENTITY'
  | 'EMAIL'
  | 'KRA_PIN'
  | 'PHONE'
  | 'TEXT';

type ConflictCheckInput = {
  tenantId: string;
  clientId?: string | null;
  matterId?: string | null;

  clientName?: string | null;
  matterTitle?: string | null;
  counterpartyName?: string | null;
  opposingPartyName?: string | null;
  kraPin?: string | null;
  email?: string | null;
  phoneNumber?: string | null;

  adversePartyNames?: string[] | null;
  relatedEntityNames?: string[] | null;
  searchTerms?: string[] | null;

  excludeMatterId?: string | null;
  includeArchived?: boolean;
};

type ConflictMatch = {
  type: ConflictMatchType;
  source: string;
  term: string;
  score: number;
  severity: ConflictLevel;
  entityId: string;
  entityType: 'CLIENT' | 'MATTER';
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
};

type ConflictCheckResult = {
  conflictLevel: ConflictLevel;
  conflictReason: string | null;
  searchedNames: string[];
  matches: ConflictMatch[];
  summary: {
    totalMatches: number;
    clientMatches: number;
    matterMatches: number;
    highRiskMatches: number;
    sanctionsOrPepMatches: number;
    exactIdentifierMatches: number;
    hasActiveMatterMatch: boolean;
    excludedMatterId?: string | null;
  };
};

type ClientConflictRecord = {
  id: string;
  name: string;
  clientCode?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  kraPin?: string | null;
  type?: string | null;
  status?: string | null;
  kycStatus?: string | null;
  riskBand?: string | null;
  riskScore?: number | string | null;
  pepStatus?: string | null;
  sanctionsStatus?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type AdvocateRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type MatterConflictRecord = {
  id: string;
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
  deletedAt?: Date | string | null;
  client?: ClientConflictRecord | null;
  leadAdvocate?: AdvocateRecord | null;
};

type ConflictDbClient = {
  /**
   * The concrete Prisma delegate type may be request-scoped / extended.
   * We intentionally keep this structural at the boundary and recover typed
   * records inside safeFindFirst/safeFindMany call sites.
   */
  client: unknown;
  matter: unknown;
};

type ConflictFindFirstDelegate = {
  findFirst: (args?: never) => Promise<unknown>;
};

type ConflictFindManyDelegate = {
  findMany: (args?: never) => Promise<unknown>;
};

function asFindFirstDelegate(delegate: unknown): ConflictFindFirstDelegate | null {
  if (
    delegate &&
    typeof delegate === 'object' &&
    'findFirst' in delegate &&
    typeof (delegate as { findFirst?: unknown }).findFirst === 'function'
  ) {
    return delegate as ConflictFindFirstDelegate;
  }

  return null;
}

function asFindManyDelegate(delegate: unknown): ConflictFindManyDelegate | null {
  if (
    delegate &&
    typeof delegate === 'object' &&
    'findMany' in delegate &&
    typeof (delegate as { findMany?: unknown }).findMany === 'function'
  ) {
    return delegate as ConflictFindManyDelegate;
  }

  return null;
}

type ConflictInputContext = {
  tenantId: string;
  client: ClientConflictRecord | null;
  matter: MatterConflictRecord | null;
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

function normalizeSearchTerm(value: unknown): string | null {
  const normalized = toNullableString(value);

  if (!normalized) {
    return null;
  }

  return normalized.replace(/\s+/g, ' ').trim();
}

function normalizeEmail(value: unknown): string | null {
  return toNullableString(value)?.toLowerCase() ?? null;
}

function normalizeKraPin(value: unknown): string | null {
  return toNullableString(value)?.toUpperCase().replace(/\s+/g, '') ?? null;
}

function normalizePhone(value: unknown): string | null {
  const phone = toNullableString(value);

  if (!phone) {
    return null;
  }

  return phone.replace(/[^\d+]/g, '');
}

function unique(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const normalized = normalizeSearchTerm(value);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(normalized);
  }

  return out;
}

function uniqueIdentifierTerms(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const normalized = toNullableString(value);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(normalized);
  }

  return out;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return unique(
    value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item),
  );
}

function buildTextTerms(
  input: ConflictCheckInput,
  client?: ClientConflictRecord | null,
  matter?: MatterConflictRecord | null,
): string[] {
  return unique([
    input.clientName,
    input.matterTitle,
    input.counterpartyName,
    input.opposingPartyName,
    client?.name,
    client?.clientCode,
    matter?.title,
    matter?.category,
    ...normalizeStringArray(input.adversePartyNames),
    ...normalizeStringArray(input.relatedEntityNames),
    ...normalizeStringArray(input.searchTerms),
  ]);
}

function buildEmailTerms(
  input: ConflictCheckInput,
  client?: ClientConflictRecord | null,
): string[] {
  return uniqueIdentifierTerms([
    normalizeEmail(input.email),
    normalizeEmail(client?.email),
  ]);
}

function buildKraPinTerms(
  input: ConflictCheckInput,
  client?: ClientConflictRecord | null,
): string[] {
  return uniqueIdentifierTerms([
    normalizeKraPin(input.kraPin),
    normalizeKraPin(client?.kraPin),
  ]);
}

function buildPhoneTerms(
  input: ConflictCheckInput,
  client?: ClientConflictRecord | null,
): string[] {
  return uniqueIdentifierTerms([
    normalizePhone(input.phoneNumber),
    normalizePhone(client?.phoneNumber),
  ]);
}

function clientSelect() {
  return {
    id: true,
    name: true,
    clientCode: true,
    email: true,
    phoneNumber: true,
    kraPin: true,
    type: true,
    status: true,
    kycStatus: true,
    riskBand: true,
    riskScore: true,
    pepStatus: true,
    sanctionsStatus: true,
    createdAt: true,
    updatedAt: true,
  };
}

function matterSelect() {
  return {
    id: true,
    title: true,
    category: true,
    clientId: true,
    leadAdvocateId: true,
    status: true,
    riskLevel: true,
    openedDate: true,
    closedDate: true,
    archivedDate: true,
    deletedAt: true,
    client: {
      select: clientSelect(),
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

function isHighRiskClient(client: ClientConflictRecord | null | undefined): boolean {
  const riskBand = String(client?.riskBand ?? '').toUpperCase();
  const pepStatus = String(client?.pepStatus ?? '').toUpperCase();
  const sanctionsStatus = String(client?.sanctionsStatus ?? '').toUpperCase();

  return (
    riskBand === 'HIGH' ||
    riskBand === 'CRITICAL' ||
    pepStatus === 'MATCH' ||
    pepStatus === 'POTENTIAL_MATCH' ||
    sanctionsStatus === 'MATCH' ||
    sanctionsStatus === 'POTENTIAL_MATCH'
  );
}

function isActiveMatter(matter: MatterConflictRecord | null | undefined): boolean {
  const status = String(matter?.status ?? '').toUpperCase();

  return ['ACTIVE', 'ON_HOLD'].includes(status) && !matter?.deletedAt;
}

function scoreClientMatch(params: {
  client: ClientConflictRecord;
  term: string;
  type: ConflictMatchType;
  exactIdentifier?: boolean;
}): { score: number; severity: ConflictLevel } {
  let score = params.exactIdentifier ? 90 : 45;

  if (isHighRiskClient(params.client)) {
    score += 25;
  }

  const status = String(params.client.status ?? '').toUpperCase();

  if (status === 'ACTIVE') {
    score += 10;
  }

  if (
    params.type === 'KRA_PIN' ||
    params.type === 'EMAIL' ||
    params.type === 'PHONE'
  ) {
    score += 10;
  }

  score = Math.min(100, score);

  return {
    score,
    severity:
      score >= 90
        ? 'CRITICAL'
        : score >= 75
          ? 'HIGH'
          : score >= 50
            ? 'MEDIUM'
            : 'LOW',
  };
}

function scoreMatterMatch(params: {
  matter: MatterConflictRecord;
  term: string;
  type: ConflictMatchType;
  exactIdentifier?: boolean;
}): { score: number; severity: ConflictLevel } {
  let score = params.exactIdentifier ? 85 : 50;

  if (isActiveMatter(params.matter)) {
    score += 20;
  }

  const riskLevel = String(params.matter.riskLevel ?? '').toUpperCase();

  if (riskLevel === 'CRITICAL') {
    score += 25;
  }

  if (riskLevel === 'HIGH') {
    score += 15;
  }

  if (isHighRiskClient(params.matter.client)) {
    score += 15;
  }

  score = Math.min(100, score);

  return {
    score,
    severity:
      score >= 90
        ? 'CRITICAL'
        : score >= 75
          ? 'HIGH'
          : score >= 50
            ? 'MEDIUM'
            : 'LOW',
  };
}

function deriveConflictLevel(matches: ConflictMatch[]): ConflictLevel {
  if (matches.some((match) => match.severity === 'CRITICAL')) {
    return 'CRITICAL';
  }

  if (matches.some((match) => match.severity === 'HIGH')) {
    return 'HIGH';
  }

  if (matches.some((match) => match.severity === 'MEDIUM')) {
    return 'MEDIUM';
  }

  if (matches.some((match) => match.severity === 'LOW')) {
    return 'LOW';
  }

  return 'NONE';
}

function deriveConflictReason(
  level: ConflictLevel,
  matches: ConflictMatch[],
): string | null {
  if (level === 'NONE') {
    return null;
  }

  const exactIdentifierMatches = matches.filter((match) =>
    ['EMAIL', 'KRA_PIN', 'PHONE'].includes(match.type),
  ).length;

  const activeMatterMatches = matches.filter(
    (match) =>
      match.entityType === 'MATTER' && match.metadata?.isActiveMatter === true,
  ).length;

  const highRiskMatches = matches.filter((match) =>
    ['HIGH', 'CRITICAL'].includes(match.severity),
  ).length;

  if (exactIdentifierMatches > 0) {
    return `Potential conflict detected from ${exactIdentifierMatches} exact identifier match(es).`;
  }

  if (activeMatterMatches > 0) {
    return `Potential conflict detected from ${activeMatterMatches} active matter match(es).`;
  }

  if (highRiskMatches > 0) {
    return `Potential conflict detected from ${highRiskMatches} high-risk match(es).`;
  }

  return `Potential conflict detected from ${matches.length} related record match(es).`;
}

function clientMatch(
  client: ClientConflictRecord,
  term: string,
  type: ConflictMatchType,
  source: string,
  exactIdentifier = false,
): ConflictMatch {
  const scoring = scoreClientMatch({
    client,
    term,
    type,
    exactIdentifier,
  });

  return {
    type,
    source,
    term,
    score: scoring.score,
    severity: scoring.severity,
    entityId: client.id,
    entityType: 'CLIENT',
    title: client.name,
    description: client.clientCode ?? client.email ?? null,
    metadata: {
      clientCode: client.clientCode ?? null,
      email: client.email ?? null,
      phoneNumber: client.phoneNumber ?? null,
      kraPin: client.kraPin ?? null,
      status: client.status ?? null,
      kycStatus: client.kycStatus ?? null,
      riskBand: client.riskBand ?? null,
      riskScore: client.riskScore ?? null,
      pepStatus: client.pepStatus ?? null,
      sanctionsStatus: client.sanctionsStatus ?? null,
    },
  };
}

function matterMatch(
  matter: MatterConflictRecord,
  term: string,
  type: ConflictMatchType,
  source: string,
  exactIdentifier = false,
): ConflictMatch {
  const scoring = scoreMatterMatch({
    matter,
    term,
    type,
    exactIdentifier,
  });

  return {
    type,
    source,
    term,
    score: scoring.score,
    severity: scoring.severity,
    entityId: matter.id,
    entityType: 'MATTER',
    title: matter.title,
    description: matter.category ?? null,
    metadata: {
      category: matter.category ?? null,
      status: matter.status ?? null,
      riskLevel: matter.riskLevel ?? null,
      clientId: matter.clientId ?? null,
      clientName: matter.client?.name ?? null,
      clientCode: matter.client?.clientCode ?? null,
      leadAdvocateId: matter.leadAdvocateId ?? null,
      leadAdvocateName: matter.leadAdvocate?.name ?? null,
      openedDate: matter.openedDate ?? null,
      closedDate: matter.closedDate ?? null,
      archivedDate: matter.archivedDate ?? null,
      isActiveMatter: isActiveMatter(matter),
    },
  };
}

function dedupeMatches(matches: ConflictMatch[]): ConflictMatch[] {
  const map = new Map<string, ConflictMatch>();

  for (const match of matches) {
    const key = `${match.entityType}:${match.entityId}:${match.type}:${match.term.toLowerCase()}`;
    const existing = map.get(key);

    if (!existing || match.score > existing.score) {
      map.set(key, match);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

async function safeFindFirst<TRecord>(
  delegate: unknown,
  args: QueryArgs,
): Promise<TRecord | null> {
  const findFirstDelegate = asFindFirstDelegate(delegate);

  if (!findFirstDelegate) {
    return null;
  }

  const result = await findFirstDelegate.findFirst(args as never);

  return (result ?? null) as TRecord | null;
}

async function safeFindMany<TRecord>(
  delegate: unknown,
  args: QueryArgs,
): Promise<TRecord[]> {
  const findManyDelegate = asFindManyDelegate(delegate);

  if (!findManyDelegate) {
    return [];
  }

  const result = await findManyDelegate.findMany(args as never);

  return Array.isArray(result) ? (result as TRecord[]) : [];
}

async function loadInputContext(
  db: ConflictDbClient,
  input: ConflictCheckInput,
): Promise<ConflictInputContext> {
  const tenantId = requiredString(
    input.tenantId,
    'Tenant ID',
    'MATTER_CONFLICT_TENANT_REQUIRED',
  );

  const [client, matter] = await Promise.all([
    input.clientId
      ? safeFindFirst<ClientConflictRecord>(db.client, {
          where: {
            tenantId,
            id: input.clientId,
          },
          select: clientSelect(),
        })
      : Promise.resolve(null),

    input.matterId
      ? safeFindFirst<MatterConflictRecord>(db.matter, {
          where: {
            tenantId,
            id: input.matterId,
          },
          select: matterSelect(),
        })
      : Promise.resolve(null),
  ]);

  if (input.clientId && !client) {
    throw serviceError(
      'Client not found for conflict check',
      404,
      'CONFLICT_CHECK_CLIENT_NOT_FOUND',
    );
  }

  if (input.matterId && !matter) {
    throw serviceError(
      'Matter not found for conflict check',
      404,
      'CONFLICT_CHECK_MATTER_NOT_FOUND',
    );
  }

  return {
    tenantId,
    client,
    matter,
  };
}

function buildMatterWhereBase(
  input: ConflictCheckInput,
  tenantId: string,
): Record<string, unknown> {
  return {
    tenantId,
    ...(input.includeArchived === true ? {} : { deletedAt: null }),
    ...(input.excludeMatterId
      ? {
          id: {
            not: input.excludeMatterId,
          },
        }
      : {}),
    ...(input.matterId
      ? {
          id: {
            not: input.matterId,
          },
        }
      : {}),
  };
}

export class MatterConflictService {
  /**
   * Enterprise conflict check.
   *
   * Schema alignment:
   * - Matter uses `title`, `category`, `clientId`, `leadAdvocateId`, `riskLevel`, `status`.
   * - Matter also has physical `matterCode` and `caseNumber` reference fields.
   * - `partnerId` and `assignedLawyerId` are metadata-backed in the current Matter schema.
   * - Client uses `phoneNumber`, not `phone`.
   *
   * This service intentionally returns a rich result for audit logging, onboarding gates,
   * and manual risk review. It does not auto-block matter creation; callers decide policy.
   */
  static async runConflictCheck(
    db: ConflictDbClient,
    input: ConflictCheckInput,
  ): Promise<ConflictCheckResult> {
    const { tenantId, client, matter } = await loadInputContext(db, input);

    const textTerms = buildTextTerms(input, client, matter);
    const emailTerms = buildEmailTerms(input, client);
    const kraPinTerms = buildKraPinTerms(input, client);
    const phoneTerms = buildPhoneTerms(input, client);

    const searchedNames = unique([
      ...textTerms,
      ...emailTerms,
      ...kraPinTerms,
      ...phoneTerms,
    ]);

    if (searchedNames.length === 0) {
      throw serviceError(
        'At least one conflict-search term is required',
        422,
        'MATTER_CONFLICT_SEARCH_TERM_REQUIRED',
      );
    }

    const matches: ConflictMatch[] = [];
    const matterWhereBase = buildMatterWhereBase(input, tenantId);

    for (const term of textTerms) {
      const [clientRows, matterRows] = await Promise.all([
        safeFindMany<ClientConflictRecord>(db.client, {
          where: {
            tenantId,
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { clientCode: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
              { kraPin: { contains: term, mode: 'insensitive' } },
              { phoneNumber: { contains: term, mode: 'insensitive' } },
            ],
          },
          select: clientSelect(),
          take: 25,
        }),

        safeFindMany<MatterConflictRecord>(db.matter, {
          where: {
            ...matterWhereBase,
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { category: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } },
              {
                client: {
                  is: {
                    OR: [
                      { name: { contains: term, mode: 'insensitive' } },
                      { clientCode: { contains: term, mode: 'insensitive' } },
                      { email: { contains: term, mode: 'insensitive' } },
                      { kraPin: { contains: term, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            ],
          },
          select: matterSelect(),
          take: 25,
        }),
      ]);

      for (const row of clientRows) {
        if (input.clientId && row.id === input.clientId) {
          continue;
        }

        matches.push(clientMatch(row, term, 'TEXT', 'text-search'));
      }

      for (const row of matterRows) {
        matches.push(matterMatch(row, term, 'MATTER', 'text-search'));
      }
    }

    for (const email of emailTerms) {
      const [clientRows, matterRows] = await Promise.all([
        safeFindMany<ClientConflictRecord>(db.client, {
          where: {
            tenantId,
            email: {
              equals: email,
              mode: 'insensitive',
            },
          },
          select: clientSelect(),
          take: 25,
        }),

        safeFindMany<MatterConflictRecord>(db.matter, {
          where: {
            ...matterWhereBase,
            client: {
              is: {
                email: {
                  equals: email,
                  mode: 'insensitive',
                },
              },
            },
          },
          select: matterSelect(),
          take: 25,
        }),
      ]);

      for (const row of clientRows) {
        if (input.clientId && row.id === input.clientId) {
          continue;
        }

        matches.push(clientMatch(row, email, 'EMAIL', 'email-exact', true));
      }

      for (const row of matterRows) {
        matches.push(matterMatch(row, email, 'EMAIL', 'email-exact', true));
      }
    }

    for (const kraPin of kraPinTerms) {
      const [clientRows, matterRows] = await Promise.all([
        safeFindMany<ClientConflictRecord>(db.client, {
          where: {
            tenantId,
            kraPin: {
              equals: kraPin,
              mode: 'insensitive',
            },
          },
          select: clientSelect(),
          take: 25,
        }),

        safeFindMany<MatterConflictRecord>(db.matter, {
          where: {
            ...matterWhereBase,
            client: {
              is: {
                kraPin: {
                  equals: kraPin,
                  mode: 'insensitive',
                },
              },
            },
          },
          select: matterSelect(),
          take: 25,
        }),
      ]);

      for (const row of clientRows) {
        if (input.clientId && row.id === input.clientId) {
          continue;
        }

        matches.push(clientMatch(row, kraPin, 'KRA_PIN', 'kra-pin-exact', true));
      }

      for (const row of matterRows) {
        matches.push(matterMatch(row, kraPin, 'KRA_PIN', 'kra-pin-exact', true));
      }
    }

    for (const phone of phoneTerms) {
      const [clientRows, matterRows] = await Promise.all([
        safeFindMany<ClientConflictRecord>(db.client, {
          where: {
            tenantId,
            phoneNumber: {
              contains: phone,
              mode: 'insensitive',
            },
          },
          select: clientSelect(),
          take: 25,
        }),

        safeFindMany<MatterConflictRecord>(db.matter, {
          where: {
            ...matterWhereBase,
            client: {
              is: {
                phoneNumber: {
                  contains: phone,
                  mode: 'insensitive',
                },
              },
            },
          },
          select: matterSelect(),
          take: 25,
        }),
      ]);

      for (const row of clientRows) {
        if (input.clientId && row.id === input.clientId) {
          continue;
        }

        matches.push(clientMatch(row, phone, 'PHONE', 'phone-search', true));
      }

      for (const row of matterRows) {
        matches.push(matterMatch(row, phone, 'PHONE', 'phone-search', true));
      }
    }

    const deduped = dedupeMatches(matches);
    const conflictLevel = deriveConflictLevel(deduped);
    const conflictReason = deriveConflictReason(conflictLevel, deduped);

    const clientMatches = deduped.filter((match) => match.entityType === 'CLIENT');
    const matterMatches = deduped.filter((match) => match.entityType === 'MATTER');
    const highRiskMatches = deduped.filter((match) =>
      ['HIGH', 'CRITICAL'].includes(match.severity),
    );
    const exactIdentifierMatches = deduped.filter((match) =>
      ['EMAIL', 'KRA_PIN', 'PHONE'].includes(match.type),
    );
    const sanctionsOrPepMatches = deduped.filter((match) => {
      const metadata = match.metadata ?? {};
      const pep = String(metadata.pepStatus ?? '').toUpperCase();
      const sanctions = String(metadata.sanctionsStatus ?? '').toUpperCase();

      return (
        ['MATCH', 'POTENTIAL_MATCH'].includes(pep) ||
        ['MATCH', 'POTENTIAL_MATCH'].includes(sanctions)
      );
    });

    return {
      conflictLevel,
      conflictReason,
      searchedNames,
      matches: deduped,
      summary: {
        totalMatches: deduped.length,
        clientMatches: clientMatches.length,
        matterMatches: matterMatches.length,
        highRiskMatches: highRiskMatches.length,
        sanctionsOrPepMatches: sanctionsOrPepMatches.length,
        exactIdentifierMatches: exactIdentifierMatches.length,
        hasActiveMatterMatch: deduped.some(
          (match) =>
            match.entityType === 'MATTER' &&
            match.metadata?.isActiveMatter === true,
        ),
        excludedMatterId: input.excludeMatterId ?? input.matterId ?? null,
      },
    };
  }

  static async checkConflicts(
    db: ConflictDbClient,
    input: ConflictCheckInput,
  ): Promise<ConflictCheckResult> {
    return this.runConflictCheck(db, input);
  }

  static async checkMatterConflicts(
    db: ConflictDbClient,
    input: ConflictCheckInput,
  ): Promise<ConflictCheckResult> {
    return this.runConflictCheck(db, input);
  }

  static async evaluateMatterConflict(
    db: ConflictDbClient,
    input: ConflictCheckInput,
  ): Promise<ConflictCheckResult> {
    return this.runConflictCheck(db, input);
  }

  static async getClientConflictProfile(
    db: ConflictDbClient,
    params: {
      tenantId: string;
      clientId: string;
      includeArchived?: boolean;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'MATTER_CONFLICT_TENANT_REQUIRED',
    );
    const clientId = requiredString(
      params.clientId,
      'Client ID',
      'MATTER_CONFLICT_CLIENT_REQUIRED',
    );

    const client = await safeFindFirst<ClientConflictRecord>(db.client, {
      where: {
        tenantId,
        id: clientId,
      },
      select: clientSelect(),
    });

    if (!client) {
      throw serviceError(
        'Client not found',
        404,
        'CONFLICT_PROFILE_CLIENT_NOT_FOUND',
      );
    }

    const relatedMatters = await safeFindMany<MatterConflictRecord>(db.matter, {
      where: {
        tenantId,
        clientId,
        ...(params.includeArchived === true ? {} : { deletedAt: null }),
      },
      select: matterSelect(),
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });

    const conflict = await this.runConflictCheck(db, {
      tenantId,
      clientId,
      includeArchived: params.includeArchived,
    });

    return {
      client,
      relatedMatters,
      conflict,
      generatedAt: new Date(),
    };
  }

  static async getConflictSummary(
    db: ConflictDbClient,
    params: {
      tenantId: string;
      clientId?: string | null;
      matterId?: string | null;
      searchTerms?: string[] | null;
      includeArchived?: boolean;
    },
  ) {
    const result = await this.runConflictCheck(db, {
      tenantId: params.tenantId,
      clientId: params.clientId ?? null,
      matterId: params.matterId ?? null,
      searchTerms: params.searchTerms ?? null,
      includeArchived: params.includeArchived,
    });

    return {
      conflictLevel: result.conflictLevel,
      conflictReason: result.conflictReason,
      searchedNames: result.searchedNames,
      summary: result.summary,
      topMatches: result.matches.slice(0, 10),
    };
  }
}

export default MatterConflictService;
