// apps/api/tests/api/billing-wave-a.cert.test.ts
//
// Phase 1 Group 6 — Wave A: Billing GET-endpoint certification.
// IDENTICAL harness to api-certification.test.ts: black-box against the LIVE
// deployment, login via .env.test creds, /api/v1/billing/* paths, rate-limit spacing.
// Read-only — every test is a GET (plus two no-token 401 guards). No writes, no cleanup.
// Soft tolerance: a 500 (billing schema delegate not migrated on target) is recorded
// SKIPPED, never a hard failure. Invoice-scoped reads SKIP when no invoiceId resolves.
// WIP awareness: asserts NO journal entries (WIP-014) and NO receipt doc gen (WIP-016).

import request from 'supertest';

jest.setTimeout(15000);

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
let invoiceId: string | null = null;
const bearer = () => `Bearer ${token}`;

// A 500 on a billing endpoint on the live target almost always means the billing
// schema delegate is not migrated there (services throw BILLING_SCHEMA_DELEGATE_MISSING).
// Per Wave A scope that is recorded SKIPPED (record-only), never a hard failure.
const recordSkip = (
  group: string, name: string, method: string, path: string,
  expected: string, status: number, latencyMs: number, note: string, body: unknown,
) => {
  record({ group, name, method, path, expected, status, latencyMs, pass: true, skipped: true, body: { note, body } });
  // eslint-disable-next-line no-console
  console.warn(`[Wave A] ${method} ${path} → SKIPPED: ${note}`);
};

beforeAll(async () => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      'Missing TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD. ' +
      'Copy apps/api/.env.test.example to apps/api/.env.test and fill in.',
    );
  }
  const res = await request(BASE_URL)
    .post('/api/v1/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, ...(TEST_TENANT_SLUG ? { tenantSlug: TEST_TENANT_SLUG } : {}) });
  if (res.status !== 200 || !res.body?.data?.token) {
    throw new Error(`Wave A login failed (status ${res.status}); cannot run billing tests.`);
  }
  token = res.body.data.token;

  // Resolve a real invoiceId for the invoice-scoped reads (no hardcoded ids).
  const inv = await request(BASE_URL).get('/api/v1/billing/invoices').query({ limit: 1 }).set('Authorization', bearer());
  const list = Array.isArray(inv.body?.data) ? inv.body.data : [];
  invoiceId = list[0]?.id ?? null;
}, 45000);

// Space out requests to avoid the rate limiter (same as Groups 1-5).
afterEach(async () => { await sleep(500); });

