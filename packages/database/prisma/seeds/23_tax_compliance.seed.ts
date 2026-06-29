import {
  Prisma,
  PrismaClient,
  TenantRole,
  VatAdjustmentStatus,
  VatAdjustmentType,
} from '@prisma/client';

/*
 * 23_tax_compliance.seed.ts — Per-tenant tax compliance layer (CLAUDE.md §12).
 *
 * Faithful seed of REAL models only. Verified findings (FINDING-TAX-001):
 *   - VatAdjustment ✅ and WithholdingTaxCertificate ✅ exist.
 *   - There is NO ETIMSSubmission model — eTIMS state lives on Invoice.etims*
 *     fields (+ the layer-18 ExternalJobQueue ETIMS entry). We stamp the issued
 *     invoice's etims fields (SIMULATED, sandbox ref) — honest re: FIN-E-003.
 *   - There is NO VATReturn model — VAT returns are endpoint-computed (FIN-E-001),
 *     nothing to persist. We compute output/input/net and return them for
 *     reconciliation against layer-22 invoice VAT, but do not persist a row.
 *
 * Schema realities: VatAdjustment uses `reason` (not description, FIN-E-002) and
 * has no invoiceId (real invoice linked via metadata.invoiceId + reference).
 * WithholdingTaxCertificate is invoice-linked (WHT withheld by the client on the
 * firm's invoice — not vendor payments); 5% of professional fees (KRA schedule).
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy: idempotent (VatAdjustment gated by tenant-tagged reference;
 * WithholdingTaxCertificate upsert(tenantId,certificateNumber); eTIMS stamp is an
 * idempotent set). VAT at 16%, WHT at 5%. Tenant-scoped. No schema changes.
 */

type SeedPrisma = PrismaClient;

export type TaxComplianceSeedResult = {
  status: 'tax_compliance_seed_complete';
  tenantId: string;
  vatAdjustments: number;
  whtCertificates: number;
  etimsSubmissionsStamped: number;
  vatReturnsPersisted: number;
  vatReturnComputed: { outputVat: string; inputVat: string; netPayable: string; persisted: false };
};

const ZERO = new Prisma.Decimal(0);
const WHT_RATE = new Prisma.Decimal('0.05'); // 5% — professional services (KRA)
const round2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

async function resolveAdminId(prisma: SeedPrisma, tenantId: string): Promise<string> {
  const admin =
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.FIRM_ADMIN }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } }));
  if (!admin) throw new Error(`seedTaxCompliance: no user for tenant ${tenantId}. Run 02_users first.`);
  return admin.id;
}

type SeededInvoice = { id: string; invoiceNumber: string; matterId: string; clientId: string | null; subTotal: Prisma.Decimal; vatAmount: Prisma.Decimal; clientName: string | null; clientPin: string | null };

async function resolveInvoice(prisma: SeedPrisma, tenantId: string, invoiceNumber: string): Promise<SeededInvoice | null> {
  const inv = await prisma.invoice.findFirst({
    where: { tenantId, invoiceNumber },
    select: { id: true, invoiceNumber: true, matterId: true, clientId: true, subTotal: true, vatAmount: true, client: { select: { name: true, kraPin: true } } },
  });
  if (!inv) return null;
  return { id: inv.id, invoiceNumber: inv.invoiceNumber, matterId: inv.matterId, clientId: inv.clientId, subTotal: inv.subTotal, vatAmount: inv.vatAmount, clientName: inv.client?.name ?? null, clientPin: inv.client?.kraPin ?? null };
}

