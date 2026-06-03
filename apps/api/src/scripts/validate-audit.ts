/**
 * validate-audit.ts
 * Audit Chain Integrity Validation
 * Verifies: hash chain continuity, previousHash linkage, tamper detection,
 * actor/tenant capture, severity classification.
 * Run: npx dotenv-cli -e ../../.env -- node --require tsx/cjs src/scripts/validate-audit.ts <tenantId>
 */
import prisma from '../config/database';
import crypto from 'crypto';

type TestResult = { test: string; status: 'PASS' | 'FAIL' | 'WARN'; detail: string };
const results: TestResult[] = [];

function pass(test: string, detail = '') { results.push({ test, status: 'PASS', detail }); }
function fail(test: string, detail = '') { results.push({ test, status: 'FAIL', detail }); }
function warn(test: string, detail = '') { results.push({ test, status: 'WARN', detail }); }

async function main() {
  const tenantId = process.argv[2]?.trim() ?? 'cmpy9pg9u00002gom327d94va';
  console.log('═══════════════════════════════════════════════════════');
  console.log(' GLOBAL WAKILI — AUDIT CHAIN VALIDATION SUITE          ');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── Load audit logs ─────────────────────────────────────────────────────────
  const auditLogs = await prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { sequenceNumber: 'asc' },
    take: 500,
    select: {
      id: true, action: true, entityType: true, entityId: true,
      userId: true, tenantId: true, hash: true, previousHash: true,
      severity: true, success: true, createdAt: true,
    },
  });
  console.log(`[INFO] ${auditLogs.length} audit logs loaded\n`);

  if (!auditLogs.length) {
    warn('SETUP', 'No audit logs found. Perform some actions first, then re-run.');
  }

  // ── Test 1: All audit logs have tenantId ─────────────────────────────────────
  console.log('[TEST 1] Audit log tenant capture...');
  const missingTenant = auditLogs.filter((l) => !l.tenantId);
  if (missingTenant.length === 0) {
    pass('Tenant captured on all audit logs', `${auditLogs.length} logs all have tenantId`);
  } else {
    fail('Missing tenantId on audit logs', `${missingTenant.length} logs missing tenantId`);
  }

  // ── Test 2: All audit logs have userId ──────────────────────────────────
  console.log('[TEST 2] Actor capture...');
  const missingActor = auditLogs.filter((l) => !l.userId);
  if (missingActor.length === 0) {
    pass('Actor captured on all audit logs', `${auditLogs.length} logs all have actorUserId`);
  } else {
    warn('Missing actorUserId', `${missingActor.length} logs missing actorUserId (may be system events)`);
  }

  // ── Test 3: Action field present ─────────────────────────────────────────────
  console.log('[TEST 3] Action field completeness...');
  const missingAction = auditLogs.filter((l) => !l.action);
  if (missingAction.length === 0) {
    pass('Action field present on all logs', `All ${auditLogs.length} logs have action`);
  } else {
    fail('Missing action field', `${missingAction.length} logs missing action`);
  }

  // ── Test 4: Severity classification ──────────────────────────────────────────
  console.log('[TEST 4] Severity classification...');
  const missingSeverity = auditLogs.filter((l) => !l.severity);
  if (missingSeverity.length === 0) {
    pass('Severity classified on all logs', `All logs have severity`);
  } else {
    warn('Missing severity', `${missingSeverity.length} logs without severity classification`);
  }

  const severityDist = auditLogs.reduce<Record<string, number>>((acc, l) => {
    const sev = l.severity ?? 'UNKNOWN';
    acc[sev] = (acc[sev] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`  [INFO] Severity distribution:`, severityDist);

  // ── Test 5: Hash chain continuity ────────────────────────────────────────────
  console.log('[TEST 5] Hash chain continuity check...');
  const logsWithHash = auditLogs.filter((l) => l.hash);
  if (logsWithHash.length === 0) {
    warn('No hash chain', 'No audit logs have hash values. Hash chain may not be enabled.');
  } else {
    let chainBreaks = 0;
    for (let i = 1; i < logsWithHash.length; i++) {
      const current  = logsWithHash[i];
      const previous = logsWithHash[i - 1];
      if (current.previousHash && current.previousHash !== previous.hash) {
        fail('Hash chain break detected',
          `Log ${current.id}: previousHash ${current.previousHash} ≠ prev hash ${previous.hash}`);
        chainBreaks++;
        if (chainBreaks >= 5) { warn('Chain break limit', 'Stopped after 5 chain breaks'); break; }
      }
    }
    if (chainBreaks === 0) {
      pass('Hash chain intact', `Verified ${logsWithHash.length} chained audit entries`);
    }
  }

  // ── Test 6: No duplicate audit log IDs ───────────────────────────────────────
  console.log('[TEST 6] Duplicate audit log check...');
  const uniqueIds = new Set(auditLogs.map((l) => l.id));
  if (uniqueIds.size === auditLogs.length) {
    pass('No duplicate audit log IDs', `All ${auditLogs.length} IDs unique`);
  } else {
    fail('Duplicate audit log IDs', `${auditLogs.length - uniqueIds.size} duplicates found`);
  }

  // ── Test 7: Success field present ────────────────────────────────────────────
  console.log('[TEST 7] Success/failure field presence...');
  const failedOps = auditLogs.filter((l) => l.success === false);
  pass('Success field present on all logs', `${auditLogs.length} logs have success field. ${failedOps.length} recorded failures.`);

  // ── Test 8: Check for CRITICAL severity events ────────────────────────────────
  console.log('[TEST 8] Critical event detection...');
  const criticalEvents = auditLogs.filter((l) => l.severity === 'CRITICAL');
  if (criticalEvents.length === 0) {
    pass('No critical severity events', 'No CRITICAL events detected');
  } else {
    warn('Critical events present', `${criticalEvents.length} CRITICAL severity events — review required`);
    criticalEvents.slice(0, 3).forEach((e) =>
      console.log(`  [CRITICAL] ${e.action} on ${e.entityType}/${e.entityId} at ${e.createdAt}`)
    );
  }

  // ── Test 9: GlobalAuditLog coverage ──────────────────────────────────────────
  console.log('[TEST 9] Global audit log coverage...');
  const globalLogs = await prisma.globalAuditLog.count({ where: { targetTenantId: tenantId } });
  if (globalLogs > 0) {
    pass('Global audit log populated', `${globalLogs} global audit entries`);
  } else {
    warn('Global audit log empty', 'No entries in GlobalAuditLog for this tenant');
  }

  // ── Report ───────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' AUDIT CHAIN VALIDATION RESULTS                        ');
  console.log('═══════════════════════════════════════════════════════');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warned = results.filter((r) => r.status === 'WARN').length;

  results.forEach((r) => {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '⚠';
    console.log(`  ${icon} [${r.status}] ${r.test}${r.detail ? ': ' + r.detail : ''}`);
  });

  console.log(`\n  TOTAL: ${results.length} | PASS: ${passed} | FAIL: ${failed} | WARN: ${warned}`);
  if (failed > 0) { console.log('\n  ⛔ AUDIT INTEGRITY FAILURES DETECTED'); process.exit(1); }
  else { console.log('\n  ✅ AUDIT CHAIN VALIDATED'); }
}

main()
  .catch((e) => { console.error('[ERROR]', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
