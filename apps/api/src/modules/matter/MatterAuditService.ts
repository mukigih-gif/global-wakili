// apps/api/src/modules/matter/MatterAuditService.ts

import crypto from 'crypto';
import type { Request } from 'express';
import {
  getRequestId,
  getRequestIp,
  getRequestRole,
  getRequestUserAgent,
  getRequestUserId,
  getTenantId,
} from '../../utils/request-identity';

export type MatterAuditAction =
  | 'CREATED'
  | 'UPDATED'
  | 'CONFLICT_CHECK_RUN'
  | 'WORKFLOW_RESOLVED'
  | 'COURT_HEARING_CREATED'
  | 'COURT_HEARING_UPDATED'
  | 'COURT_HEARING_OUTCOME_RECORDED'
  | 'COURT_HEARING_ADJOURNED'
  | 'COURT_HEARING_CANCELLED'
  | 'STATUTE_LIMIT_ATTACHED'
  | 'STATUTE_LIMIT_NOTIFIED'
  | 'STATUTE_LIMIT_CANCELLED'
  | 'WRITE_OFF_CREATED'
  | 'WRITE_OFF_SUBMITTED'
  | 'WRITE_OFF_APPROVED'
  | 'WRITE_OFF_REJECTED'
  | 'WRITE_OFF_POSTED'
  | 'WRITE_OFF_REVERSED'
  | 'WRITE_OFF_CANCELLED'
  | 'COMMISSION_ORIGINATOR_SET'
  | 'COMMISSION_ORIGINATOR_DEACTIVATED'
  | 'COMMISSION_CALCULATED'
  | 'COMMISSION_PAYOUTS_LISTED';

type JsonRecord = Record<string, unknown>;

type MatterAuditEntityType =
  | 'MATTER'
  | 'MATTER_CONFLICT_CHECK'
  | 'MATTER_WORKFLOW'
  | 'COURT_HEARING'
  | 'STATUTE_LIMIT'
  | 'WRITE_OFF'
  | 'COMMISSION'
  | 'COMMISSION_ORIGINATOR'
  | 'COMMISSION_PAYOUT';

type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

type CanonicalAuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'AUTHORIZE'
  | 'VERIFY'
  | 'APPROVE'
  | 'REJECT'
  | 'REQUEST_FAILURE';

function nowIso(): string {
  return new Date().toISOString();
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';

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
  if (value instanceof Date) return value.toISOString();

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

function changedFields(
  before: JsonRecord | null,
  after: JsonRecord | null,
): string[] {
  if (!before || !after) return [];

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];

  for (const key of keys) {
    const beforeValue = JSON.stringify(jsonSafe(before[key] ?? null));
    const afterValue = JSON.stringify(jsonSafe(after[key] ?? null));

    if (beforeValue !== afterValue) {
      changed.push(key);
    }
  }

  return changed;
}

function mapAction(action: MatterAuditAction): CanonicalAuditAction {
  switch (action) {
    case 'CREATED':
    case 'COURT_HEARING_CREATED':
    case 'WRITE_OFF_CREATED':
      return 'CREATE';

    case 'UPDATED':
    case 'COURT_HEARING_UPDATED':
    case 'STATUTE_LIMIT_ATTACHED':
    case 'STATUTE_LIMIT_NOTIFIED':
    case 'COMMISSION_ORIGINATOR_SET':
      return 'UPDATE';

    case 'CONFLICT_CHECK_RUN':
      return 'VERIFY';

    case 'WORKFLOW_RESOLVED':
      return 'AUTHORIZE';

    case 'WRITE_OFF_SUBMITTED':
      return 'AUTHORIZE';

    case 'WRITE_OFF_APPROVED':
      return 'APPROVE';

    case 'WRITE_OFF_REJECTED':
      return 'REJECT';

    case 'WRITE_OFF_POSTED':
    case 'WRITE_OFF_REVERSED':
    case 'COURT_HEARING_CANCELLED':
    case 'STATUTE_LIMIT_CANCELLED':
    case 'WRITE_OFF_CANCELLED':
    case 'COMMISSION_ORIGINATOR_DEACTIVATED':
      return 'UPDATE';

    case 'COURT_HEARING_OUTCOME_RECORDED':
    case 'COURT_HEARING_ADJOURNED':
      return 'UPDATE';

    case 'COMMISSION_CALCULATED':
    case 'COMMISSION_PAYOUTS_LISTED':
      return 'READ';

    default:
      return 'READ';
  }
}

