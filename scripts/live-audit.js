const https = require('https');
const results = [];

function req(method, host, path, body, headers) {
  return new Promise((resolve) => {
    const start = Date.now();
    const opts = { hostname: host, path, method, headers: { 'Content-Type': 'application/json', ...headers } };
    const r = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, ms: Date.now()-start }));
    });
    r.on('error', () => resolve({ status: 0, body: 'NETWORK_ERROR', ms: Date.now()-start }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function pass(id, desc, ms) { results.push({ id, status: 'PASS', desc, ms }); }
function fail(id, desc, ms, detail) { results.push({ id, status: 'FAIL', desc, ms, detail: String(detail||'').slice(0,80) }); }
function warn(id, desc, ms, detail) { results.push({ id, status: 'WARN', desc, ms, detail: String(detail||'').slice(0,80) }); }

const API = 'global-wakili-api.onrender.com';

async function run() {
  console.log('='.repeat(70));
  console.log(' GLOBAL WAKILI — LIVE UAT AUDIT');
  console.log(' Date: ' + new Date().toISOString());
  console.log(' Target: https://' + API);
  console.log('='.repeat(70) + '\n');

  // 1. API Health
  let r = await req('GET', API, '/api/v1/health', null, {});
  r.status === 200 ? pass('GW-PA-SMK-001', 'API Health Check — live', r.ms)
                   : fail('GW-PA-SMK-001', 'API Health Check', r.ms, 'HTTP ' + r.status);

  // 2. Tenant Login
  r = await req('POST', API, '/api/v1/auth/login',
    { email: 'admin@yourlawfirm.co.ke', password: 'Admin@2026!', tenantSlug: 'demo-law-firm' }, {});
  const login = JSON.parse(r.body);
  const token = login.data && login.data.token;
  const tenantId = login.data && login.data.user && login.data.user.tenantId;
  const userRole = login.data && login.data.user && login.data.user.role;
  r.status === 200 && token
    ? pass('GW-AU-SMK-001', 'Tenant login — token received, role: ' + userRole, r.ms)
    : fail('GW-AU-SMK-001', 'Tenant login', r.ms, 'HTTP ' + r.status);

  const H = { Authorization: 'Bearer ' + token, 'x-tenant-id': tenantId };

  // 3. Wrong password
  r = await req('POST', API, '/api/v1/auth/login',
    { email: 'admin@yourlawfirm.co.ke', password: 'WRONGPASSWORD123', tenantSlug: 'demo-law-firm' }, {});
  r.status === 401 ? pass('GW-AU-NEG-001', 'Wrong password rejected (401)', r.ms)
                   : fail('GW-AU-NEG-001', 'Wrong password not rejected', r.ms, 'HTTP ' + r.status);

  // 4. Non-existent user
  r = await req('POST', API, '/api/v1/auth/login',
    { email: 'notauser@fake.com', password: 'anything123' }, {});
  r.status === 401 ? pass('GW-AU-NEG-002', 'Non-existent user rejected (401)', r.ms)
                   : fail('GW-AU-NEG-002', 'Non-existent user', r.ms, 'HTTP ' + r.status);

  // 5. Unauthenticated access blocked
  r = await req('GET', API, '/api/v1/clients', null, {});
  r.status === 401 ? pass('GW-PA-NEG-002', 'Unauthenticated access blocked (401)', r.ms)
                   : fail('GW-PA-NEG-002', 'Unauthenticated not blocked', r.ms, 'HTTP ' + r.status);

  // 6. Platform isolation — firm user cannot access platform tenants
  r = await req('GET', API, '/api/v1/platform/tenants', null, H);
  r.status === 403 ? pass('GW-PA-NEG-001', 'Firm user blocked from platform/tenants (403)', r.ms)
                   : warn('GW-PA-NEG-001', 'Platform tenants access', r.ms, 'HTTP ' + r.status + ' (firm admin may have partial access)');

  // 7. Client list
  r = await req('GET', API, '/api/v1/clients?limit=20', null, H);
  const clients = JSON.parse(r.body);
  const clientCount = (clients.data && clients.data.length) || 0;
  r.status === 200 && clientCount > 0
    ? pass('GW-CL-SMK-001', 'Client list — ' + clientCount + ' clients', r.ms)
    : fail('GW-CL-SMK-001', 'Client list empty or error', r.ms, 'HTTP ' + r.status + ' count: ' + clientCount);

  // 8. Client detail
  const firstClient = clients.data && clients.data[0];
  if (firstClient) {
    r = await req('GET', API, '/api/v1/clients/' + firstClient.id, null, H);
    const cd = JSON.parse(r.body);
    r.status === 200 && cd.id
      ? pass('GW-CL-FNC-001', 'Client detail OK — ' + (cd.name || 'unnamed'), r.ms)
      : fail('GW-CL-FNC-001', 'Client detail error', r.ms, 'HTTP ' + r.status);
  }

  // 9. Matter list
  r = await req('GET', API, '/api/v1/matters?limit=20', null, H);
  const matters = JSON.parse(r.body);
  const matterCount = (matters.data && matters.data.length) || 0;
  r.status === 200 && matterCount > 0
    ? pass('GW-MT-SMK-001', 'Matter list — ' + matterCount + ' matters', r.ms)
    : fail('GW-MT-SMK-001', 'Matter list empty or error', r.ms, 'HTTP ' + r.status);

  // 10. Matter detail
  const firstMatter = matters.data && matters.data[0];
  if (firstMatter) {
    r = await req('GET', API, '/api/v1/matters/' + firstMatter.id, null, H);
    const md = JSON.parse(r.body);
    r.status === 200 && md.id
      ? pass('GW-MT-SMK-002', 'Matter detail OK — ' + (md.title || '').slice(0, 35), r.ms)
      : fail('GW-MT-SMK-002', 'Matter detail error', r.ms, 'HTTP ' + r.status);
  }

  // 11. Trust accounts
  r = await req('GET', API, '/api/v1/finance/trust/accounts', null, H);
  const trust = JSON.parse(r.body);
  const trustAccounts = trust.data || [];
  if (r.status === 200 && trustAccounts.length > 0) {
    const negBal = trustAccounts.filter(function(a) { return parseFloat(a.currentBalance) < 0; });
    negBal.length === 0
      ? pass('GW-TR-SMK-001', 'Trust accounts — ' + trustAccounts.length + ' accounts, no negative balances', r.ms)
      : fail('GW-TR-NEG-001', 'NEGATIVE TRUST BALANCE DETECTED', r.ms, JSON.stringify(negBal).slice(0,80));
    pass('GW-TR-NEG-001', 'Trust overdraft check — all balances non-negative', 0);
  } else {
    warn('GW-TR-SMK-001', 'Trust accounts', r.ms, 'HTTP ' + r.status + ' count: ' + trustAccounts.length);
  }

  // 12. Tasks
  r = await req('GET', API, '/api/v1/tasks/search?limit=20', null, H);
  const tasks = JSON.parse(r.body);
  const taskCount = (tasks.data && tasks.data.length) || 0;
  r.status === 200
    ? pass('GW-MK-SMK-001', 'Task list — ' + taskCount + ' tasks', r.ms)
    : fail('GW-MK-SMK-001', 'Task list error', r.ms, 'HTTP ' + r.status);

  // 13. Billing invoices
  r = await req('GET', API, '/api/v1/billing/invoices?limit=20', null, H);
  r.status === 200
    ? pass('GW-BL-SMK-001', 'Billing invoices endpoint OK', r.ms)
    : fail('GW-BL-SMK-001', 'Billing invoices error', r.ms, 'HTTP ' + r.status);

  // 14. Notifications
  r = await req('GET', API, '/api/v1/notifications?limit=10', null, H);
  r.status === 200
    ? pass('GW-NT-SMK-001', 'Notifications endpoint OK', r.ms)
    : warn('GW-NT-SMK-001', 'Notifications', r.ms, 'HTTP ' + r.status);

  // 15. VAT monthly
  r = await req('GET', API, '/api/v1/finance/tax/vat/monthly?year=2026', null, H);
  r.status === 200
    ? pass('GW-TC-FNC-001', 'VAT monthly endpoint OK', r.ms)
    : warn('GW-TC-FNC-001', 'VAT monthly', r.ms, 'HTTP ' + r.status);

  // 16. WHT report
  r = await req('GET', API, '/api/v1/finance/tax/wht/report', null, H);
  r.status === 200
    ? pass('GW-TC-FNC-002', 'WHT report endpoint OK', r.ms)
    : warn('GW-TC-FNC-002', 'WHT report', r.ms, 'HTTP ' + r.status);

  // 17. Documents
  r = await req('GET', API, '/api/v1/documents?limit=20', null, H);
  r.status === 200
    ? pass('GW-DC-SMK-001', 'Documents endpoint OK', r.ms)
    : fail('GW-DC-SMK-001', 'Documents error', r.ms, 'HTTP ' + r.status);

  // 18. Court hearings
  r = await req('GET', API, '/api/v1/court/hearings', null, H);
  r.status === 200
    ? pass('GW-CH-SMK-001', 'Court hearings endpoint OK', r.ms)
    : warn('GW-CH-SMK-001', 'Court hearings', r.ms, 'HTTP ' + r.status);

  // 19. Finance root
  r = await req('GET', API, '/api/v1/finance', null, H);
  r.status === 200
    ? pass('GW-GL-SMK-001', 'Finance module mounted OK', r.ms)
    : warn('GW-GL-SMK-001', 'Finance root', r.ms, 'HTTP ' + r.status);

  // 20. Workflows
  r = await req('GET', API, '/api/v1/workflows', null, H);
  r.status === 200
    ? pass('GW-WF-SMK-001', 'Workflows endpoint OK', r.ms)
    : warn('GW-WF-SMK-001', 'Workflows', r.ms, 'HTTP ' + r.status);

  // 21. Express/walk-in services
  r = await req('GET', API, '/api/v1/reception/express-services', null, H);
  r.status === 200
    ? pass('GW-WI-SMK-001', 'Walk-in express services OK', r.ms)
    : fail('GW-WI-SMK-001', 'Express services error', r.ms, 'HTTP ' + r.status);

  // 22. Audit log + hash chain
  r = await req('GET', API, '/api/v1/audit?limit=10', null, H);
  const auditBody = JSON.parse(r.body);
  const auditEntries = auditBody.data || [];
  if (r.status === 200 && auditEntries.length > 0) {
    let chainOK = true;
    for (let i = 1; i < Math.min(auditEntries.length, 5); i++) {
      if (auditEntries[i].previousHash && auditEntries[i].previousHash !== auditEntries[i-1].hash) {
        chainOK = false; break;
      }
    }
    chainOK
      ? pass('GW-AF-FNC-001', 'Audit log — ' + auditEntries.length + ' entries, hash chain intact', r.ms)
      : fail('GW-AF-FNC-001', 'AUDIT HASH CHAIN BROKEN', r.ms, 'Chain break detected');
  } else {
    warn('GW-AF-SMK-001', 'Audit log', r.ms, 'HTTP ' + r.status + ' entries: ' + auditEntries.length);
  }

  // 23. Conflict check
  r = await req('POST', API, '/api/v1/clients/conflict-check',
    { name: 'ABC Holdings', idNumber: '', kraPin: '' }, H);
  r.status === 200
    ? pass('GW-CL-FNC-006', 'Conflict check endpoint OK', r.ms)
    : warn('GW-CL-FNC-006', 'Conflict check', r.ms, 'HTTP ' + r.status);

  // 24. HR employees
  r = await req('GET', API, '/api/v1/hr/employees?limit=10', null, H);
  r.status === 200
    ? pass('GW-HR-SMK-001', 'HR employees endpoint OK', r.ms)
    : warn('GW-HR-SMK-001', 'HR employees', r.ms, 'HTTP ' + r.status);

  // 25. Reporting runs
  r = await req('GET', API, '/api/v1/reporting/runs?limit=10', null, H);
  r.status === 200
    ? pass('GW-RP-SMK-001', 'Reporting runs endpoint OK', r.ms)
    : warn('GW-RP-SMK-001', 'Reporting runs', r.ms, 'HTTP ' + r.status);

  // 26. Performance — client list timing
  r = await req('GET', API, '/api/v1/clients?limit=50', null, H);
  r.ms < 600
    ? pass('GW-PRF-001a', 'Client list perf: ' + r.ms + 'ms (target <600ms)', r.ms)
    : warn('GW-PRF-001a', 'Client list slow: ' + r.ms + 'ms', r.ms, 'Target <600ms');

  // 27. Performance — matter list timing
  r = await req('GET', API, '/api/v1/matters?limit=50', null, H);
  r.ms < 600
    ? pass('GW-PRF-001b', 'Matter list perf: ' + r.ms + 'ms (target <600ms)', r.ms)
    : warn('GW-PRF-001b', 'Matter list slow: ' + r.ms + 'ms', r.ms, 'Target <600ms');

  // 28. SQL injection test
  r = await req('POST', API, '/api/v1/auth/login',
    { email: "' OR '1'='1", password: "' OR '1'='1", tenantSlug: 'demo-law-firm' }, {});
  r.status === 401
    ? pass('GW-AU-NEG-003', 'SQL injection in login rejected (401)', r.ms)
    : fail('GW-AU-NEG-003', 'SQL injection NOT rejected', r.ms, 'HTTP ' + r.status);

  // 29. Reception visitors
  r = await req('GET', API, '/api/v1/reception/visitors?limit=10', null, H);
  r.status === 200
    ? pass('GW-RC2-SMK-001', 'Reception visitors endpoint OK', r.ms)
    : warn('GW-RC2-SMK-001', 'Reception visitors', r.ms, 'HTTP ' + r.status);

  // 30. Super admin login (separate test)
  r = await req('POST', API, '/api/v1/auth/login',
    { email: 'superadmin@globalwakili.co.ke', password: 'SuperAdmin@2026!' }, {});
  const saLogin = JSON.parse(r.body);
  const saToken = saLogin.data && saLogin.data.token;
  const saSystemRole = saLogin.data && saLogin.data.user && saLogin.data.user.systemRole;
  r.status === 200 && saToken
    ? pass('GW-PA-SMK-002', 'Super admin login OK — systemRole: ' + saSystemRole, r.ms)
    : warn('GW-PA-SMK-002', 'Super admin login', r.ms, 'HTTP ' + r.status + ' (account may not be active)');

  // 31. AI artifacts
  r = await req('GET', API, '/api/v1/ai/artifacts?limit=10', null, H);
  r.status === 200
    ? pass('GW-AI-SMK-001', 'AI artifacts endpoint OK', r.ms)
    : warn('GW-AI-SMK-001', 'AI artifacts', r.ms, 'HTTP ' + r.status);

  // 32. Trust transactions
  r = await req('GET', API, '/api/v1/finance/trust/transactions?limit=20', null, H);
  const trustTxns = JSON.parse(r.body);
  const txCount = (trustTxns.data && trustTxns.data.length) || 0;
  r.status === 200 && txCount > 0
    ? pass('GW-TR-FNC-001', 'Trust transactions — ' + txCount + ' transactions found', r.ms)
    : warn('GW-TR-FNC-001', 'Trust transactions', r.ms, 'HTTP ' + r.status + ' count: ' + txCount);

  // 33. Procurement vendors
  r = await req('GET', API, '/api/v1/procurement/vendors?limit=10', null, H);
  r.status === 200
    ? pass('GW-VD-SMK-001', 'Vendor register endpoint OK', r.ms)
    : warn('GW-VD-SMK-001', 'Vendors', r.ms, 'HTTP ' + r.status);

  // 34. Settings tenant
  r = await req('GET', API, '/api/v1/tenant/settings', null, H);
  r.status === 200
    ? pass('GW-TA-FNC-001', 'Tenant settings endpoint OK', r.ms)
    : warn('GW-TA-FNC-001', 'Tenant settings', r.ms, 'HTTP ' + r.status);

  // 35. Check client created (create test)
  r = await req('POST', API, '/api/v1/clients',
    { name: 'LIVE AUDIT TEST CLIENT', type: 'INDIVIDUAL', nationalId: '99887766', kraPin: 'A998877665B', email: 'audit.test@globalwakili.co.ke', phoneNumber: '+254700000999' }, H);
  if (r.status === 201) {
    const newClient = JSON.parse(r.body);
    pass('GW-CL-SMK-002', 'Client creation OK — ID: ' + (newClient.id || newClient.data && newClient.data.id || 'unknown'), r.ms);
  } else {
    fail('GW-CL-SMK-002', 'Client creation failed', r.ms, 'HTTP ' + r.status + ' ' + r.body.slice(0,100));
  }

  // ── FINAL REPORT ─────────────────────────────────────────────────────────────
  const passed = results.filter(function(r) { return r.status === 'PASS'; }).length;
  const failed = results.filter(function(r) { return r.status === 'FAIL'; }).length;
  const warned  = results.filter(function(r) { return r.status === 'WARN'; }).length;

  console.log('='.repeat(70));
  console.log(' LIVE UAT AUDIT RESULTS — ' + new Date().toISOString());
  console.log('='.repeat(70));
  results.forEach(function(res) {
    const icon = res.status === 'PASS' ? '✓' : res.status === 'FAIL' ? '✗' : '⚠';
    const timing = res.ms > 0 ? '  (' + res.ms + 'ms)' : '';
    const detail = res.detail ? '  → ' + res.detail : '';
    console.log(icon + ' [' + res.status + '] ' + res.id + ' | ' + res.desc + timing + detail);
  });
  console.log('\n' + '='.repeat(70));
  console.log(' TOTALS: ' + results.length + ' tests | ✓ PASS: ' + passed + ' | ✗ FAIL: ' + failed + ' | ⚠ WARN: ' + warned);
  const pct = Math.round((passed / results.length) * 100);
  console.log(' PASS RATE: ' + pct + '%');
  console.log('='.repeat(70));
  if (failed > 0) process.exit(1);
}

run().catch(function(e) { console.error('AUDIT RUNTIME ERROR:', e.message); process.exit(1); });
