// apps/api/src/modules/matter/matter.dashboard.controller.ts

import type { Request, Response } from 'express';
import { Prisma, prisma } from '@global-wakili/database';

import { asyncHandler } from '../../utils/async-handler';
import { CommissionService } from './CommissionService';

type CommissionDbClient = Parameters<typeof CommissionService.calculateMatterCommission>[0];
type OriginatorPayoutDbClient = Parameters<
  typeof CommissionService.calculateOriginatorPortfolioPayout
>[0];

type MetadataRecord = Record<string, unknown>;

function getTenantId(req: Request): string {
  const tenantId =
    req.tenantId ??
    (req as { tenantId?: string }).tenantId ??
    (req as { user?: { tenantId?: string | null } }).user?.tenantId ??
    req.headers['x-tenant-id'];

  if (!tenantId || Array.isArray(tenantId)) {
    throw Object.assign(new Error('Tenant context is required'), {
      statusCode: 400,
      code: 'TENANT_REQUIRED',
    });
  }

  return tenantId;
}

function getUserId(req: Request): string | null {
  return (
    req.user?.id ??
    (req as { user?: { id?: string | null; sub?: string | null } }).user?.id ??
    (req as { user?: { id?: string | null; sub?: string | null } }).user?.sub ??
    null
  );
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'undefined') return null;
  if (trimmed.toLowerCase() === 'null') return null;

  return trimmed;
}

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
  if (trimmed.toLowerCase() === 'undefined') return null;
  if (trimmed.toLowerCase() === 'null') return null;

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

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid date value'), {
      statusCode: 422,
      code: 'INVALID_DATE',
    });
  }

  return parsed;
}

function getPagination(req: Request) {
  const rawPage = Number(req.query.page ?? 1);
  const rawLimit = Number(req.query.limit ?? 25);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 100)
      : 25;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function buildBaseMatterWhere(
  tenantId: string,
  filters?: {
    branchId?: string | null;
    leadAdvocateId?: string | null;
  },
): Prisma.MatterWhereInput {
  return {
    tenantId,
    deletedAt: null,
    ...(filters?.branchId ? { branchId: filters.branchId } : {}),
    ...(filters?.leadAdvocateId ? { leadAdvocateId: filters.leadAdvocateId } : {}),
  };
}

function buildConflictSearchTerms(req: Request): string[] {
  const rawTerms = [
    asString(req.body?.clientName),
    asString(req.body?.counterpartyName),
    asString(req.body?.opposingPartyName),
    asString(req.body?.matterTitle),
    asString(req.body?.matterCode),
    asString(req.body?.caseNumber),
    asString(req.body?.kraPin),
    asString(req.body?.email),
    asString(req.body?.phoneNumber),
  ];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const term of rawTerms) {
    if (!term) continue;

    const key = term.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(term);
  }

  return result;
}

function shapeMatterSummary<TMatter extends { metadata?: unknown }>(matter: TMatter) {
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

function matterSummarySelect() {
  return {
    id: true,
    title: true,
    matterCode: true,
    caseNumber: true,
    status: true,
    category: true,
    riskLevel: true,
    clientId: true,
    leadAdvocateId: true,
    branchId: true,
    openedDate: true,
    closedDate: true,
    archivedDate: true,
    statuteOfLimitationsDate: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.MatterSelect;
}

export const getMatterDashboard = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const { page, limit, skip } = getPagination(req);

  const where = buildBaseMatterWhere(tenantId);

  const [
    totalMatters,
    openMatters,
    closedMatters,
    statuteTrackedMatters,
    recentMatters,
    statusBreakdown,
    riskBreakdown,
    categoryBreakdown,
  ] = await Promise.all([
    prisma.matter.count({ where }),

    prisma.matter
      .count({
        where: {
          ...where,
          status: {
            in: ['ACTIVE', 'ON_HOLD'],
          },
        },
      })
      .catch(() => 0),

    prisma.matter
      .count({
        where: {
          ...where,
          status: {
            in: ['COMPLETED', 'CLOSED', 'ARCHIVED'],
          },
        },
      })
      .catch(() => 0),

    prisma.matter
      .count({
        where: {
          ...where,
          statuteOfLimitationsDate: {
            not: null,
          },
        },
      })
      .catch(() => 0),

    prisma.matter.findMany({
      where,
      select: matterSummarySelect(),
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
      skip,
    }),

    prisma.matter
      .groupBy({
        by: ['status'],
        where,
        _count: {
          id: true,
        },
      })
      .catch(() => []),

    prisma.matter
      .groupBy({
        by: ['riskLevel'],
        where,
        _count: {
          id: true,
        },
      })
      .catch(() => []),

    prisma.matter
      .groupBy({
        by: ['category'],
        where,
        _count: {
          id: true,
        },
      })
      .catch(() => []),
  ]);

  res.status(200).json({
    success: true,
    module: 'matter',
    scope: 'dashboard',
    data: {
      totals: {
        totalMatters,
        openMatters,
        closedMatters,
        statuteTrackedMatters,
      },
      statusBreakdown,
      riskBreakdown,
      categoryBreakdown,
      recentMatters: recentMatters.map(shapeMatterSummary),
      pagination: {
        page,
        limit,
        skip,
      },
      context: {
        tenantId,
        userId,
      },
      generatedAt: new Date().toISOString(),
    },
  });
});

