import 'dotenv/config';

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
      throw new Error('Tenant not found.');
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId: tenant.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
      select: {
        id: true,
        tenantId: true,
        userId: true,
        action: true,
        severity: true,
        entityType: true,
        entityId: true,
        success: true,
        failureReason: true,
        correlationId: true,
        reason: true,
        ipAddress: true,
        userAgent: true,
        previousHash: true,
        hash: true,
        afterData: true,
        createdAt: true,
      },
    });

    console.log(
      JSON.stringify(
        {
          status: 'audit_log_verification_complete',
          tenant,
          count: logs.length,
          expectedEventCodes: [
            'LOGIN_SUCCESS',
            'LOGIN_FAILED_INVALID_PASSWORD',
            'LOGOUT_SUCCESS',
          ],
          logs,
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
  console.error('[verify-auth-audit-logs:error]', {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});