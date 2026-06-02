/**
 * apps/api/src/scripts/provision-tenant.ts
 *
 * CLI script — provisions all required control-plane records for a single tenant.
 *
 * Usage:
 *   npm run provision:tenant -- <tenantId> <plan> <adminEmail>
 *
 * Arguments:
 *   tenantId   — UUID of an existing tenant in the database
 *   plan       — BASIC | PRO | ENTERPRISE | CUSTOM
 *   adminEmail — Initial admin email address for the tenant profile
 *
 * Example:
 *   npm run provision:tenant -- clx123abc456 ENTERPRISE admin@lawfirm.co.ke
 *
 * Records created / updated (idempotent — safe to re-run):
 *   1. PlatformTenantProfile
 *   2. TenantSubscription
 *   3. TenantModuleEntitlement (one per plan module)
 *   4. TenantQuotaPolicy (one per plan quota metric)
 *
 * Note: TenantUsageMetric records are created on-demand as usage is tracked,
 * not at provisioning time — this is the correct architecture (Gate 7 verified).
 *
 * WIP-001 — Gap 001–005 closure.
 */

import prisma from '../config/database';
import { PlatformOnboardingService } from '../modules/platform/PlatformOnboardingService';

const VALID_PLANS = ['BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM'] as const;
type BillingPlan = typeof VALID_PLANS[number];

function parseArgs(): { tenantId: string; plan: BillingPlan; adminEmail: string } {
  const [, , tenantId, plan, adminEmail] = process.argv;

  if (!tenantId?.trim()) {
    console.error('[PROVISION] ERROR: tenantId is required.');
    console.error('[PROVISION] Usage: npm run provision:tenant -- <tenantId> <plan> <adminEmail>');
    process.exit(1);
  }

  if (!plan || !VALID_PLANS.includes(plan as BillingPlan)) {
    console.error(`[PROVISION] ERROR: plan must be one of: ${VALID_PLANS.join(', ')}`);
    console.error(`[PROVISION] Received: ${plan ?? '(none)'}`);
    process.exit(1);
  }

  if (!adminEmail?.trim() || !adminEmail.includes('@')) {
    console.error('[PROVISION] ERROR: adminEmail must be a valid email address.');
    process.exit(1);
  }

  return {
    tenantId: tenantId.trim(),
    plan: plan as BillingPlan,
    adminEmail: adminEmail.trim(),
  };
}

async function main(): Promise<void> {
  const { tenantId, plan, adminEmail } = parseArgs();

  console.info('[PROVISION] ─────────────────────────────────────────────');
  console.info('[PROVISION] Global Wakili — Control Plane Tenant Provisioning');
  console.info('[PROVISION] ─────────────────────────────────────────────');
  console.info(`[PROVISION] Tenant ID  : ${tenantId}`);
  console.info(`[PROVISION] Plan       : ${plan}`);
  console.info(`[PROVISION] Admin Email: ${adminEmail}`);
  console.info('[PROVISION] ─────────────────────────────────────────────');

  const result = await PlatformOnboardingService.provisionTenant(prisma, {
    tenantId,
    plan,
    initialAdminEmail: adminEmail,
    activateNow: true,
  });

  console.info('[PROVISION] ✔ Provisioning complete.');
  console.info(`[PROVISION]   Tenant ID              : ${result.tenantId}`);
  console.info(`[PROVISION]   Profile lifecycle      : ${result.profile.lifecycleStatus}`);
  console.info(`[PROVISION]   Subscription plan      : ${result.subscription.plan}`);
  console.info(`[PROVISION]   Subscription status    : ${result.subscription.status}`);
  console.info(`[PROVISION]   Entitlements created   : ${result.entitlementsCreated}`);
  console.info(`[PROVISION]   Quota policies created : ${result.quotasCreated}`);
  console.info(`[PROVISION]   Modules               : ${result.defaultModules.join(', ')}`);
  console.info('[PROVISION] ─────────────────────────────────────────────');
}

main()
  .catch((error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[PROVISION] FAILED: ${msg}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
