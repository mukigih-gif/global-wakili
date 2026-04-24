// apps/api/src/modules/platform/PlatformImpersonationService.ts

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

export class PlatformImpersonationService {
  static async requestSession(db: PlatformDbClient, input: any, actorUserId: string) {
    return db.platformImpersonationSession.create({
      data: {
        tenantId: input.tenantId,
        requestedByPlatformUserId: actorUserId,
        targetUserId: input.targetUserId,
        reason: input.reason,
        status: 'REQUESTED',
        accessMode: input.accessMode ?? 'READ_ONLY',
        consentRequired: input.consentRequired ?? true,
        expiresAt: normalizeDate(input.expiresAt),
        metadata: input.metadata ?? {},
      },
    });
  }

  static async approveOrRevoke(db: PlatformDbClient, id: string, input: any, actorUserId: string) {
    const existing = await db.platformImpersonationSession.findFirst({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error('Impersonation session not found'), { statusCode: 404, code: 'IMPERSONATION_NOT_FOUND' });
    }

    return db.platformImpersonationSession.update({
      where: { id },
      data: {
        approvedByPlatformUserId: actorUserId,
        status: input.status,
        consentGrantedAt: normalizeDate(input.consentGrantedAt),
        startedAt: input.status === 'APPROVED' ? new Date() : existing.startedAt,
        endedAt: input.status === 'REVOKED' || input.status === 'DENIED' ? new Date() : existing.endedAt,
        metadata: input.metadata ?? {},
      },
    });
  }

  static async searchSessions(db: PlatformDbClient, params: any) {
    const { page, limit, skip } = pageParams(params.page, params.limit);
    const where = {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.targetUserId ? { targetUserId: params.targetUserId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [data, total] = await Promise.all([
      db.platformImpersonationSession.findMany({ where, orderBy: [{ createdAt: 'desc' }], skip, take: limit }),
      db.platformImpersonationSession.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}