import {
  BillingNotificationStatus,
  BillingNotificationType,
  CreditNoteStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentReceiptStatus,
  Prisma,
  PrismaClient,
  ProformaStatus,
  ReminderChannel,
  ReminderStatus,
  ReminderTone,
  RetainerStatus,
  TenantRole,
} from '@prisma/client';
import { billingPostingService } from '../../../../apps/api/src/modules/billing/billing-posting.service';

/*
 * 22_billing.seed.ts — Per-tenant billing layer (CLAUDE.md §12).
 *
 * Comprehensive billing-domain seed. GL posting for issued invoices goes through
 * the REAL service (billingPostingService.postInvoiceIssued) — proving the
 * FINDING-007-010 fix works with seed data (the service is tx-based, not
 * express-coupled, so it is safe to call from a seed).
 *
 * VAT (Kenya): clients carry their KRA PIN (the VAT identifier) from onboarding
 * (03_clients). Invoice has no PIN column, so each invoice/proforma snapshots the
 * client's PIN + 16% VAT rate in `metadata` (point-in-time fiscal record). VAT
 * amounts are 16% of subtotal, wht = 0.
 *
 * Schema realities: Invoice "ISSUED" = INVOICED; line model is InvoiceLine;
 * ProformaStatus has no PENDING (seeded CONVERTED, linked to the invoice);
 * Retainer with an application is PARTIALLY_APPLIED. invoiceNumber/receiptNumber/
 * proformaNumber/retainerNumber/creditNoteNumber/reminderNumber are GLOBALLY
 * unique → tenant-tagged. The service asserts balanceDue(+wht) == subTotal+vat,
 * so issuance GL is posted while balanceDue == total; the PAID invoice has its
 * payment applied AFTER posting. issuedDate = now → lands in layer-10's OPEN
 * AccountingPeriod (assertPeriodOpen).
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy: idempotent (all entities gated by their tenant-tagged unique number;
 * postInvoiceIssued is itself idempotent). Tenant-scoped. No schema changes.
 */

type SeedPrisma = PrismaClient;
type LineSeed = { description: string; amount: string };
type InvoiceSeed = { num: string; status: InvoiceStatus; matter: 'A' | 'B'; postGl: boolean; markPaid: boolean; lines: LineSeed[] };

export type BillingSeedResult = {
  status: 'billing_seed_complete';
  tenantId: string;
  invoices: number;
  invoiceLines: number;
  glJournalsPosted: number;
  proformaInvoices: number;
  proformaLines: number;
  paymentReceipts: number;
  paymentAllocations: number;
  creditNotes: number;
  retainers: number;
  retainerApplications: number;
  paymentReminders: number;
  billingNotifications: number;
};

const ZERO = new Prisma.Decimal(0);
const VAT_RATE = new Prisma.Decimal('0.16');
const round2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

const INVOICE_SEEDS: InvoiceSeed[] = [
  { num: '001', status: InvoiceStatus.DRAFT, matter: 'A', postGl: false, markPaid: false, lines: [
    { description: 'Legal fees — advisory', amount: '50000.00' },
    { description: 'Court filing fees', amount: '30000.00' },
  ] },
  { num: '002', status: InvoiceStatus.INVOICED, matter: 'B', postGl: true, markPaid: false, lines: [
    { description: 'Legal fees — conveyancing', amount: '120000.00' },
    { description: 'Disbursements', amount: '20000.00' },
    { description: 'Court filing fees', amount: '10000.00' },
  ] },
  { num: '003', status: InvoiceStatus.INVOICED, matter: 'A', postGl: true, markPaid: true, lines: [
    { description: 'Legal fees — litigation', amount: '90000.00' },
    { description: 'Court filing fees', amount: '10000.00' },
  ] },
];

async function resolveAdminId(prisma: SeedPrisma, tenantId: string): Promise<string> {
  const admin =
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.FIRM_ADMIN }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } }));
  if (!admin) throw new Error(`seedBilling: no user for tenant ${tenantId}. Run 02_users first.`);
  return admin.id;
}

async function resolveMatter(
  prisma: SeedPrisma,
  tenantId: string,
  code: string,
): Promise<{ id: string; clientId: string; clientKraPin: string | null } | null> {
  const m =
    (await prisma.matter.findFirst({ where: { tenantId, matterCode: code }, select: { id: true, clientId: true, client: { select: { kraPin: true } } } })) ??
    (await prisma.matter.findFirst({ where: { tenantId }, select: { id: true, clientId: true, client: { select: { kraPin: true } } } }));
  return m && m.clientId ? { id: m.id, clientId: m.clientId, clientKraPin: m.client?.kraPin ?? null } : null;
}

