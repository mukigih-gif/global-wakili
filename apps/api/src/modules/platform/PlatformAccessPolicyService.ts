// apps/api/src/modules/platform/PlatformAccessPolicyService.ts

import { PlatformBannerService } from './PlatformBannerService';
import { PlatformEntitlementGuardService } from './PlatformEntitlementGuardService';
import { PlatformFeatureEvaluationService } from './PlatformFeatureEvaluationService';
import { PlatformMaintenancePolicyService } from './PlatformMaintenancePolicyService';
import type { PlatformDbClient } from './platform.types';

export class PlatformAccessPolicyService {
  static async evaluate(
    db: PlatformDbClient,
    params: {
      tenantId: string;
      moduleKey: string;
      featureKey?: string | null;
      roleKey?: string | null;
    },
  ) {
    const baseAccess = await PlatformEntitlementGuardService.evaluateModuleAccess(db, {
      tenantId: params.tenantId,
      moduleKey: params.moduleKey,
    });

    const maintenance = await PlatformMaintenancePolicyService.getActivePolicies(db, {
      tenantId: params.tenantId,
      moduleKey: params.moduleKey,
    });

    const broadcasts = await PlatformBannerService.getActiveBroadcasts(db, {
      tenantId: params.tenantId,
      plan: baseAccess.plan ?? null,
      roleKey: params.roleKey ?? null,
      moduleKey: params.moduleKey,
    });

    const featureContext = params.featureKey
      ? await PlatformFeatureEvaluationService.evaluate(db, {
          moduleKey: params.moduleKey,
          featureKey: params.featureKey,
          tenantId: params.tenantId,
          plan: baseAccess.plan ?? null,
        })
      : {
          featureKey: null,
          allowed: true,
          matchedFlags: [],
          reasons: [],
        };

    const denyRequired = maintenance.active.some((item: any) => item.isReadOnly === false);
    const readOnlyRequired =
      maintenance.readOnlyRequired || broadcasts.readOnlyRequired || baseAccess.readOnly;

    const reasons = [
      ...baseAccess.reasons,
      ...maintenance.active
        .filter((item: any) => item.isReadOnly === false)
        .map((item: any) => String(item.bannerMessage ?? item.title ?? 'Maintenance window is active.')),
      ...featureContext.reasons,
    ];

    const allowed = baseAccess.allowed && featureContext.allowed && !denyRequired;

    return {
      accessPolicy: {
        moduleKey: params.moduleKey,
        allowed,
        readOnly: readOnlyRequired,
        plan: baseAccess.plan,
        subscriptionStatus: baseAccess.subscriptionStatus,
        lifecycleStatus: baseAccess.lifecycleStatus,
        entitlementEnabled: baseAccess.entitlementEnabled,
        reasons,
        features: baseAccess.features,
        decisionCode: !allowed
          ? denyRequired
            ? 'MAINTENANCE_ACTIVE'
            : featureContext.allowed
              ? 'TENANT_ACCESS_DENIED'
              : 'FEATURE_FLAG_DISABLED'
          : readOnlyRequired
            ? 'TENANT_READ_ONLY'
            : 'ALLOWED',
      },
      maintenancePolicy: {
        active: maintenance.active,
        readOnlyRequired,
        denyRequired,
        reasons,
      },
      broadcasts,
      featureContext,
    };
  }

  static async assertReadable(
    db: PlatformDbClient,
    params: {
      tenantId: string;
      moduleKey: string;
      featureKey?: string | null;
      roleKey?: string | null;
    },
  ) {
    const evaluation = await this.evaluate(db, params);

    if (!evaluation.accessPolicy.allowed) {
      throw Object.assign(new Error('Platform access policy denied this request'), {
        statusCode: evaluation.maintenancePolicy.denyRequired ? 503 : 403,
        code: evaluation.accessPolicy.decisionCode,
        details: evaluation,
      });
    }

    return evaluation;
  }

  static async assertWritable(
    db: PlatformDbClient,
    params: {
      tenantId: string;
      moduleKey: string;
      featureKey?: string | null;
      roleKey?: string | null;
    },
  ) {
    const evaluation = await this.assertReadable(db, params);

    if (evaluation.accessPolicy.readOnly) {
      throw Object.assign(new Error('Platform access policy marked this tenant read-only'), {
        statusCode: 423,
        code: evaluation.maintenancePolicy.denyRequired
          ? 'MAINTENANCE_ACTIVE'
          : 'TENANT_READ_ONLY',
        details: evaluation,
      });
    }

    return evaluation;
  }
}

export default PlatformAccessPolicyService;