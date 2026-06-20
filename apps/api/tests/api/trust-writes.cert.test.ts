// apps/api/tests/api/trust-writes.cert.test.ts
//
// Phase 1 Group 7 — Trust Accounting: WRITE-endpoint certification.
// IDENTICAL harness to trust-reads.cert.test.ts: live black-box against the
// deployed API, login via .env.test, /api/v1/trust/* paths, rate-limit spacing,
// no DB seeding (trust account + transactions are created via the API itself).
//
// Run against the deployment carrying this session's fixes (FINDING-007-005/008/009):
//   API_BASE_URL=https://global-wakili-api.onrender.com npx jest trust-writes.cert
//
// Envelope notes (verified in source):
//   * Trust write controllers return the RAW service object (no {success,data}),
//     except POST /accounts which returns { success, data }.
//   * The global error handler (app.ts) maps any sub-500 thrown error to
//     { error: <message>, code: 'REQUEST_FAILED', requestId } — the domain code
//     (e.g. INSUFFICIENT_TRUST_ACCOUNT_BALANCE) and details are NOT surfaced in the
//     body. So the overdraw test asserts status 422 + REQUEST_FAILED; the specific
//     code lives in the service (TrustTransactionService) and was proven live this
//     session. Zod validation failures come from validate() as 400 VALIDATION_ERROR.
// No soft 500-tolerance: all trust-write gaps are fixed, so 500 = real failure.

import request from 'supertest';

jest.setTimeout(20000);

const BASE_URL = process.env.API_BASE_URL || 'https://global-wakili-api.onrender.com';
const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD || '';
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
let createdTrustAccountId: string | null = null;
let clientId: string | null = null;
let matterId: string | null = null;
const bearer = () => `Bearer ${token}`;

const recordSkip = (
  name: string, method: string, path: string, expected: string,
  status: number, latencyMs: number, note: string, body: unknown,
) => {
  record({ group: 'TrustW', name, method, path, expected, status, latencyMs, pass: true, skipped: true, body: { note, body } });
  // eslint-disable-next-line no-console
  console.warn(`[TrustW] ${method} ${path} → SKIPPED: ${note}`);
};

async function post(path: string, body: unknown, withToken = true): Promise<{ res: any; latencyMs: number }> {
  const t0 = Date.now();
  const r = request(BASE_URL).post(path).send(body as object);
  if (withToken) r.set('Authorization', bearer());
  const res = await r;
  return { res, latencyMs: Date.now() - t0 };
}

beforeAll(async () => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error('Missing TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD. Copy apps/api/.env.test.example to apps/api/.env.test and fill in.');
  }
  const lg = await request(BASE_URL).post('/api/v1/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, ...(TEST_TENANT_SLUG ? { tenantSlug: TEST_TENANT_SLUG } : {}) });
  if (lg.status !== 200 || !lg.body?.data?.token) throw new Error(`Trust-writes login failed (status ${lg.status})`);
  token = lg.body.data.token;

  // Resolve a (matterId, clientId) pair via the API (no DB seeding).
  const ml = await request(BASE_URL).get('/api/v1/matters').set('Authorization', bearer());
  const matters = Array.isArray(ml.body?.data) ? ml.body.data : Array.isArray(ml.body) ? ml.body : [];
  const m0 = matters[0];
  if (m0) {
    matterId = m0.id ?? null;
    clientId = m0.clientId ?? m0.client?.id ?? null;
    if (matterId && !clientId) {
      const mb = await request(BASE_URL).get(`/api/v1/matters/${matterId}`).set('Authorization', bearer());
      const mm = mb.body?.data ?? mb.body;
      clientId = mm?.clientId ?? mm?.client?.id ?? null;
    }
  }
}, 45000);

afterEach(async () => { await sleep(500); });