export async function seedBilling(prisma: PrismaClient, tenantId: string): Promise<BillingSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) throw new Error('seedBilling requires a tenantId.');

  const adminId = await resolveAdminId(prisma, tenantId);
  const branch = await prisma.branch.findFirst({ where: { tenantId }, select: { id: true } });
  const branchId = branch?.id ?? null;
  const matterA = await resolveMatter(prisma, tenantId, 'MAT-0001');
  const matterB = await resolveMatter(prisma, tenantId, 'MAT-0004');
  if (!matterA || !matterB) throw new Error(`seedBilling: matters not seeded for tenant ${tenantId}. Run 06_matters first.`);

  const tag = tenantId.slice(-6);
  const now = new Date();
  const dueDate = new Date(now.getTime() + 30 * 24 * 3600_000);
  const matterOf = (k: 'A' | 'B') => (k === 'A' ? matterA! : matterB!);

  // 1. Invoices (+ lines) and 2. GL via the real posting service.
  const invoiceIdByNum = new Map<string, { id: string; total: Prisma.Decimal; matterId: string; clientId: string; clientKraPin: string | null }>();
  for (const seed of INVOICE_SEEDS) {
    const m = matterOf(seed.matter);
    const invoiceNumber = `INV-${tag}-${seed.num}`;
    const subTotal = round2(seed.lines.reduce((s, l) => s.plus(l.amount), ZERO));
    const vatAmount = round2(subTotal.times(VAT_RATE));
    const total = round2(subTotal.plus(vatAmount));

    let invoiceId: string;
    const existing = await prisma.invoice.findFirst({ where: { tenantId, invoiceNumber }, select: { id: true } });
    if (existing) {
      invoiceId = existing.id;
    } else {
      const created = await prisma.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          matterId: m.id,
          clientId: m.clientId,
          branchId,
          subTotal,
          vatAmount,
          taxAmount: vatAmount,
          whtAmount: ZERO,
          total,
          netAmount: subTotal,
          balanceDue: total,
          paidAmount: ZERO,
          currency: 'KES',
          exchangeRate: 1,
          status: seed.status,
          issuedDate: now,
          dueDate,
          metadata: { clientKraPin: m.clientKraPin, vatRate: '16%', vatRegistered: Boolean(m.clientKraPin) },
          lines: {
            create: seed.lines.map((l) => {
              const amt = new Prisma.Decimal(l.amount);
              const tax = round2(amt.times(VAT_RATE));
              return {
                tenantId,
                matterId: m.id,
                clientId: m.clientId,
                description: l.description,
                quantity: 1,
                unitPrice: amt,
                subTotal: amt,
                taxRate: VAT_RATE,
                taxMode: 'VATABLE',
                taxAmount: tax,
                total: round2(amt.plus(tax)),
              };
            }),
          },
        },
        select: { id: true },
      });
      invoiceId = created.id;
    }
    invoiceIdByNum.set(seed.num, { id: invoiceId, total, matterId: m.id, clientId: m.clientId, clientKraPin: m.clientKraPin });

    // GL posting via the real service (idempotent) — issued invoices only, while balanceDue == total.
    if (seed.postGl) {
      await prisma.$transaction(async (tx) => {
        await billingPostingService.postInvoiceIssued(tx as Prisma.TransactionClient, { tenantId, invoiceId, postedById: adminId });
      });
    }

    // PAID invoice: apply payment AFTER GL posting.
    if (seed.markPaid) {
      const receiptNumber = `RCT-${tag}-${seed.num}`;
      const existingReceipt = await prisma.paymentReceipt.findFirst({ where: { tenantId, receiptNumber }, select: { id: true } });
      if (!existingReceipt) {
        await prisma.paymentReceipt.create({
          data: {
            tenantId,
            receiptNumber,
            clientId: m.clientId,
            matterId: m.id,
            invoiceId,
            amount: total,
            currency: 'KES',
            method: PaymentMethod.MPESA,
            unallocatedAmount: ZERO,
            reference: `MPESA-SEED-${tag}-${seed.num}`,
            description: 'M-PESA payment for invoice (seed).',
            status: PaymentReceiptStatus.ALLOCATED,
            receivedAt: now,
            createdById: adminId,
            allocations: { create: [{ tenantId, invoiceId, allocationType: 'CASH', amountApplied: total }] },
          },
        });
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { paidAmount: total, balanceDue: ZERO, status: InvoiceStatus.PAID, paidDate: now },
        });
      }
    }
  }

  const issued = invoiceIdByNum.get('002')!; // INVOICED invoice for proforma/credit/retainer/reminder/notification

  // 3. Proforma (CONVERTED → the INVOICED invoice) + lines.
  const proformaNumber = `PRO-${tag}-001`;
  const issuedSub = round2(new Prisma.Decimal('150000.00'));
  const issuedVat = round2(issuedSub.times(VAT_RATE));
  const issuedTotal = round2(issuedSub.plus(issuedVat));
  const existingProforma = await prisma.proformaInvoice.findFirst({ where: { tenantId, proformaNumber }, select: { id: true } });
  if (!existingProforma) {
    await prisma.proformaInvoice.create({
      data: {
        tenantId,
        proformaNumber,
        clientId: issued.clientId,
        matterId: issued.matterId,
        currency: 'KES',
        issueDate: now,
        status: ProformaStatus.CONVERTED,
        subTotal: issuedSub,
        taxAmount: issuedVat,
        totalAmount: issuedTotal,
        balanceDue: ZERO,
        createdById: adminId,
        convertedAt: now,
        convertedById: adminId,
        invoiceId: issued.id,
        metadata: { clientKraPin: issued.clientKraPin, vatRate: '16%' },
        lines: {
          create: [
            { tenantId, lineNumber: 1, description: 'Legal fees — conveyancing', quantity: 1, unitPrice: new Prisma.Decimal('120000.00'), taxRate: VAT_RATE, subTotal: new Prisma.Decimal('120000.00'), taxAmount: round2(new Prisma.Decimal('120000.00').times(VAT_RATE)), totalAmount: round2(new Prisma.Decimal('120000.00').times(new Prisma.Decimal('1.16'))), matterId: issued.matterId },
            { tenantId, lineNumber: 2, description: 'Disbursements + filing', quantity: 1, unitPrice: new Prisma.Decimal('30000.00'), taxRate: VAT_RATE, subTotal: new Prisma.Decimal('30000.00'), taxAmount: round2(new Prisma.Decimal('30000.00').times(VAT_RATE)), totalAmount: round2(new Prisma.Decimal('30000.00').times(new Prisma.Decimal('1.16'))), matterId: issued.matterId },
          ],
        },
      },
    });
  }

  // 4. Credit note (partial credit against the INVOICED invoice).
  const creditNoteNumber = `CRN-${tag}-001`;
  const existingCn = await prisma.creditNote.findFirst({ where: { tenantId, creditNoteNumber }, select: { id: true } });
  if (!existingCn) {
    const cnSub = new Prisma.Decimal('20000.00');
    const cnTax = round2(cnSub.times(VAT_RATE));
    await prisma.creditNote.create({
      data: {
        tenantId,
        invoiceId: issued.id,
        matterId: issued.matterId,
        clientId: issued.clientId,
        creditNoteNumber,
        amount: round2(cnSub.plus(cnTax)),
        currency: 'KES',
        subTotal: cnSub,
        taxAmount: cnTax,
        totalAmount: round2(cnSub.plus(cnTax)),
        creditDate: now,
        reason: 'Partial credit — disbursement adjustment (seed).',
        status: CreditNoteStatus.ISSUED,
        createdById: adminId,
        issuedAt: now,
      },
    });
  }

  // 5. Retainer (client of the INVOICED invoice) + 6. partial application against it.
  const retainerNumber = `RET-${tag}-001`;
  const retainerAmount = new Prisma.Decimal('150000.00');
  const appliedAmount = new Prisma.Decimal('50000.00');
  let retainerId: string;
  const existingRet = await prisma.retainer.findFirst({ where: { tenantId, retainerNumber }, select: { id: true } });
  if (existingRet) {
    retainerId = existingRet.id;
  } else {
    const ret = await prisma.retainer.create({
      data: {
        tenantId,
        retainerNumber,
        clientId: issued.clientId,
        matterId: issued.matterId,
        amount: retainerAmount,
        unappliedAmount: round2(retainerAmount.minus(appliedAmount)),
        appliedAmount,
        currency: 'KES',
        receivedAt: now,
        reference: `RET-PAY-${tag}`,
        description: 'Client retainer (seed).',
        status: RetainerStatus.PARTIALLY_APPLIED,
        createdById: adminId,
      },
      select: { id: true },
    });
    retainerId = ret.id;
  }
  const existingApp = await prisma.retainerApplication.findFirst({ where: { tenantId, retainerId, invoiceId: issued.id }, select: { id: true } });
  if (!existingApp) {
    await prisma.retainerApplication.create({
      data: {
        tenantId,
        retainerId,
        invoiceId: issued.id,
        clientId: issued.clientId,
        matterId: issued.matterId,
        amount: appliedAmount,
        appliedAt: now,
        appliedById: adminId,
        notes: 'Partial retainer application against invoice (seed).',
      },
    });
  }

  // 7. Payment reminder (for the INVOICED invoice, SENT).
  const reminderNumber = `REM-${tag}-001`;
  const existingRem = await prisma.paymentReminder.findFirst({ where: { tenantId, reminderNumber }, select: { id: true } });
  if (!existingRem) {
    await prisma.paymentReminder.create({
      data: {
        tenantId,
        invoiceId: issued.id,
        clientId: issued.clientId,
        matterId: issued.matterId,
        reminderNumber,
        channel: ReminderChannel.EMAIL,
        tone: ReminderTone.STANDARD,
        status: ReminderStatus.SENT,
        message: 'Friendly reminder: invoice payment is due.',
        outstandingAmount: issuedTotal,
        dueDate,
        createdById: adminId,
        sentAt: now,
        sentById: adminId,
      },
    });
  }

  // 8. Billing notification (invoice issued).
  const existingNotif = await prisma.billingNotification.findFirst({ where: { tenantId, type: BillingNotificationType.INVOICE_ISSUED, invoiceId: issued.id }, select: { id: true } });
  if (!existingNotif) {
    await prisma.billingNotification.create({
      data: {
        tenantId,
        type: BillingNotificationType.INVOICE_ISSUED,
        channel: ReminderChannel.EMAIL,
        clientId: issued.clientId,
        matterId: issued.matterId,
        invoiceId: issued.id,
        subject: 'Your invoice has been issued',
        message: 'Please find your invoice attached. Payment is due within 30 days.',
        status: BillingNotificationStatus.SENT,
        createdById: adminId,
        sentAt: now,
        sentById: adminId,
      },
    });
  }

  // Final counts via queries (idempotent-safe).
  const invoiceNumbers = INVOICE_SEEDS.map((s) => `INV-${tag}-${s.num}`);
  const invoiceIds = [...invoiceIdByNum.values()].map((v) => v.id);
  const [
    invoices, invoiceLines, glJournalsPosted, proformaInvoices, proformaLines,
    paymentReceipts, paymentAllocations, creditNotes, retainers, retainerApplications,
    paymentReminders, billingNotifications,
  ] = await Promise.all([
    prisma.invoice.count({ where: { tenantId, invoiceNumber: { in: invoiceNumbers } } }),
    prisma.invoiceLine.count({ where: { tenantId, invoiceId: { in: invoiceIds } } }),
    prisma.journalEntry.count({ where: { tenantId, sourceModule: 'BILLING', sourceEntityType: 'INVOICE', sourceEntityId: { in: invoiceIds } } }),
    prisma.proformaInvoice.count({ where: { tenantId, proformaNumber } }),
    prisma.proformaLine.count({ where: { tenantId, proformaInvoice: { proformaNumber } } }),
    prisma.paymentReceipt.count({ where: { tenantId, receiptNumber: `RCT-${tag}-003` } }),
    prisma.paymentReceiptAllocation.count({ where: { tenantId, invoiceId: { in: invoiceIds } } }),
    prisma.creditNote.count({ where: { tenantId, creditNoteNumber } }),
    prisma.retainer.count({ where: { tenantId, retainerNumber } }),
    prisma.retainerApplication.count({ where: { tenantId, retainerId } }),
    prisma.paymentReminder.count({ where: { tenantId, reminderNumber } }),
    prisma.billingNotification.count({ where: { tenantId, invoiceId: issued.id, type: BillingNotificationType.INVOICE_ISSUED } }),
  ]);

  return {
    status: 'billing_seed_complete',
    tenantId,
    invoices, invoiceLines, glJournalsPosted, proformaInvoices, proformaLines,
    paymentReceipts, paymentAllocations, creditNotes, retainers, retainerApplications,
    paymentReminders, billingNotifications,
  };
}