function mapSeverity(action: MatterAuditAction, payload?: JsonRecord | null): AuditSeverity {
  if (action === 'CONFLICT_CHECK_RUN') {
    const conflictLevel = String(payload?.conflictLevel ?? payload?.riskLevel ?? '').toUpperCase();

    return conflictLevel === 'HIGH_RISK' || conflictLevel === 'HIGH' ? 'CRITICAL' : 'INFO';
  }

  if (
    action === 'WRITE_OFF_APPROVED' ||
    action === 'WRITE_OFF_POSTED' ||
    action === 'WRITE_OFF_REVERSED' ||
    action === 'WRITE_OFF_REJECTED' ||
    action === 'STATUTE_LIMIT_CANCELLED' ||
    action === 'COURT_HEARING_CANCELLED'
  ) {
    return 'WARNING';
  }

  if (
    action === 'WRITE_OFF_CANCELLED' ||
    action === 'COMMISSION_ORIGINATOR_DEACTIVATED'
  ) {
    return 'WARNING';
  }

  if (action === 'UPDATED' || action === 'COURT_HEARING_UPDATED') {
    return 'WARNING';
  }

  return 'INFO';
}

function inferEntityType(action: MatterAuditAction): MatterAuditEntityType {
  if (action === 'CONFLICT_CHECK_RUN') return 'MATTER_CONFLICT_CHECK';
  if (action === 'WORKFLOW_RESOLVED') return 'MATTER_WORKFLOW';

  if (
    action === 'COURT_HEARING_CREATED' ||
    action === 'COURT_HEARING_UPDATED' ||
    action === 'COURT_HEARING_OUTCOME_RECORDED' ||
    action === 'COURT_HEARING_ADJOURNED' ||
    action === 'COURT_HEARING_CANCELLED'
  ) {
    return 'COURT_HEARING';
  }

  if (
    action === 'STATUTE_LIMIT_ATTACHED' ||
    action === 'STATUTE_LIMIT_NOTIFIED' ||
    action === 'STATUTE_LIMIT_CANCELLED'
  ) {
    return 'STATUTE_LIMIT';
  }

  if (
    action === 'WRITE_OFF_CREATED' ||
    action === 'WRITE_OFF_SUBMITTED' ||
    action === 'WRITE_OFF_APPROVED' ||
    action === 'WRITE_OFF_REJECTED' ||
    action === 'WRITE_OFF_POSTED' ||
    action === 'WRITE_OFF_REVERSED' ||
    action === 'WRITE_OFF_CANCELLED'
  ) {
    return 'WRITE_OFF';
  }

  if (
    action === 'COMMISSION_ORIGINATOR_SET' ||
    action === 'COMMISSION_ORIGINATOR_DEACTIVATED'
  ) {
    return 'COMMISSION_ORIGINATOR';
  }

  if (action === 'COMMISSION_CALCULATED') return 'COMMISSION';
  if (action === 'COMMISSION_PAYOUTS_LISTED') return 'COMMISSION_PAYOUT';

  return 'MATTER';
}

function eventCodeFor(action: MatterAuditAction): string {
  return `MATTER_${action}`;
}

function getRequestMeta(req: Request) {
  return {
    requestId: getRequestId(req),
    ipAddress: getRequestIp(req),
    userAgent: getRequestUserAgent(req),
    userId: getRequestUserId(req),
    tenantId: getTenantId(req),
    role: getRequestRole(req),
  };
}

