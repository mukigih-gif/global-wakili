// apps/api/src/modules/matter/MatterKYCService.ts

import crypto from 'crypto';

type QueryArgs = Record<string, unknown>;

type KycStatus = 'PASS' | 'REVIEW_REQUIRED' | 'INCOMPLETE' | 'BLOCKED';
type KycRiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
type KycIssueSeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';

type MatterKycEvaluationParams = {
  tenantId: string;
  matterId: string;
  createdById?: string | null;
  persist?: boolean;
  requireApprovedClient?: boolean;
  includeDocuments?: boolean;
};

type KycIssue = {
  code: string;
  severity: KycIssueSeverity;
  message: string;
  field?: string | null;
  remediation?: string | null;
};

type KycRequirement = {
  code: string;
  label: string;
  passed: boolean;
  severity: KycIssueSeverity;
  field?: string | null;
};

type KycEvaluationResult = {
  tenantId: string;
  matterId: string;
  clientId: string | null;
  evaluatedAt: string;
  evaluatedById: string | null;
  score: number;
  status: KycStatus;
  riskBand: KycRiskBand;
  blocked: boolean;
  requirements: KycRequirement[];
  issues: KycIssue[];
  matter: {
    id: string;
    title: string;
    category: string | null;
    status: string | null;
    riskLevel: string | null;
    leadAdvocateId: string | null;
  };
  client: {
    id: string | null;
    name: string | null;
    clientCode: string | null;
    type: string | null;
    email: string | null;
    phoneNumber: string | null;
    kraPin: string | null;
    kycStatus: string | null;
    riskBand: string | null;
    riskScore: number | null;
    pepStatus: string | null;
    sanctionsStatus: string | null;
  };
  documentReadiness?: {
    requiredDocumentCount: number;
    availableDocumentCount: number;
    missingDocumentCodes: string[];
    availableDocuments: Array<{
      id: string;
      title: string;
      category: string | null;
      confidentiality: string | null;
      isRestricted: boolean;
      createdAt: Date | string | null;
    }>;
  };
};