describe('GROUP 7 — Trust writes', () => {
  it('POST /trust/accounts — create trust account → 201 + data.id', async () => {
    const path = '/api/v1/trust/accounts';
    const { res, latencyMs } = await post(path, {
      accountName: `Cert Trust ${stamp}`,
      accountNumber: `CERT-${stamp}`,
      bankName: 'Cert Test Bank',
      currency: 'KES',
    });
    const id = res.body?.data?.id ?? null;
    createdTrustAccountId = id;
    const ok = res.status === 201 && typeof id === 'string';
    record({ group: 'TrustW', name: 'create account', method: 'POST', path, expected: '201 + data.id', status: res.status, latencyMs, pass: ok, skipped: false, body: { id } });
    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(typeof res.body?.data?.id).toBe('string');
  });

  it('POST /trust/transactions — DEPOSIT → 201', async () => {
    if (!createdTrustAccountId || !clientId) { recordSkip('deposit', 'POST', '/api/v1/trust/transactions', '201', 0, 0, 'account/client not resolved', null); return; }
    const path = '/api/v1/trust/transactions';
    const { res, latencyMs } = await post(path, {
      trustAccountId: createdTrustAccountId, clientId, matterId: matterId ?? undefined,
      transactionType: 'DEPOSIT', amount: '5000.00',
      transactionDate: new Date().toISOString(), reference: `DEP-${stamp}`,
      description: 'cert deposit',
    });
    const ok = res.status === 201;
    record({ group: 'TrustW', name: 'deposit', method: 'POST', path, expected: '201', status: res.status, latencyMs, pass: ok, skipped: false, body: { id: res.body?.id, type: res.body?.transactionType } });
    expect(res.status).toBe(201);
    expect(res.body).toBeTruthy();
  });

  it('POST /trust/transactions — WITHDRAWAL within balance → 201', async () => {
    if (!createdTrustAccountId || !clientId) { recordSkip('withdrawal ok', 'POST', '/api/v1/trust/transactions', '201', 0, 0, 'account/client not resolved', null); return; }
    const path = '/api/v1/trust/transactions';
    const { res, latencyMs } = await post(path, {
      trustAccountId: createdTrustAccountId, clientId, matterId: matterId ?? undefined,
      transactionType: 'WITHDRAWAL', amount: '2000.00',
      transactionDate: new Date().toISOString(), reference: `WD-${stamp}`,
      description: 'cert withdrawal within balance',
    });
    const ok = res.status === 201;
    record({ group: 'TrustW', name: 'withdrawal within balance', method: 'POST', path, expected: '201', status: res.status, latencyMs, pass: ok, skipped: false, body: { id: res.body?.id } });
    expect(res.status).toBe(201);
  });

  it('POST /trust/transactions — WITHDRAWAL exceeding balance → 422 (INSUFFICIENT_TRUST_ACCOUNT_BALANCE)', async () => {
    if (!createdTrustAccountId || !clientId) { recordSkip('overdraw', 'POST', '/api/v1/trust/transactions', '422', 0, 0, 'account/client not resolved', null); return; }
    const path = '/api/v1/trust/transactions';
    const { res, latencyMs } = await post(path, {
      trustAccountId: createdTrustAccountId, clientId, matterId: matterId ?? undefined,
      transactionType: 'WITHDRAWAL', amount: '9999999.00',
      transactionDate: new Date().toISOString(), reference: `WDX-${stamp}`,
      description: 'cert overdraw attempt',
    });
    // Account-level overdraw guard (4180794) throws 422; envelope surfaces REQUEST_FAILED.
    const ok = res.status === 422;
    record({ group: 'TrustW', name: 'withdrawal overdraw blocked', method: 'POST', path, expected: '422 overdraw', status: res.status, latencyMs, pass: ok, skipped: false, body: res.body });
    expect(res.status).toBe(422);
    expect(res.body?.success).not.toBe(true);
    expect(res.body?.code).toBe('REQUEST_FAILED');
  });

  it('POST /trust/transfers/to-office — transfer to office → 201', async () => {
    if (!createdTrustAccountId || !clientId || !matterId) { recordSkip('transfer to office', 'POST', '/api/v1/trust/transfers/to-office', '201', 0, 0, 'account/client/matter not resolved', null); return; }
    const path = '/api/v1/trust/transfers/to-office';
    const { res, latencyMs } = await post(path, {
      trustAccountId: createdTrustAccountId, clientId, matterId,
      amount: '1000.00', reference: `TRF-${stamp}`,
      description: 'cert transfer to office',
      transactionDate: new Date().toISOString(),
    });
    const ok = res.status === 201;
    record({ group: 'TrustW', name: 'transfer to office', method: 'POST', path, expected: '201', status: res.status, latencyMs, pass: ok, skipped: false, body: { id: res.body?.id } });
    expect(res.status).toBe(201);
    expect(res.body).toBeTruthy();
  });

  it('POST /trust/interest — post interest → 201', async () => {
    if (!createdTrustAccountId || !clientId) { recordSkip('post interest', 'POST', '/api/v1/trust/interest', '201', 0, 0, 'account/client not resolved', null); return; }
    const path = '/api/v1/trust/interest';
    const { res, latencyMs } = await post(path, {
      trustAccountId: createdTrustAccountId, clientId, matterId: matterId ?? undefined,
      amount: '50.00', transactionDate: new Date().toISOString(),
      reference: `INT-${stamp}`, description: 'cert interest posting',
    });
    const ok = res.status === 201;
    record({ group: 'TrustW', name: 'post interest', method: 'POST', path, expected: '201', status: res.status, latencyMs, pass: ok, skipped: false, body: { id: res.body?.id } });
    expect(res.status).toBe(201);
    expect(res.body).toBeTruthy();
  });
});

