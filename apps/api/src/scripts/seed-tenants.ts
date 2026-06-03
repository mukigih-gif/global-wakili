/**
 * seed-tenants.ts
 * Creates test tenants: Alpha Advocates, Beta Legal, Mwananchi & Co
 * Run: npx dotenv-cli -e ../../.env -- node --require tsx/cjs src/scripts/seed-tenants.ts
 */
import prisma from '../config/database';

const TENANTS = [
  {
    slug: 'alpha-advocates',
    name: 'Alpha Advocates LLP',
    legalName: 'Alpha Advocates LLP',
    country: 'KE', currency: 'KES', timezone: 'Africa/Nairobi',
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

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug:         t.slug,
        name:         t.name,
        legalName:    t.legalName,
        country:      t.country,
        currency:     t.currency,
        timezone:     t.timezone,
        status:       'ACTIVE',
        planId:       null, // set via subscription
      },
    });
    console.log(`[OK] Tenant: ${t.name} (${tenant.id})`);

    // Create ADMIN role
    const adminRole = await prisma.role.create({
      data: { tenantId: tenant.id, name: 'ADMIN', isSystem: true },
    });

    // Seed permissions for this tenant
    const perms = await prisma.permission.findMany({ where: { tenantId: null } }).catch(() => []);
    // Create admin user
    const bcrypt = await import('bcryptjs');
    const hash   = await bcrypt.hash(t.adminPassword, 12);
    await prisma.user.create({
      data: {
        tenantId:     tenant.id,
        email:        t.adminEmail,
        name:         t.adminName,
        passwordHash: hash,
        status:       'ACTIVE',
        tenantRole:   'FIRM_ADMIN',
        roles:        { connect: [{ id: adminRole.id }] },
      },
    });
    console.log(`  └── Admin: ${t.adminEmail}`);
  }

  console.log('\n[DONE] Test tenants ready for isolation testing.');
}

main()
  .catch((e) => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
