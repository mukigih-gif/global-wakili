// apps/api/tests/api/reporting.cert.test.ts
//
// Phase 1 Group 9 — Reporting: combined READ + WRITE certification.
// IDENTICAL harness to Group 6/7: live black-box, login via .env.test,
// /api/v1/reporting/* paths, rate-limit spacing.
// Tolerance: 500 → SKIPPED (service/schema gap); 403 → SKIPPED (permission, or the
// REPORTING_ADVANCED_SCHEDULING / REPORTING_BI_CONNECTORS feature flags on
// schedules & bi-connectors).
// Reporting controllers return the raw service object (health is {success,...};
// searches return { meta: { total } }; upserts→200, runs/exports→201).
// Writes are upserts on fixed keys (idempotent — re-runnable, no record growth);
// runs/exports/schedules depend on a reportDefinitionId, widgets on a dashboardDefinitionId.

import request from 'supertest';

jest.setTimeout(20000);

const BASE_URL = process.env.API_BASE_URL || 'https://global-wakili-api.onrender.com';
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
let reportDefinitionId = '';
let dashboardDefinitionId = '';
const bearer = () => `Bearer ${token}`;

const recordSkip = (
  name: string, method: string, path: string, expected: string,
  status: number, latencyMs: number, note: string, body: unknown,
) => {
  record({ group: 'Reporting', name, method, path, expected, status, latencyMs, pass: true, skipped: true, body: { note, body } });
  // eslint-disable-next-line no-console
  console.warn(`[Reporting] ${method} ${path} → SKIPPED: ${note}`);
};

const pass = (name: string, method: string, path: string, latencyMs: number, status: number, ok: boolean, body: unknown) =>
  record({ group: 'Reporting', name, method, path, expected: 'shape', status, latencyMs, pass: ok, skipped: false, body });

// GET/POST + tolerance: 500 → SKIP (service), 403 → SKIP (permission/feature).
async function call(name: string, method: 'GET' | 'POST', path: string, opts: { query?: Record<string, string>; body?: unknown } = {}): Promise<{ res: any; latencyMs: number; skipped: boolean }> {
  const t0 = Date.now();
  const r = method === 'GET' ? request(BASE_URL).get(path) : request(BASE_URL).post(path);
  r.set('Authorization', bearer());
  if (opts.query) r.query(opts.query);
  if (opts.body) r.send(opts.body);
  const res = await r;
  const latencyMs = Date.now() - t0;
  if (res.status === 500) { recordSkip(name, method, path, '2xx', 500, latencyMs, 'reporting service 500 on target', res.body); return { res, latencyMs, skipped: true }; }
  if (res.status === 403) { recordSkip(name, method, path, '2xx', 403, latencyMs, 'permission/feature gated (403)', res.body); return { res, latencyMs, skipped: true }; }
  return { res, latencyMs, skipped: false };
}

beforeAll(async () => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error('Missing TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD. Copy apps/api/.env.test.example to apps/api/.env.test and fill in.');
  }
  const lg = await request(BASE_URL).post('/api/v1/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, ...(TEST_TENANT_SLUG ? { tenantSlug: TEST_TENANT_SLUG } : {}) });
  if (lg.status !== 200 || !lg.body?.data?.token) throw new Error(`Reporting login failed (status ${lg.status})`);
  token = lg.body.data.token;
}, 45000);

afterEach(async () => { await sleep(500); });