async function writeAudit(
  req: Request,
  params: {
    tenantId: string;
    entityId: string;
    entityType?: MatterAuditEntityType;
    action: MatterAuditAction;
    beforeData?: JsonRecord | null;
    afterData?: JsonRecord | null;
    changedFields?: string[];
    success?: boolean;
    failureReason?: string | null;
    reason?: string | null;
  },
) {
  const db = req.db;

  if (!db?.auditLog?.create || !db?.auditLog?.findFirst) {
    return null;
  }

  const requestMeta = getRequestMeta(req);
  const createdAt = nowIso();
  const eventCode = eventCodeFor(params.action);
  const entityType = params.entityType ?? inferEntityType(params.action);

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

  const afterData = {
    ...(jsonSafe(params.afterData ?? {}) as JsonRecord),
    eventCode,
    domain: 'MATTER',
    entityType,
    requestId: requestMeta.requestId ?? null,
    actorRole: requestMeta.role ?? null,
    timestamp: createdAt,
  };

  const beforeData = params.beforeData
    ? (jsonSafe(params.beforeData) as JsonRecord)
    : null;

  const auditAction = mapAction(params.action);
  const changed = params.changedFields ?? changedFields(beforeData, afterData);

  const auditPayload = {
    tenantId: params.tenantId,
    userId: requestMeta.userId ?? null,
    action: auditAction,
    entityType,
    entityId: params.entityId,
    beforeData,
    afterData,
    changedFields: changed,
    previousHash,
    createdAt,
    nonce: crypto.randomUUID(),
  };

  const hash = hashPayload(auditPayload);

  return db.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: requestMeta.userId ?? null,
      action: auditAction,
      severity: mapSeverity(params.action, afterData),
      entityType,
      entityId: params.entityId,
      beforeData: beforeData ?? {},
      afterData,
      changedFields: changed,
      ipAddress: requestMeta.ipAddress ?? null,
      userAgent: requestMeta.userAgent ?? null,
      hash,
      previousHash,
      success: params.success ?? true,
      failureReason: params.failureReason ?? null,
      correlationId: requestMeta.requestId ?? null,
      reason: params.reason ?? null,
    },
  });
}

export class MatterAuditService {
  static async logEvent(
    req: Request,
    params: {
      tenantId?: string | null;
      entityId: string;
      entityType?: MatterAuditEntityType;
      action: MatterAuditAction;
      beforeData?: JsonRecord | null;
      afterData?: JsonRecord | null;
      changedFields?: string[];
      success?: boolean;
      failureReason?: string | null;
      reason?: string | null;
    },
  ) {
    const tenantId = params.tenantId ?? getRequestMeta(req).tenantId;

    if (!tenantId || !params.entityId) return null;

    return writeAudit(req, {
      tenantId,
      entityId: params.entityId,
      entityType: params.entityType,
      action: params.action,
      beforeData: params.beforeData ?? null,
      afterData: params.afterData ?? null,
      changedFields: params.changedFields,
      success: params.success,
      failureReason: params.failureReason ?? null,
      reason: params.reason ?? null,
    });
  }

  static async logCreate(req: Request, matter: any) {
    const tenantId = getRequestMeta(req).tenantId;

    if (!tenantId || !matter?.id) return null;

    return writeAudit(req, {
      tenantId,
      entityId: matter.id,
      entityType: 'MATTER',
      action: 'CREATED',
      afterData: {
        matterId: matter.id,
        title: matter.title ?? null,
        clientId: matter.clientId ?? null,
        branchId: matter.branchId ?? null,
        leadAdvocateId: matter.leadAdvocateId ?? null,
        status: matter.status ?? null,
        category: matter.category ?? null,
        riskLevel: matter.riskLevel ?? null,
      },
    });
  }

  static async logUpdate(
    req: Request,
    params: {
      before: Record<string, any>;
      after: Record<string, any>;
    },
  ) {
    const tenantId = getRequestMeta(req).tenantId;
    const entityId = params.after?.id ?? params.before?.id;

    if (!tenantId || !entityId) return null;

    const changed = changedFields(params.before, params.after);

    return writeAudit(req, {
      tenantId,
      entityId,
      entityType: 'MATTER',
      action: 'UPDATED',
      beforeData: params.before,
      afterData: {
        ...params.after,
        changedFields: changed,
      },
      changedFields: changed,
    });
  }

