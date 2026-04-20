import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { createTenantExtension } from './tenant-extension';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to initialize PrismaClient.');
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = pool;
}

export type DbClient = PrismaClient;
export type TenantScopedClient = ReturnType<typeof getTenantClient>;

export async function connectPrisma(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}

export function getTenantClient(tenantId: string) {
  if (!tenantId) {
    throw new Error('tenantId is required to create a tenant-scoped Prisma client.');
  }

  return prisma.$extends(createTenantExtension(tenantId));
}

export default prisma;