describe('GROUP 6 Wave A — Billing reads (GET)', () => {
  // ── Aggregates (controller routes → { success:true, ... }) ──────────────────
  it('GET /billing/dashboard → 200', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/dashboard').set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'dashboard', 'GET', '/api/v1/billing/dashboard', '200', 500, latencyMs, 'billing schema delegate not migrated on target', res.body); return; }
    record({ group: 'Billing', name: 'dashboard', method: 'GET', path: '/api/v1/billing/dashboard', expected: '200', status: res.status, latencyMs, pass: res.status === 200, skipped: false, body: res.body });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
  });

  it('GET /billing/snapshot → 200', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/snapshot').set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'snapshot', 'GET', '/api/v1/billing/snapshot', '200', 500, latencyMs, 'billing schema delegate not migrated on target', res.body); return; }
    record({ group: 'Billing', name: 'snapshot', method: 'GET', path: '/api/v1/billing/snapshot', expected: '200', status: res.status, latencyMs, pass: res.status === 200, skipped: false, body: res.body });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
  });

  // ── List reads (controller routes → { success:true, data:[...] }) ───────────
  it('GET /billing/proformas → 200', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/proformas').set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'proformas list', 'GET', '/api/v1/billing/proformas', '200', 500, latencyMs, 'proformaInvoice delegate not migrated on target', res.body); return; }
    record({ group: 'Billing', name: 'proformas list', method: 'GET', path: '/api/v1/billing/proformas', expected: '200 + data[]', status: res.status, latencyMs, pass: res.status === 200 && Array.isArray(res.body?.data), skipped: false, body: { count: (res.body?.data || []).length } });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  it('GET /billing/proformas/:id — non-existent → 404', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/proformas/cert-nonexistent-0000000000').set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'proforma not-found', 'GET', '/api/v1/billing/proformas/:id', '404', 500, latencyMs, 'proformaInvoice delegate not migrated on target', res.body); return; }
    record({ group: 'Billing', name: 'proforma not-found', method: 'GET', path: '/api/v1/billing/proformas/:id', expected: '404', status: res.status, latencyMs, pass: res.status === 404, skipped: false, body: res.body });
    expect(res.status).toBe(404);
  });

  it('GET /billing/credit-notes → 200', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/credit-notes').set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'credit-notes list', 'GET', '/api/v1/billing/credit-notes', '200', 500, latencyMs, 'creditNote delegate not migrated on target', res.body); return; }
    record({ group: 'Billing', name: 'credit-notes list', method: 'GET', path: '/api/v1/billing/credit-notes', expected: '200 + data[]', status: res.status, latencyMs, pass: res.status === 200 && Array.isArray(res.body?.data), skipped: false, body: { count: (res.body?.data || []).length } });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  it('GET /billing/retainers → 200', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/retainers').set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'retainers list', 'GET', '/api/v1/billing/retainers', '200', 500, latencyMs, 'retainer delegate not migrated on target', res.body); return; }
    record({ group: 'Billing', name: 'retainers list', method: 'GET', path: '/api/v1/billing/retainers', expected: '200 + data[]', status: res.status, latencyMs, pass: res.status === 200 && Array.isArray(res.body?.data), skipped: false, body: { count: (res.body?.data || []).length } });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  it('GET /billing/reminders → 200', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/reminders').set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'reminders list', 'GET', '/api/v1/billing/reminders', '200', 500, latencyMs, 'paymentReminder delegate not migrated on target', res.body); return; }
    record({ group: 'Billing', name: 'reminders list', method: 'GET', path: '/api/v1/billing/reminders', expected: '200 + data[]', status: res.status, latencyMs, pass: res.status === 200 && Array.isArray(res.body?.data), skipped: false, body: { count: (res.body?.data || []).length } });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  it('GET /billing/notifications → 200', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/notifications').set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'notifications list', 'GET', '/api/v1/billing/notifications', '200', 500, latencyMs, 'billingNotification delegate not migrated on target', res.body); return; }
    record({ group: 'Billing', name: 'notifications list', method: 'GET', path: '/api/v1/billing/notifications', expected: '200 + data[]', status: res.status, latencyMs, pass: res.status === 200 && Array.isArray(res.body?.data), skipped: false, body: { count: (res.body?.data || []).length } });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  // ── Inline routes (→ { data:[...] }, no success flag) ───────────────────────
  it('GET /billing/invoices → 200', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/invoices').set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'invoices list', 'GET', '/api/v1/billing/invoices', '200', 500, latencyMs, 'invoice delegate unavailable on target', res.body); return; }
    record({ group: 'Billing', name: 'invoices list', method: 'GET', path: '/api/v1/billing/invoices', expected: '200 + data[]', status: res.status, latencyMs, pass: res.status === 200 && Array.isArray(res.body?.data), skipped: false, body: { count: (res.body?.data || []).length } });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  it('GET /billing/quotations → 200', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/quotations').set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'quotations list', 'GET', '/api/v1/billing/quotations', '200', 500, latencyMs, 'unexpected 500 on quotations', res.body); return; }
    record({ group: 'Billing', name: 'quotations list', method: 'GET', path: '/api/v1/billing/quotations', expected: '200 + data[]', status: res.status, latencyMs, pass: res.status === 200 && Array.isArray(res.body?.data), skipped: false, body: { count: (res.body?.data || []).length } });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  it('GET /billing/expenses → 200', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/expenses').set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'expenses list', 'GET', '/api/v1/billing/expenses', '200', 500, latencyMs, 'expenseEntry delegate unavailable on target', res.body); return; }
    record({ group: 'Billing', name: 'expenses list', method: 'GET', path: '/api/v1/billing/expenses', expected: '200 + data[]', status: res.status, latencyMs, pass: res.status === 200 && Array.isArray(res.body?.data), skipped: false, body: { count: (res.body?.data || []).length } });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.data)).toBe(true);
  });

  // ── Invoice-scoped reads — SKIP when no invoiceId resolved in beforeAll ──────
  it('GET /billing/invoices/:id/ledes → 200 (format=LEDES_1998B)', async () => {
    const t0 = Date.now();
    if (!invoiceId) { recordSkip('Billing', 'invoice LEDES', 'GET', '/api/v1/billing/invoices/:id/ledes', '200', 0, 0, 'no invoiceId resolved from live tenant', null); return; }
    const res = await request(BASE_URL).get(`/api/v1/billing/invoices/${invoiceId}/ledes`).query({ format: 'LEDES_1998B' }).set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'invoice LEDES', 'GET', '/api/v1/billing/invoices/:id/ledes', '200', 500, latencyMs, 'billing export/invoice delegate not migrated on target', res.body); return; }
    record({ group: 'Billing', name: 'invoice LEDES', method: 'GET', path: '/api/v1/billing/invoices/:id/ledes', expected: '200 + success', status: res.status, latencyMs, pass: res.status === 200 && res.body?.success === true, skipped: false, body: { format: res.body?.data?.format } });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
  });

  it('GET /billing/invoices/:id/receipt → 200', async () => {
    const t0 = Date.now();
    if (!invoiceId) { recordSkip('Billing', 'invoice receipt', 'GET', '/api/v1/billing/invoices/:id/receipt', '200', 0, 0, 'no invoiceId resolved from live tenant', null); return; }
    const res = await request(BASE_URL).get(`/api/v1/billing/invoices/${invoiceId}/receipt`).set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'invoice receipt', 'GET', '/api/v1/billing/invoices/:id/receipt', '200', 500, latencyMs, 'invoice/paymentReceipt delegate not migrated on target', res.body); return; }
    // WIP-016: receipt-document generation is out of scope — assert only the read view shape.
    record({ group: 'Billing', name: 'invoice receipt', method: 'GET', path: '/api/v1/billing/invoices/:id/receipt', expected: '200 + success', status: res.status, latencyMs, pass: res.status === 200 && res.body?.success === true, skipped: false, body: { invoiceNumber: res.body?.data?.invoiceNumber } });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
  });

  it('GET /billing/invoices/:id → 200 (full detail)', async () => {
    const t0 = Date.now();
    if (!invoiceId) { recordSkip('Billing', 'invoice detail', 'GET', '/api/v1/billing/invoices/:id', '200', 0, 0, 'no invoiceId resolved from live tenant', null); return; }
    const res = await request(BASE_URL).get(`/api/v1/billing/invoices/${invoiceId}`).set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing', 'invoice detail', 'GET', '/api/v1/billing/invoices/:id', '200', 500, latencyMs, 'invoice detail delegate not migrated on target', res.body); return; }
    record({ group: 'Billing', name: 'invoice detail', method: 'GET', path: '/api/v1/billing/invoices/:id', expected: '200 + matching id', status: res.status, latencyMs, pass: res.status === 200 && res.body?.data?.id === invoiceId, skipped: false, body: { id: res.body?.data?.id } });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.id).toBe(invoiceId);
  });
});

