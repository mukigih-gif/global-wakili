/**
 * Canonical tenant role definitions — SINGLE SOURCE OF TRUTH (FINDING-007-011 step a).
 *
 * Consumed by BOTH provisioning paths so seeded and onboarded tenants get identical
 * UPPERCASE roles + grants (closes the casing/parity hole):
 *   - packages/database/prisma/seeds/00_bootstrap.ts  (seed / Playwright path)
 *   - apps/api/src/scripts/seed-default-roles.ts       (production onboarding path)
 *
 * Permission grants are declared against the catalog in apps/api/src/config/permissions.ts:
 *   { module: 'finance' } -> all dot keys whose resource === 'finance'
 *   { key: 'client.view_client' } -> that single resource.action key
 *
 * NOTE: packages/core/identity/services/OnboardingService.ts has its OWN ad-hoc
 * ADMIN/USER role + non-catalog permission vocabulary — a separate 3rd path,
 * tracked under FINDING-007-011-ONB (NOT unified here).
 */

export type RolePermSpec = { module: string } | { key: string };

export type CanonicalRole = {
  name: string;
  description: string;
  perms: 'ALL' | RolePermSpec[];
};

type CatalogRow = { id: string; resource: string; action: string };

export const CANONICAL_ROLES: CanonicalRole[] = [
  { name: 'FIRM_ADMIN', description: 'Firm administrator — full tenant access.', perms: 'ALL' },
  {
    name: 'MANAGING_PARTNER',
    description: 'Managing partner — full access (also unlocks HR).',
    perms: 'ALL',
  },
  {
    name: 'SENIOR_PARTNER',
    description: 'Senior partner — practice, finance, trust, reporting, analytics oversight.',
    perms: [
      { module: 'matter' }, { module: 'client' }, { module: 'billing' }, { module: 'finance' },
      { module: 'trust' }, { module: 'reporting' }, { module: 'document' }, { module: 'analytics' },
      { module: 'calendar' }, { module: 'task' },
    ],
  },
  {
    name: 'PARTNER',
    description: 'Partner — matters, clients, billing, finance, trust, reporting, documents.',
    perms: [
      { module: 'matter' }, { module: 'client' }, { module: 'billing' }, { module: 'finance' },
      { module: 'trust' }, { module: 'reporting' }, { module: 'document' },
    ],
  },
  {
    name: 'CFO',
    description:
      'Chief Financial Officer — finance, trust, procurement, payroll, payments, integrations + audit oversight. Name MUST stay "CFO" to match finance/payment authorization.',
    perms: [
      { module: 'finance' }, { module: 'trust' }, { module: 'procurement' }, { module: 'payroll' },
      { module: 'integrations' }, { module: 'payments' }, { key: 'admin.view_audit' },
    ],
  },
  {
    name: 'BRANCH_MANAGER',
    description:
      'Branch manager — operational oversight across finance, trust, procurement, client, matter, document, calendar, payments.',
    perms: [
      { module: 'finance' }, { module: 'trust' }, { module: 'procurement' }, { module: 'client' },
      { module: 'matter' }, { module: 'document' }, { module: 'calendar' }, { module: 'integrations' },
      { module: 'payments' }, { key: 'admin.view_audit' }, { key: 'admin.manage_settings' },
    ],
  },
  {
    name: 'ACCOUNTANT',
    description:
      'Accounting — finance, billing, trust, reporting, payments, procurement, payroll, integrations; client view.',
    perms: [
      { module: 'finance' }, { module: 'billing' }, { module: 'trust' }, { module: 'reporting' },
      { module: 'payments' }, { module: 'procurement' }, { module: 'payroll' }, { module: 'integrations' },
      { key: 'client.view_client' },
    ],
  },
  {
    name: 'HR_MANAGER',
    description: 'HR manager — full HR + payroll; client view + reporting overview.',
    perms: [
      { module: 'hr' }, { module: 'payroll' },
      { key: 'client.view_client' }, { key: 'reporting.view_overview' },
    ],
  },
  {
    name: 'ADVOCATE',
    description: 'Advocate fee earner — matters, documents, calendar, tasks; client + billing create.',
    perms: [
      { module: 'matter' }, { module: 'document' }, { module: 'calendar' }, { module: 'task' },
      { key: 'client.view_client' }, { key: 'client.create_client' },
      { key: 'billing.view_invoice' }, { key: 'billing.create_invoice' },
      { key: 'trust.view_statement' }, { key: 'trust.view_dashboard' },
    ],
  },
  {
    name: 'ASSOCIATE',
    description: 'Associate fee earner — matters, documents, calendar, tasks; client/billing view.',
    perms: [
      { module: 'matter' }, { module: 'document' }, { module: 'calendar' }, { module: 'task' },
      { key: 'client.view_client' }, { key: 'billing.view_invoice' },
      { key: 'trust.view_statement' }, { key: 'trust.view_dashboard' },
    ],
  },
  {
    name: 'PARALEGAL',
    description: 'Paralegal support — matter/client/document view, light task + document handling.',
    perms: [
      { key: 'matter.view_matter' }, { key: 'client.view_client' },
      { key: 'document.view_document' }, { key: 'document.upload_document' },
      { key: 'calendar.view_event' }, { key: 'task.view_task' },
      { key: 'task.create_task' }, { key: 'task.comment_task' },
    ],
  },
  {
    name: 'RECEPTIONIST',
    description: 'Front desk — client intake, calendar, reception, notifications.',
    perms: [
      { key: 'client.view_client' }, { key: 'client.create_client' }, { key: 'matter.view_matter' },
      { module: 'calendar' }, { key: 'task.view_task' }, { module: 'reception' }, { module: 'notifications' },
    ],
  },
  {
    name: 'CLERK',
    description: 'Read-only clerk — zero client permissions (required for F-05).',
    perms: [
      { key: 'matter.view_matter' }, { key: 'calendar.view_event' },
      { key: 'task.view_task' }, { key: 'document.view_document' },
    ],
  },
  {
    name: 'CLIENT',
    description: 'Client portal user — restricted portal-facing permissions.',
    perms: [
      { key: 'client.view_portal' }, { key: 'document.view_document' },
      { key: 'document.download_document' }, { key: 'calendar.view_event' },
    ],
  },
];

/** Roles permitted to resolve to zero catalog permissions without erroring. */
export const ZERO_PERM_OK_ROLES = new Set<string>(['CLIENT']);

/** Resolve a role's permission grants against the tenant's catalog rows. */
export function resolveRolePermissions<T extends CatalogRow>(catalog: T[], role: CanonicalRole): T[] {
  if (role.perms === 'ALL') return catalog;
  const specs = role.perms;
  return catalog.filter((p) =>
    specs.some((s) => ('module' in s ? s.module === p.resource : s.key === `${p.resource}.${p.action}`)),
  );
}
