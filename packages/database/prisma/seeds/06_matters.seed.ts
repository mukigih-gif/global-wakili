import { MatterStatus, Prisma, PrismaClient, TenantRole } from '@prisma/client';

/*
 * 06_matters.seed.ts — Per-tenant matter layer (CLAUDE.md §12).
 *
 * Seeds a realistic Kenyan legal matter mix linked to the seeded clients,
 * using the HQ branch (05) and the tenant's advocate (02) as lead advocate.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Schema reality (verified against schema.prisma model Matter + MatterService):
 * - Physical columns used: title, category (the legal "type"), status, caseNumber,
 *   description, riskLevel, openedDate, clientId, branchId (req), leadAdvocateId (req).
 * - estimatedValue is NOT a column: MatterService.buildMatterMetadataForCreate
 *   preserves it in metadata.estimatedValue (string) + metadata.currency. This
 *   seed writes metadata in that same shape so the UI reads it back.
 * - MatterStatus has NO DRAFT (ACTIVE | ON_HOLD | COMPLETED | CLOSED | ARCHIVED);
 *   "draft-stage" matters use status ON_HOLD + metadata.progressStage 'INTAKE'.
 *
 * Policy:
 * - Idempotent: matterCode is NOT @@unique, so findFirst on (tenantId, matterCode)
 *   then update/create. Deterministic codes/dates → reruns converge.
 * - Tenant-scoped: clientId resolved within the tenant; branch/advocate resolved
 *   within the tenant. Missing client → that matter is skipped (defensive).
 * - No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type MatterSeed = {
  code: string; // matterCode (idempotency key within tenant)
  clientCode: string; // resolves to clientId within the tenant
  title: string;
  category: string; // the legal "type" — real physical column is `category`
  status: MatterStatus;
  estimatedValueKes: number; // preserved in metadata (no physical column)
  riskLevel: string;
  progressStage: string; // metadata lifecycle ('INTAKE' == draft-stage)
  openedDate: string; // ISO date, deterministic
  caseNumber?: string;
  description: string;
};

export type SeededMatter = {
  id: string;
  matterCode: string | null;
  clientCode: string;
  title: string;
  category: string;
  status: MatterStatus;
};

export type MattersSeedResult = {
  status: 'matters_seed_complete';
  tenantId: string;
  matters: SeededMatter[];
};

/* 8 matters across the 3 seeded clients (CLI-0001 corporate, CLI-0002
 * individual, CLI-0003 state agency). Covers conveyancing, litigation, probate,
 * corporate, IP, employment, and public/admin law. */
const MATTER_SEEDS: MatterSeed[] = [
  // CLI-0001 — Acme Holdings Limited (corporate): corporate / litigation / IP
  {
    code: 'MAT-0001',
    clientCode: 'CLI-0001',
    title: 'Acme Holdings — Acquisition of Tarama Logistics Ltd',
    category: 'Corporate & Commercial',
    status: MatterStatus.ACTIVE,
    estimatedValueKes: 12_000_000,
    riskLevel: 'MEDIUM',
    progressStage: 'IN_PROGRESS',
    openedDate: '2026-01-20',
    description: 'Due diligence and share purchase agreement for a 60% stake.',
  },
  {
    code: 'MAT-0002',
    clientCode: 'CLI-0001',
    title: 'Acme Holdings v Coastline Suppliers Ltd — Breach of Contract',
    category: 'Commercial Litigation',
    status: MatterStatus.ACTIVE,
    estimatedValueKes: 8_500_000,
    riskLevel: 'HIGH',
    progressStage: 'AWAITING_COURT',
    openedDate: '2026-02-05',
    caseNumber: 'HCCC E045 of 2026',
    description: 'Recovery of KES 8.5M for undelivered goods under a supply contract.',
  },
  {
    code: 'MAT-0003',
    clientCode: 'CLI-0001',
    title: "Acme Holdings — Trademark Registration 'AcmePay'",
    category: 'Intellectual Property',
    status: MatterStatus.ON_HOLD,
    estimatedValueKes: 450_000,
    riskLevel: 'LOW',
    progressStage: 'INTAKE',
    openedDate: '2026-03-11',
    description: "Registration of the 'AcmePay' word + device mark in classes 36 and 42.",
  },

  // CLI-0002 — Grace Wanjiru Mwangi (individual): conveyancing / probate / employment
  {
    code: 'MAT-0004',
    clientCode: 'CLI-0002',
    title: 'Grace Wanjiru — Transfer of LR No. Nairobi/Block 121/456',
    category: 'Conveyancing',
    status: MatterStatus.ACTIVE,
    estimatedValueKes: 6_200_000,
    riskLevel: 'LOW',
    progressStage: 'IN_PROGRESS',
    openedDate: '2026-01-28',
    description: 'Purchase and transfer of a residential apartment in Kilimani, Nairobi.',
  },
  {
    code: 'MAT-0005',
    clientCode: 'CLI-0002',
    title: 'Estate of the Late Joseph Mwangi — Grant of Probate',
    category: 'Probate & Administration',
    status: MatterStatus.ACTIVE,
    estimatedValueKes: 1_800_000,
    riskLevel: 'MEDIUM',
    progressStage: 'AWAITING_COURT',
    openedDate: '2026-02-18',
    caseNumber: 'P&A E210 of 2026',
    description: 'Application for grant of probate for a testate estate.',
  },
  {
    code: 'MAT-0006',
    clientCode: 'CLI-0002',
    title: 'Grace Wanjiru — Unfair Termination Claim v Zania Bank Ltd',
    category: 'Employment & Labour',
    status: MatterStatus.ON_HOLD,
    estimatedValueKes: 3_000_000,
    riskLevel: 'MEDIUM',
    progressStage: 'INTAKE',
    openedDate: '2026-03-22',
    caseNumber: 'ELRC E078 of 2026',
    description: 'Claim for unfair dismissal and terminal dues before the ELRC.',
  },

  // CLI-0003 — County Government of Nairobi (state agency): public law / commercial
  {
    code: 'MAT-0007',
    clientCode: 'CLI-0003',
    title: 'County Government of Nairobi — Judicial Review (Tender Award)',
    category: 'Public & Administrative Law',
    status: MatterStatus.ACTIVE,
    estimatedValueKes: 15_000_000,
    riskLevel: 'HIGH',
    progressStage: 'AWAITING_COURT',
    openedDate: '2026-02-12',
    caseNumber: 'JR E012 of 2026',
    description: 'Defending a judicial review challenge to a road-works tender award.',
  },
  {
    code: 'MAT-0008',
    clientCode: 'CLI-0003',
    title: 'County Government of Nairobi — Market Lease Agreements',
    category: 'Corporate & Commercial',
    status: MatterStatus.ACTIVE,
    estimatedValueKes: 2_400_000,
    riskLevel: 'LOW',
    progressStage: 'IN_PROGRESS',
    openedDate: '2026-03-04',
    description: 'Drafting standard lease agreements for county market stalls.',
  },
];

