// apps/api/src/modules/matter/matter.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import MatterService from './MatterService';
import { MatterProgressNotificationService } from './MatterProgressNotificationService';
import { getBranchFilter } from '../../utils/branch-filter';
import type { MatterInput } from './matter.types';

type MetadataRecord = Record<string, unknown>;

function asMetadataRecord(value: unknown): MetadataRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as MetadataRecord)
    : {};
}

function metadataString(metadata: MetadataRecord, key: string): string | null {
  const value = metadata[key];

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'null') return null;
  if (trimmed.toLowerCase() === 'undefined') return null;

  return trimmed;
}

function metadataNumber(metadata: MetadataRecord, key: string): number | null {
  const value = metadata[key];

  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/**
 * Preserve business capability at the API boundary.
 *
 * MatterService writes confirmed schema-backed Matter fields physically and keeps
 * non-schema business fields in metadata. This shaper exposes those metadata-backed
 * fields at the top level so existing UI/API consumers do not lose capability.
 */
function shapeMatterResponse<TMatter extends { metadata?: unknown } | null>(
  matter: TMatter,
) {
  if (!matter) return null;

  const metadata = asMetadataRecord(matter.metadata);

  return {
    ...matter,

    partnerId: metadataString(metadata, 'partnerId'),
    originatorId: metadataString(metadata, 'originatorId'),
    assigneeId: metadataString(metadata, 'assigneeId'),
    assignedLawyerId: metadataString(metadata, 'assignedLawyerId'),

    billingModel: metadataString(metadata, 'billingModel'),
    closeDate: metadataString(metadata, 'closeDate'),

    estimatedValue: metadataString(metadata, 'estimatedValue'),
    currency: metadataString(metadata, 'currency') ?? 'KES',

    progressPercent: metadataNumber(metadata, 'progressPercent') ?? 0,
    progressStage: metadataString(metadata, 'progressStage'),

    matterReference: metadataString(metadata, 'matterReference'),

    billing: metadata.billing ?? null,
    documents: metadata.documents ?? null,
    calendar: metadata.calendar ?? null,
    invoice: metadata.invoice ?? null,
    reports: metadata.reports ?? null,
  };
}

function requireTenantId(req: Request): string {
  if (!req.tenantId) {
    throw Object.assign(new Error('Tenant context is required'), {
      statusCode: 400,
      code: 'TENANT_REQUIRED',
    });
  }

  return req.tenantId;
}

function getMatterId(req: Request): string {
  const matterId = req.params.matterId ?? req.params.id;

  if (!matterId) {
    throw Object.assign(new Error('Matter ID is required'), {
      statusCode: 400,
      code: 'MATTER_ID_REQUIRED',
    });
  }

  return matterId;
}

function parsePositiveInteger(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;

  return Math.floor(parsed);
}

export const createMatter = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const actorId  = (req as any).user?.id ?? (req as any).user?.sub ?? null;
  const actorBranchId = (req as any).user?.branchId ?? null;

  // Resolve a branchId: explicit → actor's branch → client's branch → tenant's first branch.
  let branchId: string | null = req.body.branchId || actorBranchId || null;
  if (!branchId && req.body.clientId) {
    const client = await req.db.client.findFirst({
      where: { tenantId, id: req.body.clientId },
      select: { branchId: true },
    }).catch(() => null);
    branchId = client?.branchId ?? null;
  }
  if (!branchId) {
    const firstBranch = await req.db.branch.findFirst({
      where: { tenantId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    }).catch(() => null);
    branchId = firstBranch?.id ?? null;
  }

  // Resolve a leadAdvocateId: explicit → assigned lawyer → current actor.
  const leadAdvocateId =
    req.body.leadAdvocateId || req.body.assignedLawyerId || actorId || null;

  const input: MatterInput = {
    ...req.body,
    leadAdvocateId,
    branchId,
    // Frontend may send matterType instead of category
    category: req.body.category || req.body.matterType || 'GENERAL',
  };

  const created = await MatterService.create(req.db, tenantId, input);

  res.status(201).json(shapeMatterResponse(created));
});

export const updateMatter = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const matterId = getMatterId(req);
  const input = req.body as Partial<MatterInput>;

  // Capture current stage before update for change detection
  const existingMatter = await req.db.matter.findFirst({
    where: { tenantId, id: matterId },
    select: { metadata: true },
  }).catch(() => null);
  const previousStage = (existingMatter?.metadata as any)?.progressStage ?? null;

  const updated = await MatterService.update(req.db, tenantId, matterId, input);

  // Notify client + lead advocate if progress stage changed
  if (input.progressStage !== undefined) {
    const actorId = (req as any).user?.sub ?? (req as any).user?.id ?? null;
    void MatterProgressNotificationService.notifyIfProgressChanged(req.db, {
      tenantId,
      matterId,
      previousStage,
      newStage: input.progressStage ?? null,
      updatedBy: actorId,
    });
  }

  res.status(200).json(shapeMatterResponse(updated));
});

export const listOpenMatters = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const branchFilter = getBranchFilter(req.user ?? {});

  const result = await MatterService.listOpen(req.db, tenantId, {
    page:     parsePositiveInteger(req.query.page),
    limit:    parsePositiveInteger(req.query.limit),
    search:   typeof req.query.search === 'string' ? req.query.search : undefined,
    status:   typeof req.query.status === 'string' ? req.query.status : undefined,
    branchId: branchFilter.branchId,
  });

  res.status(200).json({
    ...result,
    data: result.data.map(shapeMatterResponse),
  });
});

export const getMatterById = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const matterId = getMatterId(req);

  const matter = await MatterService.getById(req.db, tenantId, matterId);

  if (!matter) {
    throw Object.assign(new Error('Matter not found'), {
      statusCode: 404,
      code: 'MISSING_MATTER',
    });
  }

  res.status(200).json(shapeMatterResponse(matter));
});

export const getMatterOverview = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const matterId = getMatterId(req);

  const matter = await MatterService.getOverview(req.db, tenantId, matterId);

  if (!matter) {
    throw Object.assign(new Error('Matter not found'), {
      statusCode: 404,
      code: 'MISSING_MATTER',
    });
  }

  const shapedMatter = shapeMatterResponse(matter);

  res.status(200).json({
    ...shapedMatter,

    invoiceCount: matter._count.invoices,
    trustTransactionCount: matter._count.trustTransactions,
    expenseCount: matter._count.expenseEntries,
    documentCount: matter._count.documents,
    taskCount: matter._count.tasks,
    courtHearingCount: matter._count.courtHearings,

    recentInvoices: matter.invoices ?? [],
    recentTrustTransactions: matter.trustTransactions ?? [],
    recentExpenses: matter.expenseEntries ?? [],

    client: matter.client,
    leadAdvocate: matter.leadAdvocate,
  });
});