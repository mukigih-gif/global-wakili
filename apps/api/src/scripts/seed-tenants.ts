/**
 * seed-tenants.ts
 * Creates test tenants: Alpha Advocates, Beta Legal, Mwananchi & Co
 * Run: npx dotenv-cli -e ../../.env -- node --require tsx/cjs src/scripts/seed-tenants.ts
 */
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { seedDefaultRoles } from './seed-default-roles';

const TENANTS = [
  {
    slug: 'alpha-advocates',
    name: 'Alpha Advocates LLP',
    legalName: 'Alpha Advocates LLP',
    country: 'KE', currency: 'KES', timezone: 'Africa/Nairobi',
    kraPin: 'P051234567X', billingCycleStart: 1, billingCycleEnd: 31,
    plan: 'PROFESSIONAL',
    adminEmail: 'admin@alphaadvocates.co.ke',
    adminName: 'Alice Mwangi',
    adminPassword: 'Alpha@2026!',
  },
  {
    slug: 'beta-legal',
    name: 'Beta Legal Associates',
    legalName: 'Beta Legal Associates',
    country: 'KE', currency: 'KES', timezone: 'Africa/Nairobi',
    kraPin: 'P051234568X', billingCycleStart: 1, billingCycleEnd: 31,
    plan: 'ENTERPRISE',
    adminEmail: 'admin@betalegal.co.ke',
    adminName: 'Brian Otieno',
    adminPassword: 'Beta@2026!',
  },
  {
    slug: 'mwananchi-co',
    name: 'Mwananchi & Co Advocates',
    legalName: 'Mwananchi & Co Advocates',
    country: 'KE', currency: 'KES', timezone: 'Africa/Nairobi',
    kraPin: 'P051234569X', billingCycleStart: 1, billingCycleEnd: 31,
    plan: 'STARTER',
    adminEmail: 'admin@mwananchi.co.ke',
    adminName: 'David Kamau',
    adminPassword: 'Mwananchi@2026!',
  },
];

async function main() {
  console.log('[TENANTS] Creating test tenants for isolation testing...\n');

  for (const t of TENANTS) {
    const existing = await prisma.tenant.findUnique({ where: { slug: t.slug } });
    if (existing) {
      console.log(`[SKIP] Tenant '${t.slug}' already exists (${existing.id})`);
      continue;
    }

    // Billing cycle: convert day-of-month (1..31) to dates in the current month
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const billingCycleStart = new Date(Date.UTC(year, month, Math.min(t.billingCycleStart, lastDay)));
    const billingCycleEnd = new Date(Date.UTC(year, month, Math.min(t.billingCycleEnd, lastDay)));

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug:              t.slug,
        name:              t.name,
        kraPin:            t.kraPin,
        currency:          t.currency,
        timezone:          t.timezone,
        billingCycleStart,
        billingCycleEnd,
      },
    });
    console.log(`[OK] Tenant: ${t.name} (${tenant.id})`);

    // Create ADMIN role
    const adminRole = await prisma.role.create({
      data: { tenantId: tenant.id, name: 'ADMIN', isSystem: true },
    });

    // Seed the permission catalog + all default roles (FIRM_ADMIN, MANAGING_PARTNER, … CLERK)
    await seedDefaultRoles(prisma, tenant.id);

    // Connect the full permission catalog to the legacy ADMIN role.
    const allPerms = await prisma.permission.findMany({ where: { tenantId: tenant.id }, select: { id: true } });
    await prisma.role.update({
      where: { id: adminRole.id },
      data: { permissions: { connect: allPerms.map((p) => ({ id: p.id })) } },
    });

    // Resolve FIRM_ADMIN to connect the admin user (full access).
    const firmAdminRole = await prisma.role.findUniqueOrThrow({
      where: { tenantId_name: { tenantId: tenant.id, name: 'FIRM_ADMIN' } },
      select: { id: true },
    });

    // Create admin user
    const hash   = await bcrypt.hash(t.adminPassword, 12);
    await prisma.user.create({
      data: {
        tenantId:     tenant.id,
        email:        t.adminEmail,
        name:         t.adminName,
        passwordHash: hash,
        status:       'ACTIVE',
        tenantRole:   'FIRM_ADMIN',
        roles:        { connect: [{ id: adminRole.id }, { id: firmAdminRole.id }] },
      },
    });
    console.log(`  └── Admin: ${t.adminEmail}`);
  }

  console.log('\n[DONE] Test tenants ready for isolation testing.');
}

main()
  .catch((e) => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