export const getMatterPortfolioSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);

    const branchId = asString(req.query.branchId);
    const partnerId = asString(req.query.partnerId);
    const assignedLawyerId = asString(req.query.assignedLawyerId);
    const leadAdvocateId = asString(req.query.leadAdvocateId);

    const where = buildBaseMatterWhere(tenantId, {
      branchId,
      leadAdvocateId,
    });

    const [total, byStatus, byCategory, byRiskLevel, recent] = await Promise.all([
      prisma.matter.count({ where }),

      prisma.matter
        .groupBy({
          by: ['status'],
          where,
          _count: {
            id: true,
          },
        })
        .catch(() => []),

      prisma.matter
        .groupBy({
          by: ['category'],
          where,
          _count: {
            id: true,
          },
        })
        .catch(() => []),

      prisma.matter
        .groupBy({
          by: ['riskLevel'],
          where,
          _count: {
            id: true,
          },
        })
        .catch(() => []),

      prisma.matter.findMany({
        where,
        select: matterSummarySelect(),
        orderBy: {
          updatedAt: 'desc',
        },
        take: 25,
      }),
    ]);

    res.status(200).json({
      success: true,
      module: 'matter',
      scope: 'portfolio-summary',
      data: {
        total,
        byStatus,
        byCategory,
        byRiskLevel,
        recent: recent.map(shapeMatterSummary),
        filters: {
          branchId,
          partnerId,
          assignedLawyerId,
          leadAdvocateId,
          note:
            'partnerId and assignedLawyerId are metadata-backed fields in the current schema and are preserved in response shaping, not physical Matter filters.',
        },
        generatedAt: new Date().toISOString(),
      },
    });
  },
);

export const getMatterWorkflowTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const matterType = asString(req.query.matterType) ?? asString(req.query.category) ?? 'GENERAL';

    const templates: Record<string, string[]> = {
      GENERAL: [
        'Open matter',
        'Complete client KYC',
        'Assign responsible lawyer',
        'Confirm fee arrangement',
        'Track work in progress',
        'Bill client',
        'Close matter',
      ],
      LITIGATION: [
        'Open litigation matter',
        'Complete client KYC',
        'Conflict check',
        'Pleadings review',
        'Court date tracking',
        'Evidence/document bundle',
        'Hearing preparation',
        'Billing and recovery',
        'Judgment/order tracking',
        'Close matter',
      ],
      CONVEYANCING: [
        'Open conveyancing matter',
        'Complete client KYC',
        'Conflict check',
        'Due diligence',
        'Draft/review transaction documents',
        'Completion accounting',
        'Stamp duty / registration follow-up',
        'Billing and recovery',
        'Close matter',
      ],
      CORPORATE: [
        'Open corporate matter',
        'Complete client KYC',
        'Conflict check',
        'Board/shareholder document preparation',
        'Regulatory filing tracking',
        'Billing and recovery',
        'Close matter',
      ],
    };

    const normalizedType = matterType.toUpperCase();
    const steps = templates[normalizedType] ?? templates.GENERAL;

    res.status(200).json({
      success: true,
      module: 'matter',
      scope: 'workflow-template',
      data: {
        tenantId,
        matterType: normalizedType,
        category: normalizedType,
        steps,
        generatedAt: new Date().toISOString(),
      },
    });
  },
);

