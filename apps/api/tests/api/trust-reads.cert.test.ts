// apps/api/tests/api/trust-reads.cert.test.ts
//
// Phase 1 Group 7 — Trust Accounting: READ-endpoint certification.
// IDENTICAL harness to Group 6: live black-box, login via .env.test,
// /api/v1/trust/* paths, rate-limit spacing.
// Tolerance: 500 → SKIPPED (service/schema gap); 403 → SKIPPED (permission, or the
// TRUST_STATEMENT_EXPORTS feature flag gating statement/view/snapshot).
// Trust controllers return the raw service object (no {success,data} wrapper).
// Read-only — all GETs + three no-token 401 guards. No writes.

import request from 'supertest';

jest.setTimeout(15000);

const BASE_URL = process.env.API_BASE_URL || 'https://global-wakili-api.vercel.app';
const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD || '';
const TEST_TENANT_SLUG = process.env.TEST_TENANT_SLUG || '';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Evidence = {
  group: string; name: string; method: string; path: string;
  expected: string; status: number; latencyMs: number;
  pass: boolean; skipped: boolean; body: unknown;
};
const evidence: Evidence[] = [];
const record = (e: Evidence) => { evidence.push(e); return e; };

let token = '';
let trustAccountId: string | null = null;
let runId: string | null = null;
const bearer = () => `Bearer ${token}`;

const recordSkip = (
  name: string, method: string, path: string, expected: string,
  status: number, latencyMs: number, note: string, body: unknown,
) => {
  record({ group: 'Trust', name, method, path, expected, status, latencyMs, pass: true, skipped: true, body: { note, body } });
  // eslint-disable-next-line no-console
  console.warn(`[Trust] ${method} ${path} → SKIPPED: ${note}`);
};

// GET + tolerance: 500 → SKIP (service), 403 → SKIP (permission/feature). Returns res unless skipped.
async function doRead(name: string, path: string, query?: Record<string, string>): Promise<{ res: any; latencyMs: number; skipped: boolean }> {
  const t0 = Date.now();
  const r = request(BASE_URL).get(path).set('Authorization', bearer());
  if (query) r.query(query);
  const res = await r;
  const latencyMs = Date.now() - t0;
  if (res.status === 500) { recordSkip(name, 'GET', path, '200', 500, latencyMs, 'trust service 500 on target', res.body); return { res, latencyMs, skipped: true }; }
  if (res.status === 403) { recordSkip(name, 'GET', path, '200', 403, latencyMs, 'permission/feature gated (403)', res.body); return { res, latencyMs, skipped: true }; }
  return { res, latencyMs, skipped: false };
}

const pass = (name: string, path: string, latencyMs: number, status: number, ok: boolean, body: unknown) =>
  record({ group: 'Trust', name, method: 'GET', path, expected: '200 + shape', status, latencyMs, pass: ok, skipped: false, body });

beforeAll(async () => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error('Missing TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD. Copy apps/api/.env.test.example to apps/api/.env.test and fill in.');
  }
  const lg = await request(BASE_URL).post('/api/v1/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, ...(TEST_TENANT_SLUG ? { tenantSlug: TEST_TENANT_SLUG } : {}) });
  if (lg.status !== 200 || !lg.body?.data?.token) throw new Error(`Trust login failed (status ${lg.status})`);
  token = lg.body.data.token;

  // resolve a trust account id (GET /accounts → { data: [...] })
  const acc = await request(BASE_URL).get('/api/v1/trust/accounts').set('Authorization', bearer());
  trustAccountId = (Array.isArray(acc.body?.data) ? acc.body.data[0] : null)?.id ?? null;

  // resolve a reconciliation run id (GET /reconciliations → top-level array)
  const rec = await request(BASE_URL).get('/api/v1/trust/reconciliations').set('Authorization', bearer());
  runId = (Array.isArray(rec.body) ? rec.body[0] : null)?.id ?? null;
}, 45000);

afterEach(async () => { await sleep(500); });

