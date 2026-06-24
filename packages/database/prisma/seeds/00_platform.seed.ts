import {
  BillingPlan,
  PrismaClient,
  QuotaEnforcementMode,
  SubscriptionStatus,
  TenantLifecycleStatus,
  UsageMetricType,
} from '@prisma/client';

import PlatformModuleRegistry from '../../../../apps/api/src/services/platform/PlatformModuleRegistry';

type SeedPrisma = PrismaClient;

export type PlatformSeedResult = {
  status: 'platform_seed_complete';
  tenantId: string;
  profileLifecycle: TenantLifecycleStatus;
  subscriptionPlan: BillingPlan;
  moduleEntitlements: number;
  quotaPolicies: number;
  usageMetrics: number;
};

/*
 * 00_platform.seed.ts — Control-plane layer (WIP-001).
 *
 * Attaches platform/control-plane records to the tenant created by the
 * bootstrap layer (00_bootstrap.ts). Does NOT create the tenant; it is
 * resolved by the master orchestrator and passed in.
 *
 * Policy:
 * - Idempotent: safe to rerun. Every write keys on tenantId (+ a stable
 *   secondary key) so reruns converge instead of duplicating.
 * - Explicit tenantId in every where AND data — control-plane records are
 *   platform-scoped; we never rely on an implicit tenant filter here.
 * - No schema changes, no destructive operations.
 */

function optionalEmailEnv(name: string): string | undefined {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return undefined;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : undefined;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfNextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

async function seedPlatformProfile(
  prisma: SeedPrisma,
  tenantId: string,
): Promise<TenantLifecycleStatus> {
  const now = new Date();
  const initialAdminEmail = optionalEmailEnv('SEED_FIRM_ADMIN_EMAIL');

  const profile = await prisma.platformTenantProfile.upsert({
    where: { tenantId },
    update: {
      lifecycleStatus: TenantLifecycleStatus.ACTIVE,
      environmentKey: 'production',
      initialAdminEmail,
      readOnlyMode: false,
      suspensionReason: null,
      activatedAt: now,
    },
    create: {
      tenantId,
      lifecycleStatus: TenantLifecycleStatus.ACTIVE,
      environmentKey: 'production',
      initialAdminEmail,
      readOnlyMode: false,
      provisionedAt: now,
      activatedAt: now,
    },
    select: { lifecycleStatus: true },
  });

  return profile.lifecycleStatus;
}

async function seedSubscription(
  prisma: SeedPrisma,
  tenantId: string,
): Promise<BillingPlan> {
  /*
   * TenantSubscription has no single-column unique on tenantId, so we
   * resolve-then-write (mirrors the bootstrap admin-user idempotency idiom).
   */
  const billingEmail = optionalEmailEnv('SEED_FIRM_ADMIN_EMAIL');

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { currency: true, billingCycleStart: true, billingCycleEnd: true },
  });

  const currency = tenant?.currency ?? 'KES';
  const currentPeriodStart = tenant?.billingCycleStart ?? new Date();
  const currentPeriodEnd = tenant?.billingCycleEnd ?? null;

  const existing = await prisma.tenantSubscription.findFirst({
    where: { tenantId },
    select: { id: true },
  });

  const data = {
    plan: BillingPlan.ENTERPRISE,
    status: SubscriptionStatus.ACTIVE,
    provider: 'internal',
    currency,
    billingEmail,
    seatLimit: 50,
    currentPeriodStart,
    currentPeriodEnd,
  };

  if (existing) {
    await prisma.tenantSubscription.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.tenantSubscription.create({
      data: { tenantId, ...data },
    });
  }

  return BillingPlan.ENTERPRISE;
}

