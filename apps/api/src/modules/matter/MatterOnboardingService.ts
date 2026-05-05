// apps/api/src/modules/matter/MatterOnboardingService.ts

import type { Request } from 'express';
import { getRequestUserId, requireTenantId } from '../../utils/request-identity';
import { MatterService } from './MatterService';
import { MatterWorkflowService } from './MatterWorkflowService';
import { MatterConflictService } from './MatterConflictService';
import { MatterAuditService } from './MatterAuditService';
import type { MatterInput } from './matter.types';

type ConflictBlockPolicy = 'CRITICAL_ONLY' | 'HIGH_AND_CRITICAL' | 'MANUAL_REVIEW_ONLY';

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

type MatterOnboardingResult = {
  matter: unknown;
  workflowTemplate: {
    matterType: string;
    workflowType: string;
    recommendedStages: string[];
    requiredArtifacts: string[];
  };
  conflictResult: Awaited<ReturnType<typeof MatterConflictService.runConflictCheck>> | null;
  onboarding: {
    status: 'COMPLETED';
    completedAt: string;
    conflictLevel: string;
    conflictPolicy: ConflictBlockPolicy;
    notes: string | null;
  };
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

function normalizeDateInput(value: unknown): Date | string | null {
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

    return value;
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
  return asRecord(payload['metadata']);
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
  workflowTemplate: {
    matterType: string;
    workflowType: string;
    recommendedStages: string[];
    requiredArtifacts: string[];
  };
  completedAt: string;
  notes?: string | null;
  conflictLevel?: string | null;
  conflictSummary?: Record<string, unknown> | null;
  userId?: string | null;
}) {
  const transientMetadata = getTransientMetadata(params.matterPayload);

  return MatterWorkflowService.normalizeMetadata({
    ...transientMetadata,
    matterType: params.category,
    category: params.category,
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
    },
    originatorId: resolveOriginatorId(
      params.matterPayload,
      transientMetadata,
      params.userId ?? null,
    ),
  });
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

  const leadAdvocateId = resolveLeadAdvocateId(payload);
  const originatorId = resolveOriginatorId(payload, transientMetadata, params.userId ?? null);

  const estimatedValue = normalizeNumberInput(payload.estimatedValue);
  const progressPercent = normalizeNumberInput(payload.progressPercent);

  return {
    matterReference: toNullableString(payload.matterReference),
    matterType: params.category,

    title,
    clientId,
    branchId: toNullableString(payload.branchId),
    description: toNullableString(payload.description),

    category: params.category,
    riskLevel: toNullableString(payload.riskLevel) ?? toNullableString(transientMetadata.riskLevel),
    status: toNullableString(payload.status) as MatterInput['status'] | undefined,

    openedDate: normalizeDateInput(payload.openedDate),
    closedDate: normalizeDateInput(payload.closedDate),
    closeDate: normalizeDateInput(payload.closeDate),
    archivedDate: normalizeDateInput(payload.archivedDate),
    statuteOfLimitationsDate: normalizeDateInput(payload.statuteOfLimitationsDate),

    leadAdvocateId,
    originatorId,
    assigneeId: toNullableString(payload.assigneeId),

    billingModel: toNullableString(payload.billingModel) as MatterInput['billingModel'] | undefined,
    currency: toNullableString(payload.currency),
    estimatedValue,

    progressPercent:
      typeof progressPercent === 'number'
        ? progressPercent
        : typeof progressPercent === 'string'
          ? Number(progressPercent)
          : null,
    progressStage: toNullableString(payload.progressStage) as MatterInput['progressStage'] | null,

    billing:
      payload.billing && typeof payload.billing === 'object' && !Array.isArray(payload.billing)
        ? (payload.billing as MatterInput['billing'])
        : null,

    documents:
      payload.documents && typeof payload.documents === 'object' && !Array.isArray(payload.documents)
        ? (payload.documents as MatterInput['documents'])
        : null,

    calendar:
      payload.calendar && typeof payload.calendar === 'object' && !Array.isArray(payload.calendar)
        ? (payload.calendar as MatterInput['calendar'])
        : null,

    invoice:
      payload.invoice && typeof payload.invoice === 'object' && !Array.isArray(payload.invoice)
        ? (payload.invoice as MatterInput['invoice'])
        : null,

    reports:
      payload.reports && typeof payload.reports === 'object' && !Array.isArray(payload.reports)
        ? (payload.reports as MatterInput['reports'])
        : null,

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
  db: any,
  callback: (tx: any) => Promise<T>,
): Promise<T> {
  if (typeof db?.$transaction === 'function') {
    return db.$transaction(callback);
  }

  return callback(db);
}

async function logMatterOnboardingAudit(
  req: Request,
  params: {
    createdMatter: any;
    conflictResult: Awaited<ReturnType<typeof MatterConflictService.runConflictCheck>> | null;
    workflowTemplate: {
      matterType: string;
      workflowType: string;
      recommendedStages: string[];
      requiredArtifacts: string[];
    };
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

    const transactionResult = await runInTransaction(req.db, async (tx: any) => {
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
      createdMatter: transactionResult.createdMatter,
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