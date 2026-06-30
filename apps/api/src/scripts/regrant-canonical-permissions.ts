/**
 * regrant-canonical-permissions.ts — one-time post-deploy data migration for
 * FINDING-007-011 step (a)/(b) carry-forward.
 *
 * Existing tenants provisioned BEFORE the catalog back-fill (step b) + seeder
 * unification (step a) have stale role grants — most importantly HR_MANAGER lacks
 * hr.* (seed-default-roles is skip-if-exists, so a re-run never updates it), and
 * ACCOUNTANT/CFO/BRANCH_MANAGER lack payments.*, etc. Once the route migration
 * (step c) is deployed, those users lose access until re-granted.
 *
 * This migration is:
 *  - IDEMPOTENT — re-connecting an already-granted permission is a no-op.
 *  - ADDITIVE — uses `connect` (never `set`/`disconnect`); existing custom grants
 *    are preserved, only missing canonical grants are added.
 *  - SINGLE-SOURCE — reuses CANONICAL_ROLES + resolveRolePermissions.
 *
 * Usage:
 *   node --require tsx/cjs src/scripts/regrant-canonical-permissions.ts --dry-run
 *   node --require tsx/cjs src/scripts/regrant-canonical-permissions.ts [--tenant=<id>] [--create-missing]
 *
 * Flags:
 *   --dry-run         report planned grants, write nothing (read-only).
 *   --tenant=<id>     limit to one tenant (default: all tenants).
 *   --create-missing  also CREATE canonical roles absent in a tenant (default: re-grant existing only).
 */
import { PermissionScope } from '@prisma/client';
import prisma, { connectPrisma, disconnectPrisma } from '../config/database';
import { ALL_PERMISSION_DEFINITIONS } from '../config/permissions';
import { CANONICAL_ROLES, ZERO_PERM_OK_ROLES, resolveRolePermissions } from '../config/roles';

type CatalogRow = { id: string; resource: string; action: string };

const CODE_CATALOG: CatalogRow[] = ALL_PERMISSION_DEFINITIONS.map((p) => ({
  id: `${p.resource}.${p.action}`,
  resource: p.resource,
  action: p.action,
}));

function key(p: { resource: string; action: string }): string {
  return `${p.resource}.${p.action}`;
}

type RolePlan = { role: string; exists: boolean; toAdd: number; addedKeys: string[] };

/** Read-only: compute, per canonical role, which dot keys this tenant's role is missing. */
async function planTenant(tenantId: string): Promise<RolePlan[]> {
  const plans: RolePlan[] = [];
  for (const role of CANONICAL_ROLES) {
    const existing = await prisma.role.findUnique({
      where: { tenantId_name: { tenantId, name: role.name } },
      select: { id: true, permissions: { select: { resource: true, action: true } } },
    });
    const intended = resolveRolePermissions(CODE_CATALOG, role).map((p) => key(p));
    if (!existing) {
      plans.push({ role: role.name, exists: false, toAdd: intended.length, addedKeys: intended });
      continue;
    }
    const current = new Set(existing.permissions.map((p) => key(p)));
    const addedKeys = intended.filter((k) => !current.has(k));
    plans.push({ role: role.name, exists: true, toAdd: addedKeys.length, addedKeys });
  }
  return plans;
}

/** Apply (idempotent, additive). Optionally creates absent canonical roles. */
async function applyTenant(
  db: typeof prisma,
  tenantId: string,
  opts: { createMissing: boolean },
): Promise<{ rolesUpdated: number; rolesCreated: number }> {
  // 1. ensure the full permission catalog exists for this tenant (idempotent).
  for (const perm of ALL_PERMISSION_DEFINITIONS) {
    await db.permission.upsert({
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

  const catalog: CatalogRow[] = await db.permission.findMany({
    where: { tenantId },
    select: { id: true, resource: true, action: true },
  });

  let rolesUpdated = 0;
  let rolesCreated = 0;

  for (const role of CANONICAL_ROLES) {
    const resolved = resolveRolePermissions(catalog, role);
    if (!ZERO_PERM_OK_ROLES.has(role.name) && resolved.length === 0) continue;
    const ids = resolved.map((p) => ({ id: p.id }));

    const existing = await db.role.findUnique({
      where: { tenantId_name: { tenantId, name: role.name } },
      select: { id: true },
    });

    if (existing) {
      await db.role.update({
        where: { id: existing.id },
        data: { permissions: { connect: ids } }, // additive — never disconnects
      });
      rolesUpdated += 1;
    } else if (opts.createMissing) {
      await db.role.create({
        data: {
          tenantId,
          name: role.name,
          description: role.description,
          isSystem: true,
          permissions: { connect: ids },
        },
      });
      rolesCreated += 1;
    }
  }

  return { rolesUpdated, rolesCreated };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const createMissing = args.includes('--create-missing');
  const tenantArg = args.find((a) => a.startsWith('--tenant='))?.split('=')[1];

  await connectPrisma();

  const tenants = tenantArg
    ? [{ id: tenantArg, name: '(explicit)', slug: tenantArg }]
    : await prisma.tenant.findMany({ select: { id: true, name: true, slug: true } });

  console.info(`[REGRANT] ${dryRun ? 'DRY-RUN' : 'APPLY'} | tenants=${tenants.length} | createMissing=${createMissing}`);

  for (const t of tenants) {
    if (dryRun) {
      const plans = await planTenant(t.id);
      const changed = plans.filter((p) => p.toAdd > 0 || !p.exists);
      if (changed.length === 0) {
        console.info(`  ${t.slug}: up-to-date`);
        continue;
      }
      console.info(`  ${t.slug} [${t.id}]:`);
      for (const p of changed) {
        const hr = p.addedKeys.filter((k) => k.startsWith('hr.')).length;
        const pay = p.addedKeys.filter((k) => k.startsWith('payments.')).length;
        const tag = p.exists ? `+${p.toAdd}` : `MISSING ROLE (+${p.toAdd} if --create-missing)`;
        console.info(`    ${p.role}: ${tag}${hr ? ` [hr.*:${hr}]` : ''}${pay ? ` [payments.*:${pay}]` : ''}`);
      }
    } else {
      const r = await applyTenant(prisma, t.id, { createMissing });
      console.info(`  ${t.slug}: rolesUpdated=${r.rolesUpdated} rolesCreated=${r.rolesCreated}`);
    }
  }

  console.info('[REGRANT] done.');
}

if (require.main === module) {
  main()
    .catch((e) => { console.error('[REGRANT] FAILED', e); process.exitCode = 1; })
    .finally(() => disconnectPrisma());
}

export { applyTenant, planTenant };