  static async logConflictCheck(
    req: Request,
    result: {
      conflictLevel?: string;
      riskLevel?: string;
      conflictReason?: string | null;
      searchedNames?: string[];
      searchTerms?: string[];
      summary?: Record<string, unknown>;
      matchCount?: number;
    },
  ) {
    const tenantId = getRequestMeta(req).tenantId;

    if (!tenantId) return null;

    const requestId = getRequestMeta(req).requestId ?? crypto.randomUUID();

    return writeAudit(req, {
      tenantId,
      entityId: `CONFLICT_CHECK:${requestId}`,
      entityType: 'MATTER_CONFLICT_CHECK',
      action: 'CONFLICT_CHECK_RUN',
      afterData: {
        conflictLevel: result.conflictLevel ?? result.riskLevel ?? null,
        riskLevel: result.riskLevel ?? result.conflictLevel ?? null,
        conflictReason: result.conflictReason ?? null,
        searchedNames: result.searchedNames ?? result.searchTerms ?? [],
        searchTerms: result.searchTerms ?? result.searchedNames ?? [],
        matchCount: result.matchCount ?? null,
        summary: jsonSafe(result.summary ?? {}),
      },
    });
  }

  static async logWorkflowResolution(
    req: Request,
    params: {
      matterType: string;
      workflowType: string;
      recommendedStages: string[];
    },
  ) {
    const tenantId = getRequestMeta(req).tenantId;

    if (!tenantId) return null;

    return writeAudit(req, {
      tenantId,
      entityId: `WORKFLOW:${params.matterType}:${params.workflowType}`,
      entityType: 'MATTER_WORKFLOW',
      action: 'WORKFLOW_RESOLVED',
      afterData: {
        matterType: params.matterType,
        workflowType: params.workflowType,
        recommendedStages: params.recommendedStages,
      },
    });
  }

  static async logCourtHearing(
    req: Request,
    action: Extract<
      MatterAuditAction,
      | 'COURT_HEARING_CREATED'
      | 'COURT_HEARING_UPDATED'
      | 'COURT_HEARING_OUTCOME_RECORDED'
      | 'COURT_HEARING_ADJOURNED'
      | 'COURT_HEARING_CANCELLED'
    >,
    hearing: any,
    extra?: JsonRecord | null,
  ) {
    const tenantId = getRequestMeta(req).tenantId ?? toNullableString(hearing?.tenantId);

    if (!tenantId || !hearing?.id) return null;

    return writeAudit(req, {
      tenantId,
      entityId: hearing.id,
      entityType: 'COURT_HEARING',
      action,
      afterData: {
        courtHearingId: hearing.id,
        matterId: hearing.matterId ?? null,
        title: hearing.title ?? null,
        caseNumber: hearing.caseNumber ?? null,
        hearingType: hearing.hearingType ?? null,
        status: hearing.status ?? null,
        hearingDate: jsonSafe(hearing.hearingDate ?? null),
        startTime: jsonSafe(hearing.startTime ?? null),
        endTime: jsonSafe(hearing.endTime ?? null),
        outcome: hearing.outcome ?? null,
        ...jsonSafe(extra ?? {}) as JsonRecord,
      },
    });
  }

  static async logStatuteLimit(
    req: Request,
    action: Extract<
      MatterAuditAction,
      'STATUTE_LIMIT_ATTACHED' | 'STATUTE_LIMIT_NOTIFIED' | 'STATUTE_LIMIT_CANCELLED'
    >,
    statute: any,
    extra?: JsonRecord | null,
  ) {
    const tenantId = getRequestMeta(req).tenantId;

    if (!tenantId || !statute?.matterId) return null;

    return writeAudit(req, {
      tenantId,
      entityId: statute.id ?? statute.matterId,
      entityType: 'STATUTE_LIMIT',
      action,
      afterData: {
        statuteLimitId: statute.id ?? null,
        matterId: statute.matterId ?? null,
        statuteType: statute.statuteType ?? statute.statueType ?? null,
        statueType: statute.statueType ?? statute.statuteType ?? null,
        limitationPeriod: statute.limitationPeriod ?? null,
        deadlineDate: jsonSafe(statute.deadlineDate ?? null),
        notifyAt: jsonSafe(statute.notifyAt ?? null),
        isNotified: statute.isNotified ?? null,
        status: statute.status ?? null,
        ...jsonSafe(extra ?? {}) as JsonRecord,
      },
    });
  }

