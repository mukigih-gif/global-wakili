import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { seedBootstrap } from './00_bootstrap';
import { seedPlatform } from './00_platform.seed';
import { seedTenants } from './01_tenants.seed';
import { seedUsers } from './02_users.seed';
import { seedClients } from './03_clients.seed';
import { seedContacts } from './04_contacts.seed';
import { seedBranches } from './05_branches.seed';
import { seedMatters } from './06_matters.seed';
import { seedCalendar } from './07_calendar.seed';
import { seedTasks } from './08_tasks.seed';
import { seedWorkflows } from './09_workflows.seed';

/*
 * master.seed.ts — Master Seed Orchestrator (CLAUDE.md §12).
 *
 * Runs the numbered seed layers in dependency order against DATABASE_URL.
 *
 * Order:
 *   1. 00_bootstrap   — tenant + permissions + roles + platform/firm admins
 *                       (foundation; creates the primary tenant).
 *   2. 00_platform    — control-plane records for the bootstrapped tenant.
 *   ... numbered context layers wired in as each lands ...
 *   N. 21_validation  — read-query every seeded model (runs LAST).
 *
 * Policy:
 * - Bootstrap is the source of the primary tenant id; downstream layers
 *   receive it (they never re-create the tenant).
 * - Every layer is idempotent; the whole run is safe to repeat.
 * - 20_stress and the unbuilt 24-27 placeholders are intentionally excluded.
 * - No secrets are logged.
 */

type SeedLayerResult = {
  status: string;
  [key: string]: unknown;
};

type SeedExecutionSummary = {
  status: 'master_seed_complete';
  environment: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  tenantId: string;
  layers: Record<string, SeedLayerResult>;
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required to run the master seed.`);
  }

  return value.trim();
}

function getNodeEnvironment(): string {
  return process.env.NODE_ENV?.trim() || 'development';
}

/*
 * Demo / fixture data policy (best practice — production-safe by default).
 *
 * Foundational seed (bootstrap + control plane) ALWAYS runs; the app needs it
 * in every environment. Demo/fixture layers (secondary tenants, role-spread
 * login-able test users sharing the seed password, and future sample
 * clients/matters/finance data) must NEVER touch real production data by
 * default.
 *
 * Rule:
 * - development / test: on by default.
 * - production: hard-blocked, even with SEED_DEMO_DATA=true, unless the
 *   deliberate override SEED_ALLOW_DEMO_IN_PRODUCTION=true is also set.
 * - any other environment (e.g. staging): explicit opt-in via SEED_DEMO_DATA=true.
 */
function resolveDemoDataPolicy(): { enabled: boolean; reason: string } {
  const nodeEnv = getNodeEnvironment().toLowerCase();
  const optIn = process.env.SEED_DEMO_DATA?.trim().toLowerCase() === 'true';
  const prodOverride =
    process.env.SEED_ALLOW_DEMO_IN_PRODUCTION?.trim().toLowerCase() === 'true';

  if (nodeEnv === 'production') {
    if (optIn && prodOverride) {
      return {
        enabled: true,
        reason: 'production with explicit SEED_ALLOW_DEMO_IN_PRODUCTION override',
      };
    }

    return {
      enabled: false,
      reason:
        'production: demo data blocked (set SEED_DEMO_DATA=true AND SEED_ALLOW_DEMO_IN_PRODUCTION=true to override)',
    };
  }

  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return { enabled: true, reason: `${nodeEnv}: on by default` };
  }

  return optIn
    ? { enabled: true, reason: `${nodeEnv}: enabled via SEED_DEMO_DATA=true` }
    : { enabled: false, reason: `${nodeEnv}: off (set SEED_DEMO_DATA=true to enable)` };
}

function buildPrismaClient() {
  const connectionString = requireEnv('DATABASE_URL');

  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return { pool, prisma };
}

async function main() {
  requireEnv('DATABASE_URL');

  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();

  const { pool, prisma } = buildPrismaClient();

  try {
    const layers: Record<string, SeedLayerResult> = {};

    // 1. Foundation — creates the primary tenant.
    const bootstrap = await seedBootstrap(prisma);
    layers.bootstrap = bootstrap;

    const tenantId = bootstrap.tenant.id;

    // 2. Control-plane layer for the bootstrapped (primary) tenant.
    layers.platform = await seedPlatform(prisma, tenantId);

    // 3+. Demo / fixture layers — production-safe gate (see resolveDemoDataPolicy).
    const demoPolicy = resolveDemoDataPolicy();
    layers.demoData = { status: 'demo_data_policy', ...demoPolicy };

    if (demoPolicy.enabled) {
      // 3. Additional tenants (multi-tenant isolation / breach testing) + RBAC.
      const tenants = await seedTenants(prisma, tenantId);
      layers.tenants = tenants;

      // 4. Control-plane layer for each additional tenant.
      for (const additional of tenants.additionalTenants) {
        await seedPlatform(prisma, additional.id);
      }

      // 5. Role-spread users for primary + each additional tenant.
      layers.users = await seedUsers(prisma, tenantId);
      for (const additional of tenants.additionalTenants) {
        await seedUsers(prisma, additional.id);
      }

      // 6. Clients for primary + each additional tenant.
      layers.clients = await seedClients(prisma, tenantId);
      for (const additional of tenants.additionalTenants) {
        await seedClients(prisma, additional.id);
      }

      // 7. Client contacts for primary + each additional tenant.
      layers.contacts = await seedContacts(prisma, tenantId);
      for (const additional of tenants.additionalTenants) {
        await seedContacts(prisma, additional.id);
      }

      // 8. HQ branch per tenant (prerequisite for matters / finance / HR).
      layers.branches = await seedBranches(prisma, tenantId);
      for (const additional of tenants.additionalTenants) {
        await seedBranches(prisma, additional.id);
      }

      // 9. Matters per tenant (linked to seeded clients + HQ branch + advocate).
      layers.matters = await seedMatters(prisma, tenantId);
      for (const additional of tenants.additionalTenants) {
        await seedMatters(prisma, additional.id);
      }

      // 10. Calendar events + court hearings per tenant.
      layers.calendar = await seedCalendar(prisma, tenantId);
      for (const additional of tenants.additionalTenants) {
        await seedCalendar(prisma, additional.id);
      }

      // 11. Matter tasks per tenant.
      layers.tasks = await seedTasks(prisma, tenantId);
      for (const additional of tenants.additionalTenants) {
        await seedTasks(prisma, additional.id);
      }

      // 12. Workflow definitions + history + approvals per tenant.
      layers.workflows = await seedWorkflows(prisma, tenantId);
      for (const additional of tenants.additionalTenants) {
        await seedWorkflows(prisma, additional.id);
      }

      // ... subsequent demo/fixture layers (10_finance …) wired here as they land ...
    }

    const finishedAtDate = new Date();

    const summary: SeedExecutionSummary = {
      status: 'master_seed_complete',
      environment: getNodeEnvironment(),
      startedAt,
      finishedAt: finishedAtDate.toISOString(),
      durationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
      tenantId,
      layers,
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[master-seed:error]', {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
