import {
  ExpenseStatus,
  Prisma,
  PrismaClient,
  PurchaseOrderStatus,
  PurchaseReceiptStatus,
  QuotationStatus,
  RecurringFrequency,
  RFQStatus,
  SupplierStatus,
  TenantRole,
  VendorBillStatus,
} from '@prisma/client';

/*
 * 24_procurement.seed.ts — Per-tenant procurement / procure-to-pay layer (CLAUDE.md §12).
 *
 * Comprehensive procurement-domain seed (standing directive — all 15 models):
 *   Supplier, RequestForQuotation(+Item,+Supplier), Quotation(+Line),
 *   PurchaseOrder(+Line,+Receipt,+ReceiptLine), VendorBill(+Line),
 *   VendorPayment, ExpenseEntry, RecurringExpenseTemplate.
 *
 * Realistic procure-to-pay flow: 2 suppliers → RFQ (2 items, both invited) →
 * 2 quotations (1 SELECTED / 1 REJECTED, RFQ AWARDED) → PO from the winning
 * quote (RECEIVED) → goods receipt → vendor bill (16% VAT, PAID) → payment;
 * plus a matter expense and a recurring monthly expense template.
 *
 * Data-only: vendor-bill GL posting is a separate finance concern, not seeded.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy: idempotent — Supplier upsert(tenantId,kraPin); RFQSupplier
 * upsert(tenantId,rfqId,vendorId); PO/Receipt/VendorBill have tenant-tagged
 * unique numbers (gated by findFirst); RFQ/Quotation/Expense/Recurring gated by
 * a deterministic key. Tenant-scoped. No schema changes.
 */

type SeedPrisma = PrismaClient;
const round2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const VAT_RATE = new Prisma.Decimal('0.16');

type SupplierSeed = { key: 'SUP1' | 'SUP2'; name: string; kraPin: string; contactPerson: string; email: string };
type QuoteSeed = { vendor: 'SUP1' | 'SUP2'; status: QuotationStatus; lines: { description: string; quantity: number; unitPrice: number }[] };

export type ProcurementSeedResult = {
  status: 'procurement_seed_complete';
  tenantId: string;
  suppliers: number;
  requestForQuotations: number;
  rfqItems: number;
  rfqSuppliers: number;
  quotations: number;
  quotationLines: number;
  purchaseOrders: number;
  purchaseOrderLines: number;
  purchaseOrderReceipts: number;
  purchaseOrderReceiptLines: number;
  vendorBills: number;
  vendorBillLines: number;
  vendorPayments: number;
  expenseEntries: number;
  recurringExpenseTemplates: number;
};

const SUPPLIERS: SupplierSeed[] = [
  { key: 'SUP1', name: 'Office Supplies Kenya Ltd', kraPin: 'P051999001A', contactPerson: 'Mary Kamau', email: 'sales@officesupplies.co.ke' },
  { key: 'SUP2', name: 'Lex Research Subscriptions Ltd', kraPin: 'P051999002B', contactPerson: 'Peter Otieno', email: 'accounts@lexresearch.co.ke' },
];

const RFQ_TITLE = 'Office Supplies — Q3 (seed)';
const RFQ_ITEMS = [
  { description: 'A4 paper reams', quantity: 50, estimatedUnitPrice: 600 },
  { description: 'Toner cartridges', quantity: 10, estimatedUnitPrice: 8000 },
];

const QUOTES: QuoteSeed[] = [
  { vendor: 'SUP1', status: QuotationStatus.SELECTED, lines: [{ description: 'A4 paper reams', quantity: 50, unitPrice: 600 }, { description: 'Toner cartridges', quantity: 10, unitPrice: 7500 }] },
  { vendor: 'SUP2', status: QuotationStatus.REJECTED, lines: [{ description: 'A4 paper reams', quantity: 50, unitPrice: 650 }, { description: 'Toner cartridges', quantity: 10, unitPrice: 8000 }] },
];