export async function seedTaxCompliance(prisma: PrismaClient, tenantId: string): Promise<TaxComplianceSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) throw new Error('seedTaxCompliance requires a tenantId.');

  const adminId = await resolveAdminId(prisma, tenantId);
  const tag = tenantId.slice(-6);
  const now = new Date();

  const issued = await resolveInvoice(prisma, tenantId, `INV-${tag}-002`); // INVOICED
  const paid = await resolveInvoice(prisma, tenantId, `INV-${tag}-003`);   // PAID
  if (!issued || !paid) throw new Error(`seedTaxCompliance: layer-22 invoices not found for tenant ${tenantId}. Run 22_billing first.`);

  // 1. VAT adjustments — 1 POSTED + 1 VOID (reason field; real invoice via metadata.invoiceId).
  const vatAdjustments: { ref: string; type: VatAdjustmentType; amount: string; reason: string; status: VatAdjustmentStatus; invoice: SeededInvoice }[] = [
    { ref: `VATADJ-${tag}-001`, type: VatAdjustmentType.OUTPUT_VAT, amount: '3200.00', reason: 'Output VAT correction — under-declared fees (seed).', status: VatAdjustmentStatus.POSTED, invoice: issued },
    { ref: `VATADJ-${tag}-002`, type: VatAdjustmentType.OUTPUT_VAT, amount: '1600.00', reason: 'Erroneous VAT entry — reversed (seed).', status: VatAdjustmentStatus.VOID, invoice: paid },
  ];
  for (const adj of vatAdjustments) {
    const existing = await prisma.vatAdjustment.findFirst({ where: { tenantId, reference: adj.ref }, select: { id: true } });
    if (existing) continue;
    const isVoid = adj.status === VatAdjustmentStatus.VOID;
    await prisma.vatAdjustment.create({
      data: {
        tenantId,
        type: adj.type,
        amount: new Prisma.Decimal(adj.amount),
        adjustmentDate: now,
        reason: adj.reason,
        reference: adj.ref,
        status: adj.status,
        createdById: adminId,
        voidedAt: isVoid ? now : null,
        voidedById: isVoid ? adminId : null,
        voidReason: isVoid ? 'Voided during reconciliation (seed).' : null,
        metadata: { invoiceId: adj.invoice.id, invoiceNumber: adj.invoice.invoiceNumber, vatRate: '16%' },
      },
    });
  }

  // 2. WHT certificates — 5% of fees, withheld by the client on the firm's invoice.
  const whtSeeds = [
    { num: `WHT-${tag}-001`, inv: issued },
    { num: `WHT-${tag}-002`, inv: paid },
  ];
  for (const w of whtSeeds) {
    const whtAmount = round2(w.inv.subTotal.times(WHT_RATE));
    await prisma.withholdingTaxCertificate.upsert({
      where: { tenantId_certificateNumber: { tenantId, certificateNumber: w.num } },
      update: { amount: whtAmount, status: 'RECEIVED' },
      create: {
        tenantId,
        invoiceId: w.inv.id,
        matterId: w.inv.matterId,
        clientId: w.inv.clientId,
        certificateNumber: w.num,
        certificateDate: now,
        amount: whtAmount,
        payerName: w.inv.clientName,
        payerPin: w.inv.clientPin,
        receivedById: adminId,
        status: 'RECEIVED',
        notes: 'WHT @ 5% on professional fees (KRA schedule, seed).',
      },
    });
  }

  // 3. eTIMS submission — stamp the issued invoice (SIMULATED; no ETIMSSubmission model).
  await prisma.invoice.update({
    where: { id: issued.id },
    data: {
      etimsReference: `ETIMS-SIM-${tag}`,
      etimsStatus: 'SIMULATED',
      etimsValidated: false,
      etimsLastSyncedAt: now,
    },
  });
  const etimsSubmissionsStamped = 1;

  // 4. VAT return — endpoint-computed (no model). Compute + reconcile against layer-22 VAT.
  const outputVat = round2(issued.vatAmount.plus(paid.vatAmount)); // VAT on issued invoices
  const inputVat = ZERO; // no expenses seeded yet (procurement = layer 24)
  const netPayable = round2(outputVat.minus(inputVat));

  // Final counts via queries (idempotent-safe).
  const adjRefs = vatAdjustments.map((a) => a.ref);
  const whtNums = whtSeeds.map((w) => w.num);
  const [vatAdjustmentsCount, whtCertificates] = await Promise.all([
    prisma.vatAdjustment.count({ where: { tenantId, reference: { in: adjRefs } } }),
    prisma.withholdingTaxCertificate.count({ where: { tenantId, certificateNumber: { in: whtNums } } }),
  ]);

  return {
    status: 'tax_compliance_seed_complete',
    tenantId,
    vatAdjustments: vatAdjustmentsCount,
    whtCertificates,
    etimsSubmissionsStamped,
    vatReturnsPersisted: 0,
    vatReturnComputed: { outputVat: outputVat.toFixed(2), inputVat: inputVat.toFixed(2), netPayable: netPayable.toFixed(2), persisted: false },
  };
}
