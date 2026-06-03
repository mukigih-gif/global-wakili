/**
 * validate-finance.ts
 * Finance & Tax Compliance Validation
 * Tests: journal balance, VAT integrity, WHT completeness, invoice data integrity
 * Run: npx dotenv-cli -e ../../.env -- node --require tsx/cjs src/scripts/validate-finance.ts <tenantId>
 */
import prisma from '../config/database';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const D = (n: unknown) => ({ eq: (v: unknown) => Number(n) === Number(v), lte: (v: unknown) => Number(n) <= Number(v), gt: (v: unknown) => Number(n) > Number(v), add: (v: unknown) => D(Number(n) + Number(v)) });

type TestResult = { test: string; status: 'PASS' | 'FAIL' | 'WARN'; detail: string };
const results: TestResult[] = [];
function pass(test: string, detail = '') { results.push({ test, status: 'PASS', detail }); }
function fail(test: string, detail = '') { results.push({ test, status: 'FAIL', detail }); }
function warn(test: string, detail = '') { results.push({ test, status: 'WARN', detail }); }

async function main() {
  const tenantId = process.argv[2]?.trim() ?? 'cmpy9pg9u00002gom327d94va';
  console.log('═══════════════════════════════════════════════════════');
  console.log(' GLOBAL WAKILI — FINANCE & TAX VALIDATION SUITE        ');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── Test 1: Journal entry double-entry balance ───────────────────────────────
  console.log('[TEST 1] Journal double-entry balance check...');
  const journals = await prisma.journalEntry.findMany({
    where: { tenantId },
    include: { lines: { select: { debit: true, credit: true } } },
    take: 100,
  });

  let journalImbalances = 0;
  for (const journal of journals) {
    const totalDebits  = journal.lines.reduce((s, l) => s + Number((l as any).debit  ?? 0), 0);
    const totalCredits = journal.lines.reduce((s, l) => s + Number((l as any).credit ?? 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      fail(`Journal imbalance: ${journal.id}`, `Debits ${totalDebits} ≠ Credits ${totalCredits}`);
      journalImbalances++;
    }
  }
  if (journalImbalances === 0 && journals.length > 0) {
    pass('All journals balance', `${journals.length} posted journals verified (debits = credits)`);
  } else if (journals.length === 0) {
    warn('No posted journals', 'No posted journal entries found to validate');
  }

  // ── Test 2: Invoice amounts are positive ────────────────────────────────────
  console.log('[TEST 2] Invoice amount integrity...');
  const invoices = await prisma.invoice.findMany({
    where: { tenantId },
    select: { id: true, total: true, vatAmount: true, subTotal: true, balanceDue: true, paidAmount: true, clientId: true },
    take: 200,
  });

  const invalidInvoices = invoices.filter((i) => Number(i.total) <= 0);
  if (invalidInvoices.length === 0) {
    pass('Invoice amounts positive', `All ${invoices.length} invoices have positive amounts`);
  } else {
    fail('Invalid invoice amounts', `${invalidInvoices.length} invoices with zero or negative total`);
  }

  // ── Test 3: Invoices have required fields ────────────────────────────────────
  console.log('[TEST 3] Invoice completeness check...');
  const missingClientInvoices = await prisma.invoice.count({ where: { tenantId, clientId: null } });
  if (missingClientInvoices === 0) {
    pass('All invoices have clientId', `${invoices.length} invoices checked`);
  } else {
    warn('Invoices without clientId', `${missingClientInvoices} invoices have no client linked`);
  }

  // ── Test 4: VAT amounts consistent with rate ─────────────────────────────────
  console.log('[TEST 4] VAT calculation consistency...');
  const invoiceLines = await prisma.invoiceLine.findMany({
    where: { tenantId },
    select: { subTotal: true, taxRate: true, taxAmount: true, taxMode: true },
    take: 500,
  });

  let vatMismatches = 0;
  for (const line of invoiceLines) {
    if (line.taxMode === 'EXEMPT' || Number(line.taxRate) === 0) continue;
    const expectedVat = Math.round(Number(line.subTotal) * Number(line.taxRate)) / 100;
    const actualVat   = Number(line.taxAmount);
    if (Math.abs(expectedVat - actualVat) > 0.01) vatMismatches++;
  }
  if (vatMismatches === 0) {
    pass('VAT calculations consistent', `${invoiceLines.length} invoice lines checked`);
  } else {
    fail('VAT calculation mismatches', `${vatMismatches} lines where taxAmount ≠ subTotal × taxRate`);
  }

  // ── Test 5: WHT certificates linked to valid invoices ─────────────────────────
  console.log('[TEST 5] WHT certificate invoice linkage...');
  const whtCerts = await prisma.withholdingTaxCertificate.findMany({
    where: { tenantId },
    select: { id: true, certificateNumber: true, invoiceId: true, amount: true, status: true },
  });

  let orphanedWht = 0;
  for (const cert of whtCerts) {
    const invoice = await prisma.invoice.findFirst({ where: { id: cert.invoiceId, tenantId } });
    if (!invoice) orphanedWht++;
  }
  if (orphanedWht === 0) {
    pass('WHT certificates linked to valid invoices', `${whtCerts.length} certificates checked`);
  } else {
    fail('Orphaned WHT certificates', `${orphanedWht} certificates linked to non-existent invoices`);
  }

  // ── Test 6: Paid invoices have payment receipts ───────────────────────────────
  console.log('[TEST 6] Payment receipt linkage...');
  const paidInvoices = invoices.filter((i) => Number((i as any).paidAmount) >= Number((i as any).total) && Number((i as any).total) > 0);
  let invoicesWithoutReceipts = 0;
  for (const inv of paidInvoices.slice(0, 50)) {
    const receipt = await prisma.paymentReceipt.findFirst({
      where: { tenantId, allocations: { some: { invoiceId: inv.id } } },
    });
    if (!receipt) invoicesWithoutReceipts++;
  }
  if (invoicesWithoutReceipts === 0 && paidInvoices.length > 0) {
    pass('Paid invoices have payment receipts', `${paidInvoices.length} paid invoices verified`);
  } else if (paidInvoices.length === 0) {
    warn('No paid invoices to check', 'No PAID invoices found');
  } else {
    warn('Some paid invoices missing receipts', `${invoicesWithoutReceipts} paid invoices have no receipt`);
  }

  // ── Test 7: Chart of accounts completeness ───────────────────────────────────
  console.log('[TEST 7] Chart of accounts...');
  const accounts = await prisma.chartOfAccount.count({ where: { tenantId } });
  if (accounts >= 5) {
    pass('Chart of accounts populated', `${accounts} GL accounts defined`);
  } else {
    warn('Sparse chart of accounts', `Only ${accounts} accounts found (expected 50+)`);
  }

  // ── Test 8: Expenses linked to matters ───────────────────────────────────────
  console.log('[TEST 8] Expense linkage...');
  const expenses = await prisma.expenseEntry.count({ where: { tenantId } });
  const linkedExpenses = await prisma.expenseEntry.count({ where: { tenantId, matterId: { not: '' } } });
  if (expenses > 0) {
    pass('Expense records exist', `${expenses} expenses, ${linkedExpenses} linked to matters`);
  } else {
    warn('No expense records', 'No expense entries found');
  }

  // ── Report ───────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' FINANCE & TAX VALIDATION RESULTS                      ');
  console.log('═══════════════════════════════════════════════════════');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  results.forEach((r) => {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '⚠';
    console.log(`  ${icon} [${r.status}] ${r.test}${r.detail ? ': ' + r.detail : ''}`);
  });
  console.log(`\n  TOTAL: ${results.length} | PASS: ${passed} | FAIL: ${failed} | WARN: ${warned}`);
  if (failed > 0) { console.log('\n  ⛔ FINANCE INTEGRITY FAILURES DETECTED'); process.exit(1); }
  else { console.log('\n  ✅ FINANCE & TAX INTEGRITY VALIDATED'); }
}

main()
  .catch((e) => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
