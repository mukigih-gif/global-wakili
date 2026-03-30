import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaNeon } from '@prisma/adapter-neon';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);

// In Prisma 7, we pass the adapter directly
export const prisma = new PrismaClient({ adapter });

// Optional helpers for graceful lifecycle management
export async function connectPrisma() {
  try {
    await prisma.$connect();
    logger.info('Prisma connected');
  } catch (err) {
    logger.error({ err }, 'Prisma connection failed');
    throw err;
  }
}

export async function disconnectPrisma() {
  try {
    await prisma.$disconnect();
    await pool.end();
    logger.info('Prisma and PG pool disconnected');
  } catch (err) {
    logger.error({ err }, 'Error during Prisma disconnect');
  }
}

export default prisma;