  static async logWriteOff(
    req: Request,
    action: Extract<
      MatterAuditAction,
      | 'WRITE_OFF_CREATED'
      | 'WRITE_OFF_SUBMITTED'
      | 'WRITE_OFF_APPROVED'
      | 'WRITE_OFF_REJECTED'
      | 'WRITE_OFF_POSTED'
      | 'WRITE_OFF_REVERSED'
      | 'WRITE_OFF_CANCELLED'
    >,
    writeOff: any,
    extra?: JsonRecord | null,
  ) {
    const tenantId = getRequestMeta(req).tenantId ?? toNullableString(writeOff?.tenantId);

    if (!tenantId || !writeOff?.id) return null;

    return writeAudit(req, {
      tenantId,
      entityId: writeOff.id,
      entityType: 'WRITE_OFF',
      action,
      afterData: {
        writeOffId: writeOff.id,
        matterId: writeOff.matterId ?? null,
        amount: jsonSafe(writeOff.amount ?? null),
        currency: writeOff.currency ?? null,
        sourceType: writeOff.sourceType ?? null,
        sourceId: writeOff.sourceId ?? null,
        reason: writeOff.reason ?? null,
        status: writeOff.status ?? null,
        requestedById: writeOff.requestedById ?? null,
        approvedById: writeOff.approvedById ?? null,
        journalEntryId: writeOff.journalEntryId ?? null,
        ...jsonSafe(extra ?? {}) as JsonRecord,
      },
      reason: toNullableString(extra?.reason),
    });
  }

  static async logCommissionOriginator(
    req: Request,
    action: Extract<
      MatterAuditAction,
      'COMMISSION_ORIGINATOR_SET' | 'COMMISSION_ORIGINATOR_DEACTIVATED'
    >,
    originator: any,
    extra?: JsonRecord | null,
  ) {
    const tenantId = getRequestMeta(req).tenantId;

    if (!tenantId || !originator?.matterId) return null;

    return writeAudit(req, {
      tenantId,
      entityId: originator.id ?? originator.matterId,
      entityType: 'COMMISSION_ORIGINATOR',
      action,
      afterData: {
        matterOriginatorId: originator.id ?? null,
        matterId: originator.matterId ?? null,
        originatorId: originator.originatorId ?? null,
        commissionRate: jsonSafe(originator.commissionRate ?? null),
        isActive: originator.isActive ?? null,
        ...jsonSafe(extra ?? {}) as JsonRecord,
      },
    });
  }

  static async logCommissionCalculation(
    req: Request,
    params: {
      matterId?: string | null;
      lawyerId?: string | null;
      originatorId?: string | null;
      result?: JsonRecord | null;
    },
  ) {
    const tenantId = getRequestMeta(req).tenantId;

    if (!tenantId) return null;

    const entityId =
      toNullableString(params.matterId) ??
      toNullableString(params.lawyerId) ??
      toNullableString(params.originatorId) ??
      `COMMISSION:${getRequestMeta(req).requestId ?? crypto.randomUUID()}`;

    return writeAudit(req, {
      tenantId,
      entityId,
      entityType: 'COMMISSION',
      action: 'COMMISSION_CALCULATED',
      afterData: {
        matterId: params.matterId ?? null,
        lawyerId: params.lawyerId ?? null,
        originatorId: params.originatorId ?? null,
        resultSummary: jsonSafe(params.result ?? {}),
      },
    });
  }

  static async logCommissionPayoutListing(
    req: Request,
    params: {
      matterId?: string | null;
      userId?: string | null;
      status?: string | null;
      count?: number | null;
    },
  ) {
    const tenantId = getRequestMeta(req).tenantId;

    if (!tenantId) return null;

    const entityId =
      params.matterId ??
      params.userId ??
      `COMMISSION_PAYOUTS:${getRequestMeta(req).requestId ?? crypto.randomUUID()}`;

    return writeAudit(req, {
      tenantId,
      entityId,
      entityType: 'COMMISSION_PAYOUT',
      action: 'COMMISSION_PAYOUTS_LISTED',
      afterData: {
        matterId: params.matterId ?? null,
        userId: params.userId ?? null,
        status: params.status ?? null,
        count: params.count ?? null,
      },
    });
  }
}

export default MatterAuditService;