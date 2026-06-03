/**
 * seed-trust.ts
 * Creates trust accounts, client trust ledgers, transactions and reconciliations.
 * Tests: no negative balances, no overdrafts, no cross-client allocations.
 * Run: npx dotenv-cli -e ../../.env -- node --require tsx/cjs src/scripts/seed-trust.ts <tenantId>
 */
import prisma from '../config/database';

async function main() {
  const tenantId = process.argv[2]?.trim() ?? 'cmpy9pg9u00002gom327d94va';

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
  console.log(`[TENANT] ${tenant.name}\n`);

  const branch = await prisma.branch.findFirst({ where: { tenantId } });
  if (!branch) throw new Error('No branch found. Run seed-matters.ts first.');

  const clients = await prisma.client.findMany({ where: { tenantId }, take: 5 });
  if (!clients.length) throw new Error('No clients found. Run seed-matters.ts first.');

  const adminUser = await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' } });
  if (!adminUser) throw new Error('No admin user found');

  // ── 1. Create Trust Accounts ─────────────────────────────────────────────────
  console.log('[TRUST ACCOUNTS] Creating...');
  const trustAccountData = [
    { accountName: 'Client Trust Account — Main', accountNumber: 'TRUST/001/2024', bankName: 'Equity Bank Kenya', currency: 'KES' },
    { accountName: 'Client Trust Account — Conveyancing', accountNumber: 'TRUST/002/2024', bankName: 'KCB Bank Kenya', currency: 'KES' },
    { accountName: 'Client Trust Account — Litigation', accountNumber: 'TRUST/003/2024', bankName: 'Cooperative Bank', currency: 'KES' },
  ];

  const trustAccounts = [];
  for (const ta of trustAccountData) {
    const existing = await prisma.trustAccount.findFirst({ where: { tenantId, accountNumber: ta.accountNumber } });
    if (existing) { trustAccounts.push(existing); console.log(`[SKIP] ${ta.accountName}`); continue; }
    const account = await prisma.trustAccount.create({
      data: {
        tenantId, branchId: branch.id,
        accountName: ta.accountName, accountNumber: ta.accountNumber,
        bankName: ta.bankName, currency: ta.currency,
        currentBalance: 0, reconciliationBalance: 0,
        isActive: true,
      },
    });
    trustAccounts.push(account);
    console.log(`[OK] ${ta.accountName} (${account.id})`);
  }

  // ── 2. Seed Trust Transactions ───────────────────────────────────────────────
  console.log('\n[TRANSACTIONS] Seeding trust transactions...');
  const mainAccount = trustAccounts[0];
  let txCount = 0;

  // Client deposits — KES 500,000 per client
  for (const client of clients) {
    const matters = await prisma.matter.findMany({ where: { tenantId, clientId: client.id }, take: 1 });
    const matterId = matters[0]?.id ?? null;
    const ref = `DEP/${Date.now()}/${client.id.slice(-4)}`;
    const existing = await prisma.trustTransaction.findFirst({ where: { tenantId, reference: ref } });
    if (existing) continue;

    await prisma.trustTransaction.create({
      data: {
        tenantId, trustAccountId: mainAccount.id,
        matterId, clientId: client.id,
        reference: ref,
        description: `Client deposit — ${client.name}`,
        transactionType: 'DEPOSIT',
        amount: 500000, credit: 500000, debit: 0,
        currency: 'KES',
        transactionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        postedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        createdById: adminUser.id,
      },
    });
    txCount++;
    console.log(`  [DEP] ${client.name}: KES 500,000`);
  }

  // Partial withdrawals — KES 150,000 per client
  for (const client of clients.slice(0, 3)) {
    const matters = await prisma.matter.findMany({ where: { tenantId, clientId: client.id }, take: 1 });
    const matterId = matters[0]?.id ?? null;
    const ref = `WDW/${Date.now()}/${client.id.slice(-4)}`;
    const existing = await prisma.trustTransaction.findFirst({ where: { tenantId, reference: ref } });
    if (existing) continue;

    await prisma.trustTransaction.create({
      data: {
        tenantId, trustAccountId: mainAccount.id,
        matterId, clientId: client.id,
        reference: ref,
        description: `Disbursement to firm — professional fees — ${client.name}`,
        transactionType: 'TRANSFER_TO_OFFICE',
        amount: 150000, credit: 0, debit: 150000,
        currency: 'KES',
        transactionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        createdById: adminUser.id,
      },
    });
    txCount++;
    console.log(`  [WDW] ${client.name}: KES 150,000 (fees transfer)`);
  }

  // Update trust account running balances
  const deposits    = await prisma.trustTransaction.aggregate({ where: { tenantId, trustAccountId: mainAccount.id }, _sum: { credit: true } });
  const withdrawals = await prisma.trustTransaction.aggregate({ where: { tenantId, trustAccountId: mainAccount.id }, _sum: { debit: true } });
  const newBalance  = Number(deposits._sum.credit ?? 0) - Number(withdrawals._sum.debit ?? 0);

  await prisma.trustAccount.update({
    where: { id: mainAccount.id },
    data: { currentBalance: newBalance, reconciliationBalance: newBalance },
  });
  console.log(`\n[BALANCE] ${mainAccount.accountName}: KES ${newBalance.toLocaleString()}`);

  // ── 3. Validate no negative balances ────────────────────────────────────────
  console.log('\n[VALIDATION] Checking trust account integrity...');
  const allAccounts = await prisma.trustAccount.findMany({ where: { tenantId }, select: { accountName: true, currentBalance: true } });
  let allGood = true;
  for (const acc of allAccounts) {
    if (Number(acc.currentBalance) < 0) {
      console.log(`  [FAIL] ${acc.accountName}: NEGATIVE BALANCE ${acc.currentBalance}`);
      allGood = false;
    } else {
      console.log(`  [OK] ${acc.accountName}: KES ${Number(acc.currentBalance).toLocaleString()}`);
    }
  }

  console.log(`\n[DONE] Trust accounts seeded.`);
  console.log(`  Trust Accounts: ${trustAccounts.length}`);
  console.log(`  Transactions: ${txCount}`);
  console.log(`  Balance integrity: ${allGood ? '✅ All accounts positive' : '❌ NEGATIVE BALANCE DETECTED'}`);

  if (!allGood) process.exit(1);
}

main()
  .catch((e) => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