type MatterContext = {
  tenantId: string;
  branchId: string;
  leadAdvocateId: string;
};

async function resolveClientId(
  prisma: SeedPrisma,
  tenantId: string,
  clientCode: string,
): Promise<string | null> {
  const client = await prisma.client.findFirst({
    where: { tenantId, clientCode },
    select: { id: true },
  });

  return client?.id ?? null;
}

async function upsertMatter(
  prisma: SeedPrisma,
  ctx: MatterContext,
  def: MatterSeed,
): Promise<SeededMatter | null> {
  const clientId = await resolveClientId(prisma, ctx.tenantId, def.clientCode);

  // Defensive: 03_clients must have run first.
  if (!clientId) {
    return null;
  }

  // Mirror MatterService: estimatedValue/currency/progressStage live in metadata.
  const metadata: Prisma.InputJsonObject = {
    estimatedValue: String(def.estimatedValueKes),
    currency: 'KES',
    progressStage: def.progressStage,
  };

  const data = {
    title: def.title,
    category: def.category,
    status: def.status,
    description: def.description,
    riskLevel: def.riskLevel,
    caseNumber: def.caseNumber ?? null,
    openedDate: new Date(def.openedDate),
    branchId: ctx.branchId,
    leadAdvocateId: ctx.leadAdvocateId,
    metadata,
  };

  // matterCode is NOT @@unique → findFirst on (tenantId, matterCode) then upsert.
  const existing = await prisma.matter.findFirst({
    where: { tenantId: ctx.tenantId, matterCode: def.code },
    select: { id: true },
  });

  const record = existing
    ? await prisma.matter.update({
        where: { id: existing.id },
        data: { ...data, clientId },
        select: { id: true, matterCode: true, title: true, category: true, status: true },
      })
    : await prisma.matter.create({
        data: { tenantId: ctx.tenantId, matterCode: def.code, clientId, ...data },
        select: { id: true, matterCode: true, title: true, category: true, status: true },
      });

  return {
    id: record.id,
    matterCode: record.matterCode,
    clientCode: def.clientCode,
    title: record.title,
    category: record.category,
    status: record.status,
  };
}

export async function seedMatters(
  prisma: PrismaClient,
  tenantId: string,
): Promise<MattersSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedMatters requires a tenantId.');
  }

  const branch = await prisma.branch.findFirst({
    where: { tenantId },
    select: { id: true },
  });

  if (!branch) {
    throw new Error(`seedMatters: no branch for tenant ${tenantId}. Run 05_branches first.`);
  }

  // Lead advocate: the tenant's ADVOCATE user, falling back to any active user.
  const advocate =
    (await prisma.user.findFirst({
      where: { tenantId, tenantRole: TenantRole.ADVOCATE },
      select: { id: true },
    })) ??
    (await prisma.user.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true },
    }));

  if (!advocate) {
    throw new Error(`seedMatters: no advocate/user for tenant ${tenantId}. Run 02_users first.`);
  }

  const ctx: MatterContext = {
    tenantId,
    branchId: branch.id,
    leadAdvocateId: advocate.id,
  };

  const matters: SeededMatter[] = [];

  for (const def of MATTER_SEEDS) {
    const seeded = await upsertMatter(prisma, ctx, def);
    if (seeded) {
      matters.push(seeded);
    }
  }

  return { status: 'matters_seed_complete', tenantId, matters };
}