describe('GROUP 7 — Trust write guards / validation', () => {
  it('POST /trust/transactions — no token → 401', async () => {
    const path = '/api/v1/trust/transactions';
    const { res, latencyMs } = await post(path, {
      trustAccountId: createdTrustAccountId ?? 'x', clientId: clientId ?? 'x',
      transactionType: 'DEPOSIT', amount: '1.00',
      transactionDate: new Date().toISOString(), reference: `NOAUTH-${stamp}`,
    }, false);
    record({ group: 'TrustW', name: 'transactions no token', method: 'POST', path, expected: '401', status: res.status, latencyMs, pass: res.status === 401, skipped: false, body: res.body });
    expect(res.status).toBe(401);
    expect(res.body?.success).not.toBe(true);
  });

  it('POST /trust/transactions — invalid transactionType → 400 VALIDATION_ERROR', async () => {
    const path = '/api/v1/trust/transactions';
    const { res, latencyMs } = await post(path, {
      trustAccountId: createdTrustAccountId ?? 'x', clientId: clientId ?? 'x', matterId: matterId ?? undefined,
      transactionType: 'NOT_A_REAL_TYPE', amount: '10.00',
      transactionDate: new Date().toISOString(), reference: `BADTYPE-${stamp}`,
    });
    const ok = res.status === 400 && res.body?.code === 'VALIDATION_ERROR';
    record({ group: 'TrustW', name: 'invalid transactionType', method: 'POST', path, expected: '400 VALIDATION_ERROR', status: res.status, latencyMs, pass: ok, skipped: false, body: res.body });
    expect(res.status).toBe(400);
    expect(res.body?.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body?.details)).toBe(true);
  });
});

afterAll(() => {
  const total = evidence.length;
  const skipped = evidence.filter((e) => e.skipped).length;
  const failed = evidence.filter((e) => !e.pass).length;
  const passed = evidence.filter((e) => e.pass && !e.skipped).length;
  // eslint-disable-next-line no-console
  console.log(`[Trust writes] passed=${passed} failed=${failed} skipped=${skipped} total=${total}`);
});
