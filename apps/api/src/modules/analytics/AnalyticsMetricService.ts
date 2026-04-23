// apps/api/src/modules/analytics/AnalyticsMetricService.ts

import type {
  AnalyticsDbClient,
  AnalyticsInsightInput,
  AnalyticsInsightSearchFilters,
  AnalyticsMetricInput,
  AnalyticsMetricSearchFilters,
  AnalyticsSnapshotInput,
  AnalyticsSnapshotSearchFilters,
} from './analytics.types';

const MAX_PAGE_SIZE = 100;

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for analytics'), {
      statusCode: 400,
      code: 'ANALYTICS_TENANT_REQUIRED',
    });
  }
}

async function assertTenantExists(
  db: AnalyticsDbClient,
  tenantId: string,
): Promise<void> {
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId },
    select: { id: true },
  });

  if (!tenant) {
    throw Object.assign(new Error('Tenant not found for analytics operation'), {
      statusCode: 404,
      code: 'ANALYTICS_TENANT_NOT_FOUND',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid analytics date'), {
      statusCode: 422,
      code: 'ANALYTICS_DATE_INVALID',
    });
  }

  return parsed;
}

function assertDateRange(
  start?: Date | null,
  end?: Date | null,
  code = 'ANALYTICS_PERIOD_INVALID',
): void {
  if (start && end && end.getTime() < start.getTime()) {
    throw Object.assign(
      new Error('Analytics period end cannot be before period start'),
      {
        statusCode: 422,
        code,
      },
    );
  }
}

function normalizeDecimal(value: number | string): number | string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw Object.assign(new Error('Analytics metric value must be finite'), {
        statusCode: 422,
        code: 'ANALYTICS_METRIC_VALUE_INVALID',
      });
    }

    return value;
  }

  const trimmed = value.trim();

  if (!trimmed || !/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw Object.assign(
      new Error('Analytics metric value must be a valid decimal number'),
      {
        statusCode: 422,
        code: 'ANALYTICS_METRIC_VALUE_INVALID',
      },
    );
  }

  return trimmed;
}

function normalizeKey(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw Object.assign(new Error(`${fieldName} is required`), {
      statusCode: 422,
      code: 'ANALYTICS_KEY_REQUIRED',
    });
  }

  return normalized;
}

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit =
    limit && limit > 0 ? Math.min(limit, MAX_PAGE_SIZE) : 50;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

function buildDateWindow(
  field: string,
  from?: Date | string | null,
  to?: Date | string | null,
): Record<string, unknown> | null {
  const normalizedFrom = normalizeDate(from);
  const normalizedTo = normalizeDate(to);

  assertDateRange(normalizedFrom, normalizedTo);

  if (!normalizedFrom && !normalizedTo) return null;

  return {
    [field]: {
      ...(normalizedFrom ? { gte: normalizedFrom } : {}),
      ...(normalizedTo ? { lte: normalizedTo } : {}),
    },
  };
}

function buildMetricWhere(
  tenantId: string,
  filters?: AnalyticsMetricSearchFilters | null,
) {
  const andClauses: Record<string, unknown>[] = [{ tenantId }];

  if (filters?.module) andClauses.push({ module: filters.module });
  if (filters?.metricKey) andClauses.push({ metricKey: filters.metricKey });
  if (filters?.scope) andClauses.push({ scope: filters.scope });
  if (filters?.sourceEntityType) {
    andClauses.push({ sourceEntityType: filters.sourceEntityType });
  }
  if (filters?.sourceEntityId) {
    andClauses.push({ sourceEntityId: filters.sourceEntityId });
  }

  const windows = [
    buildDateWindow(
      'periodStart',
      filters?.periodStartFrom,
      filters?.periodStartTo,
    ),
    buildDateWindow('periodEnd', filters?.periodEndFrom, filters?.periodEndTo),
    buildDateWindow('createdAt', filters?.createdFrom, filters?.createdTo),
  ].filter(Boolean) as Record<string, unknown>[];

  andClauses.push(...windows);

  return { AND: andClauses };
}

export class AnalyticsMetricService {
  static async createMetric(db: AnalyticsDbClient, input: AnalyticsMetricInput) {
    assertTenant(input.tenantId);
    await assertTenantExists(db, input.tenantId);

    const periodStart = normalizeDate(input.periodStart);
    const periodEnd = normalizeDate(input.periodEnd);
    assertDateRange(periodStart, periodEnd);

    return db.analyticsMetric.create({
      data: {
        tenantId: input.tenantId,
        module: input.module,
        scope: input.scope ?? 'TENANT',
        metricKey: normalizeKey(input.metricKey, 'metricKey'),
        metricName: normalizeKey(input.metricName, 'metricName'),
        value: normalizeDecimal(input.value),
        valueType: input.valueType ?? 'NUMBER',
        unit: input.unit?.trim() || null,
        periodStart,
        periodEnd,
        sourceEntityType: input.sourceEntityType?.trim() || null,
        sourceEntityId: input.sourceEntityId?.trim() || null,
        dimensions: input.dimensions ?? {},
        metadata: input.metadata ?? {},
      },
    });
  }

