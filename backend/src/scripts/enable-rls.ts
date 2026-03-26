// ==========================================
// ENABLE ROW-LEVEL SECURITY (RLS)
// Executes SQL to enable RLS policies
// ==========================================

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { logger } from '../prisma/seeds/logger';

const prisma = new PrismaClient();

async function enableRLS() {
  try {
    logger.section('Enabling Row-Level Security (RLS)');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'enable-rls.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Split by statements and execute
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    logger.info(`Found ${statements.length} RLS statements to execute`);

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        logger.success(`✓ ${statement.split('\n')[0].substring(0, 60)}...`);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          throw error;
        }
        logger.warn(`⚠ Policy already exists: ${statement.split('\n')[0]}`);
      }
    }

    logger.info('\n✨ RLS enabled successfully!');
    logger.info('⚠️  Important: RLS policies will enforce tenant isolation at the database level');

  } catch (error) {
    logger.error('Failed to enable RLS', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

enableRLS();