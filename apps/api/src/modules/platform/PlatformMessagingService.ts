// apps/api/src/modules/platform/PlatformMessagingService.ts

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

export class PlatformMessagingService {
  static async upsertMessage(db: PlatformDbClient, input: any) {
    const existing = input.id
      ? await db.platformGlobalMessage.findFirst({ where: { id: input.id } })
      : null;

    const data = {
      title: input.title,
      subject: input.subject ?? null,
      body: input.body,
      status: input.status ?? 'DRAFT',
      audience: input.audience,
      targetPlan: input.targetPlan ?? null,
      targetTenantId: input.targetTenantId ?? null,
      targetRoleKey: input.targetRoleKey ?? null,
      channels: input.channels ?? [],
      startsAt: normalizeDate(input.startsAt),
      endsAt: normalizeDate(input.endsAt),
      sentAt: normalizeDate(input.sentAt),
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.platformGlobalMessage.update({ where: { id: existing.id }, data });
    }

    return db.platformGlobalMessage.create({ data });
  }

  static async searchMessages(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.audience ? { audience: params.audience } : {}),
      ...(params.tenantId ? { targetTenantId: params.tenantId } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformGlobalMessage.findMany({ where, orderBy: [{ updatedAt: 'desc' }], skip, take: limit }),
      db.platformGlobalMessage.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}