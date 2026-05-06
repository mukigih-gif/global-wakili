// apps/api/src/middleware/platform-access.middleware.ts

import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express';

import { PlatformAccessAuditService } from '../modules/platform/PlatformAccessAuditService';
import { PlatformAccessPolicyService } from '../modules/platform/PlatformAccessPolicyService';
import { PlatformModuleRegistry } from '../services/platform/PlatformModuleRegistry';

type PlatformAccessOptions = {
  moduleKey?: string | null;
  featureKey?: string | null;

  /**
   * Legacy/current module route metadata.
   * Some routes already pass metricType to track SaaS usage/entitlement
   * events. It must be preserved, not rejected by the bridge.
   */
  metricType?: string | null;
  metricKey?: string | null;
  usageMetricKey?: string | null;
  usageMetricType?: string | null;

  /**
   * Write/access modifiers used by module-level guards.
   */
  requireWriteAccess?: boolean;
  requireWrite?: boolean;
  write?: boolean;
  allowReadOnly?: boolean;

  /**
   * Extra route metadata that should travel through audit/context without
   * weakening the access decision.
   */
  [key: string]: unknown;
};

type PlatformAccessInput = string | PlatformAccessOptions | null | undefined;

type RequestPlatformAccessPolicy = NonNullable<Request['platformAccessPolicy']>;
type RequestPlatformMaintenancePolicy = NonNullable<Request['platformMaintenancePolicy']>;
type RequestPlatformFeatureContext = NonNullable<Request['platformFeatureContext']>;
type RequestPlatformBroadcasts = NonNullable<Request['platformBroadcasts']>;

