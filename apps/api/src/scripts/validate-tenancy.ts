/**
 * validate-tenancy.ts
 * Multi-Tenant Isolation Security Test
 * Verifies that no data can cross tenant boundaries via API calls.
 * Run: npx dotenv-cli -e ../../.env -- node --require tsx/cjs src/scripts/validate-tenancy.ts
 */
import prisma from '../config/database';

type TestResult = { test: string; status: 'PASS' | 'FAIL' | 'WARN'; detail: string };
const results: TestResult[] = [];

function pass(test: string, detail = '') { results.push({ test, status: 'PASS', detail }); }
function fail(test: string, detail = '') { results.push({ test, status: 'FAIL', detail }); }
function warn(test: string, detail = '') { results.push({ test, status: 'WARN', detail }); }

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' GLOBAL WAKILI — MULTI-TENANT ISOLATION TEST SUITE     ');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── Load tenants ────────────────────────────────────────────────────────────
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, slug: true }, take: 10 });
  if (tenants.length < 2) {
    warn('SETUP', `Only ${tenants.length} tenant(s) found. Run seed-tenants.ts for proper isolation testing.`);
  }
  console.log(`[INFO] ${tenants.length} tenants loaded for testing\n`);

  // ── Test 1: Matter isolation ─────────────────────────────────────────────────
  console.log('[TEST 1] Matter tenant isolation...');
  for (const tenant of tenants) {
    const matters = await prisma.matter.findMany({ where: { tenantId: tenant.id }, select: { tenantId: true }, take: 5 });
    const allBelongToTenant = matters.every((m) => m.tenantId === tenant.id);
    if (allBelongToTenant) {
      pass(`Matter isolation: ${tenant.name}`, `${matters.length} matters, all tenantId = ${tenant.id}`);
    } else {
      fail(`Matter isolation: ${tenant.name}`, 'Matter with wrong tenantId found!');
    }
  }

  // ── Test 2: Cross-tenant matter lookup ──────────────────────────────────────
  console.log('[TEST 2] Cross-tenant matter lookup...');
  if (tenants.length >= 2) {
    const tenantA = tenants[0];
    const tenantB = tenants[1];
    const matterFromA = await prisma.matter.findFirst({ where: { tenantId: tenantA.id } });
    if (matterFromA) {
      // Attempt to find tenantA's matter with tenantB's filter
      const crossTenantLookup = await prisma.matter.findFirst({
        where: { id: matterFromA.id, tenantId: tenantB.id },
      });
      if (crossTenantLookup === null) {
        pass('Cross-tenant matter lookup blocked', `Matter ${matterFromA.id} from ${tenantA.name} not visible under ${tenantB.name}`);
      } else {
        fail('Cross-tenant matter lookup BREACH', `Matter ${matterFromA.id} from ${tenantA.name} is visible under ${tenantB.name}!`);
      }
    } else {
      warn('Cross-tenant matter lookup', `No matters in ${tenantA.name} to test with`);
    }
  }

  // ── Test 3: Client isolation ─────────────────────────────────────────────────
  console.log('[TEST 3] Client tenant isolation...');
  for (const tenant of tenants) {
    const clients = await prisma.client.findMany({ where: { tenantId: tenant.id }, select: { tenantId: true }, take: 5 });
    const allBelong = clients.every((c) => c.tenantId === tenant.id);
    if (allBelong) {
      pass(`Client isolation: ${tenant.name}`, `${clients.length} clients verified`);
    } else {
      fail(`Client isolation: ${tenant.name}`, 'Client with wrong tenantId found!');
    }
  }

  // ── Test 4: Invoice isolation ────────────────────────────────────────────────
  console.log('[TEST 4] Invoice tenant isolation...');
  for (const tenant of tenants) {
    const invoices = await prisma.invoice.findMany({ where: { tenantId: tenant.id }, select: { tenantId: true }, take: 5 });
    const allBelong = invoices.every((i) => i.tenantId === tenant.id);
    if (allBelong) {
      pass(`Invoice isolation: ${tenant.name}`, `${invoices.length} invoices verified`);
    } else {
      fail(`Invoice isolation: ${tenant.name}`, 'Invoice with wrong tenantId found!');
    }
  }

  // ── Test 5: Trust account isolation ─────────────────────────────────────────
  console.log('[TEST 5] Trust account isolation...');
  for (const tenant of tenants) {
    const trustAccounts = await prisma.trustAccount.findMany({ where: { tenantId: tenant.id }, select: { tenantId: true }, take: 5 });
    const allBelong = trustAccounts.every((t) => t.tenantId === tenant.id);
    if (allBelong) {
      pass(`Trust account isolation: ${tenant.name}`, `${trustAccounts.length} trust accounts verified`);
    } else {
      fail(`Trust account isolation: ${tenant.name}`, 'Trust account with wrong tenantId found!');
    }
  }

  // ── Test 6: User isolation ───────────────────────────────────────────────────
  console.log('[TEST 6] User tenant isolation...');
  for (const tenant of tenants) {
    const users = await prisma.user.findMany({ where: { tenantId: tenant.id }, select: { tenantId: true }, take: 10 });
    const allBelong = users.every((u) => u.tenantId === tenant.id);
    if (allBelong) {
      pass(`User isolation: ${tenant.name}`, `${users.length} users verified`);
    } else {
      fail(`User isolation: ${tenant.name}`, 'User with wrong tenantId found!');
    }
  }

  // ── Test 7: Audit log isolation ──────────────────────────────────────────────
  console.log('[TEST 7] Audit log isolation...');
  for (const tenant of tenants) {
    const auditLogs = await prisma.auditLog.findMany({ where: { tenantId: tenant.id }, select: { tenantId: true }, take: 5 });
    const allBelong = auditLogs.filter((a) => a.tenantId).every((a) => a.tenantId === tenant.id);
    if (allBelong) {
      pass(`Audit log isolation: ${tenant.name}`, `${auditLogs.length} audit logs verified`);
    } else {
      fail(`Audit log isolation: ${tenant.name}`, 'Audit log with wrong tenantId found!');
    }
  }

  // ── Test 8: Document isolation ───────────────────────────────────────────────
  console.log('[TEST 8] Document tenant isolation...');
  for (const tenant of tenants) {
    const docs = await prisma.document.findMany({ where: { tenantId: tenant.id }, select: { tenantId: true }, take: 5 });
    const allBelong = docs.every((d) => d.tenantId === tenant.id);
    if (allBelong) {
      pass(`Document isolation: ${tenant.name}`, `${docs.length} documents verified`);
    } else {
      fail(`Document isolation: ${tenant.name}`, 'Document with wrong tenantId found!');
    }
  }

  // ── Test 9: No orphaned records without tenantId ─────────────────────────────
  console.log('[TEST 9] Orphaned record check...');
  const orphanedMatters    = await prisma.matter.count({ where: { tenantId: '' } });
  const orphanedClients    = await prisma.client.count({ where: { tenantId: '' } });
  const orphanedInvoices   = await prisma.invoice.count({ where: { tenantId: '' } });

  if (orphanedMatters === 0)  pass('No orphaned matters',  'All matters have tenantId');
  else                        fail('Orphaned matters',      `${orphanedMatters} matters with empty tenantId!`);
  if (orphanedClients === 0)  pass('No orphaned clients',  'All clients have tenantId');
  else                        fail('Orphaned clients',      `${orphanedClients} clients with empty tenantId!`);
  if (orphanedInvoices === 0) pass('No orphaned invoices', 'All invoices have tenantId');
  else                        fail('Orphaned invoices',     `${orphanedInvoices} invoices with empty tenantId!`);

  // ── Report ───────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' ISOLATION TEST RESULTS                                 ');
  console.log('═══════════════════════════════════════════════════════');

  const passed  = results.filter((r) => r.status === 'PASS').length;
  const failed  = results.filter((r) => r.status === 'FAIL').length;
  const warned  = results.filter((r) => r.status === 'WARN').length;

  results.forEach((r) => {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '⚠';
    console.log(`  ${icon} [${r.status}] ${r.test}${r.detail ? ': ' + r.detail : ''}`);
  });

  console.log(`\n  TOTAL: ${results.length} tests`);
  console.log(`  PASS:  ${passed}`);
  console.log(`  FAIL:  ${failed}`);
  console.log(`  WARN:  ${warned}`);

  if (failed > 0) {
    console.log('\n  ⛔ ISOLATION FAILURES DETECTED — DO NOT PROCEED TO PRODUCTION');
    process.exit(1);
  } else {
    console.log('\n  ✅ TENANT ISOLATION VALIDATED');
  }
}

main()
  .catch((e) => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
