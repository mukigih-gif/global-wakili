// apps/api/src/modules/platform/PlatformTenantLifecycleService.ts

import type { PlatformDbClient } from './platform.types';

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

async function assertTenant(db: PlatformDbClient, tenantId: string) {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { statusCode: 404, code: 'TENANT_NOT_FOUND' });
  }
  return tenant;
}

export class PlatformTenantLifecycleService {
  static async upsertTenantProfile(
    db: PlatformDbClient,
    input: {
      tenantId: string;
      lifecycleStatus: string;
      environmentKey?: string | null;
      initialAdminEmail?: string | null;
      readOnlyMode?: boolean;
      suspensionReason?: string | null;
      provisionedAt?: Date | null;
      activatedAt?: Date | null;
      suspendedAt?: Date | null;
      terminatedAt?: Date | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    await assertTenant(db, input.tenantId);

    const existing = await db.platformTenantProfile.findFirst({
      where: { tenantId: input.tenantId },
    });

    const data = {
      tenantId: input.tenantId,
      lifecycleStatus: input.lifecycleStatus,
      environmentKey: input.environmentKey ?? null,
      initialAdminEmail: input.initialAdminEmail ?? null,
      readOnlyMode: input.readOnlyMode ?? false,
      suspensionReason: input.suspensionReason ?? null,
      provisionedAt: input.provisionedAt ?? null,
      activatedAt: input.activatedAt ?? null,
      suspendedAt: input.suspendedAt ?? null,
      terminatedAt: input.terminatedAt ?? null,
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.platformTenantProfile.update({ where: { id: existing.id }, data });
    }

    return db.platformTenantProfile.create({ data });
  }

  static async searchTenantProfiles(
    db: PlatformDbClient,
    params: { tenantId?: string | null; status?: string | null; page?: number; limit?: number },
  ) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.status ? { lifecycleStatus: params.status } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformTenantProfile.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.platformTenantProfile.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}