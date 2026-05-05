import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import * as bootstrapModule from './seeds/00_bootstrap';

type SeedLayerResult = {
  status: string;
  [key: string]: unknown;
};

type SeedExecutionSummary = {
  status: 'seed_complete';
  environment: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  layers: {
    bootstrap: SeedLayerResult;
  };
};

type BootstrapModuleShape = {
  seedBootstrap?: unknown;
  default?: {
    seedBootstrap?: unknown;
  };
  'module.exports'?: {
    seedBootstrap?: unknown;
  };
};

type SeedBootstrapFn = (
  prisma: PrismaClient,
) => Promise<SeedLayerResult>;

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required to run database seed.`);
  }

  return value.trim();
}

function getNodeEnvironment(): string {
  return process.env.NODE_ENV?.trim() || 'development';
}

function resolveSeedBootstrap(): SeedBootstrapFn {
  const moduleShape = bootstrapModule as BootstrapModuleShape;

  const candidate =
    moduleShape.seedBootstrap ??
    moduleShape.default?.seedBootstrap ??
    moduleShape['module.exports']?.seedBootstrap;

  if (typeof candidate !== 'function') {
    throw new Error(
      'Seed bootstrap layer is not exported correctly. Expected seedBootstrap(prisma) from packages/database/prisma/seeds/00_bootstrap.ts.',
    );
  }

  return candidate as SeedBootstrapFn;
}

function assertSeedRuntimeSafety() {
  requireEnv('DATABASE_URL');

  /*
   * Security policy:
   * - The seed entrypoint must not invent credentials.
   * - User/admin password hashes must be supplied by seed layers through
   *   explicit environment validation.
   * - No database URLs, secrets, tokens, or hashes are logged here.
   */
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

  return {
    pool,
    prisma,
  };
}

async function main() {
  assertSeedRuntimeSafety();

  const seedBootstrap = resolveSeedBootstrap();

  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();

  const { pool, prisma } = buildPrismaClient();

  try {
    const bootstrap = await seedBootstrap(prisma);

    const finishedAtDate = new Date();
    const finishedAt = finishedAtDate.toISOString();

    const summary: SeedExecutionSummary = {
      status: 'seed_complete',
      environment: getNodeEnvironment(),
      startedAt,
      finishedAt,
      durationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
      layers: {
        bootstrap,
      },
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[seed:error]', {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});