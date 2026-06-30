/*
 * 21_validation.seed.ts — Post-seed validation layer (CLAUDE.md §12).
 *
 * READ-ONLY. Runs LAST in the master seed (after all data layers). Two parts:
 *
 *   1. Schema-drift sweep — a `.count()` read-query against every seeded
 *      model. A query that throws (e.g. a controller/seed referencing a
 *      field the deployed schema lost) is caught and surfaced as DRIFT —
 *      the early-warning system §12 calls for (would have caught the
 *      Department/Payroll/Tasks/Documents dead-field bugs pre-prod).
 *
 *   2. Cross-model relational integrity — the 14 agreed checks (FK +
 *      polymorphic/soft refs, GL DR=CR, ADR-004 trust three-way), each
 *      reported PASS/FAIL with counts + offending IDs.
 *
 * Does NOT throw on data findings (recon mismatches are findings, not seed
 * failures); it throws only if it cannot connect. Returns a structured
 * result and prints a matrix. Idempotent — safe to re-run.
 *
 * Standalone:  node --require tsx/cjs packages/database/prisma/seeds/21_validation.seed.ts
 */
import path from 'path';

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { SECONDARY_TENANT_SLUGS } from './01_tenants.seed';

type Row = { check: string; status: 'PASS' | 'FAIL' | 'INFO'; count: string; detail: string };

export type ValidationSeedResult = {
  status: 'validation_complete';
  schemaDrift: { model: string; error: string }[];
  checks: Row[];
  pass: number;
  fail: number;
  info: number;
};

// Every seeded model, by Prisma delegate name — the schema-drift read-sweep.
const SWEEP_MODELS = [
  'tenant', 'user', 'client', 'clientContact', 'branch', 'matter', 'calendarEvent',
  'courtHearing', 'matterTask', 'document', 'chartOfAccount', 'journalEntry',
  'journalLine', 'accountingPeriod', 'invoice', 'invoiceLine', 'paymentReceipt',
  'creditNote', 'proformaInvoice', 'retainer', 'paymentReminder', 'trustAccount',
  'trustTransaction', 'clientTrustLedger', 'trustReconciliation', 'bankStatement',
  'bankTransaction', 'payrollBatch', 'payrollRecord', 'payslip', 'employee',
  'disciplinaryCase', 'disciplinaryAction', 'leaveRequest', 'vatAdjustment',
  'withholdingTaxCertificate', 'supplier', 'quotation', 'purchaseOrder',
  'vendorBill', 'tenderRecord', 'courtFiling', 'approval',
];

