// ==========================================
// GLOBAL WAKILI: MASTER SEED (v3.2)
// With System Tenant for global roles/permissions
// ==========================================

// prisma/seeds/master.seed.ts
import { PrismaClient } from '../generated/client';

export async function masterSeed(prisma: PrismaClient) { 
  // ... all your seeding logic goes here ...
  // Make sure you don't have another "async function main()" inside this file!
}

const SYSTEM_ROLES = [
  { name: 'SUPER_ADMIN', description: 'Full platform access - God mode', isSystem: true },
  { name: 'SYSTEM_ADMIN', description: 'Tenant onboarding and platform management', isSystem: true },
  { name: 'SYSTEM_SUPPORT', description: 'Read-only support access', isSystem: true },
];

const TENANT_ROLES = [
  { name: 'FIRM_ADMIN', description: 'Managing Partner - Full access', isSystem: true },
  { name: 'BRANCH_MANAGER', description: 'Branch-level management', isSystem: true },
  { name: 'ADVOCATE', description: 'Lawyer - Matter management', isSystem: true },
  { name: 'ASSOCIATE', description: 'Junior lawyer - Limited matter access', isSystem: true },
  { name: 'ACCOUNTANT', description: 'Finance and payroll management', isSystem: true },
  { name: 'CLERK', description: 'Administrative tasks and documents', isSystem: true },
  { name: 'CLIENT', description: 'Portal access only', isSystem: true },
];

const PERMISSIONS = [
  { action: 'matter:create', resource: 'matter', scope: 'TENANT' },
  { action: 'matter:read', resource: 'matter', scope: 'BRANCH' },
  { action: 'matter:update', resource: 'matter', scope: 'MATTER' },
  { action: 'matter:delete', resource: 'matter', scope: 'TENANT' },
  { action: 'invoice:create', resource: 'invoice', scope: 'BRANCH' },
  { action: 'invoice:approve', resource: 'invoice', scope: 'TENANT' },
  { action: 'expense:create', resource: 'expense', scope: 'BRANCH' },
  { action: 'payment:process', resource: 'payment', scope: 'TENANT' },
  { action: 'trust:read', resource: 'trust', scope: 'TENANT' },
  { action: 'trust:reconcile', resource: 'trust', scope: 'TENANT' },
  { action: 'payroll:process', resource: 'payroll', scope: 'TENANT' },
  { action: 'document:upload', resource: 'document', scope: 'BRANCH' },
  { action: 'document:view', resource: 'document', scope: 'BRANCH' },
  { action: 'task:create', resource: 'task', scope: 'BRANCH' },
  { action: 'task:assign', resource: 'task', scope: 'BRANCH' },
  { action: 'client:create', resource: 'client', scope: 'TENANT' },
  { action: 'client:read', resource: 'client', scope: 'BRANCH' },
  { action: 'admin:users', resource: 'admin', scope: 'TENANT' },
  { action: 'admin:audit', resource: 'admin', scope: 'TENANT' },
];

export async function main(prisma: PrismaClient) {
  try {
    logger.section('Global Wakili Master Seed v3.2');

    // 0. Ensure System Tenant exists
    const systemTenant = await prisma.tenant.upsert({
      where: { slug: 'system' },
      update: {},
      create: {
        slug: 'system',
        name: 'System Tenant',
        description: 'Tenant used for global/system roles and permissions',
        kraPin: 'SYS000000000', // ✅ required field
        subscriptionPlan: 'SYSTEM',
        billingCycleStart: new Date(),
        billingCycleEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year cycle
      },
    });

    // 1. Seed Roles (System & Tenant)
    const allRoles = [...SYSTEM_ROLES, ...TENANT_ROLES];
    for (const roleData of allRoles) {
      await prisma.role.upsert({
        where: { tenantId_name: { tenantId: systemTenant.id, name: roleData.name } },
        update: { description: roleData.description },
        create: { ...roleData, tenantId: systemTenant.id },
      });
    }

    // 2. Seed Permissions
    for (const permData of PERMISSIONS) {
      await prisma.permission.upsert({
        where: {
          tenantId_action_resource: {
            tenantId: systemTenant.id,
            action: permData.action,
            resource: permData.resource,
          },
        },
        update: { scope: permData.scope },
        create: { ...permData, tenantId: systemTenant.id },
      });
    }

    // 3. Map permissions to roles
    const roleMapping = [
      { roleName: 'ADVOCATE', resources: ['matter', 'client', 'document', 'task'] },
      { roleName: 'ACCOUNTANT', resources: ['invoice', 'trust', 'expense', 'payment', 'payroll'] },
      { roleName: 'FIRM_ADMIN', resources: ['*'] },
    ];

    for (const mapping of roleMapping) {
      const permsToLink = await prisma.permission.findMany({
        where: {
          resource: mapping.resources.includes('*') ? { not: '' } : { in: mapping.resources },
          tenantId: systemTenant.id,
        },
      });

      await prisma.role.update({
        where: { tenantId_name: { tenantId: systemTenant.id, name: mapping.roleName } },
        data: { permissions: { set: permsToLink.map(p => ({ id: p.id })) } },
      });
    }

    logger.success('✨ Master seeding and RBAC mapping complete.');
  } catch (error) {
    logger.error('Master seeding failed', error);
    throw error;
  }
}