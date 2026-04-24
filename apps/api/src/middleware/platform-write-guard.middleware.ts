// apps/api/src/middleware/platform-write-guard.middleware.ts

import type { NextFunction, Request, Response } from 'express';
import { PlatformAccessAuditService } from '../modules/platform/PlatformAccessAuditService';
import { PlatformAccessPolicyService } from '../modules/platform/PlatformAccessPolicyService';
import { PlatformQuotaEnforcementService } from '../modules/platform/PlatformQuotaEnforcementService';
import { PlatformModuleRegistry } from '../services/platform/PlatformModuleRegistry';

type PlatformWriteGuardOptions = {
  moduleKey?: string;
  featureKey?: string;
  metricType?: string;
  projectedValue?: number | ((req: Request) => number | null | undefined);
};

function respond(res: Response, statusCode: number, code: string, message: string, details?: unknown) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    details: details ?? null,
  });
}

export function platformWriteGuard(options: PlatformWriteGuardOptions = {}) {
  return async function platformWriteGuardMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (!PlatformModuleRegistry.isWriteMethod(req.method)) {
        return next();
      }

      const moduleKey =
        PlatformModuleRegistry.resolveModuleKey(options.moduleKey ?? req) ?? null;

      if (!moduleKey) {
        return respond(res, 500, 'MODULE_UNKNOWN', 'Unable to resolve module key for write enforcement.');
      }

      if (!req.tenantId?.trim()) {
        return respond(res, 400, 'TENANT_CONTEXT_REQUIRED', 'Tenant context is required.');
      }

      const evaluation = req.platformAccessPolicy
        ? {
            accessPolicy: req.platformAccessPolicy,
            maintenancePolicy: req.platformMaintenancePolicy,
            broadcasts: req.platformBroadcasts,
            featureContext: req.platformFeatureContext,
          }
        : await PlatformAccessPolicyService.assertWritable(req.db, {
            tenantId: req.tenantId,
            moduleKey,
            featureKey: options.featureKey ?? null,
          });

      req.platformAccessPolicy = evaluation.accessPolicy;
      req.platformMaintenancePolicy = evaluation.maintenancePolicy;
      req.platformBroadcasts = evaluation.broadcasts;
      req.platformFeatureContext = evaluation.featureContext;

      if (!evaluation.accessPolicy.allowed || evaluation.accessPolicy.readOnly) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_WRITE_BLOCKED',
          moduleKey,
          metadata: {
            reasons: evaluation.accessPolicy.reasons,
            decisionCode: evaluation.accessPolicy.decisionCode,
          },
        });

        return respond(
          res,
          423,
          evaluation.accessPolicy.decisionCode,
          'This tenant is currently in read-only mode for the requested module.',
          evaluation.accessPolicy,
        );
      }

      if (options.metricType) {
        const projectedValue =
          typeof options.projectedValue === 'function'
            ? options.projectedValue(req) ?? null
            : options.projectedValue ?? null;

        const quota = await PlatformQuotaEnforcementService.evaluate(req.db, {
          tenantId: req.tenantId,
          metricType: options.metricType,
          projectedValue,
        });

        if (!quota.allowed || quota.readOnly) {
          await PlatformAccessAuditService.logDecision(req.db, req, {
            action: 'PLATFORM_QUOTA_BLOCKED',
            moduleKey,
            metadata: quota,
          });

          return respond(
            res,
            quota.readOnly ? 423 : 403,
            'QUOTA_EXCEEDED',
            'Tenant quota policy blocked this write operation.',
            quota,
          );
        }
      }

      return next();
    } catch (error: any) {
      await PlatformAccessAuditService.logDecision(req.db, req, {
        action: 'PLATFORM_WRITE_BLOCKED',
        moduleKey: PlatformModuleRegistry.resolveModuleKey(options.moduleKey ?? req),
        metadata: {
          error: String(error?.message ?? 'Unknown write guard error'),
          code: error?.code ?? null,
          details: error?.details ?? null,
        },
      });

      return respond(
        res,
        Number(error?.statusCode ?? 500),
        String(error?.code ?? 'PLATFORM_WRITE_GUARD_ERROR'),
        String(error?.message ?? 'Platform write guard failed.'),
        error?.details ?? null,
      );
    }
  };
}

export default platformWriteGuard;