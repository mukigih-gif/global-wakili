// apps/api/src/modules/matter/MatterOnboardingService.ts

import type { Request } from 'express';
import { getRequestUserId, requireTenantId } from '../../utils/request-identity';
import { MatterAuditService } from './MatterAuditService';
import { MatterConflictService } from './MatterConflictService';
import { MatterService } from './MatterService';
import { MatterWorkflowService } from './MatterWorkflowService';
import type { MatterInput, TenantMatterDbClient } from './matter.types';

type ConflictBlockPolicy =
  | 'CRITICAL_ONLY'
  | 'HIGH_AND_CRITICAL'
  | 'MANUAL_REVIEW_ONLY';

type MatterOnboardingInput = {
  matter: Record<string, unknown>;
  runConflictCheck?: boolean;
  adversePartyNames?: string[] | null;
  relatedEntityNames?: string[] | null;
  searchTerms?: string[] | null;
  onboardingNotes?: string | null;
  conflictBlockPolicy?: ConflictBlockPolicy;
  allowHighRiskConflictOverride?: boolean;
};

type WorkflowTemplate = {
  matterType: string;
  workflowType: string;
  recommendedStages: string[];
  requiredArtifacts: string[];
};

type MatterOnboardingResult = {
  matter: unknown;
  workflowTemplate: WorkflowTemplate;
  conflictResult: Awaited<ReturnType<typeof MatterConflictService.runConflictCheck>> | null;
  onboarding: {
    status: 'COMPLETED';
    completedAt: string;
    conflictLevel: string;
    conflictPolicy: ConflictBlockPolicy;
    notes: string | null;
  };
};

type MatterOnboardingDbClient = TenantMatterDbClient & {
  $transaction?: <T>(callback: (tx: MatterOnboardingDbClient) => Promise<T>) => Promise<T>;

  /**
   * Preserve compatibility with request-scoped / tenant-scoped Prisma extensions
   * without weakening the known delegates required by Matter onboarding.
   */
  [delegateName: string]: unknown;
};

type CreatedOnboardedMatterRecord = {
  id: string;
  tenantId?: string | null;
  title?: string | null;
  category?: string | null;
  clientId?: string | null;
  leadAdvocateId?: string | null;
  status?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  [key: string]: unknown;
};

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'undefined') return null;
  if (trimmed.toLowerCase() === 'null') return null;

  return trimmed;
}

function requiredString(value: unknown, label: string, code: string): string {
  const normalized = toNullableString(value);

  if (!normalized) {
    throw Object.assign(new Error(`${label} is required`), {
      statusCode: 422,
      code,
    });
  }

  return normalized;
}

function requiredNullableString(value: unknown, label: string, code: string): string {
  return requiredString(value, label, code);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    const normalized = toNullableString(item);

    if (!normalized) continue;

    const key = normalized.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function normalizeDateInput(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw Object.assign(new Error('Invalid matter date'), {
        statusCode: 422,
        code: 'INVALID_MATTER_DATE',
      });
    }

    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw Object.assign(new Error('Invalid matter date'), {
        statusCode: 422,
        code: 'INVALID_MATTER_DATE',
      });
    }

    return parsed;
  }

  return null;
}

function normalizeNumberInput(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) return value.trim();
  }

  return null;
}