export const runMatterConflictCheck = asyncHandler(
  async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const searchTerms = buildConflictSearchTerms(req);

    if (!searchTerms.length) {
      throw Object.assign(new Error('At least one conflict search term is required'), {
        statusCode: 400,
        code: 'CONFLICT_SEARCH_TERM_REQUIRED',
      });
    }

    const matterMatches = await prisma.matter.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: searchTerms.flatMap((term) => [
          {
            title: {
              contains: term,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            matterCode: {
              contains: term,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            caseNumber: {
              contains: term,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ]),
      },
      select: matterSummarySelect(),
      take: 25,
    });

    const clientMatches = await prisma.client.findMany({
      where: {
        tenantId,
        OR: searchTerms.flatMap((term) => [
          {
            name: {
              contains: term,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            email: {
              contains: term,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            kraPin: {
              contains: term,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            phoneNumber: {
              contains: term,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ]),
      },
      select: {
        id: true,
        name: true,
        email: true,
        kraPin: true,
        phoneNumber: true,
        type: true,
        createdAt: true,
      },
      take: 25,
    });

    const matchCount = matterMatches.length + clientMatches.length;

    const riskLevel =
      matchCount >= 5
        ? 'HIGH'
        : matchCount > 0
          ? 'MEDIUM'
          : 'LOW';

    res.status(200).json({
      success: true,
      module: 'matter',
      scope: 'conflict-check',
      data: {
        riskLevel,
        searchTerms,
        matches: {
          matters: matterMatches.map(shapeMatterSummary),
          clients: clientMatches.map((client) => ({
            ...client,
            clientType: client.type,
          })),
        },
        matchCount,
        checkedAt: new Date().toISOString(),
      },
    });
  },
);

export const evaluateMatterKyc = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const matterId = asString(req.params.matterId) ?? asString(req.body?.matterId);

  if (!matterId) {
    throw Object.assign(new Error('matterId is required for matter KYC evaluation'), {
      statusCode: 400,
      code: 'MATTER_REQUIRED',
    });
  }

  const matter = await prisma.matter.findFirst({
    where: {
      id: matterId,
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      matterCode: true,
      caseNumber: true,
      category: true,
      riskLevel: true,
      clientId: true,
      metadata: true,
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          kraPin: true,
          phoneNumber: true,
          type: true,
        },
      },
    },
  });

  if (!matter) {
    throw Object.assign(new Error('Matter not found'), {
      statusCode: 404,
      code: 'MATTER_NOT_FOUND',
    });
  }

  const missing: string[] = [];

  if (!matter.client?.name) missing.push('client.name');
  if (!matter.client?.email) missing.push('client.email');
  if (!matter.client?.kraPin) missing.push('client.kraPin');
  if (!matter.client?.phoneNumber) missing.push('client.phoneNumber');
  if (!matter.category) missing.push('matter.category');

  const score = Math.max(0, 100 - missing.length * 20);

  res.status(200).json({
    success: true,
    module: 'matter',
    scope: 'kyc-evaluation',
    data: {
      matterId: matter.id,
      matterCode: matter.matterCode,
      caseNumber: matter.caseNumber,
      category: matter.category,
      riskLevel: matter.riskLevel,
      clientId: matter.clientId,
      clientType: matter.client?.type ?? null,
      score,
      status: score >= 80 ? 'PASS' : score >= 50 ? 'REVIEW_REQUIRED' : 'INCOMPLETE',
      missing,
      metadata: matter.metadata,
      evaluatedAt: new Date().toISOString(),
    },
  });
});

export const getMatterCommission = asyncHandler(
  async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const matterId = asString(req.params.matterId) ?? asString(req.query.matterId);

    if (!matterId) {
      throw Object.assign(new Error('matterId is required for commission calculation'), {
        statusCode: 400,
        code: 'MATTER_REQUIRED',
      });
    }

    const data = await CommissionService.calculateMatterCommission(
      prisma as CommissionDbClient,
      {
        tenantId,
        matterId,
        periodStart: toDate(req.query.periodStart),
        periodEnd: toDate(req.query.periodEnd),
        includeWriteOffImpact:
          req.query.includeWriteOffImpact === undefined
            ? true
            : String(req.query.includeWriteOffImpact).toLowerCase() !== 'false',
      },
    );

    res.status(200).json({
      success: true,
      module: 'matter',
      scope: 'matter-commission',
      data,
    });
  },
);

export const getOriginatorPortfolioPayout = asyncHandler(
  async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    const originatorId =
      asString(req.params.originatorId) ??
      asString(req.query.originatorId) ??
      getUserId(req);

    if (!originatorId) {
      throw Object.assign(new Error('originatorId is required'), {
        statusCode: 400,
        code: 'ORIGINATOR_REQUIRED',
      });
    }

    const data = await CommissionService.calculateOriginatorPortfolioPayout(
      prisma as OriginatorPayoutDbClient,
      {
        tenantId,
        originatorId,
        periodStart: toDate(req.query.periodStart),
        periodEnd: toDate(req.query.periodEnd),
      },
    );

    res.status(200).json({
      success: true,
      module: 'matter',
      scope: 'originator-portfolio-payout',
      data,
    });
  },
);