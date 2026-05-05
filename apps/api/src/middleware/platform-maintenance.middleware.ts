// apps/api/src/middleware/platform-maintenance.middleware.ts

import type { NextFunction, Request, Response } from 'express';
import { PlatformMaintenancePolicyService } from '../modules/platform/PlatformMaintenancePolicyService';
import { PlatformModuleRegistry } from '../services/platform/PlatformModuleRegistry';

type PlatformMaintenanceOptions = {
  moduleKey?: string | null;
  allowReadOnly?: boolean;
};

type PlatformMaintenanceInput = string | PlatformMaintenanceOptions;

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

function normalizeOptions(input: PlatformMaintenanceInput = {}): PlatformMaintenanceOptions {
  if (typeof input === 'string') {
    return {
      moduleKey: input,
    };
  }

  return input;
}

function resolveModuleKey(req: Request, configuredModuleKey?: string | null): string | null {
  const configured = toNullableString(configuredModuleKey);

  if (configured) {
    return configured;
  }

  return toNullableString(PlatformModuleRegistry.resolveModuleKey(req));
}

function getActivePolicies(result: unknown): unknown[] {
  if (!result || typeof result !== 'object') {
    return [];
  }

  const value = result as Record<string, unknown>;

  return Array.isArray(value.active) ? value.active : [];
}

function hasReadOnlyRequired(result: unknown): boolean {
  if (!result || typeof result !== 'object') {
    return false;
  }

  const value = result as Record<string, unknown>;

  return value.readOnlyRequired === true;
}

function hasDenyRequired(result: unknown): boolean {
  const active = getActivePolicies(result);

  return active.some((policy) => {
    if (!policy || typeof policy !== 'object') {
      return false;
    }

    const value = policy as Record<string, unknown>;

    return (
      value.denyRequired === true ||
      value.blocksAccess === true ||
      value.accessBlocked === true
    );
  });
}

function responseCode(result: unknown, allowReadOnly: boolean): string {
  if (hasDenyRequired(result)) {
    return 'PLATFORM_MAINTENANCE_ACTIVE';
  }

  if (hasReadOnlyRequired(result) && !allowReadOnly) {
    return 'PLATFORM_READ_ONLY';
  }

  return 'PLATFORM_MAINTENANCE_ACTIVE';
}

function errorStatusCode(error: unknown): number {
  const value = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof value === 'number' ? value : 500;
}

function errorCode(error: unknown): string {
  const value = (error as { code?: unknown } | null)?.code;
  return typeof value === 'string' ? value : 'PLATFORM_MAINTENANCE_ERROR';
}

function errorMessage(error: unknown): string {
  const value = (error as { message?: unknown } | null)?.message;
  return typeof value === 'string'
    ? value
    : 'Platform maintenance middleware failed.';
}

function errorDetails(error: unknown): unknown {
  return (error as { details?: unknown } | null)?.details ?? null;
}

export function platformMaintenance(input: PlatformMaintenanceInput = {}) {
  const options = normalizeOptions(input);

  return async function platformMaintenanceMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const tenantId = toNullableString(req.tenantId);
      const moduleKey = resolveModuleKey(req, options.moduleKey);
      const allowReadOnly = options.allowReadOnly ?? false;

      if (!tenantId) {
        return respond(
          res,
          400,
          'TENANT_CONTEXT_REQUIRED',
          'Tenant context is required before evaluating platform maintenance policy.',
        );
      }

      const maintenancePolicy = await PlatformMaintenancePolicyService.getActivePolicies(req.db, {
        tenantId,
        moduleKey,
      });

      req.platformMaintenancePolicy = maintenancePolicy;

      const shouldBlock =
        hasDenyRequired(maintenancePolicy) ||
        (hasReadOnlyRequired(maintenancePolicy) && !allowReadOnly);

      if (shouldBlock) {
        return respond(
          res,
          hasDenyRequired(maintenancePolicy) ? 503 : 423,
          responseCode(maintenancePolicy, allowReadOnly),
          'This tenant or module is currently under platform maintenance.',
          maintenancePolicy,
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

export default platformMaintenance;