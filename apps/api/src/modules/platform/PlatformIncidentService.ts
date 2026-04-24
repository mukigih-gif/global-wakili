// apps/api/src/modules/platform/PlatformIncidentService.ts

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

export class PlatformIncidentService {
  static async upsertIncident(db: PlatformDbClient, input: any) {
    const existing = input.id
      ? await db.platformIncident.findFirst({ where: { id: input.id } })
      : null;

    const data = {
      title: input.title,
      description: input.description ?? null,
      severity: input.severity,
      status: input.status,
      scope: input.scope,
      targetTenantId: input.targetTenantId ?? null,
      targetModuleKey: input.targetModuleKey ?? null,
      ownerPlatformUserId: input.ownerPlatformUserId ?? null,
      detectedAt: normalizeDate(input.detectedAt),
      acknowledgedAt: normalizeDate(input.acknowledgedAt),
      resolvedAt: normalizeDate(input.resolvedAt),
      closedAt: normalizeDate(input.closedAt),
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.platformIncident.update({ where: { id: existing.id }, data });
    }

    return db.platformIncident.create({ data });
  }

  static async searchIncidents(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.severity ? { severity: params.severity } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.tenantId ? { targetTenantId: params.tenantId } : {}),
      ...(params.moduleKey ? { targetModuleKey: params.moduleKey } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformIncident.findMany({ where, orderBy: [{ updatedAt: 'desc' }], skip, take: limit }),
      db.platformIncident.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async upsertMaintenanceWindow(db: PlatformDbClient, input: any) {
    const existing = input.id
      ? await db.platformMaintenanceWindow.findFirst({ where: { id: input.id } })
      : null;

    const data = {
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      scope: input.scope,
      targetTenantId: input.targetTenantId ?? null,
      targetModuleKey: input.targetModuleKey ?? null,
      startsAt: normalizeDate(input.startsAt),
      endsAt: normalizeDate(input.endsAt),
      isReadOnly: input.isReadOnly ?? true,
      bannerMessage: input.bannerMessage ?? null,
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.platformMaintenanceWindow.update({ where: { id: existing.id }, data });
    }

    return db.platformMaintenanceWindow.create({ data });
  }

  static async searchMaintenanceWindows(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.tenantId ? { targetTenantId: params.tenantId } : {}),
      ...(params.moduleKey ? { targetModuleKey: params.moduleKey } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformMaintenanceWindow.findMany({ where, orderBy: [{ startsAt: 'desc' }], skip, take: limit }),
      db.platformMaintenanceWindow.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}