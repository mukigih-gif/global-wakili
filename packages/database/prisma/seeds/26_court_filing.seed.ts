import {
  CourtFilingStatus,
  CourtFilingType,
  PrismaClient,
  TenantRole,
} from '@prisma/client';

/*
 * 26_court_filing.seed.ts — Per-tenant court filing registry layer (CLAUDE.md §12).
 *
 * Seeds CourtFiling (the only court-filing model — CourtCase/FilingDocument/
 * CourtOrder do not exist; CourtHearing is seeded in 07_calendar). Three filings
 * across the litigation matters, covering a realistic mix of types/statuses:
 * one FILED, one RECEIVED_BY_COURT, one PREPARED (upcoming). Each is linked to
 * its matter and, where a hearing exists for that matter (layer 07), to the
 * hearing.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy: idempotent — gated by findFirst(tenantId, matterId, title).
 * Tenant-scoped. No schema changes.
 */

type SeedPrisma = PrismaClient;

type FilingSeed = {
  matterCode: string;
  filingType: CourtFilingType;
  title: string;
  status: CourtFilingStatus;
  courtRef: string | null;
  filed: boolean;
  received: boolean;
  dueOffsetDays: number;
};

export type CourtFilingSeedResult = {
  status: 'court_filing_seed_complete';
  tenantId: string;
  courtFilings: number;
};

const FILINGS: FilingSeed[] = [
  { matterCode: 'MAT-0002', filingType: CourtFilingType.NOTICE_OF_MOTION, title: 'Notice of Motion — Interim Injunction', status: CourtFilingStatus.FILED, courtRef: 'HCCC/E045/NM/01', filed: true, received: false, dueOffsetDays: -12 },
  { matterCode: 'MAT-0005', filingType: CourtFilingType.PETITION, title: 'Petition for Grant of Probate', status: CourtFilingStatus.RECEIVED_BY_COURT, courtRef: 'P&A/E210/PET/01', filed: true, received: true, dueOffsetDays: -22 },
  { matterCode: 'MAT-0007', filingType: CourtFilingType.WRITTEN_SUBMISSIONS, title: 'Written Submissions — Judicial Review', status: CourtFilingStatus.PREPARED, courtRef: null, filed: false, received: false, dueOffsetDays: 5 },
];

async function resolveFiler(prisma: SeedPrisma, tenantId: string): Promise<string> {
  const u =
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.CLERK }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.ADVOCATE }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } }));
  if (!u) throw new Error(`seedCourtFiling: no user for tenant ${tenantId}. Run 02_users first.`);
  return u.id;
}

export async function seedCourtFiling(prisma: PrismaClient, tenantId: string): Promise<CourtFilingSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) throw new Error('seedCourtFiling requires a tenantId.');

  const filerId = await resolveFiler(prisma, tenantId);
  const now = new Date();
  const day = 24 * 3600_000;
  const titles: string[] = [];

  for (const f of FILINGS) {
    titles.push(f.title);
    const matter = await prisma.matter.findFirst({ where: { tenantId, matterCode: f.matterCode }, select: { id: true } });
    // Defensive: only seed filings for matters that exist.
    if (!matter) continue;

    const existing = await prisma.courtFiling.findFirst({ where: { tenantId, matterId: matter.id, title: f.title }, select: { id: true } });
    if (existing) continue;

    const hearing = await prisma.courtHearing.findFirst({ where: { tenantId, matterId: matter.id }, select: { id: true } });

    await prisma.courtFiling.create({
      data: {
        tenantId,
        matterId: matter.id,
        hearingId: hearing?.id ?? null,
        filingType: f.filingType,
        status: f.status,
        title: f.title,
        courtRef: f.courtRef,
        filedAt: f.filed ? new Date(now.getTime() - 10 * day) : null,
        filedById: f.filed ? filerId : null,
        receivedAt: f.received ? new Date(now.getTime() - 8 * day) : null,
        dueDate: new Date(now.getTime() + f.dueOffsetDays * day),
        scanUrl: f.filed ? `https://seed.local/filings/${tenantId.slice(-6)}/${f.matterCode}-${f.filingType}.pdf` : null,
        notes: 'Court filing (seed).',
      },
    });
  }

  const courtFilings = await prisma.courtFiling.count({ where: { tenantId, title: { in: titles } } });

  return { status: 'court_filing_seed_complete', tenantId, courtFilings };
}