  static async searchMetrics(
    db: AnalyticsDbClient,
    params: {
      tenantId: string;
      filters?: AnalyticsMetricSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = buildMetricWhere(params.tenantId, params.filters);

    const [data, total] = await Promise.all([
      db.analyticsMetric.findMany({
        where,
        orderBy: [{ computedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.analyticsMetric.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createSnapshot(
    db: AnalyticsDbClient,
    input: AnalyticsSnapshotInput,
  ) {
    assertTenant(input.tenantId);
    await assertTenantExists(db, input.tenantId);

    const snapshotKey = normalizeKey(input.snapshotKey, 'snapshotKey');
    const title = normalizeKey(input.title, 'title');
    const periodStart = normalizeDate(input.periodStart);
    const periodEnd = normalizeDate(input.periodEnd);
    assertDateRange(periodStart, periodEnd);

    const create = async (client: AnalyticsDbClient) => {
      await client.analyticsSnapshot.updateMany({
        where: {
          tenantId: input.tenantId,
          module: input.module,
          snapshotKey,
          status: 'ACTIVE',
        },
        data: {
          status: 'SUPERSEDED',
        },
      });

      return client.analyticsSnapshot.create({
        data: {
          tenantId: input.tenantId,
          module: input.module,
          snapshotKey,
          title,
          description: input.description?.trim() || null,
          status: 'ACTIVE',
          periodStart,
          periodEnd,
          payload: input.payload,
          metrics: input.metrics ?? {},
          metadata: input.metadata ?? {},
        },
      });
    };

    if (typeof db.$transaction === 'function') {
      return db.$transaction(async (tx: AnalyticsDbClient) => create(tx));
    }

    return create(db);
  }

  static async searchSnapshots(
    db: AnalyticsDbClient,
    params: {
      tenantId: string;
      filters?: AnalyticsSnapshotSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const { page, limit, skip } = pageParams(params.page, params.limit);

    const where = {
      tenantId: params.tenantId,
      ...(params.filters?.module ? { module: params.filters.module } : {}),
      ...(params.filters?.snapshotKey
        ? { snapshotKey: params.filters.snapshotKey }
        : {}),
      ...(params.filters?.status ? { status: params.filters.status } : {}),
    };

    const [data, total] = await Promise.all([
      db.analyticsSnapshot.findMany({
        where,
        orderBy: [{ generatedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.analyticsSnapshot.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createInsight(db: AnalyticsDbClient, input: AnalyticsInsightInput) {
    assertTenant(input.tenantId);
    await assertTenantExists(db, input.tenantId);

    return db.analyticsInsight.create({
      data: {
        tenantId: input.tenantId,
        module: input.module,
        insightKey: normalizeKey(input.insightKey, 'insightKey'),
        title: normalizeKey(input.title, 'title'),
        summary: normalizeKey(input.summary, 'summary'),
        severity: input.severity ?? 'INFO',
        status: input.status ?? 'OPEN',
        entityType: input.entityType?.trim() || null,
        entityId: input.entityId?.trim() || null,
        score: input.score ?? null,
        payload: input.payload ?? {},
        metadata: input.metadata ?? {},
      },
    });
  }

  static async searchInsights(
    db: AnalyticsDbClient,
    params: {
      tenantId: string;
      filters?: AnalyticsInsightSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const { page, limit, skip } = pageParams(params.page, params.limit);

    const where = {
      tenantId: params.tenantId,
      ...(params.filters?.module ? { module: params.filters.module } : {}),
      ...(params.filters?.insightKey
        ? { insightKey: params.filters.insightKey }
        : {}),
      ...(params.filters?.severity ? { severity: params.filters.severity } : {}),
      ...(params.filters?.status ? { status: params.filters.status } : {}),
      ...(params.filters?.entityType
        ? { entityType: params.filters.entityType }
        : {}),
      ...(params.filters?.entityId ? { entityId: params.filters.entityId } : {}),
    };

    const [data, total] = await Promise.all([
      db.analyticsInsight.findMany({
        where,
        orderBy: [{ detectedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.analyticsInsight.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default AnalyticsMetricService;