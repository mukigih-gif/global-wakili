// apps/api/src/modules/platform/PlatformFeatureEvaluationService.ts

import type { PlatformDbClient } from './platform.types';

function isWithinWindow(flag: any): boolean {
  const now = Date.now();
  const startsAt = flag?.startsAt ? new Date(flag.startsAt).getTime() : null;
  const endsAt = flag?.endsAt ? new Date(flag.endsAt).getTime() : null;

  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

function candidateKeys(moduleKey: string, featureKey: string): string[] {
  const raw = featureKey.trim();
  return Array.from(
    new Set([raw, `${moduleKey}.${raw}`, `${moduleKey}:${raw}`, `${moduleKey}/${raw}`]),
  );
}

export class PlatformFeatureEvaluationService {
  static async evaluate(
    db: PlatformDbClient,
    params: {
      moduleKey: string;
      featureKey: string;
      tenantId?: string | null;
      plan?: string | null;
    },
  ) {
    const keys = candidateKeys(params.moduleKey, params.featureKey);

    const flags = await db.platformFeatureFlag.findMany({
      where: {
        key: { in: keys },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    const matchedFlags = flags.filter((flag: any) => {
      if (!isWithinWindow(flag)) return false;

      switch (flag.scope) {
        case 'GLOBAL':
          return true;
        case 'PLAN':
          return Boolean(params.plan && flag.targetPlan === params.plan);
        case 'TENANT':
          return Boolean(params.tenantId && flag.targetTenantId === params.tenantId);
        case 'MODULE':
          return flag.targetModuleKey === params.moduleKey;
        default:
          return false;
      }
    });

    if (matchedFlags.length === 0) {
      return {
        featureKey: params.featureKey,
        allowed: true,
        matchedFlags: [],
        reasons: [],
      };
    }

    const explicitDeny = matchedFlags.find((flag: any) => flag.isEnabled === false);
    if (explicitDeny) {
      return {
        featureKey: params.featureKey,
        allowed: false,
        matchedFlags,
        reasons: [`Feature flag ${explicitDeny.key} is disabled.`],
      };
    }

    const explicitAllow = matchedFlags.find((flag: any) => flag.isEnabled === true);
    if (explicitAllow) {
      return {
        featureKey: params.featureKey,
        allowed: true,
        matchedFlags,
        reasons: [],
      };
    }

    return {
      featureKey: params.featureKey,
      allowed: true,
      matchedFlags,
      reasons: [],
    };
  }
}

export default PlatformFeatureEvaluationService;