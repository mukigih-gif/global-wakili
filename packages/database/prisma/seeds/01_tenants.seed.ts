import { PrismaClient } from '@prisma/client';

import { provisionTenantRbac } from './00_bootstrap';

/*
 * 01_tenants.seed.ts — Additional-tenant layer (CLAUDE.md §12).
 *
 * 00_bootstrap creates the PRIMARY tenant from env. This layer adds the
 * secondary tenant(s) required for multi-tenant isolation / breach testing
 * (Phase 4). Each additional tenant is made RBAC-complete (permissions +
 * roles) via the shared provisionTenantRbac helper so downstream
 * user/client/data layers can attach to ANY tenant.
 *
 * Policy:
 * - Idempotent: upsert on slug; reruns converge, never duplicate.
 * - Never re-creates the primary tenant (skips its slug).
 * - Deterministic fixtures (no env needed) so tests are reproducible.
 * - No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

export type SecondaryTenantSeed = {
  slug: string;
  name: string;
  kraPin: string;
};

export type SeededTenant = {
  id: string;
  slug: string;
  name: string;
  permissionsSeeded: number;
  rolesSeeded: number;
};

export type TenantsSeedResult = {
  status: 'tenants_seed_complete';
  primaryTenantId: string;
  additionalTenants: SeededTenant[];
};

/* Deterministic secondary tenant(s) for isolation/breach testing.
 * KRA PINs satisfy the bootstrap validator pattern ^[A-Z][0-9]{9}[A-Z]$. */
const SECONDARY_TENANTS: SecondaryTenantSeed[] = [
  {
    slug: 'mwangi-associates',
    name: 'Mwangi & Associates Advocates LLP',
    kraPin: 'P051234567X',
  },
];

/* Deterministic slugs of the additional tenants this seed creates. Exported so
 * 21_validation can resolve the seed-owned tenant set in standalone runs
 * (alongside the env-driven primary SEED_TENANT_SLUG). */
export const SECONDARY_TENANT_SLUGS: string[] = SECONDARY_TENANTS.map((t) => t.slug);

function addOneYear(date: Date): Date {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + 1);
  return copy;
}

async function upsertTenant(prisma: SeedPrisma, def: SecondaryTenantSeed) {
  const now = new Date();

  return prisma.tenant.upsert({
    where: { slug: def.slug },
    update: {
      name: def.name,
      kraPin: def.kraPin,
    },
    create: {
      name: def.name,
      slug: def.slug,
      kraPin: def.kraPin,
      billingCycleStart: now,
      billingCycleEnd: addOneYear(now),
    },
    select: { id: true, slug: true, name: true },
  });
}

export async function seedTenants(
  prisma: PrismaClient,
  primaryTenantId: string,
): Promise<TenantsSeedResult> {
  if (!primaryTenantId || primaryTenantId.trim().length === 0) {
    throw new Error('seedTenants requires the primary tenantId.');
  }

  const primary = await prisma.tenant.findUnique({
    where: { id: primaryTenantId },
    select: { slug: true },
  });

  const additionalTenants: SeededTenant[] = [];

  for (const def of SECONDARY_TENANTS) {
    // Never duplicate the bootstrap primary.
    if (primary?.slug && def.slug === primary.slug) {
      continue;
    }

    const tenant = await upsertTenant(prisma, def);
    const { permissions, roles } = await provisionTenantRbac(prisma, tenant.id);

    additionalTenants.push({
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      permissionsSeeded: permissions.length,
      rolesSeeded: roles.length,
    });
  }

  return {
    status: 'tenants_seed_complete',
    primaryTenantId,
    additionalTenants,
  };
}