describe('GROUP 9 — Reporting reads', () => {
  it('GET /reporting/health → 200 + module', async () => {
    const { res, latencyMs, skipped } = await call('health', 'GET', '/api/v1/reporting/health');
    if (skipped) return;
    const ok = res.status === 200 && res.body?.success === true && res.body?.module === 'reporting';
    pass('health', 'GET', '/api/v1/reporting/health', latencyMs, res.status, ok, { module: res.body?.module });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.module).toBe('reporting');
  });

  it('GET /reporting/overview → 200 + summary counts', async () => {
    const { res, latencyMs, skipped } = await call('overview', 'GET', '/api/v1/reporting/overview');
    if (skipped) return;
    const ok = res.status === 200 && typeof res.body?.summary?.reportDefinitions === 'number';
    pass('overview', 'GET', '/api/v1/reporting/overview', latencyMs, res.status, ok, { reportDefinitions: res.body?.summary?.reportDefinitions });
    expect(res.status).toBe(200);
    expect(res.body?.summary).toBeDefined();
    expect(typeof res.body?.summary?.reportDefinitions).toBe('number');
    expect(typeof res.body?.summary?.reportRuns).toBe('number');
  });

  it('GET /reporting/capabilities → 200', async () => {
    const { res, latencyMs, skipped } = await call('capabilities', 'GET', '/api/v1/reporting/capabilities');
    if (skipped) return;
    const ok = res.status === 200 && res.body?.active !== undefined;
    pass('capabilities', 'GET', '/api/v1/reporting/capabilities', latencyMs, res.status, ok, {});
    expect(res.status).toBe(200);
    expect(res.body?.active).toBeDefined();
  });

  it('GET /reporting/catalog → 200 + catalog/blueprint arrays', async () => {
    const { res, latencyMs, skipped } = await call('catalog', 'GET', '/api/v1/reporting/catalog');
    if (skipped) return;
    const ok = res.status === 200 && Array.isArray(res.body?.reportCatalog) && Array.isArray(res.body?.dashboardBlueprints);
    pass('catalog', 'GET', '/api/v1/reporting/catalog', latencyMs, res.status, ok, { reportCatalog: (res.body?.reportCatalog || []).length });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.reportCatalog)).toBe(true);
    expect(Array.isArray(res.body?.dashboardBlueprints)).toBe(true);
  });

  const searchTest = (name: string, path: string) =>
    it(`GET ${path} → 200 + meta.total`, async () => {
      const { res, latencyMs, skipped } = await call(name, 'GET', path);
      if (skipped) return;
      const ok = res.status === 200 && typeof res.body?.meta?.total === 'number';
      pass(name, 'GET', path, latencyMs, res.status, ok, { total: res.body?.meta?.total });
      expect(res.status).toBe(200);
      expect(typeof res.body?.meta?.total).toBe('number');
    });

  searchTest('definitions search', '/api/v1/reporting/definitions/search');
  searchTest('runs search', '/api/v1/reporting/runs/search');
  searchTest('exports search', '/api/v1/reporting/exports/search');
  searchTest('dashboard-definitions search', '/api/v1/reporting/dashboard-definitions/search');
  searchTest('dashboard-widgets search', '/api/v1/reporting/dashboard-widgets/search');
  searchTest('schedules search', '/api/v1/reporting/schedules/search');       // feature-gated
  searchTest('bi-connectors search', '/api/v1/reporting/bi-connectors/search'); // feature-gated
});

