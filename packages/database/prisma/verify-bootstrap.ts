import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}

async function main() {
  const pool = new Pool({
    connectionString: requireEnv('DATABASE_URL'),
    max: 3,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  try {
    const tenant = await prisma.tenant.findUnique({
      where: {
        slug: requireEnv('SEED_TENANT_SLUG'),
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    if (!tenant) {
      throw new Error('Seed tenant not found.');
    }

    const [permissions, roles, users, roleDetails, platformAdmin, firmAdmin] =
      await Promise.all([
        prisma.permission.count({
          where: {
            tenantId: tenant.id,
          },
        }),
        prisma.role.count({
          where: {
            tenantId: tenant.id,
          },
        }),
        prisma.user.count({
          where: {
            OR: [{ tenantId: tenant.id }, { tenantId: null }],
          },
        }),
        prisma.role.findMany({
          where: {
            tenantId: tenant.id,
          },
          select: {
            name: true,
            _count: {
              select: {
                permissions: true,
                users: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        }),
        prisma.user.findFirst({
          where: {
            tenantId: null,
            email: requireEnv('SEED_PLATFORM_ADMIN_EMAIL').toLowerCase(),
          },
          select: {
            id: true,
            email: true,
            tenantId: true,
            systemRole: true,
            tenantRole: true,
            status: true,
          },
        }),
        prisma.user.findFirst({
          where: {
            tenantId: tenant.id,
            email: requireEnv('SEED_FIRM_ADMIN_EMAIL').toLowerCase(),
          },
          select: {
            id: true,
            email: true,
            tenantId: true,
            systemRole: true,
            tenantRole: true,
            status: true,
          },
        }),
      ]);

    console.log(
      JSON.stringify(
        {
          status: 'bootstrap_verification_complete',
          tenant,
          counts: {
            permissions,
            roles,
            users,
          },
          roleDetails,
          platformAdmin,
          firmAdmin,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[verify-bootstrap:error]', {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});