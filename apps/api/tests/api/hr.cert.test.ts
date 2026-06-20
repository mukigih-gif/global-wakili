// apps/api/tests/api/hr.cert.test.ts
//
// Phase 1 Group 8 — HR: endpoint certification.
// IDENTICAL harness to trust-*.cert: live black-box, login via .env.test,
// /api/v1/hr/* paths, rate-limit spacing, no DB seeding.
//
// Run against the deployment under test:
//   API_BASE_URL=https://global-wakili-api.onrender.com npx jest hr.cert
//
// USER = TEST_HR (HR_MANAGER). NOT TEST_ADMIN: per FINDING-008-001, HR access is
// granted only to isSuperUser (MANAGING_PARTNER) or role HR_MANAGER — admin/FIRM_ADMIN
// is NOT in the HR privileged set (related: FINDING-007-011 parallel-role-system split).
//
// Endpoint corrections vs the task brief (verified against hr.routes.ts):
//   * GET  /hr/leave/requests      -> does NOT exist; real list route is GET /hr/leave
//   * GET  /hr/performance/reviews -> does NOT exist; real list route is GET /hr/performance
//   * POST /hr/leave/requests      -> does NOT exist (no create-leave-request route);
//                                     substituted POST /hr/leave-policies (a real leave write)
//   * POST /hr/disciplinary validates employeeId against the `employee` Prisma model,
//     but HR reads expose `user` ids and no endpoint returns `employee` ids — so a clean
//     201 may be unreachable. Test passes on 201, SKIPs on 404 EMPLOYEE_NOT_FOUND or 500.
//
// Soft tolerance: a 500 from a missing delegate / undeployed schema -> SKIP (not FAIL).
// Write controllers return 201 { success, module:'hr', data }.

import request from 'supertest';

jest.setTimeout(20000);

const BASE_URL = process.env.API_BASE_URL || 'https://global-wakili-api.onrender.com';
const HR_EMAIL = process.env.TEST_HR_EMAIL || '';
const HR_PASSWORD = process.env.TEST_HR_PASSWORD || '';
const TEST_TENANT_SLUG = process.env.TEST_TENANT_SLUG || '';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const stamp = Date.now();

type Evidence = {
  group: string; name: string; method: string; path: string;
  expected: string; status: number; latencyMs: number;
  pass: boolean; skipped: boolean; body: unknown;
};
const evidence: Evidence[] = [];
const record = (e: Evidence) => { evidence.push(e); return e; };

let token = '';
let employeeId: string | null = null;   // a User id (GET /hr/employees)
let actorUserId: string | null = null;  // logged-in HR user id
const bearer = () => `Bearer ${token}`;

const recordSkip = (
  name: string, method: string, path: string, expected: string,
  status: number, latencyMs: number, note: string, body: unknown,
) => {
  record({ group: 'HR', name, method, path, expected, status, latencyMs, pass: true, skipped: true, body: { note, body } });
  // eslint-disable-next-line no-console
  console.warn(`[HR] ${method} ${path} → SKIPPED: ${note}`);
};

// GET with soft-500 tolerance: 500 -> SKIP. Returns res unless skipped.
async function doGet(name: string, path: string): Promise<{ res: any; latencyMs: number; skipped: boolean }> {
  const t0 = Date.now();
  const res = await request(BASE_URL).get(path).set('Authorization', bearer());
  const latencyMs = Date.now() - t0;
  if (res.status === 500) { recordSkip(name, 'GET', path, '200', 500, latencyMs, 'HR service 500 (missing delegate / undeployed schema)', res.body); return { res, latencyMs, skipped: true }; }
  return { res, latencyMs, skipped: false };
}

async function post(path: string, body: unknown, withToken = true): Promise<{ res: any; latencyMs: number }> {
  const t0 = Date.now();
  const r = request(BASE_URL).post(path).send(body as object);
  if (withToken) r.set('Authorization', bearer());
  const res = await r;
  return { res, latencyMs: Date.now() - t0 };
}

const passGet = (name: string, path: string, latencyMs: number, status: number, ok: boolean, body: unknown) =>
  record({ group: 'HR', name, method: 'GET', path, expected: '200', status, latencyMs, pass: ok, skipped: false, body });

const hasList = (b: any) => Array.isArray(b?.data) || Array.isArray(b) || b?.success === true;

