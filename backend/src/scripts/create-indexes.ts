// ==========================================
// CREATE PERFORMANCE INDEXES
// Critical indexes for query optimization
// ==========================================

import { PrismaClient } from '@prisma/client';
import { logger } from '../prisma/seeds/logger';

const prisma = new PrismaClient();

const INDEXES = [
  // User indexes
  {
    name: 'idx_user_tenant_status',
    table: 'User',
    sql: 'CREATE INDEX idx_user_tenant_status ON "User" ("tenantId", "status") WHERE "deletedAt" IS NULL',
  },
  {
    name: 'idx_user_email',
    table: 'User',
    sql: 'CREATE INDEX idx_user_email ON "User" ("email")',
  },

  // Matter indexes
  {
    name: 'idx_matter_tenant_status_date',
    table: 'Matter',
    sql: 'CREATE INDEX idx_matter_tenant_status_date ON "Matter" ("branchId", "status", "createdAt" DESC) WHERE "deletedAt" IS NULL',
  },
  {
    name: 'idx_matter_case_number',
    table: 'Matter',
    sql: 'CREATE INDEX idx_matter_case_number ON "Matter" ("caseNumber")',
  },

  // Invoice indexes
  {
    name: 'idx_invoice_status_date',
    table: 'Invoice',
    sql: 'CREATE INDEX idx_invoice_status_date ON "Invoice" ("status", "createdAt" DESC)',
  },
  {
    name: 'idx_invoice_etims',
    table: 'Invoice',
    sql: 'CREATE INDEX idx_invoice_etims ON "Invoice" ("branchId", "etimsValidated", "createdAt") WHERE "status" != \'CANCELLED\'',
  },

  // Audit log indexes
  {
    name: 'idx_audit_tenant_entity_date',
    table: 'AuditLog',
    sql: 'CREATE INDEX idx_audit_tenant_entity_date ON "AuditLog" ("tenantId", "entityType", "entityId", "createdAt" DESC)',
  },
  {
    name: 'idx_audit_severity_date',
    table: 'AuditLog',
    sql: 'CREATE INDEX idx_audit_severity_date ON "AuditLog" ("tenantId", "severity", "createdAt" DESC)',
  },

  // Financial indexes
  {
    name: 'idx_journal_entry_date',
    table: 'JournalEntry',
    sql: 'CREATE INDEX idx_journal_entry_date ON "JournalEntry" ("tenantId", "date", "id")',
  },

  // Time tracking indexes
  {
    name: 'idx_time_entry_matter_date',
    table: 'TimeEntry',
    sql: 'CREATE INDEX idx_time_entry_matter_date ON "TimeEntry" ("matterId", "entryDate" DESC) WHERE "status" != \'BILLED\'',
  },

  // Notification indexes
  {
    name: 'idx_notification_status_retry',
    table: 'Notification',
    sql: 'CREATE INDEX idx_notification_status_retry ON "Notification" ("tenantId", "status", "nextRetryAt") WHERE "status" = \'PENDING\'',
  },

  // Permission indexes
  {
    name: 'idx_permission_role_action',
    table: 'Permission',
    sql: 'CREATE INDEX idx_permission_role_action ON "Permission" ("tenantId", "action", "resource")',
  },

  // Rate limit indexes
  {
    name: 'idx_rate_limit_log',
    table: 'RateLimitLog',
    sql: 'CREATE INDEX idx_rate_limit_log ON "RateLimitLog" ("tenantId", "ipAddress", "endpoint")',
  },
];

async function createIndexes() {
  try {
    logger.section('Creating Performance Indexes');

    logger.info(`Found ${INDEXES.length} indexes to create`);

    for (const index of INDEXES) {
      try {
        await prisma.$executeRawUnsafe(index.sql);
        logger.success(`✓ ${index.name}`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          logger.warn(`⚠ ${index.name} (already exists)`);
        } else {
          throw error;
        }
      }
    }

    logger.info('\n✨ All indexes created successfully!');

  } catch (error) {
    logger.error('Failed to create indexes', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createIndexes();