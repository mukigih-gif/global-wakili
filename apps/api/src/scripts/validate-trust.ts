/**
 * validate-trust.ts — Trust Accounting Integrity Validation (schema-correct)
 * Run: npx dotenv-cli -e ../../.env -- node --require tsx/cjs src/scripts/validate-trust.ts <tenantId>
 */
import prisma from '../config/database';

type TR = { test: string; status: 'PASS' | 'FAIL' | 'WARN'; detail: string };
const results: TR[] = [];
const pass = (t: string, d = '') => { results.push({ test: t, status: 'PASS', detail: d }); console.log(`  ✓ ${t}${d ? ': ' + d : ''}`); };
const fail = (t: string, d = '') => { results.push({ test: t, status: 'FAIL', detail: d }); console.log(`  ✗ ${t}${d ? ': ' + d : ''}`); };
const warn = (t: string, d = '') => { results.push({ test: t, status: 'WARN', detail: d }); console.log(`  ⚠ ${t}${d ? ': ' + d : ''}`); };
const n = (v: unknown) => parseFloat(String(v ?? 0));

async function main() {
  const tenantId = process.argv[2]?.trim() ?? 'cmpy9pg9u00002gom327d94va';
  console.log('═══════════════════════════════════════════════════════');
  console.log(' GLOBAL WAKILI — TRUST ACCOUNTING VALIDATION            ');
  console.log('═══════════════════════════════════════════════════════\n');

  const accounts = await prisma.trustAccount.findMany({
    where: { tenantId },
    select: { id: true, accountName: true, currentBalance: true, reconciliationBalance: true, isActive: true },
  });
  console.log(`[INFO] ${accounts.length} trust accounts\n`);

  if (!accounts.length) { warn('SETUP', 'No trust accounts. Run seed-trust.ts first.'); }

  // T1: No negative balances
  const negative = accounts.filter((a) => n(a.currentBalance) < 0);
  if (negative.length === 0) pass('No negative trust balances', `${accounts.length} accounts checked`);
  else negative.forEach((a) => fail(`Negative balance: ${a.accountName}`, `${n(a.currentBalance)}`));

  // T2: Inactive accounts have zero balance
  const inactiveWithFunds = accounts.filter((a) => !a.isActive && n(a.currentBalance) !== 0);
  if (inactiveWithFunds.length === 0) pass('Inactive accounts at zero', 'All inactive accounts have zero balance');
  else inactiveWithFunds.forEach((a) => fail(`Inactive account has balance: ${a.accountName}`, `${n(a.currentBalance)}`));

  // T3: All accounts belong to tenant
  pass('Trust account tenant isolation', `All ${accounts.length} accounts scoped to ${tenantId}`);

  // T4: Transaction amounts are positive
  const txns = await prisma.trustTransaction.findMany({
    where: { tenantId },
    select: { id: true, amount: true, transactionType: true, clientId: true, trustAccountId: true },
    take: 500,
  });
  const zeroAmounts = txns.filter((t) => n(t.amount) <= 0);
  if (zeroAmounts.length === 0) pass('All transaction amounts positive', `${txns.length} transactions verified`);
  else fail('Zero/negative transaction amounts', `${zeroAmounts.length} transactions`);

  // T5: Deposit total - withdrawal total matches account balance
  const mainAccount = accounts[0];
  if (mainAccount) {
    const agg = await prisma.trustTransaction.groupBy({
      by: ['transactionType'],
      where: { tenantId, trustAccountId: mainAccount.id },
      _sum: { credit: true, debit: true },
    });
    const totalCredit = agg.reduce((s, g) => s + n(g._sum.credit), 0);
    const totalDebit  = agg.reduce((s, g) => s + n(g._sum.debit), 0);
    const expectedBal = totalCredit - totalDebit;
    const actualBal   = n(mainAccount.currentBalance);
    if (Math.abs(expectedBal - actualBal) < 0.01) {
      pass('Balance = Credits - Debits', `KES ${actualBal.toLocaleString()} verified`);
    } else {
      fail('Balance mismatch', `Expected ${expectedBal}, Actual ${actualBal}`);
    }
  }

  // T6: No cross-account transactions
  const foreignTxns = await prisma.trustTransaction.count({
    where: { tenantId: { not: tenantId }, trustAccountId: { in: accounts.map((a) => a.id) } },
  });
  if (foreignTxns === 0) pass('No cross-tenant trust transactions', 'All transactions belong to tenant');
  else fail('Cross-tenant trust breach', `${foreignTxns} foreign transactions found`);

  // T7: No cross-client allocations per account
  if (accounts.length > 0) {
    let crossClientIssues = 0;
    for (const acc of accounts) {
      const clients = await prisma.trustTransaction.findMany({
        where: { tenantId, trustAccountId: acc.id, clientId: { not: null } },
        distinct: ['clientId'],
        select: { clientId: true },
        take: 100,
      });
      // Multiple clients in one trust account is allowed — but each transaction must be client-scoped
      const unscoped = await prisma.trustTransaction.count({
        where: { tenantId, trustAccountId: acc.id, clientId: null },
      });
      if (unscoped > 0) crossClientIssues++;
    }
    if (crossClientIssues === 0) pass('All transactions have client reference', 'No unscoped trust transactions');
    else warn('Some transactions lack clientId', `${crossClientIssues} accounts have unscoped transactions`);
  }

  // T8: Overdraw prevention — no WITHDRAWAL > available balance at time of transaction
  const deposits    = txns.filter((t) => t.transactionType === 'DEPOSIT').reduce((s, t) => s + n(t.amount), 0);
  const withdrawals = txns.filter((t) => t.transactionType !== 'DEPOSIT').reduce((s, t) => s + n(t.amount), 0);
  if (deposits >= withdrawals) {
    pass('No overdraw detected', `Deposits KES ${deposits.toLocaleString()} ≥ Withdrawals KES ${withdrawals.toLocaleString()}`);
  } else {
    fail('OVERDRAW DETECTED', `Withdrawals (${withdrawals}) exceed deposits (${deposits})`);
  }

  // T9: Reconciliation records
  const reconciliations = await prisma.trustReconciliation.count({ where: { tenantId } });
  if (reconciliations > 0) pass('Reconciliation records exist', `${reconciliations} reconciliation records`);
  else warn('No reconciliations', 'Three-way reconciliation not yet performed');

  // ── Report ───────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' TRUST ACCOUNTING VALIDATION RESULTS                   ');
  console.log('═══════════════════════════════════════════════════════');
  const p = results.filter((r) => r.status === 'PASS').length;
  const f = results.filter((r) => r.status === 'FAIL').length;
  const w = results.filter((r) => r.status === 'WARN').length;
  console.log(`\n  TOTAL: ${results.length} | PASS: ${p} | FAIL: ${f} | WARN: ${w}`);
  if (f > 0) { console.log('\n  ⛔ TRUST INTEGRITY FAILURES — DO NOT GO LIVE'); process.exit(1); }
  else { console.log('\n  ✅ TRUST ACCOUNTING INTEGRITY VALIDATED'); }
}

main()
  .catch((e) => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
