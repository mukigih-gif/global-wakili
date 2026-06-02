/**
 * Pure platform provisioning utilities — no database required.
 *
 * Extracted from PlatformOnboardingService for unit testing of the
 * provisioning logic without a DB connection.
 *
 * Gate 7 verification: every new tenant must receive all four provisioning
 * records before their account is considered active:
 *   1. PlatformTenantProfile — lifecycle status, environment, admin email
 *   2. TenantSubscription    — plan, trial period, billing info
 *   3. TenantModuleEntitlement — per-module access rights for the plan
 *   4. TenantQuotaPolicy     — per-metric resource limits for the plan
 *
 * TenantUsageMetric records are created on-demand as usage is tracked,
 * not during provisioning — this is the correct design.
 */

export type BillingPlan = 'BASIC' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';

export const MODULES_BY_PLAN: Record<BillingPlan, readonly string[]> = {
  BASIC: ['client', 'matter', 'calendar', 'billing', 'finance', 'approval', 'reporting'],
  PRO: [
    'client', 'matter', 'calendar', 'billing', 'finance', 'approval', 'reporting',
    'analytics', 'payroll', 'procurement', 'document', 'integrations',
  ],
  ENTERPRISE: [
    'client', 'matter', 'calendar', 'billing', 'finance', 'approval', 'reporting',
    'analytics', 'payroll', 'procurement', 'document', 'integrations',
    'trust', 'compliance', 'ai',
  ],
  CUSTOM: [
    'client', 'matter', 'calendar', 'billing', 'finance', 'approval', 'reporting',
    'analytics', 'payroll', 'procurement', 'document', 'integrations',
    'trust', 'compliance', 'ai',
  ],
} as const;

export type QuotaConfig = {
  metricType: string;
  softLimit: number;
  hardLimit: number;
  enforcementMode: 'SOFT' | 'HARD' | 'READ_ONLY';
};

export const QUOTAS_BY_PLAN: Record<BillingPlan, readonly QuotaConfig[]> = {
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
} as const;

/** Returns modules for the given plan. */
export function getModulesForPlan(plan: BillingPlan): readonly string[] {
  return MODULES_BY_PLAN[plan];
}

/** Returns quota policies for the given plan. */
export function getQuotasForPlan(plan: BillingPlan): readonly QuotaConfig[] {
  return QUOTAS_BY_PLAN[plan];
}

/**
 * Validates that a plan upgrade includes all modules from the lower plan.
 * Returns missing modules if the upgrade plan is missing any base modules.
 */
export function validatePlanUpgradeModules(
  basePlan: BillingPlan,
  upgradePlan: BillingPlan,
): string[] {
  const base = new Set(MODULES_BY_PLAN[basePlan]);
  const upgrade = new Set(MODULES_BY_PLAN[upgradePlan]);
  return [...base].filter((m) => !upgrade.has(m));
}

/**
 * Returns the required provisioning record types for a new tenant.
 * Every tenant must receive ALL of these at onboarding.
 */
export const REQUIRED_PROVISIONING_RECORDS = [
  'PlatformTenantProfile',
  'TenantSubscription',
  'TenantModuleEntitlement',
  'TenantQuotaPolicy',
] as const;

export type RequiredProvisioningRecord = typeof REQUIRED_PROVISIONING_RECORDS[number];