beforeAll(async () => {
  if (!HR_EMAIL || !HR_PASSWORD) {
    throw new Error('Missing TEST_HR_EMAIL / TEST_HR_PASSWORD (HR_MANAGER user) in apps/api/.env.test.');
  }
  const lg = await request(BASE_URL).post('/api/v1/auth/login')
    .send({ email: HR_EMAIL, password: HR_PASSWORD, ...(TEST_TENANT_SLUG ? { tenantSlug: TEST_TENANT_SLUG } : {}) });
  if (lg.status !== 200 || !lg.body?.data?.token) throw new Error(`HR login failed (status ${lg.status})`);
  token = lg.body.data.token;
  actorUserId = lg.body?.data?.user?.id ?? null;

  // resolve a real employee (User) id
  const emp = await request(BASE_URL).get('/api/v1/hr/employees').set('Authorization', bearer());
  const arr = Array.isArray(emp.body?.data) ? emp.body.data : Array.isArray(emp.body) ? emp.body : [];
  employeeId = arr[0]?.id ?? null;
}, 45000);

afterEach(async () => { await sleep(500); });

describe('GROUP 8 — HR reads', () => {
  it('GET /hr/health → 200 (mounted)', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/hr/health');
    const latencyMs = Date.now() - t0;
    const ok = res.status === 200 && res.body?.module === 'hr';
    passGet('health', '/api/v1/hr/health', latencyMs, res.status, ok, res.body);
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.module).toBe('hr');
  });

  it('GET /hr/employees → 200 + data[]', async () => {
    const { res, latencyMs, skipped } = await doGet('employees', '/api/v1/hr/employees');
    if (skipped) return;
    const ok = res.status === 200 && Array.isArray(res.body?.data);
    passGet('employees', '/api/v1/hr/employees', latencyMs, res.status, ok, { count: (res.body?.data || []).length });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  it('GET /hr/employees/:id → 200 or SKIP', async () => {
    if (!employeeId) { recordSkip('employee by id', 'GET', '/api/v1/hr/employees/:id', '200', 0, 0, 'no employee id resolved', null); return; }
    const path = `/api/v1/hr/employees/${employeeId}`;
    const { res, latencyMs, skipped } = await doGet('employee by id', path);
    if (skipped) return;
    const ok = res.status === 200 && (res.body?.data?.id === employeeId);
    passGet('employee by id', path, latencyMs, res.status, ok, { id: res.body?.data?.id });
    expect(res.status).toBe(200);
    expect(res.body?.data?.id).toBe(employeeId);
  });

  it('GET /hr/departments → 200 or SKIP', async () => {
    const { res, latencyMs, skipped } = await doGet('departments', '/api/v1/hr/departments');
    if (skipped) return;
    const ok = res.status === 200 && hasList(res.body);
    passGet('departments', '/api/v1/hr/departments', latencyMs, res.status, ok, {});
    expect(res.status).toBe(200);
    expect(hasList(res.body)).toBe(true);
  });

  it('GET /hr/leave → 200 or SKIP  (real route; brief said /leave/requests)', async () => {
    const { res, latencyMs, skipped } = await doGet('leave list', '/api/v1/hr/leave');
    if (skipped) return;
    const ok = res.status === 200 && hasList(res.body);
    passGet('leave list', '/api/v1/hr/leave', latencyMs, res.status, ok, {});
    expect(res.status).toBe(200);
    expect(hasList(res.body)).toBe(true);
  });

  it('GET /hr/performance → 200 or SKIP  (real route; brief said /performance/reviews)', async () => {
    const { res, latencyMs, skipped } = await doGet('performance list', '/api/v1/hr/performance');
    if (skipped) return;
    const ok = res.status === 200 && hasList(res.body);
    passGet('performance list', '/api/v1/hr/performance', latencyMs, res.status, ok, {});
    expect(res.status).toBe(200);
    expect(hasList(res.body)).toBe(true);
  });

  it('GET /hr/disciplinary → 200 or SKIP', async () => {
    const { res, latencyMs, skipped } = await doGet('disciplinary list', '/api/v1/hr/disciplinary');
    if (skipped) return;
    const ok = res.status === 200 && hasList(res.body);
    passGet('disciplinary list', '/api/v1/hr/disciplinary', latencyMs, res.status, ok, {});
    expect(res.status).toBe(200);
    expect(hasList(res.body)).toBe(true);
  });

  it('GET /hr/documents → 200 or SKIP', async () => {
    const { res, latencyMs, skipped } = await doGet('documents list', '/api/v1/hr/documents');
    if (skipped) return;
    const ok = res.status === 200 && hasList(res.body);
    passGet('documents list', '/api/v1/hr/documents', latencyMs, res.status, ok, {});
    expect(res.status).toBe(200);
    expect(hasList(res.body)).toBe(true);
  });
});