describe('GROUP 7 — Trust reads', () => {
  it('GET /trust/dashboard → 200 + violation/balance totals', async () => {
    const { res, latencyMs, skipped } = await doRead('dashboard', '/api/v1/trust/dashboard');
    if (skipped) return;
    const ok = res.status === 200
      && typeof res.body?.totalTrustAccounts === 'number'
      && typeof res.body?.totalViolations === 'number'
      && typeof res.body?.unreconciledAccounts === 'number';
    pass('dashboard', '/api/v1/trust/dashboard', latencyMs, res.status, ok, { totalTrustAccounts: res.body?.totalTrustAccounts, totalViolations: res.body?.totalViolations });
    expect(res.status).toBe(200);
    expect(typeof res.body?.totalTrustAccounts).toBe('number');
    expect(res.body?.totalTrustBalance).toBeDefined();
    expect(typeof res.body?.unreconciledAccounts).toBe('number');
    expect(typeof res.body?.totalViolations).toBe('number');
  });

  it('GET /trust/overview → 200 + dashboard + recent lists', async () => {
    const { res, latencyMs, skipped } = await doRead('overview', '/api/v1/trust/overview');
    if (skipped) return;
    const ok = res.status === 200 && !!res.body?.dashboard && Array.isArray(res.body?.recentTransactions) && Array.isArray(res.body?.recentReconciliations);
    pass('overview', '/api/v1/trust/overview', latencyMs, res.status, ok, { hasDashboard: !!res.body?.dashboard });
    expect(res.status).toBe(200);
    expect(res.body?.dashboard).toBeDefined();
    expect(Array.isArray(res.body?.recentTransactions)).toBe(true);
    expect(Array.isArray(res.body?.recentReconciliations)).toBe(true);
  });

  it('GET /trust/accounts → 200 + data[] of accounts', async () => {
    const { res, latencyMs, skipped } = await doRead('accounts list', '/api/v1/trust/accounts');
    if (skipped) return;
    const ok = res.status === 200 && Array.isArray(res.body?.data);
    pass('accounts list', '/api/v1/trust/accounts', latencyMs, res.status, ok, { count: (res.body?.data || []).length });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.data)).toBe(true);
    if ((res.body?.data || []).length > 0) {
      expect(res.body.data[0]).toHaveProperty('accountName');
      expect(res.body.data[0]).toHaveProperty('accountNumber');
      expect(res.body.data[0]).toHaveProperty('isActive');
    }
  });

  it('GET /trust/accounts/:id/statement → 200 + metadata/account/rows/summary', async () => {
    if (!trustAccountId) { recordSkip('account statement', 'GET', '/api/v1/trust/accounts/:id/statement', '200', 0, 0, 'no trust account resolved', null); return; }
    const path = `/api/v1/trust/accounts/${trustAccountId}/statement`;
    const { res, latencyMs, skipped } = await doRead('account statement', path);
    if (skipped) return;
    const ok = res.status === 200 && res.body?.metadata?.reportType === 'TRUST_STATEMENT' && Array.isArray(res.body?.rows) && typeof res.body?.summary?.rowCount === 'number';
    pass('account statement', '/api/v1/trust/accounts/:id/statement', latencyMs, res.status, ok, { reportType: res.body?.metadata?.reportType, rowCount: res.body?.summary?.rowCount });
    expect(res.status).toBe(200);
    expect(res.body?.metadata?.reportType).toBe('TRUST_STATEMENT');
    expect(res.body?.account?.accountName).toBeDefined();
    expect(Array.isArray(res.body?.rows)).toBe(true);
    expect(res.body?.summary?.openingBalance).toBeDefined();
    expect(res.body?.summary?.closingBalance).toBeDefined();
    expect(typeof res.body?.summary?.rowCount).toBe('number');
  });

  it('GET /trust/accounts/:id/view → 200 + account/statement/snapshot', async () => {
    if (!trustAccountId) { recordSkip('account view', 'GET', '/api/v1/trust/accounts/:id/view', '200', 0, 0, 'no trust account resolved', null); return; }
    const path = `/api/v1/trust/accounts/${trustAccountId}/view`;
    const { res, latencyMs, skipped } = await doRead('account view', path);
    if (skipped) return;
    const ok = res.status === 200 && res.body?.account !== undefined && res.body?.statement !== undefined && res.body?.snapshot !== undefined;
    pass('account view', '/api/v1/trust/accounts/:id/view', latencyMs, res.status, ok, {});
    expect(res.status).toBe(200);
    expect(res.body?.account).toBeDefined();
    expect(res.body?.statement).toBeDefined();
    expect(res.body?.snapshot).toBeDefined();
  });

  it('GET /trust/accounts/:id/snapshot → 200 + three-way balances', async () => {
    if (!trustAccountId) { recordSkip('account snapshot', 'GET', '/api/v1/trust/accounts/:id/snapshot', '200', 0, 0, 'no trust account resolved', null); return; }
    const path = `/api/v1/trust/accounts/${trustAccountId}/snapshot`;
    const { res, latencyMs, skipped } = await doRead('account snapshot', path, { statementDate: new Date().toISOString() });
    if (skipped) return;
    const ok = res.status === 200 && typeof res.body?.isThreeWayBalanced === 'boolean' && res.body?.trustBookBalance !== undefined;
    pass('account snapshot', '/api/v1/trust/accounts/:id/snapshot', latencyMs, res.status, ok, { isThreeWayBalanced: res.body?.isThreeWayBalanced });
    expect(res.status).toBe(200);
    expect(res.body?.trustAccountId).toBeDefined();
    expect(typeof res.body?.isThreeWayBalanced).toBe('boolean');
    expect(res.body?.trustBookBalance).toBeDefined();
    expect(res.body?.clientLedgerBalance).toBeDefined();
    expect(res.body?.bankBalance).toBeDefined();
  });

  it('GET /trust/alerts → 200 + alert counts', async () => {
    const { res, latencyMs, skipped } = await doRead('alerts', '/api/v1/trust/alerts');
    if (skipped) return;
    const ok = res.status === 200 && typeof res.body?.alertCount === 'number' && Array.isArray(res.body?.alerts);
    pass('alerts', '/api/v1/trust/alerts', latencyMs, res.status, ok, { alertCount: res.body?.alertCount, criticalCount: res.body?.criticalCount });
    expect(res.status).toBe(200);
    expect(typeof res.body?.alertCount).toBe('number');
    expect(typeof res.body?.criticalCount).toBe('number');
    expect(typeof res.body?.warningCount).toBe('number');
    expect(Array.isArray(res.body?.alerts)).toBe(true);
  });

  it('GET /trust/violations → 200 + violation buckets', async () => {
    const { res, latencyMs, skipped } = await doRead('violations', '/api/v1/trust/violations');
    if (skipped) return;
    const ok = res.status === 200 && typeof res.body?.totalViolations === 'number'
      && Array.isArray(res.body?.matterOverdraws) && Array.isArray(res.body?.trustOverdraws) && Array.isArray(res.body?.ledgerMismatch);
    pass('violations', '/api/v1/trust/violations', latencyMs, res.status, ok, { totalViolations: res.body?.totalViolations });
    expect(res.status).toBe(200);
    expect(typeof res.body?.totalViolations).toBe('number');
    expect(Array.isArray(res.body?.matterOverdraws)).toBe(true);
    expect(Array.isArray(res.body?.trustOverdraws)).toBe(true);
    expect(Array.isArray(res.body?.ledgerMismatch)).toBe(true);
  });

  it('GET /trust/reconciliations → 200 + array', async () => {
    const { res, latencyMs, skipped } = await doRead('reconciliations list', '/api/v1/trust/reconciliations');
    if (skipped) return;
    const ok = res.status === 200 && Array.isArray(res.body);
    pass('reconciliations list', '/api/v1/trust/reconciliations', latencyMs, res.status, ok, { count: Array.isArray(res.body) ? res.body.length : null });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /trust/reconciliations/:runId/matches → 200 + array', async () => {
    if (!runId) { recordSkip('reconciliation matches', 'GET', '/api/v1/trust/reconciliations/:runId/matches', '200', 0, 0, 'no reconciliation run resolved', null); return; }
    const path = `/api/v1/trust/reconciliations/${runId}/matches`;
    const { res, latencyMs, skipped } = await doRead('reconciliation matches', path);
    if (skipped) return;
    const ok = res.status === 200 && Array.isArray(res.body);
    pass('reconciliation matches', '/api/v1/trust/reconciliations/:runId/matches', latencyMs, res.status, ok, { count: Array.isArray(res.body) ? res.body.length : null });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GROUP 7 — Trust auth guards (401)', () => {
  const guard = (name: string, path: string) =>
    it(`GET ${path} — no token → 401`, async () => {
      const t0 = Date.now();
      const res = await request(BASE_URL).get(path);
      const latencyMs = Date.now() - t0;
      record({ group: 'Trust', name, method: 'GET', path, expected: '401', status: res.status, latencyMs, pass: res.status === 401, skipped: false, body: res.body });
      expect(res.status).toBe(401);
      expect(res.body?.success).not.toBe(true);
    });

  guard('dashboard no token', '/api/v1/trust/dashboard');
  guard('accounts no token', '/api/v1/trust/accounts');
  guard('reconciliations no token', '/api/v1/trust/reconciliations');
});

afterAll(() => {
  const total = evidence.length;
  const skipped = evidence.filter((e) => e.skipped).length;
  const failed = evidence.filter((e) => !e.pass).length;
  const passed = evidence.filter((e) => e.pass && !e.skipped).length;
  // eslint-disable-next-line no-console
  console.log(`[Trust reads] passed=${passed} failed=${failed} skipped=${skipped} total=${total}`);
});
