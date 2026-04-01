import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const superRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: {},
    create: { name: 'super_admin', description: 'Global super administrator', scope: 'global' }
  });

  const superUser = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      name: 'Super Admin',
      passwordHash: 'dev-placeholder-hash'
    }
  });

  await prisma.userRole.upsert({
    where: { id: `${superUser.id}-${superRole.id}` },
    update: {},
    create: { id: `${superUser.id}-${superRole.id}`, userId: superUser.id, roleId: superRole.id }
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: { name: 'Default Tenant', slug: 'default', ownerId: superUser.id }
  });

  await prisma.tenantMembership.upsert({
    where: { id: `${tenant.id}-${superUser.id}` },
    update: {},
    create: { id: `${tenant.id}-${superUser.id}`, tenantId: tenant.id, userId: superUser.id, role: 'owner', isOwner: true }
  });

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });