// apps/api/src/modules/platform/PlatformPatchService.ts

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

export class PlatformPatchService {
  static async upsertPatch(db: PlatformDbClient, input: any) {
    const existing = input.id
      ? await db.platformPatchDeployment.findFirst({ where: { id: input.id } })
      : await db.platformPatchDeployment.findFirst({
          where: {
            patchKey: input.patchKey.trim(),
            version: input.version.trim(),
            targetTenantId: input.targetTenantId ?? null,
            targetModuleKey: input.targetModuleKey ?? null,
          },
        });

    const data = {
      patchKey: input.patchKey.trim(),
      version: input.version.trim(),
      title: input.title,
      description: input.description ?? null,
      severity: input.severity ?? 'MEDIUM',
      status: input.status ?? 'DRAFT',
      scope: input.scope,
      targetPlan: input.targetPlan ?? null,
      targetTenantId: input.targetTenantId ?? null,
      targetModuleKey: input.targetModuleKey ?? null,
      artifactRef: input.artifactRef ?? null,
      checksum: input.checksum ?? null,
      rollbackRef: input.rollbackRef ?? null,
      scheduledAt: normalizeDate(input.scheduledAt),
      startedAt: normalizeDate(input.startedAt),
      completedAt: normalizeDate(input.completedAt),
      rolledBackAt: normalizeDate(input.rolledBackAt),
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.platformPatchDeployment.update({ where: { id: existing.id }, data });
    }

    return db.platformPatchDeployment.create({ data });
  }

  static async searchPatches(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.patchKey ? { patchKey: params.patchKey } : {}),
      ...(params.version ? { version: params.version } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.severity ? { severity: params.severity } : {}),
      ...(params.tenantId ? { targetTenantId: params.tenantId } : {}),
      ...(params.moduleKey ? { targetModuleKey: params.moduleKey } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformPatchDeployment.findMany({ where, orderBy: [{ updatedAt: 'desc' }], skip, take: limit }),
      db.platformPatchDeployment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}