// apps/api/src/modules/platform/PlatformBackupService.ts

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

export class PlatformBackupService {
  static async createBackupJob(db: PlatformDbClient, input: any, actorUserId: string) {
    return db.platformBackupJob.create({
      data: {
        tenantId: input.tenantId ?? null,
        scope: input.scope,
        status: 'PENDING',
        targetModuleKey: input.targetModuleKey ?? null,
        expiresAt: normalizeDate(input.expiresAt),
        requestedByPlatformUserId: actorUserId,
        metadata: input.metadata ?? {},
      },
    });
  }

  static async searchBackupJobs(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.moduleKey ? { targetModuleKey: params.moduleKey } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformBackupJob.findMany({ where, orderBy: [{ createdAt: 'desc' }], skip, take: limit }),
      db.platformBackupJob.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}