// apps/api/src/modules/platform/PlatformBannerService.ts

import type { PlatformDbClient } from './platform.types';
import { PlatformMaintenancePolicyService } from './PlatformMaintenancePolicyService';

function isNowWithin(startsAt?: Date | string | null, endsAt?: Date | string | null) {
  const now = Date.now();
  const start = startsAt ? new Date(startsAt).getTime() : null;
  const end = endsAt ? new Date(endsAt).getTime() : null;

  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

export class PlatformBannerService {
  static async getActiveBroadcasts(
    db: PlatformDbClient,
    params?: {
      tenantId?: string | null;
      plan?: string | null;
      roleKey?: string | null;
      moduleKey?: string | null;
    },
  ) {
    const [messages, maintenance] = await Promise.all([
      db.platformGlobalMessage.findMany({
        where: {
          status: { in: ['SCHEDULED', 'SENT'] },
        },
        orderBy: [{ startsAt: 'asc' }, { updatedAt: 'desc' }],
        take: 200,
      }),
      PlatformMaintenancePolicyService.getActivePolicies(db, {
        tenantId: params?.tenantId ?? null,
        moduleKey: params?.moduleKey ?? null,
      }),
    ]);

    const activeMessages = messages.filter((message: any) => {
      if (!isNowWithin(message.startsAt, message.endsAt)) return false;

      switch (message.audience) {
        case 'ALL_TENANTS':
          return true;
        case 'PLAN':
          return params?.plan && message.targetPlan === params.plan;
        case 'TENANT':
          return params?.tenantId && message.targetTenantId === params.tenantId;
        case 'ROLE':
          return params?.roleKey && message.targetRoleKey === params.roleKey;
        case 'PLATFORM_USERS':
          return true;
        default:
          return false;
      }
    });

    return {
      generatedAt: new Date(),
      activeMessages,
      activeMaintenance: maintenance.active,
      readOnlyRequired: maintenance.readOnlyRequired,
    };
  }
}

export default PlatformBannerService;