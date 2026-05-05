// apps/api/src/middleware/platform-feature-flag.middleware.ts

import type { NextFunction, Request, Response } from 'express';
import { PlatformFeatureEvaluationService } from '../modules/platform/PlatformFeatureEvaluationService';
import { PlatformModuleRegistry } from '../services/platform/PlatformModuleRegistry';

type PlatformFeatureFlagOptions = {
  moduleKey?: string | null;
  featureKey?: string | null;
  required?: boolean;
  failClosed?: boolean;
};

type PlatformFeatureFlagInput = string | PlatformFeatureFlagOptions | null | undefined;

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

function normalizeOptions(
  first?: PlatformFeatureFlagInput,
  second?: PlatformFeatureFlagInput,
): PlatformFeatureFlagOptions {
  if (typeof first === 'string' && typeof second === 'string') {
    return {
      moduleKey: first,
      featureKey: second,
      required: true,
      failClosed: true,
    };
  }

  if (typeof first === 'string' && second && typeof second === 'object') {
    return {
      ...second,
      moduleKey: second.moduleKey ?? first,
      featureKey: second.featureKey ?? null,
    };
  }

  if (typeof first === 'string') {
    return {
      featureKey: first,
      required: true,
      failClosed: true,
    };
  }

  if (first && typeof first === 'object') {
    return first;
  }

  return {};
}

function resolveModuleKey(req: Request, configuredModuleKey?: string | null): string | null {
  const configured = toNullableString(configuredModuleKey);

  if (configured) {
    return configured;
  }

  return toNullableString(PlatformModuleRegistry.resolveModuleKey(req));
}

function isFeatureAllowed(result: unknown, failClosed: boolean): boolean {
  if (!result || typeof result !== 'object') {
    return !failClosed;
  }

  const value = result as Record<string, unknown>;

  if (typeof value.allowed === 'boolean') return value.allowed;
  if (typeof value.enabled === 'boolean') return value.enabled;
  if (typeof value.isEnabled === 'boolean') return value.isEnabled;
  if (typeof value.featureEnabled === 'boolean') return value.featureEnabled;

  return !failClosed;
}

function errorStatusCode(error: unknown): number {
  const value = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof value === 'number' ? value : 500;
}

function errorCode(error: unknown): string {
  const value = (error as { code?: unknown } | null)?.code;
  return typeof value === 'string' ? value : 'PLATFORM_FEATURE_FLAG_ERROR';
}

function errorMessage(error: unknown): string {
  const value = (error as { message?: unknown } | null)?.message;
  return typeof value === 'string'
    ? value
    : 'Platform feature-flag middleware failed.';
}

function errorDetails(error: unknown): unknown {
  return (error as { details?: unknown } | null)?.details ?? null;
}

export function platformFeatureFlag(
  input?: PlatformFeatureFlagInput,
  second?: PlatformFeatureFlagInput,
) {
  const options = normalizeOptions(input, second);

  return async function platformFeatureFlagMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const tenantId = toNullableString(req.tenantId);
      const moduleKey = resolveModuleKey(req, options.moduleKey);
      const featureKey = toNullableString(options.featureKey ?? req.query.featureKey);
      const required = options.required ?? Boolean(featureKey);
      const failClosed = options.failClosed ?? true;

      if (!tenantId) {
        return respond(
          res,
          400,
          'TENANT_CONTEXT_REQUIRED',
          'Tenant context is required before evaluating platform feature flags.',
        );
      }

      if (!moduleKey) {
        return respond(
          res,
          500,
          'MODULE_KEY_REQUIRED',
          'Module key is required for platform feature-flag enforcement.',
        );
      }

      if (!featureKey) {
        if (required || failClosed) {
          return respond(
            res,
            500,
            'FEATURE_KEY_REQUIRED',
            'Feature key is required for platform feature-flag enforcement.',
          );
        }

        return next();
      }

      const featureContext = await PlatformFeatureEvaluationService.evaluate(req.db, {
        tenantId,
        moduleKey,
        featureKey,
      });

      req.platformFeatureContext = featureContext;

      if (!isFeatureAllowed(featureContext, failClosed)) {
        return respond(
          res,
          403,
          'FEATURE_DISABLED',
          'This feature is not enabled for the current tenant or module.',
          featureContext,
        );
      }

      return next();
    } catch (error: unknown) {
      return respond(
        res,
        errorStatusCode(error),
        errorCode(error),
        errorMessage(error),
        errorDetails(error),
      );
    }
  };
}

export default platformFeatureFlag;