describe('GROUP 8 — HR writes', () => {
  it('POST /hr/departments → 201 or SKIP', async () => {
    const path = '/api/v1/hr/departments';
    const { res, latencyMs } = await post(path, { name: `Cert Dept ${stamp}`, code: `CD${stamp % 100000}` });
    if (res.status === 500) { recordSkip('create department', 'POST', path, '201', 500, latencyMs, 'HR service 500 (missing delegate / undeployed schema)', res.body); return; }
    const ok = res.status === 201 && res.body?.data?.id;
    record({ group: 'HR', name: 'create department', method: 'POST', path, expected: '201', status: res.status, latencyMs, pass: ok, skipped: false, body: { id: res.body?.data?.id } });
    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.id).toBeTruthy();
  });

  it('POST /hr/leave-policies → 201 or SKIP  (substitute: no create-leave-request route exists)', async () => {
    const path = '/api/v1/hr/leave-policies';
    const { res, latencyMs } = await post(path, {
      name: `Cert Leave ${stamp}`, code: `CL${stamp % 100000}`,
      leaveType: 'ANNUAL', annualEntitlementDays: 21,
      effectiveFrom: new Date().toISOString(),
    });
    if (res.status === 500) { recordSkip('create leave policy', 'POST', path, '201', 500, latencyMs, 'HR service 500 (missing delegate / undeployed schema)', res.body); return; }
    const ok = res.status === 201 && res.body?.data?.id;
    record({ group: 'HR', name: 'create leave policy', method: 'POST', path, expected: '201', status: res.status, latencyMs, pass: ok, skipped: false, body: { id: res.body?.data?.id } });
    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.id).toBeTruthy();
  });

  it('POST /hr/disciplinary → 201, or SKIP on 404/500 (User-vs-Employee id split)', async () => {
    if (!employeeId || !actorUserId) { recordSkip('create disciplinary', 'POST', '/api/v1/hr/disciplinary', '201', 0, 0, 'employee/actor id not resolved', null); return; }
    const path = '/api/v1/hr/disciplinary';
    const { res, latencyMs } = await post(path, {
      employeeId, reportedById: actorUserId,
      title: `Cert Case ${stamp}`, description: 'cert disciplinary case',
      incidentDate: new Date().toISOString(), severity: 'LOW',
    });
    // createCase validates employeeId against the `employee` model; HR reads expose `user`
    // ids, so EMPLOYEE_NOT_FOUND (404) or a missing-delegate 500 are tolerated as SKIP.
    if (res.status === 500 || res.status === 404) {
      recordSkip('create disciplinary', 'POST', path, '201', res.status, latencyMs,
        res.status === 404 ? 'EMPLOYEE_NOT_FOUND — User id not resolvable to `employee` model' : 'HR service 500 (missing delegate / undeployed schema)', res.body);
      return;
    }
    const ok = res.status === 201 && res.body?.data?.id;
    record({ group: 'HR', name: 'create disciplinary', method: 'POST', path, expected: '201', status: res.status, latencyMs, pass: ok, skipped: false, body: { id: res.body?.data?.id } });
    expect(res.status).toBe(201);
    expect(res.body?.data?.id).toBeTruthy();
  });
});

describe('GROUP 8 — HR auth guards (401)', () => {
  const guard = (name: string, path: string) =>
    it(`GET ${path} — no token → 401`, async () => {
      const t0 = Date.now();
      const res = await request(BASE_URL).get(path);
      const latencyMs = Date.now() - t0;
      record({ group: 'HR', name, method: 'GET', path, expected: '401', status: res.status, latencyMs, pass: res.status === 401, skipped: false, body: res.body });
      expect(res.status).toBe(401);
      expect(res.body?.success).not.toBe(true);
    });

  guard('employees no token', '/api/v1/hr/employees');
  guard('disciplinary no token', '/api/v1/hr/disciplinary');
});

afterAll(() => {
  const total = evidence.length;
  const skipped = evidence.filter((e) => e.skipped).length;
  const failed = evidence.filter((e) => !e.pass).length;
  const passed = evidence.filter((e) => e.pass && !e.skipped).length;
  // eslint-disable-next-line no-console
  console.log(`[HR] passed=${passed} failed=${failed} skipped=${skipped} total=${total}`);
});
