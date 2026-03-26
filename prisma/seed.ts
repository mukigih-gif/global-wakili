// prisma/seed.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';
import { masterSeed } from './seeds/master.seed.ts'; // Updated name

async function main() {
  const connectionString = process.env.DATABASE_URL; // Change it back from the hardcoded string
  
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🚀 Starting Global Wakili Seeding...');
    await masterSeed(prisma); // Calling the renamed function
    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();