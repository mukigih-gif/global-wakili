// apps/api/src/middleware/platform-access.middleware.ts

import type { NextFunction, Request, Response } from 'express';
import { PlatformAccessAuditService } from '../modules/platform/PlatformAccessAuditService';
import { PlatformAccessPolicyService } from '../modules/platform/PlatformAccessPolicyService';
import { PlatformModuleRegistry } from '../services/platform/PlatformModuleRegistry';

type PlatformAccessOptions = {
  moduleKey?: string;
  featureKey?: string;
};

function respond(res: Response, statusCode: number, code: string, message: string, details?: unknown) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    details: details ?? null,
  });
}

export function platformAccess(options: PlatformAccessOptions = {}) {
  return async function platformAccessMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const moduleKey =
        PlatformModuleRegistry.resolveModuleKey(options.moduleKey ?? req) ?? null;

      if (!moduleKey) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_ACCESS_DENIED',
          moduleKey: null,
          metadata: {
            reason: 'Unknown module key.',
          },
        });

        return respond(res, 500, 'MODULE_UNKNOWN', 'Unable to resolve module key for platform enforcement.');
      }

      if (!req.tenantId?.trim()) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_ACCESS_DENIED',
          moduleKey,
          metadata: {
            reason: 'Tenant context missing.',
          },
        });

        return respond(res, 400, 'TENANT_CONTEXT_REQUIRED', 'Tenant context is required.');
      }

      const evaluation = await PlatformAccessPolicyService.evaluate(req.db, {
        tenantId: req.tenantId,
        moduleKey,
        featureKey: options.featureKey ?? null,
      });

      req.platformAccessPolicy = evaluation.accessPolicy;
      req.platformMaintenancePolicy = evaluation.maintenancePolicy;
      req.platformBroadcasts = evaluation.broadcasts;
      req.platformFeatureContext = evaluation.featureContext;

      if (!evaluation.accessPolicy.allowed) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_ACCESS_DENIED',
          moduleKey,
          metadata: {
            reasons: evaluation.accessPolicy.reasons,
            decisionCode: evaluation.accessPolicy.decisionCode,
          },
        });

        return respond(
          res,
          evaluation.maintenancePolicy.denyRequired ? 503 : 403,
          evaluation.accessPolicy.decisionCode,
          'This tenant is not allowed to access the requested module.',
          evaluation.accessPolicy,
        );
      }

      return next();
    } catch (error: any) {
      return respond(
        res,
        Number(error?.statusCode ?? 500),
        String(error?.code ?? 'PLATFORM_ACCESS_ERROR'),
        String(error?.message ?? 'Platform access middleware failed.'),
        error?.details ?? null,
      );
    }
  };
}

export default platformAccess;