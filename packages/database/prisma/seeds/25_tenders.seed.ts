import {
  PrismaClient,
  TenantRole,
  TenderActivityType,
  TenderCategory,
  TenderOutcome,
  TenderStatus,
} from '@prisma/client';

/*
 * 25_tenders.seed.ts — Per-tenant tender management layer (CLAUDE.md §12).
 *
 * Comprehensive tender-domain seed (all 3 models): TenderRecord,
 * TenderActivity, TenderDocument. (No TenderBid model exists.)
 *
 * Two realistic Kenyan legal-services tenders per tenant: one AWARDED (full
 * lifecycle incl. award) and one SUBMITTED/under evaluation; each with a
 * prepared→submitted activity trail and Technical/Financial bid documents.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy: idempotent — TenderRecord gated by (tenantId,tenderNumber);
 * TenderActivity by (tenantId,tenderId,activityType); TenderDocument by
 * (tenantId,tenderId,title). Tenant-scoped. No schema changes.
 */

type SeedPrisma = PrismaClient;

type ActSeed = { type: TenderActivityType; subject: string; notes: string };
type DocSeed = { title: string; docType: string };
type TenderSeed = {
  numSuffix: string;
  name: string;
  issuedBy: string;
  category: TenderCategory;
  status: TenderStatus;
  outcome: TenderOutcome | null;
  estimatedValue: string;
  matterCode: string | null;
  activities: ActSeed[];
  docs: DocSeed[];
};

export type TendersSeedResult = {
  status: 'tenders_seed_complete';
  tenantId: string;
  tenderRecords: number;
  tenderActivities: number;
  tenderDocuments: number;
};

const BID_DOCS: DocSeed[] = [
  { title: 'Technical Proposal', docType: 'Technical Proposal' },
  { title: 'Financial Bid', docType: 'Financial Bid' },
];

const TENDERS: TenderSeed[] = [
  {
    numSuffix: '001',
    name: 'Provision of Legal Services to County Government of Nairobi',
    issuedBy: 'County Government of Nairobi',
    category: TenderCategory.SERVICES,
    status: TenderStatus.AWARDED,
    outcome: TenderOutcome.AWARDED,
    estimatedValue: '4500000.00',
    matterCode: 'MAT-0007',
    activities: [
      { type: TenderActivityType.DOCUMENT_PREPARED, subject: 'Bid documents prepared', notes: 'Technical and financial proposals compiled (seed).' },
      { type: TenderActivityType.SUBMISSION_MADE, subject: 'Bid submitted before deadline', notes: 'Submitted via the procuring entity portal (seed).' },
      { type: TenderActivityType.AWARD_RECEIVED, subject: 'Award notification received', notes: 'Firm awarded the legal services panel (seed).' },
    ],
    docs: BID_DOCS,
  },
  {
    numSuffix: '002',
    name: 'Legal Advisory Panel — Kenya Power & Lighting Co.',
    issuedBy: 'Kenya Power & Lighting Company',
    category: TenderCategory.CONSULTANCY,
    status: TenderStatus.SUBMITTED,
    outcome: null,
    estimatedValue: '2000000.00',
    matterCode: null,
    activities: [
      { type: TenderActivityType.DOCUMENT_PREPARED, subject: 'Bid documents prepared', notes: 'Advisory panel application compiled (seed).' },
      { type: TenderActivityType.SUBMISSION_MADE, subject: 'Bid submitted before deadline', notes: 'Awaiting evaluation outcome (seed).' },
    ],
    docs: BID_DOCS,
  },
];

async function resolveUsers(prisma: SeedPrisma, tenantId: string): Promise<{ adminId: string; advocateId: string }> {
  const admin =
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.FIRM_ADMIN }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } }));
  if (!admin) throw new Error(`seedTenders: no user for tenant ${tenantId}. Run 02_users first.`);
  const advocate = await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.ADVOCATE }, select: { id: true } });
  return { adminId: admin.id, advocateId: advocate?.id ?? admin.id };
}

export async function seedTenders(prisma: PrismaClient, tenantId: string): Promise<TendersSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) throw new Error('seedTenders requires a tenantId.');

  const { advocateId } = await resolveUsers(prisma, tenantId);
  const tag = tenantId.slice(-6);
  const now = new Date();
  const day = 24 * 3600_000;
  const openingDate = new Date(now.getTime() - 21 * day);
  const submittedAt = new Date(now.getTime() - 8 * day);
  const deadline = new Date(now.getTime() - 7 * day);
  const outcomeDate = new Date(now.getTime() - 2 * day);

  const tenderNumbers: string[] = [];
  const tenderIds: string[] = [];

  for (const t of TENDERS) {
    const tenderNumber = `TND-${tag}-${t.numSuffix}`;
    tenderNumbers.push(tenderNumber);
    const matter = t.matterCode
      ? await prisma.matter.findFirst({ where: { tenantId, matterCode: t.matterCode }, select: { id: true } })
      : null;

    let tenderId: string;
    const existing = await prisma.tenderRecord.findFirst({ where: { tenantId, tenderNumber }, select: { id: true } });
    if (existing) {
      tenderId = existing.id;
    } else {
      const created = await prisma.tenderRecord.create({
        data: {
          tenantId,
          tenderNumber,
          tenderName: t.name,
          issuedBy: t.issuedBy,
          category: t.category,
          status: t.status,
          estimatedValue: t.estimatedValue,
          currency: 'KES',
          openingDate,
          deadline,
          submittedAt,
          outcome: t.outcome,
          outcomeDate: t.outcome ? outcomeDate : null,
          outcomeNotes: t.outcome === TenderOutcome.AWARDED ? 'Awarded to the firm (seed).' : null,
          assignedToId: advocateId,
          matterId: matter?.id ?? null,
        },
        select: { id: true },
      });
      tenderId = created.id;
    }
    tenderIds.push(tenderId);

    // Activities — gated by (tenantId, tenderId, activityType).
    for (const a of t.activities) {
      const existingAct = await prisma.tenderActivity.findFirst({ where: { tenantId, tenderId, activityType: a.type }, select: { id: true } });
      if (!existingAct) {
        await prisma.tenderActivity.create({
          data: {
            tenantId,
            tenderId,
            userId: advocateId,
            activityType: a.type,
            subject: a.subject,
            notes: a.notes,
            completedAt: now,
          },
        });
      }
    }

    // Documents — gated by (tenantId, tenderId, title).
    for (const d of t.docs) {
      const existingDoc = await prisma.tenderDocument.findFirst({ where: { tenantId, tenderId, title: d.title }, select: { id: true } });
      if (!existingDoc) {
        await prisma.tenderDocument.create({
          data: {
            tenantId,
            tenderId,
            title: d.title,
            docType: d.docType,
            scanUrl: `https://seed.local/tenders/${tag}/${t.numSuffix}/${d.docType.replace(/\s+/g, '-').toLowerCase()}.pdf`,
            uploadedAt: now,
          },
        });
      }
    }
  }

  // Final counts via queries (idempotent-safe).
  const [tenderRecords, tenderActivities, tenderDocuments] = await Promise.all([
    prisma.tenderRecord.count({ where: { tenantId, tenderNumber: { in: tenderNumbers } } }),
    prisma.tenderActivity.count({ where: { tenantId, tenderId: { in: tenderIds } } }),
    prisma.tenderDocument.count({ where: { tenantId, tenderId: { in: tenderIds } } }),
  ]);

  return {
    status: 'tenders_seed_complete',
    tenantId,
    tenderRecords,
    tenderActivities,
    tenderDocuments,
  };
}
