/**
 * Assigns all tenant permissions to the ADMIN role for a given tenant.
 * Run: npx dotenv-cli -e ../../.env -- node --require tsx/cjs src/scripts/assign-role-permissions.ts <tenantId>
 */
import prisma from '../config/database';

async function main() {
  const tenantId = process.argv[2]?.trim();
  if (!tenantId) throw new Error('Usage: assign-role-permissions.ts <tenantId>');

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
  console.log(`[TENANT] ${tenant.name} (${tenantId})`);

  const roles = await prisma.role.findMany({ where: { tenantId }, select: { id: true, name: true } });
  console.log(`[ROLES] Found ${roles.length}:`, roles.map((r) => r.name).join(', '));

  const permissions = await prisma.permission.findMany({
    where: { tenantId },
    select: { id: true, resource: true, action: true },
  });
  console.log(`[PERMS] Found ${permissions.length} permissions`);

  if (!permissions.length) throw new Error('No permissions found — run seed:permissions first');

  for (const role of roles) {
    await prisma.role.update({
      where: { id: role.id },
      data: { permissions: { set: permissions.map((p) => ({ id: p.id })) } },
    });
    console.log(`[OK] Role '${role.name}': assigned ${permissions.length} permissions`);
  }

  console.log(`\n[DONE] All roles now have full permission set.`);
}

main()
  .catch((e) => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
