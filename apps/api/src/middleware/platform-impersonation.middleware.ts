// apps/api/src/middleware/platform-impersonation.middleware.ts

import type { NextFunction, Request, Response } from 'express';
import { PlatformAccessAuditService } from '../modules/platform/PlatformAccessAuditService';
import { PlatformModuleRegistry } from '../services/platform/PlatformModuleRegistry';

function respond(res: Response, statusCode: number, code: string, message: string, details?: unknown) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    details: details ?? null,
  });
}

function headerValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function platformImpersonation(moduleKey?: string) {
  return async function platformImpersonationMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const resolvedModuleKey =
        PlatformModuleRegistry.resolveModuleKey(moduleKey ?? req) ?? null;

      req.platformImpersonation = {
        isImpersonated: false,
        sessionId: null,
        accessMode: null,
        targetUserId: null,
        requestedByPlatformUserId: null,
        approvedByPlatformUserId: null,
        status: null,
        expiresAt: null,
        reasons: [],
      };

      if (!resolvedModuleKey) {
        return next();
      }

      const sessionId =
        headerValue(req.headers['x-impersonation-session-id']) ??
        headerValue(req.headers['x-platform-impersonation-id']);

      if (!sessionId) {
        return next();
      }

      const session = await req.db.platformImpersonationSession.findFirst({
        where: { id: sessionId },
      });

      if (!session) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_IMPERSONATION_BLOCKED',
          moduleKey: resolvedModuleKey,
          metadata: {
            reason: 'Impersonation session not found.',
            sessionId,
          },
        });

        return respond(res, 403, 'IMPERSONATION_INVALID', 'Impersonation session not found.');
      }

      const reasons: string[] = [];
      if (!['ACTIVE', 'APPROVED'].includes(session.status)) {
        reasons.push('Impersonation session is not active.');
      }
      if (session.consentRequired && !session.consentGrantedAt) {
        reasons.push('Impersonation consent has not been granted.');
      }
      if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
        reasons.push('Impersonation session has expired.');
      }

      req.platformImpersonation = {
        isImpersonated: reasons.length === 0,
        sessionId: session.id,
        accessMode: session.accessMode,
        targetUserId: session.targetUserId,
        requestedByPlatformUserId: session.requestedByPlatformUserId,
        approvedByPlatformUserId: session.approvedByPlatformUserId ?? null,
        status: session.status,
        expiresAt: session.expiresAt ? new Date(session.expiresAt).toISOString() : null,
        reasons,
      };

      if (reasons.length > 0) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_IMPERSONATION_BLOCKED',
          moduleKey: resolvedModuleKey,
          metadata: {
            sessionId: session.id,
            reasons,
          },
        });

        return respond(
          res,
          403,
          'IMPERSONATION_INVALID',
          'Impersonation session is not valid for this request.',
          req.platformImpersonation,
        );
      }

      if (
        session.accessMode === 'READ_ONLY' &&
        PlatformModuleRegistry.isWriteMethod(req.method)
      ) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_IMPERSONATION_BLOCKED',
          moduleKey: resolvedModuleKey,
          metadata: {
            sessionId: session.id,
            reason: 'Read-only impersonation cannot perform write operations.',
          },
        });

        return respond(
          res,
          423,
          'IMPERSONATION_READ_ONLY',
          'This impersonation session is read-only.',
          req.platformImpersonation,
        );
      }

      return next();
    } catch (error: any) {
      return respond(
        res,
        Number(error?.statusCode ?? 500),
        String(error?.code ?? 'PLATFORM_IMPERSONATION_ERROR'),
        String(error?.message ?? 'Platform impersonation middleware failed.'),
        error?.details ?? null,
      );
    }
  };
}

export default platformImpersonation;