// apps/api/src/modules/platform/PlatformEntitlementGuardService.ts

import type { BillingPlan, PlatformDbClient } from './platform.types';

const PLAN_FEATURES: Record<BillingPlan, string[]> = {
  BASIC: ['STANDARD_EXPORTS'],
  PRO: ['STANDARD_EXPORTS', 'ADVANCED_SCHEDULING', 'BI_CONNECTORS', 'EXECUTIVE_DASHBOARDS'],
  ENTERPRISE: [
    'STANDARD_EXPORTS',
    'ADVANCED_SCHEDULING',
    'BI_CONNECTORS',
    'EXECUTIVE_DASHBOARDS',
    'CUSTOM_REPORTS',
  ],
  CUSTOM: [
    'STANDARD_EXPORTS',
    'ADVANCED_SCHEDULING',
    'BI_CONNECTORS',
    'EXECUTIVE_DASHBOARDS',
    'CUSTOM_REPORTS',
  ],
};

function subscriptionAllowsAccess(status?: string | null) {
  switch (status) {
    case 'TRIAL':
    case 'ACTIVE':
    case 'GRACE_PERIOD':
      return { allowed: true, readOnly: false };
    case 'PAST_DUE':
      return { allowed: true, readOnly: true };
    case 'SUSPENDED':
    case 'CANCELLED':
    case 'EXPIRED':
      return { allowed: false, readOnly: true };
    default:
      return { allowed: false, readOnly: true };
  }
}

function lifecycleAllowsAccess(status?: string | null, readOnlyMode?: boolean | null) {
  switch (status) {
    case 'PROVISIONING':
      return { allowed: false, readOnly: true };
    case 'ACTIVE':
      return { allowed: true, readOnly: Boolean(readOnlyMode) };
    case 'READ_ONLY':
      return { allowed: true, readOnly: true };
    case 'SUSPENDED':
    case 'TERMINATED':
    case 'ARCHIVED':
      return { allowed: false, readOnly: true };
    default:
      return { allowed: false, readOnly: true };
  }
}

export class PlatformEntitlementGuardService {
  static async evaluateModuleAccess(
    db: PlatformDbClient,
    params: {
      tenantId: string;
      moduleKey: string;
    },
  ) {
    const [profile, subscription, entitlement] = await Promise.all([
      db.platformTenantProfile.findFirst({
        where: { tenantId: params.tenantId },
        orderBy: [{ updatedAt: 'desc' }],
      }),
      db.tenantSubscription.findFirst({
        where: { tenantId: params.tenantId },
        orderBy: [{ updatedAt: 'desc' }],
      }),
      db.tenantModuleEntitlement.findFirst({
        where: { tenantId: params.tenantId, moduleKey: params.moduleKey.trim() },
      }),
    ]);

    const lifecycleGate = lifecycleAllowsAccess(profile?.lifecycleStatus, profile?.readOnlyMode);
    const subscriptionGate = subscriptionAllowsAccess(subscription?.status);

    const reasons: string[] = [];
    if (!profile) reasons.push('Tenant lifecycle profile is missing.');
    if (!subscription) reasons.push('Tenant subscription is missing.');
    if (!entitlement) reasons.push(`Module entitlement for ${params.moduleKey} is missing.`);
    if (profile?.readOnlyMode) reasons.push('Tenant is currently in read-only mode.');
    if (profile?.suspensionReason) reasons.push(profile.suspensionReason);
    if (subscription?.status === 'PAST_DUE') reasons.push('Subscription is past due and should operate read-only.');
    if (subscription?.status === 'SUSPENDED') reasons.push('Subscription is suspended.');
    if (entitlement && entitlement.isEnabled === false) reasons.push('Module entitlement is disabled.');

    const allowed =
      lifecycleGate.allowed &&
      subscriptionGate.allowed &&
      Boolean(entitlement?.isEnabled);

    const readOnly =
      lifecycleGate.readOnly ||
      subscriptionGate.readOnly ||
      Boolean(profile?.readOnlyMode);

    return {
      tenantId: params.tenantId,
      moduleKey: params.moduleKey.trim(),
      allowed,
      readOnly,
      plan: subscription?.plan ?? null,
      subscriptionStatus: subscription?.status ?? null,
      lifecycleStatus: profile?.lifecycleStatus ?? null,
      entitlementEnabled: entitlement?.isEnabled ?? false,
      features: subscription?.plan ? PLAN_FEATURES[subscription.plan as BillingPlan] ?? [] : [],
      reasons,
    };
  }

  static async assertModuleAccess(
    db: PlatformDbClient,
    params: {
      tenantId: string;
      moduleKey: string;
      writeIntent?: boolean;
    },
  ) {
    const evaluation = await this.evaluateModuleAccess(db, params);

    if (!evaluation.allowed) {
      throw Object.assign(new Error('Tenant module access is denied'), {
        statusCode: 403,
        code: 'TENANT_MODULE_ACCESS_DENIED',
        details: evaluation,
      });
    }

    if (params.writeIntent && evaluation.readOnly) {
      throw Object.assign(new Error('Tenant module is in read-only mode'), {
        statusCode: 423,
        code: 'TENANT_MODULE_READ_ONLY',
        details: evaluation,
      });
    }

    return evaluation;
  }
}

export default PlatformEntitlementGuardService;