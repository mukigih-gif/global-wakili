// apps/api/src/modules/platform/PlatformGlobalSettingsService.ts

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

export class PlatformGlobalSettingsService {
  static async upsertSetting(db: PlatformDbClient, input: any) {
    const existing = await db.platformGlobalSetting.findFirst({
      where: {
        key: input.key.trim(),
        scope: input.scope,
        targetTenantId: input.targetTenantId ?? null,
        targetModuleKey: input.targetModuleKey ?? null,
      },
    });

    const data = {
      key: input.key.trim(),
      name: input.name.trim(),
      description: input.description ?? null,
      scope: input.scope,
      targetPlan: input.targetPlan ?? null,
      targetTenantId: input.targetTenantId ?? null,
      targetModuleKey: input.targetModuleKey ?? null,
      dataType: input.dataType ?? null,
      isEncrypted: input.isEncrypted ?? false,
      currentValue: input.currentValue ?? {},
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.platformGlobalSetting.update({ where: { id: existing.id }, data });
    }

    return db.platformGlobalSetting.create({ data });
  }

  static async searchSettings(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.key ? { key: params.key } : {}),
      ...(params.scope ? { scope: params.scope } : {}),
      ...(params.tenantId ? { targetTenantId: params.tenantId } : {}),
      ...(params.moduleKey ? { targetModuleKey: params.moduleKey } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformGlobalSetting.findMany({ where, orderBy: [{ updatedAt: 'desc' }], skip, take: limit }),
      db.platformGlobalSetting.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async publishConfigVersion(db: PlatformDbClient, input: any) {
    const existing = await db.platformConfigVersion.findFirst({
      where: {
        subjectKey: input.subjectKey.trim(),
        scope: input.scope,
        version: input.version,
        targetTenantId: input.targetTenantId ?? null,
        targetModuleKey: input.targetModuleKey ?? null,
      },
    });

    const data = {
      platformGlobalSettingId: input.platformGlobalSettingId ?? null,
      subjectKey: input.subjectKey.trim(),
      scope: input.scope,
      targetPlan: input.targetPlan ?? null,
      targetTenantId: input.targetTenantId ?? null,
      targetModuleKey: input.targetModuleKey ?? null,
      version: input.version,
      status: input.status,
      payload: input.payload,
      changeSummary: input.changeSummary ?? null,
      reviewRequired: input.reviewRequired ?? true,
      effectiveFrom: normalizeDate(input.effectiveFrom),
      publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.platformConfigVersion.update({ where: { id: existing.id }, data });
    }

    return db.platformConfigVersion.create({ data });
  }

  static async searchConfigVersions(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.subjectKey ? { subjectKey: params.subjectKey } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.tenantId ? { targetTenantId: params.tenantId } : {}),
      ...(params.moduleKey ? { targetModuleKey: params.moduleKey } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformConfigVersion.findMany({ where, orderBy: [{ updatedAt: 'desc' }], skip, take: limit }),
      db.platformConfigVersion.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}