// apps/api/src/modules/platform/PlatformOnboardingService.ts

import type { BillingPlan, PlatformDbClient } from './platform.types';
import { PlatformQuotaService } from './PlatformQuotaService';
import { PlatformSubscriptionService } from './PlatformSubscriptionService';
import { PlatformTenantLifecycleService } from './PlatformTenantLifecycleService';

const DEFAULT_MODULES_BY_PLAN: Record<BillingPlan, string[]> = {
  BASIC: ['client', 'matter', 'calendar', 'billing', 'finance', 'approval', 'reporting'],
  PRO: [
    'client',
    'matter',
    'calendar',
    'billing',
    'finance',
    'approval',
    'reporting',
    'analytics',
    'payroll',
    'procurement',
    'document',
    'integrations',
  ],
  ENTERPRISE: [
    'client',
    'matter',
    'calendar',
    'billing',
    'finance',
    'approval',
    'reporting',
    'analytics',
    'payroll',
    'procurement',
    'document',
    'integrations',
    'trust',
    'compliance',
    'ai',
  ],
  CUSTOM: [
    'client',
    'matter',
    'calendar',
    'billing',
    'finance',
    'approval',
    'reporting',
    'analytics',
    'payroll',
    'procurement',
    'document',
    'integrations',
    'trust',
    'compliance',
    'ai',
  ],
};

const DEFAULT_QUOTAS_BY_PLAN: Record<
  BillingPlan,
  Array<{
    metricType: string;
    softLimit: number;
    hardLimit: number;
    enforcementMode: 'SOFT' | 'HARD' | 'READ_ONLY';
  }>
> = {
  BASIC: [
    { metricType: 'ACTIVE_USERS', softLimit: 10, hardLimit: 15, enforcementMode: 'HARD' },
    { metricType: 'FILE_STORAGE', softLimit: 10_000, hardLimit: 12_000, enforcementMode: 'READ_ONLY' },
    { metricType: 'API_REQUESTS', softLimit: 100_000, hardLimit: 120_000, enforcementMode: 'SOFT' },
  ],
  PRO: [
    { metricType: 'ACTIVE_USERS', softLimit: 50, hardLimit: 60, enforcementMode: 'HARD' },
    { metricType: 'FILE_STORAGE', softLimit: 50_000, hardLimit: 60_000, enforcementMode: 'READ_ONLY' },
    { metricType: 'API_REQUESTS', softLimit: 500_000, hardLimit: 600_000, enforcementMode: 'SOFT' },
    { metricType: 'PAYROLL_BATCHES', softLimit: 100, hardLimit: 150, enforcementMode: 'SOFT' },
  ],
  ENTERPRISE: [
    { metricType: 'ACTIVE_USERS', softLimit: 500, hardLimit: 700, enforcementMode: 'HARD' },
    { metricType: 'FILE_STORAGE', softLimit: 500_000, hardLimit: 700_000, enforcementMode: 'READ_ONLY' },
    { metricType: 'API_REQUESTS', softLimit: 5_000_000, hardLimit: 6_000_000, enforcementMode: 'SOFT' },
    { metricType: 'PAYROLL_BATCHES', softLimit: 1000, hardLimit: 1500, enforcementMode: 'SOFT' },
  ],
  CUSTOM: [
    { metricType: 'ACTIVE_USERS', softLimit: 500, hardLimit: 700, enforcementMode: 'HARD' },
    { metricType: 'FILE_STORAGE', softLimit: 500_000, hardLimit: 700_000, enforcementMode: 'READ_ONLY' },
    { metricType: 'API_REQUESTS', softLimit: 5_000_000, hardLimit: 6_000_000, enforcementMode: 'SOFT' },
    { metricType: 'PAYROLL_BATCHES', softLimit: 1000, hardLimit: 1500, enforcementMode: 'SOFT' },
  ],
};

export class PlatformOnboardingService {
  static async provisionTenant(
    db: PlatformDbClient,
    input: {
      tenantId: string;
      initialAdminEmail: string;
      environmentKey?: string | null;
      plan: BillingPlan;
      billingEmail?: string | null;
      activateNow?: boolean;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    const tenant = await db.tenant.findFirst({
      where: { id: input.tenantId },
    });

    if (!tenant) {
      throw Object.assign(new Error('Tenant not found for onboarding'), {
        statusCode: 404,
        code: 'TENANT_NOT_FOUND',
      });
    }

    const activateNow = input.activateNow ?? true;

    const profile = await PlatformTenantLifecycleService.upsertTenantProfile(db, {
      tenantId: input.tenantId,
      lifecycleStatus: activateNow ? 'ACTIVE' : 'PROVISIONING',
      environmentKey: input.environmentKey ?? null,
      initialAdminEmail: input.initialAdminEmail,
      readOnlyMode: false,
      provisionedAt: new Date(),
      activatedAt: activateNow ? new Date() : null,
      metadata: input.metadata ?? {},
    });

    const subscription = await PlatformSubscriptionService.upsertSubscription(db, {
      tenantId: input.tenantId,
      plan: input.plan,
      status: 'TRIAL',
      provider: null,
      billingEmail: input.billingEmail ?? input.initialAdminEmail,
      seatLimit: DEFAULT_QUOTAS_BY_PLAN[input.plan].find((item) => item.metricType === 'ACTIVE_USERS')?.softLimit ?? null,
      seatsAllocated: 1,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      metadata: {
        onboardedByControlPlane: true,
        ...(input.metadata ?? {}),
      },
    });

    const entitlements = [];
    for (const moduleKey of DEFAULT_MODULES_BY_PLAN[input.plan]) {
      const entitlement = await PlatformSubscriptionService.upsertEntitlement(db, {
        tenantId: input.tenantId,
        moduleKey,
        isEnabled: true,
        planSource: input.plan,
        metadata: {
          seeded: true,
          onboarding: true,
        },
      });
      entitlements.push(entitlement);
    }

    const quotas = [];
    for (const quota of DEFAULT_QUOTAS_BY_PLAN[input.plan]) {
      const policy = await PlatformQuotaService.upsertQuotaPolicy(db, {
        tenantId: input.tenantId,
        metricType: quota.metricType,
        softLimit: quota.softLimit,
        hardLimit: quota.hardLimit,
        enforcementMode: quota.enforcementMode,
        warningThresholdPercent: 80,
        metadata: {
          seeded: true,
          onboarding: true,
        },
      });
      quotas.push(policy);
    }

    return {
      tenantId: input.tenantId,
      profile,
      subscription,
      entitlementsCreated: entitlements.length,
      quotasCreated: quotas.length,
      defaultModules: DEFAULT_MODULES_BY_PLAN[input.plan],
    };
  }
}

export default PlatformOnboardingService;