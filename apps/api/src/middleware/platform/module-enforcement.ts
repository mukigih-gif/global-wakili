// apps/api/src/middleware/platform/module-enforcement.ts

import type { Router } from 'express';
import type { PlatformModuleKey } from '../../types/platform-enforcement';
import { platformAccess } from '../platform-access.middleware';
import { platformImpersonation } from '../platform-impersonation.middleware';
import { platformMaintenance } from '../platform-maintenance.middleware';
import { platformWriteGuard } from '../platform-write-guard.middleware';

export type BindPlatformModuleEnforcementOptions = {
  moduleKey: PlatformModuleKey;
  metricType?: string;
  projectedValue?: number;
};

export function bindPlatformModuleEnforcement(
  router: Router,
  options: BindPlatformModuleEnforcementOptions,
) {
  router.use(platformImpersonation(options.moduleKey));
  router.use(platformAccess({ moduleKey: options.moduleKey }));
  router.use(platformMaintenance(options.moduleKey));
  router.use(
    platformWriteGuard({
      moduleKey: options.moduleKey,
      metricType: options.metricType,
      projectedValue: options.projectedValue,
    }),
  );
}

export default bindPlatformModuleEnforcement;