// apps/api/src/modules/platform/PlatformQuotaService.ts

import type { PlatformDbClient } from './platform.types';

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

function normalizeDate(value?: Date | string | null) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export class PlatformQuotaService {
  static async upsertQuotaPolicy(db: PlatformDbClient, input: any) {
    const existing = await db.tenantQuotaPolicy.findFirst({
      where: { tenantId: input.tenantId, metricType: input.metricType },
    });

    const data = {
      tenantId: input.tenantId,
      metricType: input.metricType,
      softLimit: input.softLimit ?? null,
      hardLimit: input.hardLimit ?? null,
      enforcementMode: input.enforcementMode,
      warningThresholdPercent: input.warningThresholdPercent ?? 80,
      resetFrequency: input.resetFrequency ?? null,
      effectiveAt: normalizeDate(input.effectiveAt) ?? new Date(),
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.tenantQuotaPolicy.update({ where: { id: existing.id }, data });
    }

    return db.tenantQuotaPolicy.create({ data });
  }

  static async searchQuotaPolicies(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.metricType ? { metricType: params.metricType } : {}),
      ...(params.enforcementMode ? { enforcementMode: params.enforcementMode } : {}),
    };

    const [data, total] = await Promise.all([
      db.tenantQuotaPolicy.findMany({ where, orderBy: [{ updatedAt: 'desc' }], skip, take: limit }),
      db.tenantQuotaPolicy.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async upsertUsageMetric(db: PlatformDbClient, input: any) {
    const periodStart = normalizeDate(input.periodStart) ?? new Date();
    const periodEnd = normalizeDate(input.periodEnd) ?? new Date();

    const existing = await db.tenantUsageMetric.findFirst({
      where: {
        tenantId: input.tenantId,
        metricType: input.metricType,
        periodStart,
        periodEnd,
      },
    });

    const data = {
      tenantId: input.tenantId,
      metricType: input.metricType,
      periodStart,
      periodEnd,
      currentValue: input.currentValue,
      peakValue: input.peakValue ?? null,
      unit: input.unit ?? null,
      lastRecordedAt: normalizeDate(input.lastRecordedAt),
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.tenantUsageMetric.update({ where: { id: existing.id }, data });
    }

    return db.tenantUsageMetric.create({ data });
  }

  static async searchUsageMetrics(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.metricType ? { metricType: params.metricType } : {}),
      ...(params.createdFrom || params.createdTo
        ? {
            createdAt: {
              ...(normalizeDate(params.createdFrom) ? { gte: normalizeDate(params.createdFrom) } : {}),
              ...(normalizeDate(params.createdTo) ? { lte: normalizeDate(params.createdTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      db.tenantUsageMetric.findMany({ where, orderBy: [{ periodEnd: 'desc' }], skip, take: limit }),
      db.tenantUsageMetric.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}