export async function seedValidation(
  prisma: PrismaClient,
  opts?: { tenantIds?: string[] },
): Promise<ValidationSeedResult> {
  // When master.seed passes the tenant ids it actually seeded, the per-tenant
  // data-integrity checks (10-13) scope to those — so the gate validates what
  // the seed OWNS, not legacy/demo residue on tenants the seed never touched
  // (e.g. the Demo Law Firm cert-test tenant — XREL-001/002). No scope = all
  // tenants (standalone diagnostic mode).
  let scopeIds: string[] | null =
    opts?.tenantIds && opts.tenantIds.length > 0 ? opts.tenantIds : null;
  if (!scopeIds) {
    // Standalone: resolve the SAME deterministic seed-owned set by slug —
    // the env-driven primary (SEED_TENANT_SLUG) + the SECONDARY_TENANTS defs.
    // No match → null → all-tenants diagnostic mode.
    const seededSlugs = [
      process.env.SEED_TENANT_SLUG?.trim().toLowerCase(),
      ...SECONDARY_TENANT_SLUGS,
    ].filter((s): s is string => Boolean(s));
    if (seededSlugs.length > 0) {
      const seeded = await prisma.tenant.findMany({
        where: { slug: { in: seededSlugs } },
        select: { id: true },
      });
      if (seeded.length > 0) scopeIds = seeded.map((t) => t.id);
    }
  }
  const scopeSet = scopeIds ? new Set(scopeIds) : null;
  const inScope = (tenantId: string) => !scopeSet || scopeSet.has(tenantId);
  const scopeNote = scopeIds ? `[scoped: ${scopeIds.length} seeded tenant(s)]` : '[all tenants]';

  const results: Row[] = [];
  const offenders: string[] = [];
  const record = (check: string, status: Row['status'], count: string, detail: string) =>
    results.push({ check, status, count, detail });
  const fail = (check: string, ids: string[], detail: string) =>
    offenders.push(`\n[FAIL] ${check}\n  ${detail}\n  offending IDs (${ids.length}): ${ids.slice(0, 50).join(', ')}${ids.length > 50 ? ' …' : ''}`);

  const dec = (v: any) => Number(v ?? 0);
  const setOf = async (rows: Promise<{ id: string }[]>) => new Set((await rows).map(r => r.id));

  // ===== 0. SCHEMA-DRIFT READ-SWEEP ===================================
  const schemaDrift: { model: string; error: string }[] = [];
  for (const model of SWEEP_MODELS) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any)[model].count();
    } catch (e) {
      schemaDrift.push({ model, error: e instanceof Error ? e.message.split('\n')[0] : String(e) });
    }
  }

  {
    // Reusable parent id-sets (scalar membership = uniform orphan test that
    // works for BOTH required and nullable relations, and PROVES integrity
    // rather than trusting the FK constraint).
    const matterIds = await setOf(prisma.matter.findMany({ select: { id: true } }));
    const clientIds = await setOf(prisma.client.findMany({ select: { id: true } }));
    const userIds = await setOf(prisma.user.findMany({ select: { id: true } }));
    const trustAcctIds = await setOf(prisma.trustAccount.findMany({ select: { id: true } }));
    const supplierIds = await setOf(prisma.supplier.findMany({ select: { id: true } }));

    const missingRefs = (rows: { id: string; ref: string | null }[], parents: Set<string>, requireNonNull: boolean) =>
      rows.filter(r => (r.ref === null ? requireNonNull : !parents.has(r.ref)));

    // ===== FK / REFERENCE INTEGRITY =====================================

    // 1. Invoice → Matter (NON-NULL FK) ; Invoice → Client (nullable, soft)
    {
      const invs = await prisma.invoice.findMany({ select: { id: true, matterId: true, clientId: true } });
      const orphanMatter = missingRefs(invs.map(i => ({ id: i.id, ref: i.matterId })), matterIds, true);
      const orphanClient = missingRefs(invs.map(i => ({ id: i.id, ref: i.clientId })), clientIds, false);
      const ok = orphanMatter.length === 0 && orphanClient.length === 0;
      record('1. Invoice→Matter (FK) / Invoice→Client (nullable)', ok ? 'PASS' : 'FAIL',
        `${invs.length} invoices`, `matterOrphans=${orphanMatter.length}, clientOrphans=${orphanClient.length}`);
      if (orphanMatter.length) fail('1a Invoice→Matter', orphanMatter.map(r => r.id), 'invoice.matterId points to missing Matter');
      if (orphanClient.length) fail('1b Invoice→Client', orphanClient.map(r => r.id), 'invoice.clientId set but Client missing');
    }

    // 2. TrustTransaction → TrustAccount (NON-NULL FK) ; → Matter/Client (nullable)
    {
      const txns = await prisma.trustTransaction.findMany({ select: { id: true, trustAccountId: true, matterId: true, clientId: true } });
      const orphanAcct = missingRefs(txns.map(t => ({ id: t.id, ref: t.trustAccountId })), trustAcctIds, true);
      const orphanMatter = missingRefs(txns.map(t => ({ id: t.id, ref: t.matterId })), matterIds, false);
      const orphanClient = missingRefs(txns.map(t => ({ id: t.id, ref: t.clientId })), clientIds, false);
      const ok = !orphanAcct.length && !orphanMatter.length && !orphanClient.length;
      record('2. TrustTxn→Account (FK) / →Matter / →Client', ok ? 'PASS' : 'FAIL',
        `${txns.length} txns`, `acctOrphans=${orphanAcct.length}, matterOrphans=${orphanMatter.length}, clientOrphans=${orphanClient.length}`);
      if (orphanAcct.length) fail('2a TrustTxn→Account', orphanAcct.map(r => r.id), 'missing TrustAccount');
      if (orphanMatter.length) fail('2b TrustTxn→Matter', orphanMatter.map(r => r.id), 'matterId set but Matter missing');
      if (orphanClient.length) fail('2c TrustTxn→Client', orphanClient.map(r => r.id), 'clientId set but Client missing');
    }

    // 3. PayrollRecord → PayrollBatch & → User (both NON-NULL FK)
    {
      const batchIds = await setOf(prisma.payrollBatch.findMany({ select: { id: true } }));
      const recs = await prisma.payrollRecord.findMany({ select: { id: true, batchId: true, userId: true } });
      const orphanBatch = missingRefs(recs.map(r => ({ id: r.id, ref: r.batchId })), batchIds, true);
      const orphanUser = missingRefs(recs.map(r => ({ id: r.id, ref: r.userId })), userIds, true);
      const ok = !orphanBatch.length && !orphanUser.length;
      record('3. PayrollRecord→Batch & →User (FK)', ok ? 'PASS' : 'FAIL',
        `${recs.length} records`, `batchOrphans=${orphanBatch.length}, userOrphans=${orphanUser.length}`);
      if (orphanBatch.length) fail('3a PayrollRecord→Batch', orphanBatch.map(r => r.id), 'missing PayrollBatch');
      if (orphanUser.length) fail('3b PayrollRecord→User', orphanUser.map(r => r.id), 'missing User');
    }

    // 4. DisciplinaryCase → Employee (SOFT — no FK; employeeId is plain String)
    {
      const cases = await prisma.disciplinaryCase.findMany({ select: { id: true, employeeId: true } });
      const empIds = await setOf(prisma.employee.findMany({ select: { id: true } }));
      const badToEmployee = cases.filter(c => !empIds.has(c.employeeId));
      const hitsUserInstead = badToEmployee.filter(c => userIds.has(c.employeeId));
      const ok = badToEmployee.length === 0;
      record('4. DisciplinaryCase→Employee (SOFT, no FK)', ok ? 'PASS' : 'FAIL',
        `${cases.length} cases`, `unresolved=${badToEmployee.length} (of which point to User.id instead=${hitsUserInstead.length})`);
      if (badToEmployee.length) fail('4 DisciplinaryCase→Employee', badToEmployee.map(c => `${c.id}(emp=${c.employeeId})`),
        'employeeId does not resolve to a real Employee.id (FINDING-008-003 surface)');
    }

    // 5. CourtFiling → Matter (NON-NULL FK) ; → CourtHearing (nullable hearingId, soft)
    {
      const hearingIds = await setOf(prisma.courtHearing.findMany({ select: { id: true } }));
      const filings = await prisma.courtFiling.findMany({ select: { id: true, matterId: true, hearingId: true } });
      const orphanMatter = missingRefs(filings.map(f => ({ id: f.id, ref: f.matterId })), matterIds, true);
      const orphanHearing = missingRefs(filings.map(f => ({ id: f.id, ref: f.hearingId })), hearingIds, false);
      const ok = !orphanMatter.length && !orphanHearing.length;
      record('5. CourtFiling→Matter (FK) / →Hearing (nullable)', ok ? 'PASS' : 'FAIL',
        `${filings.length} filings`, `matterOrphans=${orphanMatter.length}, hearingOrphans=${orphanHearing.length}`);
      if (orphanMatter.length) fail('5a CourtFiling→Matter', orphanMatter.map(r => r.id), 'missing Matter');
      if (orphanHearing.length) fail('5b CourtFiling→Hearing', orphanHearing.map(r => r.id), 'hearingId set but CourtHearing missing');
    }

    // 6. Approval → source entity (SOFT polymorphic: entityType + entityId, no FK)
    {
      const approvals = await prisma.approval.findMany({ select: { id: true, entityType: true, entityId: true } });
      // Build resolver map per entityType -> existing id-set, lazily.
      // Keys normalized: uppercase + strip non-alphanumerics, so 'PaymentReceipt',
      // 'PAYMENT_RECEIPT', 'payment-receipt' all collapse to 'PAYMENTRECEIPT'.
      const norm = (s: string) => (s || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
      const resolvers: Record<string, () => Promise<Set<string>>> = {
        INVOICE: async () => setOf(prisma.invoice.findMany({ select: { id: true } })),
        CREDITNOTE: async () => setOf(prisma.creditNote.findMany({ select: { id: true } })),
        PURCHASEORDER: async () => setOf(prisma.purchaseOrder.findMany({ select: { id: true } })),
        VENDORBILL: async () => setOf(prisma.vendorBill.findMany({ select: { id: true } })),
        LEAVEREQUEST: async () => setOf(prisma.leaveRequest.findMany({ select: { id: true } })),
        MATTER: async () => setOf(prisma.matter.findMany({ select: { id: true } })),
        JOURNALENTRY: async () => setOf(prisma.journalEntry.findMany({ select: { id: true } })),
        PAYMENTRECEIPT: async () => setOf(prisma.paymentReceipt.findMany({ select: { id: true } })),
        TRUSTTRANSACTION: async () => setOf(prisma.trustTransaction.findMany({ select: { id: true } })),
        PAYROLLBATCH: async () => setOf(prisma.payrollBatch.findMany({ select: { id: true } })),
        TENDER: async () => setOf(prisma.tenderRecord.findMany({ select: { id: true } })),
        TENDERRECORD: async () => setOf(prisma.tenderRecord.findMany({ select: { id: true } })),
      };
      const cache: Record<string, Set<string>> = {};
      const byType: Record<string, number> = {};
      const unresolvable: string[] = [];  // entityType has no resolver mapping
      const missing: string[] = [];       // entityType known but entityId not found
      for (const a of approvals) {
        const t = norm(a.entityType);
        byType[t] = (byType[t] || 0) + 1;
        const resolver = resolvers[t];
        if (!resolver) { unresolvable.push(`${a.id}(type=${a.entityType})`); continue; }
        if (!cache[t]) cache[t] = await resolver();
        if (!cache[t].has(a.entityId)) missing.push(`${a.id}(type=${t},entity=${a.entityId})`);
      }
      const ok = missing.length === 0;
      record('6. Approval→source entity (SOFT polymorphic)', ok ? (unresolvable.length ? 'INFO' : 'PASS') : 'FAIL',
        `${approvals.length} approvals`,
        `types={${Object.entries(byType).map(([k, v]) => `${k}:${v}`).join(', ')}}; missing=${missing.length}; unmappedType=${unresolvable.length}`);
      if (missing.length) fail('6 Approval→entity', missing, 'entityId does not resolve in its target table');
      if (unresolvable.length) offenders.push(`\n[INFO] 6 Approval entityType with no resolver mapping (cannot verify, not a fail): ${unresolvable.slice(0, 50).join(', ')}`);
    }

    // 7. TenderRecord → Matter (nullable FK, soft)
    {
      const tenders = await prisma.tenderRecord.findMany({ select: { id: true, matterId: true } });
      const linked = tenders.filter(t => t.matterId !== null).length;
      const orphanMatter = missingRefs(tenders.map(t => ({ id: t.id, ref: t.matterId })), matterIds, false);
      const ok = orphanMatter.length === 0;
      record('7. TenderRecord→Matter (nullable)', ok ? 'PASS' : 'FAIL',
        `${tenders.length} tenders (${linked} matter-linked)`, `matterOrphans=${orphanMatter.length}`);
      if (orphanMatter.length) fail('7 TenderRecord→Matter', orphanMatter.map(r => r.id), 'matterId set but Matter missing');
    }

    // 8. PurchaseOrder→Supplier & →Quotation (NON-NULL) ; VendorBill→Supplier (NON-NULL)
    {
      const quotationIds = await setOf(prisma.quotation.findMany({ select: { id: true } }));
      const pos = await prisma.purchaseOrder.findMany({ select: { id: true, vendorId: true, quotationId: true } });
      const poOrphanVendor = missingRefs(pos.map(p => ({ id: p.id, ref: p.vendorId })), supplierIds, true);
      const poOrphanQuote = missingRefs(pos.map(p => ({ id: p.id, ref: p.quotationId })), quotationIds, true);
      const bills = await prisma.vendorBill.findMany({ select: { id: true, supplierId: true } });
      const vbOrphanSupplier = missingRefs(bills.map(b => ({ id: b.id, ref: b.supplierId })), supplierIds, true);
      const ok = !poOrphanVendor.length && !poOrphanQuote.length && !vbOrphanSupplier.length;
      record('8. PO→Supplier/Quotation & VendorBill→Supplier (FK)', ok ? 'PASS' : 'FAIL',
        `${pos.length} POs / ${bills.length} bills`, `poVendorOrphans=${poOrphanVendor.length}, poQuoteOrphans=${poOrphanQuote.length}, billSupplierOrphans=${vbOrphanSupplier.length}`);
      if (poOrphanVendor.length) fail('8a PO→Supplier', poOrphanVendor.map(r => r.id), 'missing Supplier');
      if (poOrphanQuote.length) fail('8b PO→Quotation', poOrphanQuote.map(r => r.id), 'missing Quotation');
      if (vbOrphanSupplier.length) fail('8c VendorBill→Supplier', vbOrphanSupplier.map(r => r.id), 'missing Supplier');
    }

    // ===== GL INTEGRITY =================================================

    // 9. Every JournalEntry: Σ debit = Σ credit
    {
      const entries = await prisma.journalEntry.findMany({
        select: { id: true, reference: true, lines: { select: { debit: true, credit: true } } },
      });
      const unbalanced = entries.filter(e => {
        const d = e.lines.reduce((s, l) => s + dec(l.debit), 0);
        const c = e.lines.reduce((s, l) => s + dec(l.credit), 0);
        return Math.abs(d - c) > 0.005;
      });
      const noLines = entries.filter(e => e.lines.length === 0);
      const ok = unbalanced.length === 0;
      record('9. JournalEntry DR=CR (every entry balanced)', ok ? 'PASS' : 'FAIL',
        `${entries.length} entries`, `unbalanced=${unbalanced.length}, zeroLine=${noLines.length}`);
      if (unbalanced.length) fail('9 JournalEntry balance', unbalanced.map(e => {
        const d = e.lines.reduce((s, l) => s + dec(l.debit), 0);
        const c = e.lines.reduce((s, l) => s + dec(l.credit), 0);
        return `${e.id}(${e.reference}: DR ${d.toFixed(2)} vs CR ${c.toFixed(2)})`;
      }), 'sum(debit) != sum(credit)');
    }

    // 10. Trust bank GL (subtype TRUST_BANK) == Trust liability GL (subtype TRUST_LIABILITY), per tenant (ADR-004)
    {
      const trustBankAccts = (await prisma.chartOfAccount.findMany({ where: { subtype: 'TRUST_BANK' }, select: { id: true, tenantId: true, code: true } })).filter(a => inScope(a.tenantId));
      const trustLiabAccts = (await prisma.chartOfAccount.findMany({ where: { subtype: 'TRUST_LIABILITY' }, select: { id: true, tenantId: true, code: true } })).filter(a => inScope(a.tenantId));
      const sumFor = async (accountIds: string[]) => {
        if (!accountIds.length) return 0;
        const agg = await prisma.journalLine.aggregate({
          _sum: { debit: true, credit: true }, where: { accountId: { in: accountIds } },
        });
        return dec(agg._sum.debit) - dec(agg._sum.credit);
      };
      const tenants = Array.from(new Set([...trustBankAccts, ...trustLiabAccts].map(a => a.tenantId)));
      const mism: string[] = [];
      const detail: string[] = [];
      for (const t of tenants) {
        const bankIds = trustBankAccts.filter(a => a.tenantId === t).map(a => a.id);
        const liabIds = trustLiabAccts.filter(a => a.tenantId === t).map(a => a.id);
        const bankBal = await sumFor(bankIds);          // asset: DR-CR (positive = funds held)
        const liabBalRaw = await sumFor(liabIds);        // liability: natural CR balance => DR-CR is negative
        const liabBal = -liabBalRaw;                     // flip to compare magnitude owed to clients
        detail.push(`${t.slice(0, 8)}:bank=${bankBal.toFixed(2)}/liab=${liabBal.toFixed(2)}`);
        if (Math.abs(bankBal - liabBal) > 0.005) mism.push(`${t}(bank ${bankBal.toFixed(2)} vs liab ${liabBal.toFixed(2)})`);
      }
      const ok = mism.length === 0;
      record('10. Trust bank GL == Trust liability GL /tenant (ADR-004)', ok ? 'PASS' : 'FAIL',
        `${tenants.length} tenants ${scopeNote}`, detail.join(' | ') || 'no trust GL accounts');
      if (mism.length) fail('10 Trust GL balance (ADR-004)', mism, 'trust bank GL balance != trust liability GL balance');
    }

    // 11. Opening journal entry present per FINANCE-ACTIVE tenant.
    //     Scoped to tenants that actually have a Chart of Accounts — an empty
    //     bootstrap/infra tenant (coa=0, no journals) correctly has none.
    {
      const tenants = (await prisma.tenant.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }))
        .filter(t => inScope(t.id));
      const missing: string[] = [];
      const detail: string[] = [];
      let skipped = 0;
      for (const t of tenants) {
        const coa = await prisma.chartOfAccount.count({ where: { tenantId: t.id } });
        if (coa === 0) { detail.push(`${t.name}:SKIP(no CoA)`); skipped++; continue; }
        const opening = await prisma.journalEntry.count({
          where: {
            tenantId: t.id,
            OR: [
              { sourceEntityType: { equals: 'OpeningBalance' } },
              { reference: { contains: 'OPEN', mode: 'insensitive' } },
              { description: { contains: 'opening', mode: 'insensitive' } },
            ],
          },
        });
        detail.push(`${t.name}:${opening}`);
        if (opening === 0) missing.push(`${t.id}(${t.name})`);
      }
      const ok = missing.length === 0;
      record('11. Opening journal /finance-active tenant', ok ? 'PASS' : 'FAIL',
        `${tenants.length} tenants (${skipped} skipped: no CoA) ${scopeNote}`, detail.join(', '));
      if (missing.length) fail('11 Opening journal', missing, 'finance-active tenant (has CoA) has no opening-balance journal entry');
    }

    // ===== TRUST THREE-WAY ==============================================

    // 12. TrustAccount.currentBalance == Σ(its TrustTransaction credit - debit)
    {
      const accts = await prisma.trustAccount.findMany({ where: scopeIds ? { tenantId: { in: scopeIds } } : undefined, select: { id: true, accountName: true, currentBalance: true } });
      const mism: string[] = [];
      for (const a of accts) {
        const agg = await prisma.trustTransaction.aggregate({
          _sum: { credit: true, debit: true }, where: { trustAccountId: a.id },
        });
        const computed = dec(agg._sum.credit) - dec(agg._sum.debit);
        if (Math.abs(computed - dec(a.currentBalance)) > 0.005) {
          mism.push(`${a.id}(${a.accountName}: stored ${dec(a.currentBalance).toFixed(2)} vs txnsum ${computed.toFixed(2)})`);
        }
      }
      const ok = mism.length === 0;
      record('12. TrustAccount.currentBalance == Σ txns', ok ? 'PASS' : 'FAIL',
        `${accts.length} accounts ${scopeNote}`, `mismatches=${mism.length}`);
      if (mism.length) fail('12 TrustAccount balance', mism, 'stored currentBalance != sum(credit-debit) of transactions');
    }

    // 13. ClientTrustLedger latest running balance == TrustAccount balance (per account)
    {
      const accts = await prisma.trustAccount.findMany({ where: scopeIds ? { tenantId: { in: scopeIds } } : undefined, select: { id: true, accountName: true, currentBalance: true } });
      const mism: string[] = [];
      const detail: string[] = [];
      for (const a of accts) {
        const led = await prisma.clientTrustLedger.aggregate({
          _sum: { credit: true, debit: true }, where: { trustAccountId: a.id },
        });
        const ledgerNet = dec(led._sum.credit) - dec(led._sum.debit);
        const ledgerCount = await prisma.clientTrustLedger.count({ where: { trustAccountId: a.id } });
        detail.push(`${a.accountName}:ledgerNet=${ledgerNet.toFixed(2)}/acct=${dec(a.currentBalance).toFixed(2)}(${ledgerCount} rows)`);
        if (ledgerCount > 0 && Math.abs(ledgerNet - dec(a.currentBalance)) > 0.005) {
          mism.push(`${a.id}(${a.accountName}: ledgerNet ${ledgerNet.toFixed(2)} vs acct ${dec(a.currentBalance).toFixed(2)})`);
        }
      }
      const ok = mism.length === 0;
      record('13. ClientTrustLedger net == TrustAccount balance', ok ? 'PASS' : 'FAIL',
        `${accts.length} accounts ${scopeNote}`, detail.join(' | ') || 'no accounts');
      if (mism.length) fail('13 ClientTrustLedger vs TrustAccount', mism, 'sum(ledger credit-debit) != account balance (where ledger rows exist)');
    }

    // 14. BankStatement closing balances reconcile vs trust ledger movement
    {
      const stmts = await prisma.bankStatement.findMany({
        select: { id: true, accountType: true, accountId: true, openingBalance: true, closingBalance: true, statementDate: true },
      });
      const mism: string[] = [];
      const detail: string[] = [];
      for (const s of stmts) {
        // closing should equal opening + sum(bank transactions on this statement)
        const agg = await prisma.bankTransaction.aggregate({
          _sum: { amount: true }, where: { bankStatementId: s.id },
        });
        const movement = dec(agg._sum.amount);
        const expectedClosing = dec(s.openingBalance) + movement;
        detail.push(`${s.accountType}:${s.id.slice(0, 8)} open=${dec(s.openingBalance).toFixed(2)}+mv=${movement.toFixed(2)}=>exp=${expectedClosing.toFixed(2)}/act=${dec(s.closingBalance).toFixed(2)}`);
        if (Math.abs(expectedClosing - dec(s.closingBalance)) > 0.005) {
          mism.push(`${s.id}(open ${dec(s.openingBalance).toFixed(2)} + mv ${movement.toFixed(2)} = ${expectedClosing.toFixed(2)} != closing ${dec(s.closingBalance).toFixed(2)})`);
        }
      }
      const ok = mism.length === 0;
      record('14. BankStatement opening+movement == closing', ok ? 'PASS' : 'FAIL',
        `${stmts.length} statements`, detail.length ? detail.join(' | ') : 'no bank statements seeded');
      if (mism.length) fail('14 BankStatement reconcile', mism, 'openingBalance + Σ(transaction amount) != closingBalance');
    }

  }

  // ===== REPORT =========================================================
  const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));
  if (schemaDrift.length) {
    console.log('\n================= SCHEMA-DRIFT SWEEP (FAILURES) =================');
    for (const d of schemaDrift) console.log(`  [DRIFT] ${d.model}: ${d.error}`);
  } else {
    console.log(`\n[schema-drift sweep] OK — all ${SWEEP_MODELS.length} seeded models read clean.`);
  }
  console.log('\n================= CROSS-MODEL VERIFICATION MATRIX =================');
  console.log(pad('CHECK', 52) + pad('STATUS', 7) + pad('COUNT', 22) + 'DETAIL');
  console.log('-'.repeat(120));
  for (const r of results) {
    console.log(pad(r.check, 52) + pad(r.status, 7) + pad(r.count, 22) + r.detail);
  }
  const passes = results.filter(r => r.status === 'PASS').length;
  const fails = results.filter(r => r.status === 'FAIL').length;
  const infos = results.filter(r => r.status === 'INFO').length;
  console.log('-'.repeat(120));
  console.log(`TOTAL: ${passes} PASS / ${fails} FAIL / ${infos} INFO  (of ${results.length} checks); schemaDrift=${schemaDrift.length}`);

  if (offenders.length) {
    console.log('\n================= FAILURE / INFO DETAIL =================');
    console.log(offenders.join('\n'));
  }

  return { status: 'validation_complete', schemaDrift, checks: results, pass: passes, fail: fails, info: infos };
}

// Standalone runner — owns its own connection lifecycle (the master seed
// instead calls seedValidation(prisma) with its shared client).
async function main() {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not loaded');
  const pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 15_000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await seedValidation(prisma);
    console.log('\n[done]');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((e) => { console.error('VALIDATION_FATAL', e); process.exit(1); });
}
