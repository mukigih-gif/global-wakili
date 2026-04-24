// apps/api/src/middleware/platform-feature-flag.middleware.ts

import type { NextFunction, Request, Response } from 'express';
import { PlatformAccessAuditService } from '../modules/platform/PlatformAccessAuditService';
import { PlatformFeatureEvaluationService } from '../modules/platform/PlatformFeatureEvaluationService';
import { PlatformModuleRegistry } from '../services/platform/PlatformModuleRegistry';

function respond(res: Response, statusCode: number, code: string, message: string, details?: unknown) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    details: details ?? null,
  });
}

export function platformFeatureFlag(featureKey: string, moduleKey?: string) {
  return async function platformFeatureFlagMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const resolvedModuleKey =
        PlatformModuleRegistry.resolveModuleKey(moduleKey ?? req) ?? null;

      if (!resolvedModuleKey) {
        return respond(res, 500, 'MODULE_UNKNOWN', 'Unable to resolve module key for feature enforcement.');
      }

      if (!req.tenantId?.trim()) {
        return respond(res, 400, 'TENANT_CONTEXT_REQUIRED', 'Tenant context is required.');
      }

      const plan = req.platformAccessPolicy?.plan ?? null;

      const featureContext = await PlatformFeatureEvaluationService.evaluate(req.db, {
        moduleKey: resolvedModuleKey,
        featureKey,
        tenantId: req.tenantId,
        plan,
      });

      req.platformFeatureContext = featureContext;

      if (!featureContext.allowed) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_FEATURE_DENIED',
          moduleKey: resolvedModuleKey,
          metadata: {
            featureKey,
            reasons: featureContext.reasons,
            matchedFlags: featureContext.matchedFlags,
          },
        });

        return respond(
          res,
          403,
          'FEATURE_FLAG_DISABLED',
          'This feature is currently disabled for the tenant.',
          featureContext,
        );
      }

      return next();
    } catch (error: any) {
      return respond(
        res,
        Number(error?.statusCode ?? 500),
        String(error?.code ?? 'PLATFORM_FEATURE_ERROR'),
        String(error?.message ?? 'Platform feature flag middleware failed.'),
        error?.details ?? null,
      );
    }
  };
}

export default platformFeatureFlag;