// apps/api/src/modules/platform/PlatformImpersonationGuardService.ts

import type { PlatformDbClient } from './platform.types';

export class PlatformImpersonationGuardService {
  static async activateApprovedSession(
    db: PlatformDbClient,
    params: {
      id: string;
      actorUserId: string;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    const session = await db.platformImpersonationSession.findFirst({
      where: { id: params.id },
    });

    if (!session) {
      throw Object.assign(new Error('Impersonation session not found'), {
        statusCode: 404,
        code: 'IMPERSONATION_SESSION_NOT_FOUND',
      });
    }

    if (session.status !== 'APPROVED') {
      throw Object.assign(new Error('Only approved impersonation sessions can be activated'), {
        statusCode: 409,
        code: 'IMPERSONATION_NOT_APPROVED',
      });
    }

    if (session.consentRequired && !session.consentGrantedAt) {
      throw Object.assign(new Error('Consent is required before impersonation can be activated'), {
        statusCode: 409,
        code: 'IMPERSONATION_CONSENT_REQUIRED',
      });
    }

    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      throw Object.assign(new Error('Impersonation session has expired'), {
        statusCode: 410,
        code: 'IMPERSONATION_EXPIRED',
      });
    }

    return db.platformImpersonationSession.update({
      where: { id: params.id },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
        metadata: {
          activatedByPlatformUserId: params.actorUserId,
          ...(params.metadata ?? {}),
        },
      },
    });
  }

  static async expireStaleSessions(db: PlatformDbClient) {
    const sessions = await db.platformImpersonationSession.findMany({
      where: {
        status: { in: ['APPROVED', 'ACTIVE'] },
      },
      orderBy: [{ createdAt: 'asc' }],
      take: 500,
    });

    let expiredCount = 0;

    for (const session of sessions) {
      if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
        await db.platformImpersonationSession.update({
          where: { id: session.id },
          data: {
            status: 'EXPIRED',
            endedAt: new Date(),
          },
        });
        expiredCount += 1;
      }
    }

    return {
      scanned: sessions.length,
      expiredCount,
    };
  }
}

export default PlatformImpersonationGuardService;