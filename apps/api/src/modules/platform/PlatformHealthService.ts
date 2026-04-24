// apps/api/src/modules/platform/PlatformHealthService.ts

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

export class PlatformHealthService {
  static async upsertTenantHealth(db: PlatformDbClient, input: any) {
    const existing = await db.tenantHealthSnapshot.findFirst({
      where: { tenantId: input.tenantId },
      orderBy: [{ createdAt: 'desc' }],
    });

    const data = {
      tenantId: input.tenantId,
      status: input.status,
      healthScore: input.healthScore,
      apiErrorRate: input.apiErrorRate ?? null,
      queueBacklog: input.queueBacklog ?? 0,
      storageUsagePercent: input.storageUsagePercent ?? null,
      rateLimitEvents: input.rateLimitEvents ?? 0,
      failedWebhookCount: input.failedWebhookCount ?? 0,
      lastEvaluatedAt: normalizeDate(input.lastEvaluatedAt) ?? new Date(),
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.tenantHealthSnapshot.update({ where: { id: existing.id }, data });
    }

    return db.tenantHealthSnapshot.create({ data });
  }

  static async searchTenantHealth(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [data, total] = await Promise.all([
      db.tenantHealthSnapshot.findMany({ where, orderBy: [{ lastEvaluatedAt: 'desc' }], skip, take: limit }),
      db.tenantHealthSnapshot.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}