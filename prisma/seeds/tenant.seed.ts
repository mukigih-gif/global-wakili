// ==========================================
// TENANT SEED: SAMPLE TENANT DATA
// ==========================================

import { PrismaClient } from '@prisma/client';   // ✅ aligned with preferred generator block
import { logger } from './logger';

import bcrypt from 'bcryptjs'; // ✅ use bcryptjs for Windows compatibility

export async function tenantSeed(prisma: PrismaClient) {
  try {
    logger.section('Sample Tenant Seeding');

    // 1. Tenant
    const tenant = await prisma.tenant.upsert({
      where: { slug: 'sample-law-firm' },
      update: {},
      create: {
        name: 'Sample Law Firm',
        slug: 'sample-law-firm',
        description: 'Sample law firm for testing',
        kraPin: 'A123456789DEF',
        subscriptionPlan: 'PROFESSIONAL',
        billingCycleStart: new Date(),
        billingCycleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    logger.success(`Tenant created: ${tenant.name} (${tenant.id})`);

    // 2. Branch
    const branch = await prisma.branch.upsert({
      where: { kraPin: 'B987654321XYZ' },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Nairobi Main Branch',
        kraPin: 'B987654321XYZ',
        location: 'Nairobi, Kenya',
        etimsDrn: 'DRN123456789',
        vscuSerial: 'VSCU123456',
      },
    });
    logger.success(`Branch created: ${branch.name}`);

    // 3. Users
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@samplelawfirm.co.ke' },
      update: {},
      create: {
        email: 'admin@samplelawfirm.co.ke',
        name: 'Admin User',
        passwordHash,
        tenantId: tenant.id,
        branchId: branch.id,
        tenantRole: 'FIRM_ADMIN',
        systemRole: 'NONE',
        phone: '+254712345678',
        admissionNumber: 'P/LSK/12345',
        idNumber: '12345678',
        kraPin: 'A001234567DEF',
        basicSalary: 500000,
      },
    });
    logger.success(`Admin user created: ${admin.email}`);

    const lawyer = await prisma.user.upsert({
      where: { email: 'lawyer@samplelawfirm.co.ke' },
      update: {},
      create: {
        email: 'lawyer@samplelawfirm.co.ke',
        name: 'Sample Lawyer',
        passwordHash,
        tenantId: tenant.id,
        branchId: branch.id,
        tenantRole: 'ADVOCATE',
        systemRole: 'NONE',
        phone: '+254787654321',
        admissionNumber: 'P/LSK/54321',
        idNumber: '87654321',
        kraPin: 'A009876543DEF',
        basicSalary: 300000,
        defaultRate: 5000,
      },
    });
    logger.success(`Lawyer user created: ${lawyer.email}`);

    // 4. Client
    const client = await prisma.client.upsert({
      where: { email: 'client@example.co.ke' },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Sample Client Ltd',
        email: 'client@example.co.ke',
        phone: '+254712999999',
        kraPin: 'C123456789DEF',
        idNumber: '99999999',
        kycStatus: 'APPROVED',
      },
    });
    logger.success(`Client created: ${client.name}`);

    // 5. Matter
    const matter = await prisma.matter.upsert({
      where: { caseNumber: 'CASE/2024/001' },
      update: {},
      create: {
        branchId: branch.id,
        title: 'Sample Commercial Dispute',
        caseNumber: 'CASE/2024/001',
        status: 'ACTIVE',
        category: 'COMMERCIAL',
        description: 'Sample matter for testing',
        clientId: client.id,
        leadAdvocateId: lawyer.id,
        openedDate: new Date(),
      },
    });
    logger.success(`Matter created: ${matter.caseNumber}`);

    // 6. Invoice
    const invoice = await prisma.invoice.upsert({
      where: { invoiceNumber: 'INV/2024/001' },
      update: {},
      create: {
        invoiceNumber: 'INV/2024/001',
        matterId: matter.id,
        branchId: branch.id,
        total: 100000,
        taxAmount: 16000,
        netAmount: 84000,
        status: 'DRAFT',
        issuedDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    logger.success(`Invoice created: ${invoice.invoiceNumber}`);

    // 7. Chart of Accounts
    const coa = [
      { id: '1000', name: 'Cash and Cash Equivalents', type: 'ASSET' },
      { id: '1100', name: 'Accounts Receivable', type: 'ASSET' },
      { id: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { id: '3000', name: 'Legal Fees Revenue', type: 'INCOME' },
      { id: '4000', name: 'Office Expenses', type: 'EXPENSE' },
      { id: '5000', name: 'Trust Account', type: 'TRUST' },
    ];

    for (const account of coa) {
      await prisma.chartOfAccount.upsert({
        where: { tenantId_id: { tenantId: tenant.id, id: account.id } },
        update: {},
        create: {
          ...account,
          tenantId: tenant.id,
        },
      });
    }
    logger.success(`Chart of Accounts created: ${coa.length} accounts`);

    logger.info('\n✨ Tenant seeding completed!');
    logger.info(`\n📌 Test Credentials:`);
    logger.info(`  Email: ${admin.email}`);
    logger.info(`  Password: Password123!`);
    logger.info(`  Tenant ID: ${tenant.id}`);
  } catch (error) {
    logger.error('Tenant seeding failed', error);
    throw error;
  }
}