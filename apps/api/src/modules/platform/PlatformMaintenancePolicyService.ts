// apps/api/src/modules/platform/PlatformMaintenancePolicyService.ts

import type { PlatformDbClient } from './platform.types';

function isNowWithin(startsAt?: Date | string | null, endsAt?: Date | string | null) {
  const now = Date.now();
  const start = startsAt ? new Date(startsAt).getTime() : null;
  const end = endsAt ? new Date(endsAt).getTime() : null;

  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

export class PlatformMaintenancePolicyService {
  static async getActivePolicies(
    db: PlatformDbClient,
    params?: {
      tenantId?: string | null;
      moduleKey?: string | null;
    },
  ) {
    const windows = await db.platformMaintenanceWindow.findMany({
      where: {
        status: { in: ['SCHEDULED', 'ACTIVE'] },
      },
      orderBy: [{ startsAt: 'asc' }],
      take: 200,
    });

    const active = windows.filter((item: any) => {
      if (!isNowWithin(item.startsAt, item.endsAt)) return false;

      if (item.scope === 'GLOBAL') return true;
      if (item.scope === 'TENANT' && params?.tenantId && item.targetTenantId === params.tenantId) {
        return true;
      }
      if (
        item.scope === 'MODULE' &&
        params?.moduleKey &&
        item.targetModuleKey === params.moduleKey
      ) {
        return true;
      }
      return false;
    });

    return {
      generatedAt: new Date(),
      active,
      readOnlyRequired: active.some((item: any) => item.isReadOnly),
    };
  }
}

export default PlatformMaintenancePolicyService;