async function seedModuleEntitlements(
  prisma: SeedPrisma,
  tenantId: string,
): Promise<number> {
  const modules = PlatformModuleRegistry.list();

  await prisma.tenantModuleEntitlement.createMany({
    data: modules.map((moduleDef) => ({
      tenantId,
      moduleKey: moduleDef.moduleKey,
      isEnabled: true,
      planSource: BillingPlan.ENTERPRISE,
    })),
    skipDuplicates: true,
  });

  return prisma.tenantModuleEntitlement.count({ where: { tenantId } });
}

async function seedQuotaPolicies(
  prisma: SeedPrisma,
  tenantId: string,
): Promise<number> {
  const policies: Array<{
    metricType: UsageMetricType;
    softLimit: string;
    hardLimit: string;
  }> = [
    { metricType: UsageMetricType.ACTIVE_USERS, softLimit: '45', hardLimit: '50' },
    { metricType: UsageMetricType.DOCUMENT_STORAGE, softLimit: '8000', hardLimit: '10000' },
    { metricType: UsageMetricType.API_REQUESTS, softLimit: '450000', hardLimit: '500000' },
  ];

  for (const policy of policies) {
    await prisma.tenantQuotaPolicy.upsert({
      where: {
        tenantId_metricType: {
          tenantId,
          metricType: policy.metricType,
        },
      },
      update: {
        softLimit: policy.softLimit,
        hardLimit: policy.hardLimit,
        enforcementMode: QuotaEnforcementMode.SOFT,
        warningThresholdPercent: 80,
      },
      create: {
        tenantId,
        metricType: policy.metricType,
        softLimit: policy.softLimit,
        hardLimit: policy.hardLimit,
        enforcementMode: QuotaEnforcementMode.SOFT,
        warningThresholdPercent: 80,
      },
    });
  }

  return prisma.tenantQuotaPolicy.count({ where: { tenantId } });
}

async function seedUsageMetrics(
  prisma: SeedPrisma,
  tenantId: string,
): Promise<number> {
  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = startOfNextMonth(now);

  const metrics: Array<{
    metricType: UsageMetricType;
    currentValue: string;
    peakValue: string;
    unit: string;
  }> = [
    { metricType: UsageMetricType.ACTIVE_USERS, currentValue: '8', peakValue: '9', unit: 'users' },
    { metricType: UsageMetricType.DOCUMENT_STORAGE, currentValue: '120', peakValue: '140', unit: 'MB' },
    { metricType: UsageMetricType.API_REQUESTS, currentValue: '4200', peakValue: '5100', unit: 'requests' },
  ];

  for (const metric of metrics) {
    await prisma.tenantUsageMetric.upsert({
      where: {
        tenantId_metricType_periodStart_periodEnd: {
          tenantId,
          metricType: metric.metricType,
          periodStart,
          periodEnd,
        },
      },
      update: {
        currentValue: metric.currentValue,
        peakValue: metric.peakValue,
        unit: metric.unit,
        lastRecordedAt: now,
      },
      create: {
        tenantId,
        metricType: metric.metricType,
        periodStart,
        periodEnd,
        currentValue: metric.currentValue,
        peakValue: metric.peakValue,
        unit: metric.unit,
        lastRecordedAt: now,
      },
    });
  }

  return prisma.tenantUsageMetric.count({ where: { tenantId } });
}

export async function seedPlatform(
  prisma: PrismaClient,
  tenantId: string,
): Promise<PlatformSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedPlatform requires a tenantId.');
  }

  const profileLifecycle = await seedPlatformProfile(prisma, tenantId);
  const subscriptionPlan = await seedSubscription(prisma, tenantId);
  const moduleEntitlements = await seedModuleEntitlements(prisma, tenantId);
  const quotaPolicies = await seedQuotaPolicies(prisma, tenantId);
  const usageMetrics = await seedUsageMetrics(prisma, tenantId);

  return {
    status: 'platform_seed_complete',
    tenantId,
    profileLifecycle,
    subscriptionPlan,
    moduleEntitlements,
    quotaPolicies,
    usageMetrics,
  };
}
