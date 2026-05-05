// apps/api/src/middleware/platform-write-guard.middleware.ts

import type { NextFunction, Request, Response } from 'express';
import { PlatformAccessAuditService } from '../modules/platform/PlatformAccessAuditService';
import { PlatformAccessPolicyService } from '../modules/platform/PlatformAccessPolicyService';
import { PlatformQuotaEnforcementService } from '../modules/platform/PlatformQuotaEnforcementService';
import { PlatformModuleRegistry } from '../services/platform/PlatformModuleRegistry';
import type { PlatformAccessPolicy } from '../types/platform-enforcement';

type PlatformWriteGuardOptions = {
  moduleKey?: string | null;
  featureKey?: string | null;
  metricType?: string | null;
  projectedValue?: number | ((req: Request) => number | null | undefined);
};

type PlatformWriteEvaluation = {
  accessPolicy: NonNullable<Request['platformAccessPolicy']>;
  maintenancePolicy: Request['platformMaintenancePolicy'] | null;
  broadcasts: Request['platformBroadcasts'] | null;
  featureContext: Request['platformFeatureContext'] | null;
};

function respond(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    details: details ?? null,
  });
}

function toNullableString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    return toNullableString(value[0]);
  }

  return null;
}

function resolveModuleKey(req: Request, configuredModuleKey?: string | null): string | null {
  const configured = toNullableString(configuredModuleKey);

  if (configured) {
    return configured;
  }

  return toNullableString(PlatformModuleRegistry.resolveModuleKey(req));
}

function resolveProjectedValue(
  req: Request,
  projectedValue?: number | ((req: Request) => number | null | undefined),
): number | null {
  if (typeof projectedValue === 'function') {
    const value = projectedValue(req);
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  return typeof projectedValue === 'number' && Number.isFinite(projectedValue)
    ? projectedValue
    : null;
}

function isAccessBlocked(accessPolicy: PlatformAccessPolicy): boolean {
  return accessPolicy.allowed !== true || accessPolicy.readOnly === true;
}

function accessDecisionCode(accessPolicy: PlatformAccessPolicy): string {
  const code = accessPolicy.decisionCode;

  return typeof code === 'string' && code.trim()
    ? code.trim()
    : 'PLATFORM_WRITE_BLOCKED';
}

function accessReasons(accessPolicy: PlatformAccessPolicy): unknown[] {
  return Array.isArray(accessPolicy.reasons) ? accessPolicy.reasons : [];
}

function normalizeEvaluation(evaluation: {
  accessPolicy: Request['platformAccessPolicy'];
  maintenancePolicy?: Request['platformMaintenancePolicy'] | null;
  broadcasts?: Request['platformBroadcasts'] | null;
  featureContext?: Request['platformFeatureContext'] | null;
}): PlatformWriteEvaluation {
  if (!evaluation.accessPolicy) {
    throw Object.assign(new Error('Platform access policy evaluation failed.'), {
      statusCode: 500,
      code: 'PLATFORM_POLICY_EVALUATION_MISSING',
    });
  }

  return {
    accessPolicy: evaluation.accessPolicy,
    maintenancePolicy: evaluation.maintenancePolicy ?? null,
    broadcasts: evaluation.broadcasts ?? null,
    featureContext: evaluation.featureContext ?? null,
  };
}

function getErrorStatusCode(error: unknown): number {
  const value = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof value === 'number' ? value : 500;
}

function getErrorCode(error: unknown): string {
  const value = (error as { code?: unknown } | null)?.code;
  return typeof value === 'string' ? value : 'PLATFORM_WRITE_GUARD_ERROR';
}

function getErrorMessage(error: unknown): string {
  const value = (error as { message?: unknown } | null)?.message;
  return typeof value === 'string' ? value : 'Platform write guard failed.';
}

function getErrorDetails(error: unknown): unknown {
  return (error as { details?: unknown } | null)?.details ?? null;
}

export function platformWriteGuard(options: PlatformWriteGuardOptions = {}) {
  return async function platformWriteGuardMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const resolvedModuleKey = resolveModuleKey(req, options.moduleKey);
    const auditModuleKey = resolvedModuleKey ?? 'unknown';

    try {
      if (!PlatformModuleRegistry.isWriteMethod(req.method)) {
        return next();
      }

      if (!resolvedModuleKey) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_WRITE_BLOCKED',
          moduleKey: auditModuleKey,
          metadata: {
            reason: 'Unable to resolve module key for write enforcement.',
            method: req.method,
            path: req.originalUrl ?? req.url,
          },
        });

        return respond(
          res,
          500,
          'MODULE_UNKNOWN',
          'Unable to resolve module key for write enforcement.',
        );
      }

      const moduleKey: string = resolvedModuleKey;
      const tenantId = toNullableString(req.tenantId);

      if (!tenantId) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_WRITE_BLOCKED',
          moduleKey,
          metadata: {
            reason: 'Tenant context missing.',
            method: req.method,
            path: req.originalUrl ?? req.url,
          },
        });

        return respond(
          res,
          400,
          'TENANT_CONTEXT_REQUIRED',
          'Tenant context is required.',
        );
      }

      const featureKey = toNullableString(options.featureKey);

      const evaluation = normalizeEvaluation(
        req.platformAccessPolicy
          ? {
              accessPolicy: req.platformAccessPolicy,
              maintenancePolicy: req.platformMaintenancePolicy ?? null,
              broadcasts: req.platformBroadcasts ?? null,
              featureContext: req.platformFeatureContext ?? null,
            }
          : await PlatformAccessPolicyService.assertWritable(req.db, {
              tenantId,
              moduleKey,
              featureKey,
            }),
      );

      req.platformAccessPolicy = evaluation.accessPolicy;
      req.platformMaintenancePolicy = evaluation.maintenancePolicy;
      req.platformBroadcasts = evaluation.broadcasts;
      req.platformFeatureContext = evaluation.featureContext;

      if (isAccessBlocked(evaluation.accessPolicy)) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_WRITE_BLOCKED',
          moduleKey,
          metadata: {
            reasons: accessReasons(evaluation.accessPolicy),
            decisionCode: accessDecisionCode(evaluation.accessPolicy),
          },
        });

        return respond(
          res,
          423,
          accessDecisionCode(evaluation.accessPolicy),
          'This tenant is currently in read-only mode for the requested module.',
          evaluation.accessPolicy,
        );
      }

      const metricType = toNullableString(options.metricType);

      if (metricType) {
        const quota = await PlatformQuotaEnforcementService.evaluate(req.db, {
          tenantId,
          metricType,
          projectedValue: resolveProjectedValue(req, options.projectedValue),
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
    } catch (error: unknown) {
      await PlatformAccessAuditService.logDecision(req.db, req, {
        action: 'PLATFORM_WRITE_BLOCKED',
        moduleKey: auditModuleKey,
        metadata: {
          error: getErrorMessage(error),
          code: getErrorCode(error),
          details: getErrorDetails(error),
        },
      });

      return respond(
        res,
        getErrorStatusCode(error),
        getErrorCode(error),
        getErrorMessage(error),
        getErrorDetails(error),
      );
    }
  };
}

export default platformWriteGuard;