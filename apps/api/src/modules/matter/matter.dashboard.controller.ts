// apps/api/src/modules/matter/matter.dashboard.controller.ts

import type { Request, Response } from 'express';
import { Prisma, prisma } from '@global-wakili/database';

import { asyncHandler } from '../../utils/async-handler';
import { CommissionService } from './CommissionService';

function getTenantId(req: Request): string {
  const tenantId =
    req.tenantId ??
    (req as any).tenantId ??
    (req as any).user?.tenantId ??
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
  return req.user?.id ?? (req as any).user?.id ?? null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 25), 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export const getMatterDashboard = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const { page, limit, skip } = getPagination(req);

  const where: Prisma.MatterWhereInput = {
    tenantId,
    deletedAt: null,
  };

  const [
    totalMatters,
    openMatters,
    closedMatters,
    recentMatters,
    highLevelCounts,
  ] = await Promise.all([
    prisma.matter.count({ where }),
    prisma.matter.count({
      where: {
        ...where,
        status: {
          in: ['OPEN', 'ACTIVE', 'IN_PROGRESS'] as any,
        },
      },
    }).catch(() => 0),
    prisma.matter.count({
      where: {
        ...where,
        status: {
          in: ['CLOSED', 'ARCHIVED'] as any,
        },
      },
    }).catch(() => 0),
    prisma.matter.findMany({
      where,
      select: {
        id: true,
        title: true,
        matterCode: true,
        caseNumber: true,
        status: true,
        matterType: true,
        clientId: true,
        partnerId: true,
        assignedLawyerId: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
      skip,
    }),
    prisma.matter.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true,
      },
    }).catch(() => []),
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
      },
      statusBreakdown: highLevelCounts,
      recentMatters,
      pagination: {
        page,
        limit,
        skip,
      },
      context: {
        tenantId,
        userId,
      },
    },
  });
});

export const getMatterPortfolioSummary = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantId(req);

  const branchId = asString(req.query.branchId);
  const partnerId = asString(req.query.partnerId);
  const assignedLawyerId = asString(req.query.assignedLawyerId);

  const where: Prisma.MatterWhereInput = {
    tenantId,
    deletedAt: null,
    ...(branchId ? { branchId } : {}),
    ...(partnerId ? { partnerId } : {}),
    ...(assignedLawyerId ? { assignedLawyerId } : {}),
  };

  const [
    total,
    byStatus,
    byType,
    recent,
  ] = await Promise.all([
    prisma.matter.count({ where }),
    prisma.matter.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true,
      },
    }).catch(() => []),
    prisma.matter.groupBy({
      by: ['matterType'],
      where,
      _count: {
        id: true,
      },
    }).catch(() => []),
    prisma.matter.findMany({
      where,
      select: {
        id: true,
        title: true,
        matterCode: true,
        caseNumber: true,
        status: true,
        matterType: true,
        clientId: true,
        partnerId: true,
        assignedLawyerId: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
      },
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
      byType,
      recent,
      filters: {
        branchId,
        partnerId,
        assignedLawyerId,
      },
      generatedAt: new Date().toISOString(),
    },
  });
});

export const getMatterWorkflowTemplate = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const matterType = asString(req.query.matterType) ?? 'GENERAL';

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
      steps,
      generatedAt: new Date().toISOString(),
    },
  });
});

export const runMatterConflictCheck = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantId(req);

  const searchTerms = [
    asString(req.body?.clientName),
    asString(req.body?.counterpartyName),
    asString(req.body?.opposingPartyName),
    asString(req.body?.matterTitle),
    asString(req.body?.kraPin),
    asString(req.body?.email),
  ].filter(Boolean) as string[];

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
        { title: { contains: term, mode: 'insensitive' as const } },
        { caseNumber: { contains: term, mode: 'insensitive' as const } },
        { matterCode: { contains: term, mode: 'insensitive' as const } },
      ]),
    },
    select: {
      id: true,
      title: true,
      matterCode: true,
      caseNumber: true,
      status: true,
      clientId: true,
      createdAt: true,
    },
    take: 25,
  });

  const clientMatches = await prisma.client.findMany({
    where: {
      tenantId,
      OR: searchTerms.flatMap((term) => [
        { name: { contains: term, mode: 'insensitive' as const } },
        { email: { contains: term, mode: 'insensitive' as const } },
        { kraPin: { contains: term, mode: 'insensitive' as const } },
      ]),
    },
    select: {
      id: true,
      name: true,
      email: true,
      kraPin: true,
      createdAt: true,
    },
    take: 25,
  });

  const riskLevel =
    matterMatches.length + clientMatches.length >= 5
      ? 'HIGH'
      : matterMatches.length + clientMatches.length > 0
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
        matters: matterMatches,
        clients: clientMatches,
      },
      matchCount: matterMatches.length + clientMatches.length,
      checkedAt: new Date().toISOString(),
    },
  });
});

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
      clientId: true,
      metadata: true,
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          kraPin: true,
          phone: true,
          clientType: true,
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
  if (!matter.client?.phone) missing.push('client.phone');

  const score = Math.max(0, 100 - missing.length * 20);

  res.status(200).json({
    success: true,
    module: 'matter',
    scope: 'kyc-evaluation',
    data: {
      matterId: matter.id,
      clientId: matter.clientId,
      score,
      status: score >= 80 ? 'PASS' : score >= 50 ? 'REVIEW_REQUIRED' : 'INCOMPLETE',
      missing,
      evaluatedAt: new Date().toISOString(),
    },
  });
});

export const getMatterCommission = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const matterId = asString(req.params.matterId) ?? asString(req.query.matterId);

  if (!matterId) {
    throw Object.assign(new Error('matterId is required for commission calculation'), {
      statusCode: 400,
      code: 'MATTER_REQUIRED',
    });
  }

  const data = await CommissionService.calculateMatterCommission(prisma, {
    tenantId,
    matterId,
    periodStart: toDate(req.query.periodStart),
    periodEnd: toDate(req.query.periodEnd),
    includeWriteOffImpact:
      req.query.includeWriteOffImpact === undefined
        ? true
        : String(req.query.includeWriteOffImpact).toLowerCase() !== 'false',
  });

  res.status(200).json({
    success: true,
    module: 'matter',
    scope: 'matter-commission',
    data,
  });
});

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

    const data = await CommissionService.calculateOriginatorPortfolioPayout(prisma, {
      tenantId,
      originatorId,
      periodStart: toDate(req.query.periodStart),
      periodEnd: toDate(req.query.periodEnd),
    });

    res.status(200).json({
      success: true,
      module: 'matter',
      scope: 'originator-portfolio-payout',
      data,
    });
  },
);