// apps/api/src/modules/platform/PlatformFeatureFlagService.ts

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

export class PlatformFeatureFlagService {
  static async upsertFlag(db: PlatformDbClient, input: any) {
    const existing = await db.platformFeatureFlag.findFirst({ where: { key: input.key.trim() } });

    const data = {
      key: input.key.trim(),
      name: input.name.trim(),
      description: input.description ?? null,
      scope: input.scope,
      targetPlan: input.targetPlan ?? null,
      targetTenantId: input.targetTenantId ?? null,
      targetModuleKey: input.targetModuleKey ?? null,
      isEnabled: input.isEnabled ?? false,
      rolloutPercentage: input.rolloutPercentage ?? null,
      rolloutRing: input.rolloutRing ?? null,
      config: input.config ?? {},
      startsAt: normalizeDate(input.startsAt),
      endsAt: normalizeDate(input.endsAt),
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.platformFeatureFlag.update({ where: { id: existing.id }, data });
    }

    return db.platformFeatureFlag.create({ data });
  }

  static async searchFlags(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.key ? { key: params.key } : {}),
      ...(params.scope ? { scope: params.scope } : {}),
      ...(params.tenantId ? { targetTenantId: params.tenantId } : {}),
      ...(params.moduleKey ? { targetModuleKey: params.moduleKey } : {}),
      ...(typeof params.isEnabled === 'boolean' ? { isEnabled: params.isEnabled } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformFeatureFlag.findMany({ where, orderBy: [{ updatedAt: 'desc' }], skip, take: limit }),
      db.platformFeatureFlag.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}