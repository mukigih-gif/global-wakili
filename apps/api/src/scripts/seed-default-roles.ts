/**
 * seed-default-roles.ts — idempotent default-role seeder.
 *
 * Creates the standard law-firm roles for a tenant, connecting permissions from
 * the tenant's permission catalog (resource.action keys). The full catalog is
 * upserted first (idempotent), so this also works for brand-new tenants.
 *
 * Idempotent: a role that already exists (tenantId + name) is SKIPPED and left
 * untouched — existing roles/permission wiring is never overwritten.
 *
 * Add a new role by appending one entry to ROLE_SPECS — "room for any role".
 *
 * Usage: node --require tsx/cjs src/scripts/seed-default-roles.ts <tenantId>
 * Exports seedDefaultRoles(prisma, tenantId) for reuse in tenant provisioning.
 *
 * NOTE (F-14): the HR module uses a separate permission system
 * (hr-permission.map.ts) with colon-format keys that are NOT in this catalog.
 * The catalog perms below grant HR_MANAGER only payroll/client/reporting;
 * functional HR module access is granted role-by-name in hr-permission.map.ts
 * (HR_FULL_ACCESS_ROLES + the MANAGING_PARTNER/SUPER_ADMIN/SYSTEM_ADMIN bypass),
 * not via this catalog. See FINDING-008-001 (commit 8bb946d).
 */
import { PermissionScope } from '@prisma/client';
import defaultPrisma from '../config/database';
import { ALL_PERMISSION_DEFINITIONS } from '../config/permissions';
import { CANONICAL_ROLES, resolveRolePermissions } from '../config/roles';

type Db = typeof defaultPrisma;
type CatalogRow = { id: string; resource: string; action: string };

// Roles live in the canonical single source of truth: apps/api/src/config/roles.ts
// (CANONICAL_ROLES) — shared with 00_bootstrap.ts so seeded and onboarded tenants
// get identical UPPERCASE roles + grants (FINDING-007-011 step a).

export async function seedDefaultRoles(prisma: Db, tenantId: string): Promise<void> {
  // 1. Ensure the permission catalog exists for this tenant (idempotent — no-op if seeded).
  for (const perm of ALL_PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { unique_tenant_action_resource: { tenantId, action: perm.action, resource: perm.resource } },
      update: {},
      create: {
        tenantId,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        scope: PermissionScope.TENANT,
        isSystem: true,
      },
    });
  }

  const catalog: CatalogRow[] = await prisma.permission.findMany({
    where: { tenantId },
    select: { id: true, resource: true, action: true },
  });

  // 2. Create each role if absent (skip-if-exists; existing roles are untouched).
  for (const spec of CANONICAL_ROLES) {
    const existing = await prisma.role.findUnique({
      where: { tenantId_name: { tenantId, name: spec.name } },
      select: { id: true },
    });
    if (existing) {
      console.info(`[ROLES] SKIP   ${spec.name} (already exists)`);
      continue;
    }
    const ids = resolveRolePermissions(catalog, spec).map((p) => ({ id: p.id }));
    await prisma.role.create({
      data: {
        tenantId,
        name: spec.name,
        description: spec.description,
        isSystem: true,
        permissions: { connect: ids },
      },
    });
    console.info(`[ROLES] CREATE ${spec.name} (${ids.length} permissions)`);
  }
}

async function main(): Promise<void> {
  const tenantId = process.argv[2]?.trim();
  if (!tenantId) {
    console.error('Usage: node --require tsx/cjs src/scripts/seed-default-roles.ts <tenantId>');
    process.exit(1);
  }
  const tenant = await defaultPrisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, slug: true } });
  if (!tenant) {
    console.error(`Tenant ${tenantId} not found.`);
    process.exit(1);
  }
  console.info(`[ROLES] Seeding default roles for ${tenant.slug} [${tenant.id}]`);
  await seedDefaultRoles(defaultPrisma, tenantId);
  console.info('[ROLES] Done.');
}

if (require.main === module) {
  main()
    .catch((e) => { console.error('[ROLES] FAILED', e); process.exit(1); })
    .finally(() => defaultPrisma.$disconnect());
}
