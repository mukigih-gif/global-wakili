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

type Db = typeof defaultPrisma;
type PermSpec = { module: string } | { key: string }; // module = all actions of a resource; key = 'resource.action'
type RoleSpec = { name: string; description: string; perms: PermSpec[] | 'ALL' };
type CatalogRow = { id: string; resource: string; action: string };

// ── Roles (REAL catalog keys only). Add new roles here — "room for any role". ──
const ROLE_SPECS: RoleSpec[] = [
  { name: 'FIRM_ADMIN', description: 'Firm administrator — full access', perms: 'ALL' },
  { name: 'MANAGING_PARTNER', description: 'Managing partner — full access (also unlocks HR via super-user bypass)', perms: 'ALL' },
  { name: 'SENIOR_PARTNER', description: 'Senior partner — practice, finance, trust, reporting, analytics oversight', perms: [
    { module: 'matter' }, { module: 'client' }, { module: 'billing' }, { module: 'finance' },
    { module: 'trust' }, { module: 'reporting' }, { module: 'document' }, { module: 'analytics' },
    { module: 'calendar' }, { module: 'task' },
  ] },
  { name: 'PARTNER', description: 'Partner — matters, clients, billing, finance, trust, reporting, documents', perms: [
    { module: 'matter' }, { module: 'client' }, { module: 'billing' }, { module: 'finance' },
    { module: 'trust' }, { module: 'reporting' }, { module: 'document' },
  ] },
  { name: 'ASSOCIATE', description: 'Associate fee earner — matters, documents, calendar, tasks; client/billing view', perms: [
    { module: 'matter' }, { module: 'document' }, { module: 'calendar' }, { module: 'task' },
    { key: 'client.view_client' }, { key: 'billing.view_invoice' },
    { key: 'trust.view_statement' }, { key: 'trust.view_dashboard' },
  ] },
  { name: 'ADVOCATE', description: 'Advocate fee earner — matters, documents, calendar, tasks; client + billing create', perms: [
    { module: 'matter' }, { module: 'document' }, { module: 'calendar' }, { module: 'task' },
    { key: 'client.view_client' }, { key: 'client.create_client' },
    { key: 'billing.view_invoice' }, { key: 'billing.create_invoice' },
    { key: 'trust.view_statement' }, { key: 'trust.view_dashboard' },
  ] },
  { name: 'ACCOUNTANT', description: 'Finance, billing, trust, reporting; client view', perms: [
    { module: 'finance' }, { module: 'billing' }, { module: 'trust' }, { module: 'reporting' },
    { key: 'client.view_client' },
  ] },
  { name: 'HR_MANAGER', description: 'Payroll + client view + reporting; full HR module access granted by role in hr-permission.map.ts (F-14 / FINDING-008-001)', perms: [
    { module: 'payroll' }, { key: 'client.view_client' }, { key: 'reporting.view_overview' },
  ] },
  { name: 'RECEPTIONIST', description: 'Front desk — client intake, calendar, reception, notifications', perms: [
    { key: 'client.view_client' }, { key: 'client.create_client' }, { key: 'matter.view_matter' },
    { module: 'calendar' }, { key: 'task.view_task' }, { module: 'reception' }, { module: 'notifications' },
  ] },
  { name: 'PARALEGAL', description: 'Paralegal support — matter/client/document view, light task + document handling', perms: [
    { key: 'matter.view_matter' }, { key: 'client.view_client' },
    { key: 'document.view_document' }, { key: 'document.upload_document' },
    { key: 'calendar.view_event' }, { key: 'task.view_task' }, { key: 'task.create_task' }, { key: 'task.comment_task' },
  ] },
  { name: 'CLERK', description: 'Read-only clerk — zero client permissions (required for F-05)', perms: [
    { key: 'matter.view_matter' }, { key: 'calendar.view_event' },
    { key: 'task.view_task' }, { key: 'document.view_document' },
  ] },
];

function resolvePerms(catalog: CatalogRow[], spec: RoleSpec): CatalogRow[] {
  if (spec.perms === 'ALL') return catalog;
  const specs = spec.perms;
  return catalog.filter((p) =>
    specs.some((s) => ('module' in s ? s.module === p.resource : s.key === `${p.resource}.${p.action}`)));
}

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
  for (const spec of ROLE_SPECS) {
    const existing = await prisma.role.findUnique({
      where: { tenantId_name: { tenantId, name: spec.name } },
      select: { id: true },
    });
    if (existing) {
      console.info(`[ROLES] SKIP   ${spec.name} (already exists)`);
      continue;
    }
    const ids = resolvePerms(catalog, spec).map((p) => ({ id: p.id }));
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
