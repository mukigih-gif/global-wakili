/**
 * seed-test-users.ts — idempotent. Creates certification test users in a tenant,
 * each connected to an existing default role (run seed-default-roles first).
 * Skips a user whose email already exists in the tenant.
 * Add a user by appending to TEST_USERS — "room for any user".
 * Usage: node --require tsx/cjs src/scripts/seed-test-users.ts <tenantSlug>
 *
 * NOTE: tenantRole is the restricted TenantRole enum (informational); the
 * connected Role (by name) is what actually drives RBAC. hr@ (HR_MANAGER) has
 * NO functional HR access (F-14 — HR is bypass-only via MANAGING_PARTNER/admins).
 */
import bcrypt from 'bcryptjs';
import prisma from '../config/database';

type TestUser = {
  name: string; email: string; password: string;
  roleName: string;        // Role.name to connect (drives RBAC)
  tenantRole: 'FIRM_ADMIN' | 'BRANCH_MANAGER' | 'ADVOCATE' | 'ASSOCIATE' | 'ACCOUNTANT' | 'CLERK';
};

const TEST_USERS: TestUser[] = [
  { name: 'Test Managing Partner', email: 'managingpartner@demo-law-firm.co.ke', password: 'Test@ManagingPartner2026!', roleName: 'MANAGING_PARTNER', tenantRole: 'BRANCH_MANAGER' },
  { name: 'Test Partner',          email: 'partner@demo-law-firm.co.ke',          password: 'Test@Partner2026!',          roleName: 'PARTNER',          tenantRole: 'ADVOCATE' },
  { name: 'Test Advocate',         email: 'advocate@demo-law-firm.co.ke',         password: 'Test@Advocate2026!',         roleName: 'ADVOCATE',         tenantRole: 'ADVOCATE' },
  { name: 'Test Accountant',       email: 'accounts@demo-law-firm.co.ke',         password: 'Test@Accountant2026!',       roleName: 'ACCOUNTANT',       tenantRole: 'ACCOUNTANT' },
  { name: 'Test HR Manager',       email: 'hr@demo-law-firm.co.ke',               password: 'Test@Hr2026!',               roleName: 'HR_MANAGER',       tenantRole: 'BRANCH_MANAGER' },
  { name: 'Test Receptionist',     email: 'receptionist@demo-law-firm.co.ke',     password: 'Test@Receptionist2026!',     roleName: 'RECEPTIONIST',     tenantRole: 'CLERK' },
  { name: 'Test LowPriv',          email: 'lowpriv@demo-law-firm.co.ke',          password: 'Test@Clerk2026!',            roleName: 'CLERK',            tenantRole: 'CLERK' },
];

async function main(): Promise<void> {
  const slug = process.argv[2]?.trim();
  if (!slug) {
    console.error('Usage: node --require tsx/cjs src/scripts/seed-test-users.ts <tenantSlug>');
    process.exit(1);
  }
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!tenant) {
    console.error(`Tenant '${slug}' not found.`);
    process.exit(1);
  }
  console.info(`[TEST-USERS] Tenant ${tenant.name} [${tenant.id}]`);

  for (const u of TEST_USERS) {
    const existing = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email: u.email }, select: { id: true },
    });
    if (existing) { console.info(`[TEST-USERS] SKIP   ${u.email} (already exists)`); continue; }

    const role = await prisma.role.findUnique({
      where: { tenantId_name: { tenantId: tenant.id, name: u.roleName } }, select: { id: true },
    });
    if (!role) {
      console.error(`[TEST-USERS] ERROR  Role '${u.roleName}' not found for tenant — run seed-default-roles first.`);
      process.exit(1);
    }

    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: u.email,
        name: u.name,
        passwordHash: hash,
        status: 'ACTIVE',
        tenantRole: u.tenantRole,
        roles: { connect: [{ id: role.id }] },
      },
    });
    console.info(`[TEST-USERS] CREATE ${u.email} → role ${u.roleName}`);
  }
  console.info('[TEST-USERS] Done.');
}

main()
  .catch((e) => { console.error('[TEST-USERS] FAILED', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
