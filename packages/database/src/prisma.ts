// packages/database/src/prisma.ts
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// UPDATE: Point to the root directory (three levels up from src/prisma.ts)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const useNeon = process.env.USE_NEON === 'true' || process.env.NODE_ENV === 'production';

let prisma: PrismaClient;

if (useNeon) {
  const { PrismaNeon } = require('@prisma/adapter-neon');
  const adapter = new PrismaNeon({ connectionString });
  prisma = new PrismaClient({ adapter });
} else {
  prisma = new PrismaClient();
}

export async function connectPrisma() {
  await prisma.$connect();
}

export async function disconnectPrisma() {
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
}

export const getTenantClient = (tenantId: string) => {
  const { tenantExtension } = require('./tenant-extension');
  return prisma.$extends(tenantExtension(tenantId));
};

export default prisma;