type RouterLike = Router & {
  use: (...handlers: RequestHandler[]) => Router;
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

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function isRouterLike(value: unknown): value is RouterLike {
  return Boolean(
    value &&
      typeof value === 'function' &&
      typeof (value as { use?: unknown }).use === 'function',
  );
}

function applyAccessInput(
  current: PlatformAccessOptions,
  input: PlatformAccessInput,
): PlatformAccessOptions {
  if (!input) {
    return current;
  }

  if (typeof input === 'string') {
    const value = normalizeString(input);

    if (!value) {
      return current;
    }

    if (!current.moduleKey) {
      return {
        ...current,
        moduleKey: value,
      };
    }

    return {
      ...current,
      featureKey: current.featureKey ?? value,
    };
  }

  const merged: PlatformAccessOptions = {
    ...current,
    ...input,
  };

  return {
    ...merged,
    moduleKey: normalizeString(input.moduleKey) ?? current.moduleKey ?? null,
    featureKey: normalizeString(input.featureKey) ?? current.featureKey ?? null,
    metricType: normalizeString(input.metricType) ?? current.metricType ?? null,
    metricKey: normalizeString(input.metricKey) ?? current.metricKey ?? null,
    usageMetricKey:
      normalizeString(input.usageMetricKey) ?? current.usageMetricKey ?? null,
    usageMetricType:
      normalizeString(input.usageMetricType) ?? current.usageMetricType ?? null,
    requireWriteAccess:
      normalizeBoolean(input.requireWriteAccess) ??
      normalizeBoolean(input.requireWrite) ??
      normalizeBoolean(input.write) ??
      current.requireWriteAccess ??
      false,
    requireWrite:
      normalizeBoolean(input.requireWrite) ?? current.requireWrite ?? false,
    write: normalizeBoolean(input.write) ?? current.write ?? false,
    allowReadOnly:
      normalizeBoolean(input.allowReadOnly) ?? current.allowReadOnly ?? true,
  };
}

function normalizeOptions(
  first?: PlatformAccessInput,
  second?: PlatformAccessInput,
): PlatformAccessOptions {
  return applyAccessInput(applyAccessInput({}, first), second);
}

function resolveModuleKey(req: Request, options: PlatformAccessOptions): string | null {
  const explicitModuleKey = normalizeString(options.moduleKey);

  if (explicitModuleKey) {
    return explicitModuleKey;
  }

  return PlatformModuleRegistry.resolveModuleKey(req) ?? null;
}

function getDecisionCode(policy: unknown): string {
  const decisionCode = (policy as { decisionCode?: unknown } | null)?.decisionCode;

  return typeof decisionCode === 'string' && decisionCode.trim().length > 0
    ? decisionCode
    : 'PLATFORM_ACCESS_DENIED';
}

function getPolicyReasons(policy: unknown): unknown[] {
  const reasons = (policy as { reasons?: unknown } | null)?.reasons;

  return Array.isArray(reasons) ? reasons : [];
}

function shouldRequireWriteAccess(options: PlatformAccessOptions): boolean {
  return (
    options.requireWriteAccess === true ||
    options.requireWrite === true ||
    options.write === true
  );
}

function buildRouteMetadata(options: PlatformAccessOptions): Record<string, unknown> {
  return {
    moduleKey: options.moduleKey ?? null,
    featureKey: options.featureKey ?? null,
    metricType: options.metricType ?? null,
    metricKey: options.metricKey ?? null,
    usageMetricKey: options.usageMetricKey ?? null,
    usageMetricType: options.usageMetricType ?? null,
    requireWriteAccess: shouldRequireWriteAccess(options),
  };
}

/**
 * Enforces tenant subscription/module entitlement access.
 *
 * This file is the canonical platform module-access middleware location.
 * Do not recreate the deleted nested platform middleware folder.
 */
export function platformAccess(
  first?: PlatformAccessInput,
  second?: PlatformAccessInput,
): RequestHandler {
  const options = normalizeOptions(first, second);

  return async function platformAccessMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const moduleKey = resolveModuleKey(req, options);
      const routeMetadata = buildRouteMetadata({
        ...options,
        moduleKey,
      });

      if (!moduleKey) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_ACCESS_DENIED',
          moduleKey: null,
          metadata: {
            reason: 'Unknown module key.',
            ...routeMetadata,
          },
        });

        return respond(
          res,
          500,
          'MODULE_UNKNOWN',
          'Unable to resolve module key for platform enforcement.',
        );
      }

      if (!req.tenantId?.trim()) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_ACCESS_DENIED',
          moduleKey,
          metadata: {
            reason: 'Tenant context missing.',
            ...routeMetadata,
          },
        });

        return respond(
          res,
          400,
          'TENANT_CONTEXT_REQUIRED',
          'Tenant context is required.',
        );
      }

      const evaluation = await PlatformAccessPolicyService.evaluate(req.db, {
        tenantId: req.tenantId,
        moduleKey,
        featureKey: options.featureKey ?? null,
      });

      req.platformAccessPolicy =
        evaluation.accessPolicy as RequestPlatformAccessPolicy;
      req.platformMaintenancePolicy =
        evaluation.maintenancePolicy as RequestPlatformMaintenancePolicy;
      req.platformBroadcasts =
        evaluation.broadcasts as RequestPlatformBroadcasts;
      req.platformFeatureContext =
        evaluation.featureContext as RequestPlatformFeatureContext;

      if (!evaluation.accessPolicy.allowed) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_ACCESS_DENIED',
          moduleKey,
          metadata: {
            reasons: getPolicyReasons(evaluation.accessPolicy),
            decisionCode: getDecisionCode(evaluation.accessPolicy),
            ...routeMetadata,
          },
        });

        return respond(
          res,
          evaluation.maintenancePolicy.denyRequired ? 503 : 403,
          getDecisionCode(evaluation.accessPolicy),
          'This tenant is not allowed to access the requested module.',
          evaluation.accessPolicy,
        );
      }

      if (shouldRequireWriteAccess(options) && evaluation.accessPolicy.readOnly) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_ACCESS_DENIED',
          moduleKey,
          metadata: {
            reason: 'Module is currently read-only.',
            decisionCode: 'MODULE_READ_ONLY',
            ...routeMetadata,
          },
        });

        return respond(
          res,
          403,
          'MODULE_READ_ONLY',
          'This module is currently read-only for the tenant.',
          evaluation.accessPolicy,
        );
      }

      return next();
    } catch (error: unknown) {
      const maybeError = error as {
        statusCode?: unknown;
        code?: unknown;
        message?: unknown;
        details?: unknown;
      };

      return respond(
        res,
        typeof maybeError.statusCode === 'number' ? maybeError.statusCode : 500,
        typeof maybeError.code === 'string'
          ? maybeError.code
          : 'PLATFORM_ACCESS_ERROR',
        typeof maybeError.message === 'string'
          ? maybeError.message
          : 'Platform access middleware failed.',
        maybeError.details ?? null,
      );
    }
  };
}

/**
 * Route-level binder used by module routes.
 *
 * Supported modern style:
 *   router.use(bindPlatformModuleEnforcement('finance'))
 *   router.use(bindPlatformModuleEnforcement({ moduleKey: 'finance' }))
 *
 * Supported existing route style:
 *   bindPlatformModuleEnforcement(router, 'finance')
 *   bindPlatformModuleEnforcement(router, { moduleKey: 'finance', metricType: '...' })
 *   bindPlatformModuleEnforcement(router, 'finance', { metricType: '...' })
 *
 * This keeps platform enforcement in the real middleware file while avoiding
 * recreation of the deleted middleware/platform/module-enforcement path.
 */
export function bindPlatformModuleEnforcement(
  router: Router,
  first?: PlatformAccessInput,
  second?: PlatformAccessInput,
): Router;

export function bindPlatformModuleEnforcement(
  first?: PlatformAccessInput,
  second?: PlatformAccessInput,
): RequestHandler;

export function bindPlatformModuleEnforcement(
  first?: Router | PlatformAccessInput,
  second?: PlatformAccessInput,
  third?: PlatformAccessInput,
): Router | RequestHandler {
  if (isRouterLike(first)) {
    first.use(platformAccess(second, third));
    return first;
  }

  return platformAccess(first, second);
}

export default platformAccess;