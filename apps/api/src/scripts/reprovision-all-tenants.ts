/**
 * apps/api/src/scripts/reprovision-all-tenants.ts
 *
 * CLI script — retroactively provisions all existing tenants that may have
 * been created before automated provisioning was wired into the onboarding flow.
 *
 * Usage:
 *   npm run provision:all -- [--plan BASIC|PRO|ENTERPRISE|CUSTOM] [--dry-run]
 *
 * Flags:
 *   --plan <PLAN>  Override plan for all tenants. If omitted, derives plan from
 *                  the tenant's existing TenantSubscription, defaulting to BASIC.
 *   --dry-run      Print what would be provisioned without writing to the DB.
 *
 * Examples:
 *   npm run provision:all
 *   npm run provision:all -- --dry-run
 *   npm run provision:all -- --plan ENTERPRISE
 *
 * Idempotent — uses upsert on all records. Safe to re-run at any time.
 *
 * WIP-001 — Gap 001–005 closure.
 */

import prisma from '../config/database';
import { PlatformOnboardingService } from '../modules/platform/PlatformOnboardingService';

const VALID_PLANS = ['BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM'] as const;
type BillingPlan = typeof VALID_PLANS[number];

function parseFlags(): { planOverride: BillingPlan | null; dryRun: boolean } {
  const args = process.argv.slice(2);
  let planOverride: BillingPlan | null = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    }
    if (args[i] === '--plan' && args[i + 1]) {
      const candidate = args[i + 1]!.toUpperCase() as BillingPlan;
      if (!VALID_PLANS.includes(candidate)) {
        console.error(`[REPROVISION] ERROR: --plan must be one of: ${VALID_PLANS.join(', ')}`);
        process.exit(1);
      }
      planOverride = candidate;
      i++;
    }
  }

  return { planOverride, dryRun };
}

async function resolvePlanForTenant(tenantId: string, override: BillingPlan | null): Promise<BillingPlan> {
  if (override) return override;

  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: { plan: true },
  });

  const plan = subscription?.plan as BillingPlan | undefined;
  return plan && VALID_PLANS.includes(plan) ? plan : 'BASIC';
}

async function main(): Promise<void> {
  const { planOverride, dryRun } = parseFlags();

  console.info('[REPROVISION] ──────────────────────────────────────────────────');
  console.info('[REPROVISION] Global Wakili — Reprovision All Tenants');
  console.info('[REPROVISION] ──────────────────────────────────────────────────');
  if (dryRun) console.info('[REPROVISION] DRY RUN — no database writes will occur');
  if (planOverride) console.info(`[REPROVISION] Plan override: ${planOverride}`);
  console.info('[REPROVISION] ──────────────────────────────────────────────────');

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' },
  });

  console.info(`[REPROVISION] Found ${tenants.length} tenant(s) to process.\n`);

  const results = {
    total: tenants.length,
    succeeded: 0,
    failed: 0,
    failures: [] as Array<{ tenantId: string; name: string; error: string }>,
  };

  for (const tenant of tenants) {
    const plan = await resolvePlanForTenant(tenant.id, planOverride);

    if (dryRun) {
      console.info(`[REPROVISION] [DRY-RUN] ${tenant.name} (${tenant.id}) → plan: ${plan}`);
      results.succeeded++;
      continue;
    }

    try {
      const result = await PlatformOnboardingService.provisionTenant(prisma, {
        tenantId: tenant.id,
        plan,
        initialAdminEmail: `admin@${tenant.slug}.placeholder`,
        activateNow: true,
      });

      console.info(
        `[REPROVISION] ✔ ${tenant.name} (${tenant.id}) | plan: ${plan}` +
        ` | entitlements: ${result.entitlementsCreated}` +
        ` | quotas: ${result.quotasCreated}` +
        ` | lifecycle: ${result.profile.lifecycleStatus}`,
      );
      results.succeeded++;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[REPROVISION] ✘ ${tenant.name} (${tenant.id}) — FAILED: ${msg}`);
      results.failures.push({ tenantId: tenant.id, name: tenant.name, error: msg });
      results.failed++;
    }
  }

  console.info('\n[REPROVISION] ──────────────────────────────────────────────────');
  console.info('[REPROVISION] Summary');
  console.info(`[REPROVISION]   Total    : ${results.total}`);
  console.info(`[REPROVISION]   Succeeded: ${results.succeeded}`);
  console.info(`[REPROVISION]   Failed   : ${results.failed}`);

  if (results.failures.length > 0) {
    console.error('\n[REPROVISION] Failed tenants:');
    for (const f of results.failures) {
      console.error(`[REPROVISION]   - ${f.name} (${f.tenantId}): ${f.error}`);
    }
    console.info('[REPROVISION] ──────────────────────────────────────────────────');
    process.exit(1);
  }

  console.info('[REPROVISION] ✔ All tenants provisioned successfully.');
  console.info('[REPROVISION] ──────────────────────────────────────────────────');
}

main()
  .catch((error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[REPROVISION] FATAL: ${msg}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
