import { PrismaClient } from '@prisma/client';

/*
 * 05_branches.seed.ts — Per-tenant HQ branch layer (CLAUDE.md §12).
 *
 * Matters, office/trust accounts, invoices, employees, and payroll all require
 * a branchId. This layer seeds ONE head-office Branch per tenant so 06_matters
 * (and later finance/HR layers) have a valid branch to attach to.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Schema reality (verified against schema.prisma model Branch):
 * - Real columns: name (req), kraPin (req, globally @unique + @@unique[tenantId,
 *   kraPin]), location?, phone?, email?, etims* (left null). There is NO code /
 *   address / city / isActive column — intent maps onto `name` + `location`.
 *
 * Policy:
 * - Idempotent: upsert on the @@unique([tenantId, kraPin]) composite key.
 * - kraPin is REQUIRED and globally unique; derived from the tenant's own
 *   (globally-unique) kraPin + "-HQ" so reruns converge and no two tenants
 *   collide on the global unique constraint.
 * - Tenant-scoped; deterministic per tenant slug (Upper Hill for the primary,
 *   Westlands for Mwangi & Associates), with a name-derived fallback.
 * - No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type BranchSeed = {
  name: string;
  location: string;
  phone: string;
  email: string;
};

export type SeededBranch = {
  id: string;
  name: string;
  kraPin: string;
};

export type BranchesSeedResult = {
  status: 'branches_seed_complete';
  tenantId: string;
  branches: SeededBranch[];
};

/* HQ profile per known tenant slug; unknown slugs use a name-derived fallback. */
const BRANCH_BY_SLUG: Record<string, BranchSeed> = {
  'global-wakili-legal-enterprise': {
    name: 'Global Wakili — Head Office (Upper Hill)',
    location: 'Upper Hill, Nairobi',
    phone: '+254709000100',
    email: 'reception@globalwakili.co.ke',
  },
  'mwangi-associates': {
    name: 'Mwangi & Associates — Head Office (Westlands)',
    location: 'Westlands, Nairobi',
    phone: '+254709000200',
    email: 'reception@mwangi-associates.co.ke',
  },
};

function fallbackBranch(tenantName: string): BranchSeed {
  return {
    name: `${tenantName} — Head Office`,
    location: 'Nairobi',
    phone: '+254709000000',
    email: 'reception@example.co.ke',
  };
}

export async function seedBranches(
  prisma: PrismaClient,
  tenantId: string,
): Promise<BranchesSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedBranches requires a tenantId.');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true, name: true, kraPin: true },
  });

  if (!tenant) {
    throw new Error(`seedBranches: tenant ${tenantId} not found.`);
  }

  const def = BRANCH_BY_SLUG[tenant.slug] ?? fallbackBranch(tenant.name);

  // Branch.kraPin is required AND globally unique. Derive it from the tenant's
  // own globally-unique kraPin so it is deterministic and collision-free.
  const kraPin = `${tenant.kraPin}-HQ`;

  const data = {
    name: def.name,
    location: def.location,
    phone: def.phone,
    email: def.email,
  };

  const branch = await prisma.branch.upsert({
    where: { tenantId_kraPin: { tenantId, kraPin } },
    update: data,
    create: { tenantId, kraPin, ...data },
    select: { id: true, name: true, kraPin: true },
  });

  return {
    status: 'branches_seed_complete',
    tenantId,
    branches: [branch],
  };
}