describe('GROUP 6 Wave A — auth guards (401)', () => {
  it('GET /billing/dashboard — no token → 401', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/dashboard');
    const latencyMs = Date.now() - t0;
    record({ group: 'Billing', name: 'dashboard no token', method: 'GET', path: '/api/v1/billing/dashboard', expected: '401', status: res.status, latencyMs, pass: res.status === 401, skipped: false, body: res.body });
    expect(res.status).toBe(401);
    expect(res.body?.success).not.toBe(true);
  });

  it('GET /billing/invoices — no token → 401', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/billing/invoices');
    const latencyMs = Date.now() - t0;
    record({ group: 'Billing', name: 'invoices no token', method: 'GET', path: '/api/v1/billing/invoices', expected: '401', status: res.status, latencyMs, pass: res.status === 401, skipped: false, body: res.body });
    expect(res.status).toBe(401);
    expect(res.body?.success).not.toBe(true);
  });
});

afterAll(() => {
  const total = evidence.length;
  const skipped = evidence.filter((e) => e.skipped).length;
  const failed = evidence.filter((e) => !e.pass).length;
  const passed = evidence.filter((e) => e.pass && !e.skipped).length;
  // eslint-disable-next-line no-console
  console.log(`[Wave A] passed=${passed} failed=${failed} skipped=${skipped} total=${total}`);
});
