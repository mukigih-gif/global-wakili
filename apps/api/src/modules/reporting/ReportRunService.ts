// apps/api/src/modules/reporting/ReportRunService.ts

import type {
  ReportRunInput,
  ReportingDbClient,
  ReportingSearchFilters,
} from './reporting.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for report runs'), {
      statusCode: 400,
      code: 'REPORT_RUN_TENANT_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid report run date'), {
      statusCode: 422,
      code: 'REPORT_RUN_DATE_INVALID',
    });
  }
  return parsed;
}

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

async function assertReportDefinitionExists(
  db: ReportingDbClient,
  params: {
    tenantId: string;
    reportDefinitionId: string;
  },
) {
  const definition = await db.reportDefinition.findFirst({
    where: {
      id: params.reportDefinitionId,
      tenantId: params.tenantId,
    },
    select: {
      id: true,
      sourceLayer: true,
      key: true,
      name: true,
      metadata: true,
    },
  });

  if (!definition) {
    throw Object.assign(new Error('Report definition not found'), {
      statusCode: 404,
      code: 'REPORT_DEFINITION_NOT_FOUND',
    });
  }

  return definition;
}

export class ReportRunService {
  static async createRun(db: ReportingDbClient, input: ReportRunInput) {
    assertTenant(input.tenantId);

    const definition = await assertReportDefinitionExists(db, {
      tenantId: input.tenantId,
      reportDefinitionId: input.reportDefinitionId,
    });

    return db.reportRun.create({
      data: {
        tenantId: input.tenantId,
        reportDefinitionId: input.reportDefinitionId,
        status: 'QUEUED',
        sourceLayer: input.sourceLayer ?? definition.sourceLayer,
        triggeredByUserId: input.triggeredByUserId ?? null,
        parameters: input.parameters ?? {},
        snapshotRefType: input.snapshotRefType?.trim() || null,
        snapshotRefId: input.snapshotRefId?.trim() || null,
        metadata: {
          reportKey: definition.key,
          reportName: definition.name,
          ...(input.metadata ?? {}),
        },
      },
    });
  }

  static async searchRuns(
    db: ReportingDbClient,
    params: {
      tenantId: string;
      filters?: ReportingSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const { page, limit, skip } = pageParams(params.page, params.limit);
    const createdFrom = normalizeDate(params.filters?.createdFrom);
    const createdTo = normalizeDate(params.filters?.createdTo);

    const where = {
      tenantId: params.tenantId,
      ...(params.filters?.reportDefinitionId
        ? { reportDefinitionId: params.filters.reportDefinitionId }
        : {}),
      ...(params.filters?.status ? { status: params.filters.status } : {}),
      ...(params.filters?.sourceLayer ? { sourceLayer: params.filters.sourceLayer } : {}),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom ? { gte: createdFrom } : {}),
              ...(createdTo ? { lte: createdTo } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      db.reportRun.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.reportRun.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      runReadinessHints: [
        'Statutory outputs should remain parameterized and audit-logged.',
        'Variance-style runs should persist parameters to support re-run comparisons.',
      ],
    };
  }
}

export default ReportRunService;