type MatterKycClientRecord = {
  id: string;
  name?: string | null;
  clientCode?: string | null;
  type?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  kraPin?: string | null;
  status?: string | null;
  kycStatus?: string | null;
  riskBand?: string | null;
  riskScore?: number | string | { toString(): string } | null;
  pepStatus?: string | null;
  sanctionsStatus?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type MatterKycLeadAdvocateRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type MatterKycMatterRecord = {
  id: string;
  tenantId?: string | null;
  title: string;
  category?: string | null;
  clientId?: string | null;
  leadAdvocateId?: string | null;
  status?: string | null;
  riskLevel?: string | null;
  openedDate?: Date | string | null;
  deletedAt?: Date | string | null;
  client?: MatterKycClientRecord | null;
  leadAdvocate?: MatterKycLeadAdvocateRecord | null;
};

type MatterKycDocumentRecord = {
  id: string;
  title: string;
  category?: string | null;
  confidentiality?: string | null;
  isRestricted?: boolean | null;
  createdAt?: Date | string | null;
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

type UpdateDelegate = {
  update(args: QueryArgs): Promise<unknown>;
};

type CreateDelegate = {
  create(args: QueryArgs): Promise<unknown>;
};

type MatterKycDbClient = {
  matter: FindFirstDelegate<MatterKycMatterRecord>;
  document?: FindManyDelegate<MatterKycDocumentRecord>;
  client?: UpdateDelegate;
  auditLog?: FindFirstDelegate<AuditHashRecord> & CreateDelegate;
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

function normalizeUpper(value: unknown): string | null {
  return toNullableString(value)?.toUpperCase() ?? null;
}

function isStringConvertible(value: unknown): value is { toString(): string } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { toString?: unknown };

  return typeof candidate.toString === 'function';
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (isStringConvertible(value)) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function nowIso(): string {
  return new Date().toISOString();
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
  return crypto.createHash('sha256').update(stableStringify(payload)).digest('hex');
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

function clientSelect() {
  return {
    id: true,
    name: true,
    clientCode: true,
    type: true,
    email: true,
    phoneNumber: true,
    kraPin: true,
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

function documentSelect() {
  return {
    id: true,
    title: true,
    category: true,
    confidentiality: true,
    isRestricted: true,
    createdAt: true,
  };
}

function addRequirement(
  requirements: KycRequirement[],
  issues: KycIssue[],
  params: {
    code: string;
    label: string;
    passed: boolean;
    severity: KycIssueSeverity;
    field?: string | null;
    issueMessage?: string;
    remediation?: string | null;
  },
): void {
  requirements.push({
    code: params.code,
    label: params.label,
    passed: params.passed,
    severity: params.severity,
    field: params.field ?? null,
  });

  if (!params.passed) {
    issues.push({
      code: params.code,
      severity: params.severity,
      message: params.issueMessage ?? `${params.label} is required or incomplete.`,
      field: params.field ?? null,
      remediation: params.remediation ?? null,
    });
  }
}

function isApprovedKycStatus(value: unknown): boolean {
  return ['APPROVED', 'VERIFIED', 'CLEARED', 'PASS'].includes(
    normalizeUpper(value) ?? '',
  );
}

function isBlockedKycStatus(value: unknown): boolean {
  return ['REJECTED', 'BLOCKED', 'FAILED'].includes(normalizeUpper(value) ?? '');
}

function isPepClear(value: unknown): boolean {
  const normalized = normalizeUpper(value);

  return !normalized || ['CLEAR', 'NOT_PEP', 'NO_MATCH', 'CLEARED'].includes(normalized);
}

function isSanctionsClear(value: unknown): boolean {
  const normalized = normalizeUpper(value);

  return !normalized || ['CLEAR', 'NO_MATCH', 'CLEARED'].includes(normalized);
}

function isPepBlocked(value: unknown): boolean {
  return ['MATCH', 'POTENTIAL_MATCH', 'PEP', 'BLOCKED'].includes(
    normalizeUpper(value) ?? '',
  );
}

function isSanctionsBlocked(value: unknown): boolean {
  return ['MATCH', 'POTENTIAL_MATCH', 'SANCTIONED', 'BLOCKED'].includes(
    normalizeUpper(value) ?? '',
  );
}

function calculateScore(requirements: KycRequirement[], issues: KycIssue[]): number {
  if (requirements.length === 0) {
    return 0;
  }

  const baseScore = Math.round(
    (requirements.filter((requirement) => requirement.passed).length /
      requirements.length) *
      100,
  );

  const penalty = issues.reduce((sum, issue) => {
    switch (issue.severity) {
      case 'CRITICAL':
        return sum + 30;
      case 'HIGH':
        return sum + 20;
      case 'WARNING':
        return sum + 10;
      case 'INFO':
      default:
        return sum;
    }
  }, 0);

  return Math.max(0, Math.min(100, baseScore - penalty));
}

function deriveStatus(score: number, issues: KycIssue[]): KycStatus {
  if (issues.some((issue) => issue.severity === 'CRITICAL')) {
    return 'BLOCKED';
  }

  if (score >= 80) {
    return 'PASS';
  }

  if (score >= 50) {
    return 'REVIEW_REQUIRED';
  }

  return 'INCOMPLETE';
}

function deriveRiskBand(params: {
  status: KycStatus;
  clientRiskBand?: string | null;
  clientRiskScore?: number | null;
  matterRiskLevel?: string | null;
  issues: KycIssue[];
}): KycRiskBand {
  if (params.status === 'BLOCKED') {
    return 'CRITICAL';
  }

  const issueMax: KycRiskBand = params.issues.some((issue) => issue.severity === 'CRITICAL')
    ? 'CRITICAL'
    : params.issues.some((issue) => issue.severity === 'HIGH')
      ? 'HIGH'
      : params.issues.some((issue) => issue.severity === 'WARNING')
        ? 'MEDIUM'
        : 'LOW';

  const clientRiskBand = normalizeUpper(params.clientRiskBand);
  const matterRiskLevel = normalizeUpper(params.matterRiskLevel);

  if (clientRiskBand === 'CRITICAL' || matterRiskLevel === 'CRITICAL') {
    return 'CRITICAL';
  }

  if (clientRiskBand === 'HIGH' || matterRiskLevel === 'HIGH') {
    return 'HIGH';
  }

  if (typeof params.clientRiskScore === 'number') {
    if (params.clientRiskScore >= 80) {
      return 'CRITICAL';
    }

    if (params.clientRiskScore >= 60) {
      return 'HIGH';
    }

    if (params.clientRiskScore >= 35) {
      return 'MEDIUM';
    }
  }

  return issueMax;
}

function requiredDocumentCodesForClient(client: MatterKycClientRecord | null): string[] {
  const type = normalizeUpper(client?.type);

  if (type === 'COMPANY' || type === 'CORPORATE' || type === 'ORGANIZATION') {
    return [
      'KYC',
      'COMPANY_REGISTRATION',
      'KRA_PIN',
      'BOARD_RESOLUTION',
      'BENEFICIAL_OWNERSHIP',
    ];
  }

  return ['KYC', 'ID', 'KRA_PIN'];
}

function documentMatchesCode(document: MatterKycDocumentRecord, code: string): boolean {
  const category = normalizeUpper(document.category);
  const title = normalizeUpper(document.title);

  if (category === code) {
    return true;
  }

  if (title?.includes(code)) {
    return true;
  }

  if (code === 'ID' && (title?.includes('PASSPORT') || title?.includes('NATIONAL-ID'))) {
    return true;
  }

  if (code === 'KRA_PIN' && title?.includes('KRA')) {
    return true;
  }

  return false;
}

async function loadMatter(
  db: MatterKycDbClient,
  tenantId: string,
  matterId: string,
): Promise<MatterKycMatterRecord | null> {
  if (!db.matter?.findFirst) {
    throw serviceError(
      'Matter delegate is unavailable',
      500,
      'MATTER_DELEGATE_UNAVAILABLE',
    );
  }

  return db.matter.findFirst({
    where: {
      tenantId,
      id: matterId,
      deletedAt: null,
    },
    select: matterSelect(),
  });
}

async function loadMatterDocuments(
  db: MatterKycDbClient,
  params: {
    tenantId: string;
    matterId: string;
  },
): Promise<MatterKycDocumentRecord[]> {
  if (!db.document?.findMany) {
    return [];
  }

  return db.document.findMany({
    where: {
      tenantId: params.tenantId,
      matterId: params.matterId,
      deletedAt: null,
    },
    select: documentSelect(),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 100,
  });
}

function buildDocumentReadiness(
  client: MatterKycClientRecord | null,
  documents: MatterKycDocumentRecord[],
): NonNullable<KycEvaluationResult['documentReadiness']> {
  const requiredCodes = requiredDocumentCodesForClient(client);
  const missingDocumentCodes = requiredCodes.filter(
    (code) => !documents.some((document) => documentMatchesCode(document, code)),
  );

  return {
    requiredDocumentCount: requiredCodes.length,
    availableDocumentCount: requiredCodes.length - missingDocumentCodes.length,
    missingDocumentCodes,
    availableDocuments: documents.map((document) => ({
      id: document.id,
      title: document.title,
      category: document.category ?? null,
      confidentiality: document.confidentiality ?? null,
      isRestricted: document.isRestricted === true,
      createdAt: document.createdAt ?? null,
    })),
  };
}

function evaluateMatterKyc(params: {
  matter: MatterKycMatterRecord & { tenantId: string };
  documents?: MatterKycDocumentRecord[];
  createdById?: string | null;
  requireApprovedClient?: boolean;
  includeDocuments?: boolean;
}): KycEvaluationResult {
  const requirements: KycRequirement[] = [];
  const issues: KycIssue[] = [];

  const matter = params.matter;
  const client = matter.client ?? null;

  addRequirement(requirements, issues, {
    code: 'MATTER_EXISTS',
    label: 'Matter exists and belongs to tenant',
    passed: Boolean(matter.id),
    severity: 'CRITICAL',
    field: 'matterId',
  });

  addRequirement(requirements, issues, {
    code: 'CLIENT_LINKED',
    label: 'Matter is linked to a client',
    passed: Boolean(matter.clientId && client?.id),
    severity: 'CRITICAL',
    field: 'clientId',
  });

  addRequirement(requirements, issues, {
    code: 'LEAD_ADVOCATE_ASSIGNED',
    label: 'Matter has a lead advocate',
    passed: Boolean(matter.leadAdvocateId),
    severity: 'WARNING',
    field: 'leadAdvocateId',
  });

  addRequirement(requirements, issues, {
    code: 'CLIENT_NAME_PRESENT',
    label: 'Client name is present',
    passed: Boolean(toNullableString(client?.name)),
    severity: 'HIGH',
    field: 'client.name',
  });

  addRequirement(requirements, issues, {
    code: 'CLIENT_EMAIL_PRESENT',
    label: 'Client email is present',
    passed: Boolean(toNullableString(client?.email)),
    severity: 'WARNING',
    field: 'client.email',
  });

  addRequirement(requirements, issues, {
    code: 'CLIENT_PHONE_PRESENT',
    label: 'Client phone number is present',
    passed: Boolean(toNullableString(client?.phoneNumber)),
    severity: 'WARNING',
    field: 'client.phoneNumber',
  });

  addRequirement(requirements, issues, {
    code: 'CLIENT_KRA_PIN_PRESENT',
    label: 'Client KRA PIN is present',
    passed: Boolean(toNullableString(client?.kraPin)),
    severity: 'HIGH',
    field: 'client.kraPin',
  });

  addRequirement(requirements, issues, {
    code: 'CLIENT_TYPE_PRESENT',
    label: 'Client type is present',
    passed: Boolean(toNullableString(client?.type)),
    severity: 'WARNING',
    field: 'client.type',
  });

  addRequirement(requirements, issues, {
    code: 'CLIENT_KYC_APPROVED',
    label: 'Client KYC is approved or verified',
    passed: params.requireApprovedClient
      ? isApprovedKycStatus(client?.kycStatus)
      : !isBlockedKycStatus(client?.kycStatus),
    severity: params.requireApprovedClient ? 'HIGH' : 'WARNING',
    field: 'client.kycStatus',
    issueMessage: params.requireApprovedClient
      ? 'Client KYC must be approved before this matter can proceed.'
      : 'Client KYC is not blocked, but may require review.',
    remediation:
      'Complete client onboarding, identity verification, KRA PIN validation, and AML screening.',
  });

  addRequirement(requirements, issues, {
    code: 'CLIENT_PEP_CLEAR',
    label: 'Client PEP screening is clear',
    passed: isPepClear(client?.pepStatus),
    severity: isPepBlocked(client?.pepStatus) ? 'CRITICAL' : 'WARNING',
    field: 'client.pepStatus',
    issueMessage: 'Client PEP screening is not clear.',
    remediation: 'Escalate for MLRO/compliance review before continuing.',
  });

  addRequirement(requirements, issues, {
    code: 'CLIENT_SANCTIONS_CLEAR',
    label: 'Client sanctions screening is clear',
    passed: isSanctionsClear(client?.sanctionsStatus),
    severity: isSanctionsBlocked(client?.sanctionsStatus) ? 'CRITICAL' : 'WARNING',
    field: 'client.sanctionsStatus',
    issueMessage: 'Client sanctions screening is not clear.',
    remediation: 'Block onboarding and escalate for compliance review.',
  });

  const documentReadiness = params.includeDocuments
    ? buildDocumentReadiness(client, params.documents ?? [])
    : undefined;

  if (documentReadiness) {
    addRequirement(requirements, issues, {
      code: 'KYC_DOCUMENTS_PRESENT',
      label: 'Required matter/client KYC documents are present',
      passed: documentReadiness.missingDocumentCodes.length === 0,
      severity: 'WARNING',
      field: 'documents',
      issueMessage: `Missing KYC document(s): ${documentReadiness.missingDocumentCodes.join(', ')}`,
      remediation: 'Upload the required KYC documents to the matter document folder.',
    });
  }

  const score = calculateScore(requirements, issues);
  const status = deriveStatus(score, issues);
  const riskBand = deriveRiskBand({
    status,
    clientRiskBand: client?.riskBand ?? null,
    clientRiskScore: numberOrNull(client?.riskScore),
    matterRiskLevel: matter.riskLevel ?? null,
    issues,
  });

  return {
    tenantId: matter.tenantId,
    matterId: matter.id,
    clientId: client?.id ?? null,
    evaluatedAt: nowIso(),
    evaluatedById: params.createdById ?? null,
    score,
    status,
    riskBand,
    blocked: status === 'BLOCKED',
    requirements,
    issues,
    matter: {
      id: matter.id,
      title: matter.title,
      category: matter.category ?? null,
      status: matter.status ?? null,
      riskLevel: matter.riskLevel ?? null,
      leadAdvocateId: matter.leadAdvocateId ?? null,
    },
    client: {
      id: client?.id ?? null,
      name: client?.name ?? null,
      clientCode: client?.clientCode ?? null,
      type: client?.type ?? null,
      email: client?.email ?? null,
      phoneNumber: client?.phoneNumber ?? null,
      kraPin: client?.kraPin ?? null,
      kycStatus: client?.kycStatus ?? null,
      riskBand: client?.riskBand ?? null,
      riskScore: numberOrNull(client?.riskScore),
      pepStatus: client?.pepStatus ?? null,
      sanctionsStatus: client?.sanctionsStatus ?? null,
    },
    ...(documentReadiness ? { documentReadiness } : {}),
  };
}

async function persistKycResult(
  db: MatterKycDbClient,
  params: {
    tenantId: string;
    matterId: string;
    clientId?: string | null;
    result: KycEvaluationResult;
  },
): Promise<void> {
  const updates: Promise<unknown>[] = [];

  if (params.clientId && db.client?.update) {
    updates.push(
      db.client.update({
        where: {
          id: params.clientId,
        },
        data: {
          riskBand: params.result.riskBand,
          riskScore: params.result.score,
          ...(params.result.status === 'PASS'
            ? { kycStatus: 'APPROVED' }
            : params.result.status === 'BLOCKED'
              ? { kycStatus: 'BLOCKED' }
              : { kycStatus: 'REVIEW_REQUIRED' }),
        },
      }),
    );
  }

  await Promise.all(updates);
}

async function writeKycAudit(
  db: MatterKycDbClient,
  params: {
    tenantId: string;
    matterId: string;
    userId?: string | null;
    result: KycEvaluationResult;
  },
): Promise<unknown | null> {
  if (!db.auditLog?.create || !db.auditLog?.findFirst) {
    return null;
  }

  const createdAt = nowIso();

  const previous = await db.auditLog.findFirst({
    where: {
      tenantId: params.tenantId,
    },
    orderBy: {
      sequenceNumber: 'desc',
    },
    select: {
      hash: true,
    },
  });

  const previousHash =
    typeof previous?.hash === 'string' && previous.hash.trim()
      ? previous.hash
      : '0'.repeat(64);

  const afterData = jsonSafe({
    eventCode: 'MATTER_KYC_EVALUATED',
    domain: 'MATTER',
    matterId: params.matterId,
    clientId: params.result.clientId,
    score: params.result.score,
    status: params.result.status,
    riskBand: params.result.riskBand,
    blocked: params.result.blocked,
    issueCount: params.result.issues.length,
    issues: params.result.issues,
    evaluatedAt: params.result.evaluatedAt,
  });

  const hash = hashPayload({
    tenantId: params.tenantId,
    userId: params.userId ?? null,
    action: 'VERIFY',
    entityType: 'MATTER',
    entityId: params.matterId,
    afterData,
    previousHash,
    createdAt,
    nonce: crypto.randomUUID(),
  });

  return db.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      action: 'VERIFY',
      severity: params.result.blocked
        ? 'CRITICAL'
        : params.result.status === 'REVIEW_REQUIRED'
          ? 'WARNING'
          : 'INFO',
      entityType: 'MATTER',
      entityId: params.matterId,
      beforeData: null,
      afterData,
      changedFields: [],
      ipAddress: null,
      userAgent: null,
      hash,
      previousHash,
      success: !params.result.blocked,
      failureReason: params.result.blocked ? 'Matter KYC blocked' : null,
      correlationId: null,
      reason: null,
    },
  });
}

export class MatterKYCService {
  /**
   * Evaluates matter-level readiness based on client KYC/AML status,
   * required client identifiers, lead advocate assignment, and optional
   * matter document readiness.
   *
   * This service is schema-aligned:
   * - Client.phoneNumber, not client.phone.
   * - Matter.leadAdvocateId, not partnerId / assignedLawyerId.
   * - Matter.category, not matterType.
   * - No Matter.metadata writes.
   */
  static async evaluate(
    db: MatterKycDbClient,
    params: MatterKycEvaluationParams,
  ): Promise<KycEvaluationResult> {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'MATTER_KYC_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      params.matterId,
      'Matter ID',
      'MATTER_KYC_MATTER_REQUIRED',
    );

    const matter = await loadMatter(db, tenantId, matterId);

    if (!matter) {
      throw serviceError(
        'Matter not found for KYC evaluation',
        404,
        'MATTER_KYC_MATTER_NOT_FOUND',
      );
    }

    const documents = params.includeDocuments
      ? await loadMatterDocuments(db, { tenantId, matterId })
      : [];

    const result = evaluateMatterKyc({
      matter: {
        ...matter,
        tenantId,
      },
      documents,
      createdById: params.createdById ?? null,
      requireApprovedClient: params.requireApprovedClient ?? false,
      includeDocuments: params.includeDocuments ?? false,
    });

    if (params.persist === true) {
      await persistKycResult(db, {
        tenantId,
        matterId,
        clientId: result.clientId,
        result,
      });
    }

    await writeKycAudit(db, {
      tenantId,
      matterId,
      userId: params.createdById ?? null,
      result,
    });

    return result;
  }

  static async evaluateMatterKyc(
    db: MatterKycDbClient,
    params: MatterKycEvaluationParams,
  ): Promise<KycEvaluationResult> {
    return this.evaluate(db, params);
  }

  static async evaluateKyc(
    db: MatterKycDbClient,
    params: MatterKycEvaluationParams,
  ): Promise<KycEvaluationResult> {
    return this.evaluate(db, params);
  }

  static async getMatterKycProfile(
    db: MatterKycDbClient,
    params: MatterKycEvaluationParams,
  ): Promise<KycEvaluationResult> {
    return this.evaluate(db, {
      ...params,
      persist: false,
      includeDocuments: params.includeDocuments ?? true,
    });
  }

  static async assertMatterKycReady(
    db: MatterKycDbClient,
    params: MatterKycEvaluationParams,
  ): Promise<KycEvaluationResult> {
    const result = await this.evaluate(db, {
      ...params,
      persist: false,
      requireApprovedClient: true,
      includeDocuments: params.includeDocuments ?? true,
    });

    if (result.status !== 'PASS') {
      throw Object.assign(new Error('Matter KYC is not ready'), {
        statusCode: 409,
        code: 'MATTER_KYC_NOT_READY',
        details: {
          status: result.status,
          score: result.score,
          riskBand: result.riskBand,
          issues: result.issues,
        },
      });
    }

    return result;
  }
}

export default MatterKYCService;