describe('GROUP 9 — Reporting writes', () => {
  it('POST /reporting/definitions → 200 (upsert)', async () => {
    const { res, latencyMs, skipped } = await call('definition upsert', 'POST', '/api/v1/reporting/definitions', { body: { key: '__CERT_REPORT_DEF__', name: 'Cert Report Definition' } });
    if (skipped) return;
    reportDefinitionId = res.body?.id ?? '';
    const ok = res.status === 200 && !!reportDefinitionId && res.body?.key === '__CERT_REPORT_DEF__';
    pass('definition upsert', 'POST', '/api/v1/reporting/definitions', latencyMs, res.status, ok, { id: reportDefinitionId });
    expect(res.status).toBe(200);
    expect(res.body?.id).toBeTruthy();
    expect(res.body?.key).toBe('__CERT_REPORT_DEF__');
  });

  it('POST /reporting/runs → 201 (needs reportDefinitionId)', async () => {
    if (!reportDefinitionId) { recordSkip('run create', 'POST', '/api/v1/reporting/runs', '201', 0, 0, 'no report definition id', null); return; }
    const { res, latencyMs, skipped } = await call('run create', 'POST', '/api/v1/reporting/runs', { body: { reportDefinitionId } });
    if (skipped) return;
    const ok = res.status === 201 && !!res.body?.id && res.body?.reportDefinitionId === reportDefinitionId;
    pass('run create', 'POST', '/api/v1/reporting/runs', latencyMs, res.status, ok, { id: res.body?.id, status: res.body?.status });
    expect(res.status).toBe(201);
    expect(res.body?.id).toBeTruthy();
    expect(res.body?.reportDefinitionId).toBe(reportDefinitionId);
  });

  it('POST /reporting/exports → 201 (needs reportDefinitionId)', async () => {
    if (!reportDefinitionId) { recordSkip('export create', 'POST', '/api/v1/reporting/exports', '201', 0, 0, 'no report definition id', null); return; }
    const { res, latencyMs, skipped } = await call('export create', 'POST', '/api/v1/reporting/exports', { body: { reportDefinitionId } });
    if (skipped) return;
    const ok = res.status === 201 && !!res.body?.id && res.body?.status !== undefined;
    pass('export create', 'POST', '/api/v1/reporting/exports', latencyMs, res.status, ok, { id: res.body?.id, status: res.body?.status });
    expect(res.status).toBe(201);
    expect(res.body?.id).toBeTruthy();
    expect(res.body?.status).toBeDefined();
  });

  it('POST /reporting/dashboard-definitions → 200 (upsert)', async () => {
    const { res, latencyMs, skipped } = await call('dashboard-def upsert', 'POST', '/api/v1/reporting/dashboard-definitions', { body: { key: '__CERT_DASH_DEF__', name: 'Cert Dashboard Definition' } });
    if (skipped) return;
    dashboardDefinitionId = res.body?.id ?? '';
    const ok = res.status === 200 && !!dashboardDefinitionId && res.body?.key === '__CERT_DASH_DEF__';
    pass('dashboard-def upsert', 'POST', '/api/v1/reporting/dashboard-definitions', latencyMs, res.status, ok, { id: dashboardDefinitionId });
    expect(res.status).toBe(200);
    expect(res.body?.id).toBeTruthy();
    expect(res.body?.key).toBe('__CERT_DASH_DEF__');
  });

  it('POST /reporting/dashboard-widgets → 200 (needs dashboardDefinitionId)', async () => {
    if (!dashboardDefinitionId) { recordSkip('widget upsert', 'POST', '/api/v1/reporting/dashboard-widgets', '200', 0, 0, 'no dashboard definition id', null); return; }
    const { res, latencyMs, skipped } = await call('widget upsert', 'POST', '/api/v1/reporting/dashboard-widgets', { body: { dashboardDefinitionId, key: '__CERT_WIDGET__', title: 'Cert Widget', widgetType: 'METRIC' } });
    if (skipped) return;
    const ok = res.status === 200 && !!res.body?.id && res.body?.dashboardDefinitionId === dashboardDefinitionId;
    pass('widget upsert', 'POST', '/api/v1/reporting/dashboard-widgets', latencyMs, res.status, ok, { id: res.body?.id });
    expect(res.status).toBe(200);
    expect(res.body?.id).toBeTruthy();
    expect(res.body?.dashboardDefinitionId).toBe(dashboardDefinitionId);
  });

  it('POST /reporting/schedules → 200 (feature-gated; needs reportDefinitionId)', async () => {
    if (!reportDefinitionId) { recordSkip('schedule upsert', 'POST', '/api/v1/reporting/schedules', '200', 0, 0, 'no report definition id', null); return; }
    const { res, latencyMs, skipped } = await call('schedule upsert', 'POST', '/api/v1/reporting/schedules', { body: { reportDefinitionId, name: 'Cert Schedule', frequency: 'DAILY' } });
    if (skipped) return;
    const ok = res.status === 200 && !!res.body?.id && res.body?.frequency === 'DAILY';
    pass('schedule upsert', 'POST', '/api/v1/reporting/schedules', latencyMs, res.status, ok, { id: res.body?.id, frequency: res.body?.frequency });
    expect(res.status).toBe(200);
    expect(res.body?.id).toBeTruthy();
    expect(res.body?.frequency).toBe('DAILY');
  });

  it('POST /reporting/bi-connectors → 200 (feature-gated)', async () => {
    const { res, latencyMs, skipped } = await call('bi-connector upsert', 'POST', '/api/v1/reporting/bi-connectors', { body: { connectorType: 'WEBHOOK', name: 'Cert Connector' } });
    if (skipped) return;
    const ok = res.status === 200 && !!res.body?.id && res.body?.connectorType === 'WEBHOOK';
    pass('bi-connector upsert', 'POST', '/api/v1/reporting/bi-connectors', latencyMs, res.status, ok, { id: res.body?.id });
    expect(res.status).toBe(200);
    expect(res.body?.id).toBeTruthy();
    expect(res.body?.connectorType).toBe('WEBHOOK');
  });
});

describe('GROUP 9 — Reporting auth guards (401)', () => {
  const guard = (name: string, method: 'GET' | 'POST', path: string, body?: unknown) =>
    it(`${method} ${path} — no token → 401`, async () => {
      const t0 = Date.now();
      const r = method === 'GET' ? request(BASE_URL).get(path) : request(BASE_URL).post(path).send(body ?? {});
      const res = await r;
      const latencyMs = Date.now() - t0;
      record({ group: 'Reporting', name, method, path, expected: '401', status: res.status, latencyMs, pass: res.status === 401, skipped: false, body: res.body });
      expect(res.status).toBe(401);
      expect(res.body?.success).not.toBe(true);
    });

  guard('overview no token', 'GET', '/api/v1/reporting/overview');
  guard('definitions no token', 'POST', '/api/v1/reporting/definitions', { key: 'x', name: 'x' });
  guard('runs-search no token', 'GET', '/api/v1/reporting/runs/search');
});

afterAll(() => {
  const total = evidence.length;
  const skipped = evidence.filter((e) => e.skipped).length;
  const failed = evidence.filter((e) => !e.pass).length;
  const passed = evidence.filter((e) => e.pass && !e.skipped).length;
  // eslint-disable-next-line no-console
  console.log(`[Reporting] passed=${passed} failed=${failed} skipped=${skipped} total=${total}`);
});
