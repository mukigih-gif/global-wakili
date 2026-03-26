// ==========================================
// DATABASE INTEGRITY CHECK
// Validates schema and data consistency
// ==========================================

import { PrismaClient } from '@prisma/client';
import { logger } from '../prisma/seeds/logger';

const prisma = new PrismaClient();

interface IntegrityCheck {
  name: string;
  test: () => Promise<boolean>;
}

const checks: IntegrityCheck[] = [
  {
    name: 'Orphaned users (no tenant, no system role)',
    test: async () => {
      const result = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM "User" 
        WHERE "tenantId" IS NULL AND "systemRole" = 'NONE'
      `;
      return result[0].count === 0;
    },
  },
  {
    name: 'All matters have clients',
    test: async () => {
      const result = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM "Matter" WHERE "clientId" IS NULL
      `;
      return result[0].count === 0;
    },
  },
  {
    name: 'All invoices have matters',
    test: async () => {
      const result = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM "Invoice" WHERE "matterId" IS NULL
      `;
      return result[0].count === 0;
    },
  },
  {
    name: 'All matters have branches',
    test: async () => {
      const result = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM "Matter" WHERE "branchId" IS NULL
      `;
      return result[0].count === 0;
    },
  },
  {
    name: 'All branches have tenants',
    test: async () => {
      const result = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM "Branch" WHERE "tenantId" IS NULL
      `;
      return result[0].count === 0;
    },
  },
  {
    name: 'Invoice totals equal net + tax',
    test: async () => {
      const result = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM "Invoice" 
        WHERE ("total" != ("netAmount" + "taxAmount"))
      `;
      return result[0].count === 0;
    },
  },
];

async function checkIntegrity() {
  try {
    logger.section('Database Integrity Check');

    let passedCount = 0;
    let failedCount = 0;

    for (const check of checks) {
      try {
        const passed = await check.test();
        if (passed) {
          logger.success(check.name);
          passedCount++;
        } else {
          logger.