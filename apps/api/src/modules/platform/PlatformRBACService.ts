// apps/api/src/modules/platform/PlatformRBACService.ts

import type { PlatformDbClient } from './platform.types';

function pageParams(page?: number, limit?: number) {
  const safePage = page && page > 0 ? page : 1;
  const safeLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export class PlatformRBACService {
  static async upsertPlatformUser(
    db: PlatformDbClient,
    input: {
      email: string;
      fullName: string;
      status?: string;
      mfaEnforced?: boolean;
      isReadOnlySupportOnly?: boolean;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    const existing = await db.platformUser.findFirst({
      where: { email: input.email.trim().toLowerCase() },
    });

    const data = {
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      status: input.status ?? 'INVITED',
      mfaEnforced: input.mfaEnforced ?? true,
      isReadOnlySupportOnly: input.isReadOnlySupportOnly ?? false,
      metadata: input.metadata ?? {},
    };

    if (existing) {
      return db.platformUser.update({
        where: { id: existing.id },
        data,
      });
    }

    return db.platformUser.create({ data });
  }

  static async searchPlatformUsers(
    db: PlatformDbClient,
    params: { email?: string | null; name?: string | null; status?: string | null; page?: number; limit?: number },
  ) {
    const { page, limit, skip } = pageParams(params.page, params.limit);

    const where = {
      ...(params.email ? { email: { contains: params.email, mode: 'insensitive' } } : {}),
      ...(params.name ? { fullName: { contains: params.name, mode: 'insensitive' } } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformUser.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      db.platformUser.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async assignRole(
    db: PlatformDbClient,
    input: { platformUserId: string; roleKey: string },
  ) {
    const [user, role] = await Promise.all([
      db.platformUser.findFirst({ where: { id: input.platformUserId } }),
      db.platformRole.findFirst({ where: { key: input.roleKey } }),
    ]);

    if (!user) {
      throw Object.assign(new Error('Platform user not found'), { statusCode: 404, code: 'PLATFORM_USER_NOT_FOUND' });
    }

    if (!role) {
      throw Object.assign(new Error('Platform role not found'), { statusCode: 404, code: 'PLATFORM_ROLE_NOT_FOUND' });
    }

    const existing = await db.platformUserRole.findFirst({
      where: { platformUserId: input.platformUserId, roleId: role.id },
    });

    if (existing) return existing;

    return db.platformUserRole.create({
      data: {
        platformUserId: input.platformUserId,
        roleId: role.id,
      },
    });
  }

  static async listRoles(db: PlatformDbClient) {
    return db.platformRole.findMany({ orderBy: [{ key: 'asc' }] });
  }

  static async listPermissions(db: PlatformDbClient) {
    return db.platformPermission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
  }
}