async function resolveAdminId(prisma: SeedPrisma, tenantId: string): Promise<string> {
  const admin =
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.FIRM_ADMIN }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } }));
  if (!admin) throw new Error(`seedProcurement: no user for tenant ${tenantId}. Run 02_users first.`);
  return admin.id;
}

export async function seedProcurement(prisma: PrismaClient, tenantId: string): Promise<ProcurementSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) throw new Error('seedProcurement requires a tenantId.');

  const adminId = await resolveAdminId(prisma, tenantId);
  const branch = await prisma.branch.findFirst({ where: { tenantId }, select: { id: true } });
  const branchId = branch?.id ?? null;
  const matter =
    (await prisma.matter.findFirst({ where: { tenantId, matterCode: 'MAT-0001' }, select: { id: true } })) ??
    (await prisma.matter.findFirst({ where: { tenantId }, select: { id: true } }));
  const expenseAccount = await prisma.chartOfAccount.findFirst({ where: { tenantId, code: '5200' }, select: { id: true } });
  const tag = tenantId.slice(-6);
  const now = new Date();
  const closing = new Date(now.getTime() + 14 * 24 * 3600_000);

  // 1. Suppliers.
  const supplierId: Record<'SUP1' | 'SUP2', string> = { SUP1: '', SUP2: '' };
  for (const s of SUPPLIERS) {
    const rec = await prisma.supplier.upsert({
      where: { tenantId_kraPin: { tenantId, kraPin: s.kraPin } },
      update: { name: s.name, contactPerson: s.contactPerson, email: s.email, status: SupplierStatus.ACTIVE },
      create: { tenantId, name: s.name, kraPin: s.kraPin, contactPerson: s.contactPerson, email: s.email, status: SupplierStatus.ACTIVE, currency: 'KES', paymentTermsDays: 30 },
      select: { id: true },
    });
    supplierId[s.key] = rec.id;
  }

  // 2. RFQ (+ items) — AWARDED. Invited suppliers via upsert on the unique key.
  let rfqId: string;
  const existingRfq = await prisma.requestForQuotation.findFirst({ where: { tenantId, title: RFQ_TITLE }, select: { id: true } });
  if (existingRfq) {
    rfqId = existingRfq.id;
  } else {
    const rfq = await prisma.requestForQuotation.create({
      data: {
        tenantId,
        title: RFQ_TITLE,
        description: 'Quarterly office supplies procurement.',
        issueDate: now,
        closingDate: closing,
        branchId,
        status: RFQStatus.AWARDED,
        items: { create: RFQ_ITEMS.map((it) => ({ tenantId, description: it.description, quantity: it.quantity, estimatedUnitPrice: it.estimatedUnitPrice })) },
      },
      select: { id: true },
    });
    rfqId = rfq.id;
  }
  for (const key of ['SUP1', 'SUP2'] as const) {
    await prisma.requestForQuotationSupplier.upsert({
      where: { tenantId_rfqId_vendorId: { tenantId, rfqId, vendorId: supplierId[key] } },
      update: {},
      create: { tenantId, rfqId, vendorId: supplierId[key] },
    });
  }

  // 3. Quotations (+ lines). One SELECTED, one REJECTED.
  let selectedQuotationId = '';
  for (const q of QUOTES) {
    const vendorId = supplierId[q.vendor];
    let quotationId: string;
    const existing = await prisma.quotation.findFirst({ where: { tenantId, rfqId, vendorId }, select: { id: true } });
    if (existing) {
      quotationId = existing.id;
    } else {
      const created = await prisma.quotation.create({
        data: {
          tenantId,
          rfqId,
          vendorId,
          quoteDate: now,
          validUntil: closing,
          status: q.status,
          lines: { create: q.lines.map((l) => ({ tenantId, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, total: round2(new Prisma.Decimal(l.quantity).times(l.unitPrice)) })) },
        },
        select: { id: true },
      });
      quotationId = created.id;
    }
    if (q.status === QuotationStatus.SELECTED) selectedQuotationId = quotationId;
  }

  // 4. Purchase order (from the SELECTED quote) + lines — RECEIVED.
  const poNumber = `PO-${tag}-001`;
  const poLines = QUOTES[0]!.lines; // SUP1 (selected)
  const poTotal = round2(poLines.reduce((s, l) => s.plus(new Prisma.Decimal(l.quantity).times(l.unitPrice)), new Prisma.Decimal(0)));
  let purchaseOrderId: string;
  const existingPo = await prisma.purchaseOrder.findFirst({ where: { tenantId, poNumber }, select: { id: true } });
  if (existingPo) {
    purchaseOrderId = existingPo.id;
  } else {
    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        quotationId: selectedQuotationId,
        vendorId: supplierId.SUP1,
        poNumber,
        issueDate: now,
        expectedDeliveryDate: closing,
        branchId,
        matterId: matter?.id ?? null,
        totalAmount: poTotal,
        status: PurchaseOrderStatus.RECEIVED,
        lines: { create: poLines.map((l) => ({ tenantId, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, total: round2(new Prisma.Decimal(l.quantity).times(l.unitPrice)) })) },
      },
      select: { id: true },
    });
    purchaseOrderId = po.id;
  }

  // 5. Goods receipt + lines — RECEIVED in full.
  const receiptNumber = `POR-${tag}-001`;
  const existingReceipt = await prisma.purchaseOrderReceipt.findFirst({ where: { tenantId, receiptNumber }, select: { id: true } });
  if (!existingReceipt) {
    await prisma.purchaseOrderReceipt.create({
      data: {
        tenantId,
        purchaseOrderId,
        receiptNumber,
        receivedAt: now,
        receivedById: adminId,
        status: PurchaseReceiptStatus.RECEIVED,
        notes: 'Goods received in full (seed).',
        lines: { create: poLines.map((l) => ({ tenantId, description: l.description, quantityReceived: l.quantity, quantityRejected: 0 })) },
      },
    });
  }

  // 6. Vendor bill (+ lines) — 16% VAT, PAID.
  const billNumber = `VB-${tag}-001`;
  const subTotal = poTotal;
  const vatAmount = round2(subTotal.times(VAT_RATE));
  const total = round2(subTotal.plus(vatAmount));
  let vendorBillId: string;
  const existingBill = await prisma.vendorBill.findFirst({ where: { tenantId, billNumber }, select: { id: true } });
  if (existingBill) {
    vendorBillId = existingBill.id;
  } else {
    const bill = await prisma.vendorBill.create({
      data: {
        tenantId,
        supplierId: supplierId.SUP1,
        matterId: matter?.id ?? null,
        branchId,
        billNumber,
        supplierInvoice: `SINV-${tag}-1001`,
        billDate: now,
        dueDate: closing,
        paidAt: now,
        currency: 'KES',
        subTotal,
        vatAmount,
        whtRate: new Prisma.Decimal(0),
        whtAmount: new Prisma.Decimal(0),
        total,
        paidAmount: total,
        hasVat: true,
        status: VendorBillStatus.PAID,
        lines: {
          create: poLines.map((l) => {
            const lineTotal = round2(new Prisma.Decimal(l.quantity).times(l.unitPrice));
            return { tenantId, expenseAccountId: expenseAccount?.id ?? null, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, taxRate: VAT_RATE, taxAmount: round2(lineTotal.times(VAT_RATE)), total: lineTotal };
          }),
        },
      },
      select: { id: true },
    });
    vendorBillId = bill.id;
  }

  // 7. Vendor payment (full settlement).
  const existingPay = await prisma.vendorPayment.findFirst({ where: { tenantId, vendorBillId }, select: { id: true } });
  if (!existingPay) {
    await prisma.vendorPayment.create({
      data: { tenantId, vendorBillId, supplierId: supplierId.SUP1, amount: total, currency: 'KES', paymentDate: now, reference: `VPAY-${tag}-001`, notes: 'Vendor bill settled (seed).' },
    });
  }

  // 8. Expense entry (matter-linked, APPROVED).
  let expenseEntriesCreated = 0;
  if (matter) {
    const expenseRef = `EXP-${tag}-001`;
    const existingExp = await prisma.expenseEntry.findFirst({ where: { tenantId, reference: expenseRef }, select: { id: true } });
    if (!existingExp) {
      await prisma.expenseEntry.create({
        data: {
          tenantId,
          matterId: matter.id,
          branchId,
          expenseAccountId: expenseAccount?.id ?? null,
          amount: new Prisma.Decimal('5000.00'),
          currency: 'KES',
          expenseDate: now,
          description: 'Courier and postage (seed).',
          reference: expenseRef,
          userId: adminId,
          supplierId: supplierId.SUP1,
          status: ExpenseStatus.APPROVED,
        },
      });
    }
    expenseEntriesCreated = 1;
  }

  // 9. Recurring expense template (monthly subscription).
  const recurringTitle = 'Monthly legal research subscription (seed)';
  const existingRecurring = await prisma.recurringExpenseTemplate.findFirst({ where: { tenantId, title: recurringTitle }, select: { id: true } });
  if (!existingRecurring) {
    await prisma.recurringExpenseTemplate.create({
      data: {
        tenantId,
        title: recurringTitle,
        description: 'Monthly online legal research platform subscription.',
        amount: new Prisma.Decimal('15000.00'),
        currency: 'KES',
        frequency: RecurringFrequency.MONTHLY,
        startDate: now,
        expenseAccountId: expenseAccount?.id ?? null,
        supplierId: supplierId.SUP2,
        branchId,
        isActive: true,
      },
    });
  }

  // Final counts via queries (idempotent-safe).
  const kraPins = SUPPLIERS.map((s) => s.kraPin);
  const [
    suppliers, requestForQuotations, rfqItems, rfqSuppliers, quotations, quotationLines,
    purchaseOrders, purchaseOrderLines, purchaseOrderReceipts, purchaseOrderReceiptLines,
    vendorBills, vendorBillLines, vendorPayments, expenseEntriesCount, recurringExpenseTemplates,
  ] = await Promise.all([
    prisma.supplier.count({ where: { tenantId, kraPin: { in: kraPins } } }),
    prisma.requestForQuotation.count({ where: { tenantId, title: RFQ_TITLE } }),
    prisma.requestForQuotationItem.count({ where: { tenantId, rfqId } }),
    prisma.requestForQuotationSupplier.count({ where: { tenantId, rfqId } }),
    prisma.quotation.count({ where: { tenantId, rfqId } }),
    prisma.quotationLine.count({ where: { tenantId, quotation: { rfqId } } }),
    prisma.purchaseOrder.count({ where: { tenantId, poNumber } }),
    prisma.purchaseOrderLine.count({ where: { tenantId, purchaseOrder: { poNumber } } }),
    prisma.purchaseOrderReceipt.count({ where: { tenantId, receiptNumber } }),
    prisma.purchaseOrderReceiptLine.count({ where: { tenantId, receipt: { receiptNumber } } }),
    prisma.vendorBill.count({ where: { tenantId, billNumber } }),
    prisma.vendorBillLine.count({ where: { tenantId, vendorBill: { billNumber } } }),
    prisma.vendorPayment.count({ where: { tenantId, vendorBillId } }),
    prisma.expenseEntry.count({ where: { tenantId, reference: `EXP-${tag}-001` } }),
    prisma.recurringExpenseTemplate.count({ where: { tenantId, title: recurringTitle } }),
  ]);

  void expenseEntriesCreated;

  return {
    status: 'procurement_seed_complete',
    tenantId,
    suppliers, requestForQuotations, rfqItems, rfqSuppliers, quotations, quotationLines,
    purchaseOrders, purchaseOrderLines, purchaseOrderReceipts, purchaseOrderReceiptLines,
    vendorBills, vendorBillLines, vendorPayments, expenseEntries: expenseEntriesCount, recurringExpenseTemplates,
  };
}
