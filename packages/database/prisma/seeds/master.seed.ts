import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { seedBootstrap } from './00_bootstrap';
import { seedPlatform } from './00_platform.seed';

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

    // 2. Control-plane layer for the bootstrapped tenant.
    layers.platform = await seedPlatform(prisma, tenantId);

    // ... subsequent numbered layers wired here as they land ...

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