function normalizeProgressPercent(value: unknown): number | null {
  const normalized = normalizeNumberInput(value);

  if (typeof normalized === 'number') {
    if (normalized < 0) return 0;
    if (normalized > 100) return 100;

    return normalized;
  }

  if (typeof normalized === 'string') {
    const parsed = Number(normalized);

    if (!Number.isFinite(parsed)) return null;
    if (parsed < 0) return 0;
    if (parsed > 100) return 100;

    return parsed;
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getTenantId(req: Request): string {
  return requireTenantId(req);
}

function getUserId(req: Request): string | null {
  return getRequestUserId(req);
}

function getMatterObject(input: MatterOnboardingInput): Record<string, unknown> {
  if (!input.matter || typeof input.matter !== 'object' || Array.isArray(input.matter)) {
    throw Object.assign(new Error('Matter onboarding requires a matter payload object'), {
      statusCode: 422,
      code: 'MATTER_ONBOARDING_PAYLOAD_REQUIRED',
    });
  }

  return input.matter;
}

function getTransientMetadata(payload: Record<string, unknown>): Record<string, unknown> {
  return asRecord(payload.metadata);
}

function resolveMatterCategory(payload: Record<string, unknown>): string {
  const transientMetadata = getTransientMetadata(payload);

  return MatterWorkflowService.normalizeMatterType(
    toNullableString(payload.category) ??
      toNullableString(payload.matterType) ??
      toNullableString(transientMetadata.matterType) ??
      toNullableString(transientMetadata.category) ??
      'OTHER',
  );
}

function resolveLeadAdvocateId(payload: Record<string, unknown>): string | null {
  return (
    toNullableString(payload.leadAdvocateId) ??
    toNullableString(payload.assignedLawyerId) ??
    toNullableString(payload.assigneeId) ??
    null
  );
}

function resolveAssignedLawyerId(payload: Record<string, unknown>): string | null {
  return (
    toNullableString(payload.assignedLawyerId) ??
    toNullableString(payload.assigneeId) ??
    null
  );
}

function resolveOriginatorId(
  payload: Record<string, unknown>,
  transientMetadata: Record<string, unknown>,
  fallbackUserId: string | null,
): string | null {
  return (
    toNullableString(payload.originatorId) ??
    toNullableString(transientMetadata.originatorId) ??
    fallbackUserId
  );
}

function buildOnboardingMetadata(params: {
  matterPayload: Record<string, unknown>;
  category: string;
  workflowTemplate: WorkflowTemplate;
  completedAt: string;
  notes?: string | null;
  conflictLevel?: string | null;
  conflictSummary?: Record<string, unknown> | null;
  userId?: string | null;
}) {
  const transientMetadata = getTransientMetadata(params.matterPayload);

  return MatterWorkflowService.normalizeMetadata({
    ...transientMetadata,

    /**
     * Workflow and onboarding context only.
     *
     * Do not use metadata as the authoritative source for schema-backed Matter
     * fields such as caseNumber, category, riskLevel, leadAdvocateId, or
     * statuteOfLimitationsDate. Those are mapped directly in MatterInput below.
     */
    workflowType: params.workflowTemplate.workflowType,
    progressStage: params.workflowTemplate.recommendedStages[0] ?? 'INTAKE',
    progressPercent: 0,

    onboarding: {
      completedAt: params.completedAt,
      completedById: params.userId ?? null,
      notes: params.notes ?? null,
      recommendedStages: params.workflowTemplate.recommendedStages,
      requiredArtifacts: params.workflowTemplate.requiredArtifacts,
      conflictLevel: params.conflictLevel ?? 'NONE',
      conflictSummary: params.conflictSummary ?? null,
      resolvedMatterType: params.workflowTemplate.matterType,
      resolvedCategory: params.category,
    },

    originatorId: resolveOriginatorId(
      params.matterPayload,
      transientMetadata,
      params.userId ?? null,
    ),
  });
}

function getObjectConfig<T extends Record<string, unknown>>(
  value: unknown,
): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as T;
}

function buildMatterCreateInput(params: {
  matterPayload: Record<string, unknown>;
  category: string;
  metadata: Record<string, unknown>;
  userId?: string | null;
}): MatterInput {
  const payload = params.matterPayload;
  const transientMetadata = getTransientMetadata(payload);

  const title = requiredString(payload.title, 'Matter title', 'MATTER_TITLE_REQUIRED');
  const clientId = requiredString(payload.clientId, 'Client ID', 'MATTER_CLIENT_REQUIRED');
  const branchId = requiredNullableString(payload.branchId, 'Matter branch', 'MATTER_BRANCH_REQUIRED');

  const resolvedLeadAdvocateId = resolveLeadAdvocateId(payload);
  const leadAdvocateId = requiredNullableString(
    resolvedLeadAdvocateId,
    'Lead advocate',
    'MATTER_LEAD_ADVOCATE_REQUIRED',
  );
  const assignedLawyerId = resolveAssignedLawyerId(payload);
  const originatorId = resolveOriginatorId(payload, transientMetadata, params.userId ?? null);

  return {
    /**
     * Physical identity/reference columns.
     */
    matterCode: toNullableString(payload.matterCode),
    caseNumber: toNullableString(payload.caseNumber),
    matterReference: toNullableString(payload.matterReference),

    /**
     * Physical Matter identity/categorisation columns.
     */
    title,
    category: params.category,
    description: toNullableString(payload.description),
    riskLevel: toNullableString(payload.riskLevel) ?? toNullableString(transientMetadata.riskLevel) ?? 'LOW',

    /**
     * Tenant-owned relations and responsibility roles.
     */
    clientId,
    branchId,
    originatorId,
    partnerId: toNullableString(payload.partnerId),
    assigneeId: toNullableString(payload.assigneeId),
    leadAdvocateId,
    assignedLawyerId,

    /**
     * Status, lifecycle, and legal dates.
     */
    status: toNullableString(payload.status) as MatterInput['status'] | undefined,
    openedDate: normalizeDateInput(payload.openedDate),
    closeDate: normalizeDateInput(payload.closeDate),
    closedDate: normalizeDateInput(payload.closedDate),
    archivedDate: normalizeDateInput(payload.archivedDate),
    statuteOfLimitationsDate: normalizeDateInput(payload.statuteOfLimitationsDate),

    /**
     * Financial and progress fields.
     */
    billingModel: toNullableString(payload.billingModel) as MatterInput['billingModel'] | undefined,
    currency: toNullableString(payload.currency),
    estimatedValue: normalizeNumberInput(payload.estimatedValue),
    progressPercent: normalizeProgressPercent(payload.progressPercent),
    progressStage: toNullableString(payload.progressStage) as MatterInput['progressStage'] | null,

    /**
     * Operational context. MatterService keeps these in metadata.
     */
    billing: getObjectConfig<NonNullable<MatterInput['billing']>>(payload.billing),
    documents: getObjectConfig<NonNullable<MatterInput['documents']>>(payload.documents),
    calendar: getObjectConfig<NonNullable<MatterInput['calendar']>>(payload.calendar),
    invoice: getObjectConfig<NonNullable<MatterInput['invoice']>>(payload.invoice),
    reports: getObjectConfig<NonNullable<MatterInput['reports']>>(payload.reports),

    metadata: params.metadata,
  };
}

function shouldBlockForConflict(params: {
  conflictLevel?: string | null;
  policy: ConflictBlockPolicy;
  allowHighRiskConflictOverride: boolean;
}): boolean {
  const level = String(params.conflictLevel ?? 'NONE').toUpperCase();

  if (params.policy === 'MANUAL_REVIEW_ONLY') {
    return false;
  }

  if (level === 'CRITICAL') {
    return true;
  }

  if (
    params.policy === 'HIGH_AND_CRITICAL' &&
    level === 'HIGH' &&
    params.allowHighRiskConflictOverride !== true
  ) {
    return true;
  }

  return false;
}

function conflictBlockCode(conflictLevel?: string | null): string {
  const level = String(conflictLevel ?? 'UNKNOWN').toUpperCase();

  if (level === 'CRITICAL') return 'MATTER_CONFLICT_CRITICAL';
  if (level === 'HIGH') return 'MATTER_CONFLICT_HIGH';

  return 'MATTER_CONFLICT_BLOCKED';
}

async function runInTransaction<T>(
  db: MatterOnboardingDbClient,
  callback: (tx: MatterOnboardingDbClient) => Promise<T>,
): Promise<T> {
  if (typeof db?.$transaction === 'function') {
    return db.$transaction(callback);
  }

  return callback(db);
}

async function logMatterOnboardingAudit(
  req: Request,
  params: {
    createdMatter: CreatedOnboardedMatterRecord;
    conflictResult: Awaited<ReturnType<typeof MatterConflictService.runConflictCheck>> | null;
    workflowTemplate: WorkflowTemplate;
  },
) {
  await MatterAuditService.logCreate(req, params.createdMatter);

  if (params.conflictResult) {
    await MatterAuditService.logConflictCheck(req, params.conflictResult);
  }

  await MatterAuditService.logWorkflowResolution(req, {
    matterType: params.workflowTemplate.matterType,
    workflowType: params.workflowTemplate.workflowType,
    recommendedStages: params.workflowTemplate.recommendedStages,
  });
}

export class MatterOnboardingService {
  static async onboard(
    req: Request,
    input: MatterOnboardingInput,
  ): Promise<MatterOnboardingResult> {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const matterPayload = getMatterObject(input);

    const runConflictCheck = input.runConflictCheck ?? true;
    const conflictPolicy = input.conflictBlockPolicy ?? 'HIGH_AND_CRITICAL';
    const allowHighRiskConflictOverride = input.allowHighRiskConflictOverride === true;

    const category = resolveMatterCategory(matterPayload);
    const workflowTemplate = MatterWorkflowService.resolveWorkflowTemplate(category);

    const completedAt = new Date().toISOString();

    const transactionResult = await runInTransaction(req.db, async (tx) => {
      const conflictResult = runConflictCheck
        ? await MatterConflictService.runConflictCheck(tx, {
            tenantId,
            clientId: toNullableString(matterPayload.clientId),
            matterTitle: toNullableString(matterPayload.title),
            clientName: toNullableString(matterPayload.clientName),
            counterpartyName: toNullableString(matterPayload.counterpartyName),
            opposingPartyName: toNullableString(matterPayload.opposingPartyName),
            kraPin: toNullableString(matterPayload.kraPin),
            email: toNullableString(matterPayload.email),
            phoneNumber: toNullableString(matterPayload.phoneNumber),
            adversePartyNames: normalizeStringArray(input.adversePartyNames),
            relatedEntityNames: normalizeStringArray(input.relatedEntityNames),
            searchTerms: normalizeStringArray(input.searchTerms),
          })
        : null;

      if (
        shouldBlockForConflict({
          conflictLevel: conflictResult?.conflictLevel,
          policy: conflictPolicy,
          allowHighRiskConflictOverride,
        })
      ) {
        throw Object.assign(new Error('Matter onboarding blocked by conflict-check result'), {
          statusCode: 409,
          code: conflictBlockCode(conflictResult?.conflictLevel),
          details: {
            conflictLevel: conflictResult?.conflictLevel ?? 'UNKNOWN',
            conflictReason: conflictResult?.conflictReason ?? null,
            conflictPolicy,
            conflictSummary: conflictResult?.summary ?? null,
            topMatches: conflictResult?.matches?.slice(0, 10) ?? [],
          },
        });
      }

      const onboardingMetadata = buildOnboardingMetadata({
        matterPayload,
        category,
        workflowTemplate,
        completedAt,
        notes: input.onboardingNotes ?? null,
        conflictLevel: conflictResult?.conflictLevel ?? null,
        conflictSummary: conflictResult?.summary ?? null,
        userId,
      });

      const matterCreateInput = buildMatterCreateInput({
        matterPayload,
        category,
        metadata: onboardingMetadata,
        userId,
      });

      const createdMatter = await MatterService.create(tx, tenantId, matterCreateInput);

      return {
        createdMatter,
        conflictResult,
      };
    });

    await logMatterOnboardingAudit(req, {
      createdMatter: transactionResult.createdMatter as CreatedOnboardedMatterRecord,
      conflictResult: transactionResult.conflictResult,
      workflowTemplate,
    });

    return {
      matter: transactionResult.createdMatter,
      workflowTemplate,
      conflictResult: transactionResult.conflictResult,
      onboarding: {
        status: 'COMPLETED',
        completedAt,
        conflictLevel: transactionResult.conflictResult?.conflictLevel ?? 'NONE',
        conflictPolicy,
        notes: input.onboardingNotes ?? null,
      },
    };
  }
}

export default MatterOnboardingService;
