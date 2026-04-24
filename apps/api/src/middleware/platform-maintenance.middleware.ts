// apps/api/src/middleware/platform-maintenance.middleware.ts

import type { NextFunction, Request, Response } from 'express';
import { PlatformAccessAuditService } from '../modules/platform/PlatformAccessAuditService';
import { PlatformBannerService } from '../modules/platform/PlatformBannerService';
import { PlatformMaintenancePolicyService } from '../modules/platform/PlatformMaintenancePolicyService';
import { PlatformModuleRegistry } from '../services/platform/PlatformModuleRegistry';

function respond(res: Response, statusCode: number, code: string, message: string, details?: unknown) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    details: details ?? null,
  });
}

export function platformMaintenance(moduleKey?: string) {
  return async function platformMaintenanceMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const resolvedModuleKey =
        PlatformModuleRegistry.resolveModuleKey(moduleKey ?? req) ?? null;

      if (!resolvedModuleKey || !req.tenantId?.trim()) {
        return next();
      }

      const [maintenance, broadcasts] = await Promise.all([
        PlatformMaintenancePolicyService.getActivePolicies(req.db, {
          tenantId: req.tenantId,
          moduleKey: resolvedModuleKey,
        }),
        PlatformBannerService.getActiveBroadcasts(req.db, {
          tenantId: req.tenantId,
          plan: req.platformAccessPolicy?.plan ?? null,
          moduleKey: resolvedModuleKey,
        }),
      ]);

      const denyRequired = maintenance.active.some((item: any) => item.isReadOnly === false);
      const readOnlyRequired =
        maintenance.readOnlyRequired || broadcasts.readOnlyRequired;

      req.platformMaintenancePolicy = {
        active: maintenance.active,
        readOnlyRequired,
        denyRequired,
        reasons: maintenance.active.map((item: any) =>
          String(item.bannerMessage ?? item.title ?? 'Maintenance is active.'),
        ),
      };

      req.platformBroadcasts = broadcasts;

      if (denyRequired) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_MAINTENANCE_BLOCKED',
          moduleKey: resolvedModuleKey,
          metadata: {
            activeMaintenanceCount: maintenance.active.length,
          },
        });

        return respond(
          res,
          503,
          'MAINTENANCE_ACTIVE',
          'This module is temporarily unavailable due to active maintenance.',
          req.platformMaintenancePolicy,
        );
      }

      if (readOnlyRequired && PlatformModuleRegistry.isWriteMethod(req.method)) {
        await PlatformAccessAuditService.logDecision(req.db, req, {
          action: 'PLATFORM_MAINTENANCE_BLOCKED',
          moduleKey: resolvedModuleKey,
          metadata: {
            activeMaintenanceCount: maintenance.active.length,
            readOnlyRequired: true,
          },
        });

        return respond(
          res,
          423,
          'MAINTENANCE_READ_ONLY',
          'This module is temporarily read-only due to active maintenance.',
          req.platformMaintenancePolicy,
        );
      }

      return next();
    } catch (error: any) {
      return respond(
        res,
        Number(error?.statusCode ?? 500),
        String(error?.code ?? 'PLATFORM_MAINTENANCE_ERROR'),
        String(error?.message ?? 'Platform maintenance middleware failed.'),
        error?.details ?? null,
      );
    }
  };
}

export default platformMaintenance;