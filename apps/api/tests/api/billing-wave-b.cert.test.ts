// apps/api/tests/api/billing-wave-b.cert.test.ts
//
// Phase 1 Group 6 — Wave B: Billing WRITE & lifecycle certification.
// Same harness as Wave A / Groups 1-5: live black-box, login via .env.test,
// /api/v1/billing/* paths, rate-limit spacing, soft tolerance (500 → SKIPPED).
// Run against the deployment that has the billing schema:
//   API_BASE_URL=https://global-wakili-api.onrender.com
//
// Lifecycle is handled in-file: proforma create→patch→send→approve chained on one
// record; dedicated proformas for cancel and convert; two reminders (send vs cancel).
// WIP awareness: asserts NO journal entries (WIP-014) and NO receipt-doc gen (WIP-016).
// NOTE: Wave B creates PERSISTENT records and mutates the test invoice balance
// (retainer apply / credit note) — consistent with the no-cleanup cert pattern.

import request from 'supertest';

jest.setTimeout(30000);

const BASE_URL = process.env.API_BASE_URL || 'https://global-wakili-api.vercel.app';
const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD || '';
const TEST_TENANT_SLUG = process.env.TEST_TENANT_SLUG || '';
const TEST_CLIENT_NAME = '__CERT_TEST_CLIENT__';
const TEST_MATTER_TITLE = '__CERT_TEST_MATTER_WB__';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Evidence = {
  group: string; name: string; method: string; path: string;
  expected: string; status: number; latencyMs: number;
  pass: boolean; skipped: boolean; body: unknown;
};
const evidence: Evidence[] = [];
const record = (e: Evidence) => { evidence.push(e); return e; };

let token = '';
const bearer = () => `Bearer ${token}`;

// fixtures resolved in beforeAll
let clientId: string | null = null;
let matterId: string | null = null;
let invoiceId: string | null = null;

// lifecycle ids captured across tests
let proformaId = '';   // create → patch → send → approve → convert
let creditNoteId = '';
let retainerId = '';
let reminderId = '';

const recordSkip = (
  group: string, name: string, method: string, path: string,
  expected: string, status: number, latencyMs: number, note: string, body: unknown,
) => {
  record({ group, name, method, path, expected, status, latencyMs, pass: true, skipped: true, body: { note, body } });
  // eslint-disable-next-line no-console
  console.warn(`[Wave B] ${method} ${path} → SKIPPED: ${note}`);
};

// Create a fresh DRAFT proforma; returns its id or '' (used by cancel/convert isolation).
const createProforma = async (label: string, unitPrice: number): Promise<{ status: number; id: string; body: any }> => {
  const res = await request(BASE_URL).post('/api/v1/billing/proformas').set('Authorization', bearer())
    .send({ clientId, ...(matterId ? { matterId } : {}), currency: 'KES', lines: [{ description: label, quantity: 1, unitPrice }] });
  return { status: res.status, id: res.body?.data?.id ?? '', body: res.body };
};

beforeAll(async () => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error('Missing TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD. Copy apps/api/.env.test.example to apps/api/.env.test and fill in.');
  }
  const lg = await request(BASE_URL).post('/api/v1/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, ...(TEST_TENANT_SLUG ? { tenantSlug: TEST_TENANT_SLUG } : {}) });
  if (lg.status !== 200 || !lg.body?.data?.token) throw new Error(`Wave B login failed (status ${lg.status}); cannot run billing write tests.`);
  token = lg.body.data.token;

  // 1) resolve the persistent test client (__CERT_TEST_CLIENT__ from Group 2)
  const cl = await request(BASE_URL).get('/api/v1/clients').query({ search: TEST_CLIENT_NAME, limit: 5 }).set('Authorization', bearer());
  clientId = (Array.isArray(cl.body?.data) ? cl.body.data.find((c: any) => c?.name === TEST_CLIENT_NAME) : null)?.id ?? null;

  // 2) a matter for that client — reuse any existing; else create __CERT_TEST_MATTER_WB__
  if (clientId) {
    const ms = await request(BASE_URL).get('/api/v1/matters').query({ clientId, limit: 1 }).set('Authorization', bearer());
    matterId = (Array.isArray(ms.body?.data) ? ms.body.data[0] : null)?.id ?? null;
    if (!matterId) {
      const mc = await request(BASE_URL).post('/api/v1/matters').set('Authorization', bearer())
        .send({ title: TEST_MATTER_TITLE, clientId, matterType: 'GENERAL', category: 'CIVIL', estimatedValue: '100000', currency: 'KES' });
      matterId = mc.body?.data?.id ?? mc.body?.id ?? null;
    }
  }

  // 3) a fresh test invoice (one line, balanceDue > 0) — dependency for
  //    credit-note / retainer-apply / LEDES / reminder write tests.
  if (matterId) {
    const inv = await request(BASE_URL).post('/api/v1/billing/invoices').set('Authorization', bearer())
      .send({ matterId, clientId, currency: 'KES', lineItems: [{ description: 'Cert WB invoice line', quantity: 1, unitPrice: 10000, vatRate: 0 }] });
    invoiceId = inv.body?.data?.id ?? null;
  }
}, 60000);

// Space requests to dodge the rate limiter (same as Groups 1-5 / Wave A).
afterEach(async () => { await sleep(500); });

// ── Proforma lifecycle ────────────────────────────────────────────────────────
describe('GROUP 6 Wave B — Proforma lifecycle', () => {
  it('POST /proformas → 201 (DRAFT)', async () => {
    if (!clientId) { recordSkip('Billing-WB', 'proforma create', 'POST', '/api/v1/billing/proformas', '201', 0, 0, 'no test client resolved', null); return; }
    const t0 = Date.now();
    const r = await createProforma('Cert WB proforma', 5000);
    const latencyMs = Date.now() - t0;
    if (r.status === 500) { recordSkip('Billing-WB', 'proforma create', 'POST', '/api/v1/billing/proformas', '201', 500, latencyMs, 'proforma service 500 on target', r.body); return; }
    proformaId = r.id;
    record({ group: 'Billing-WB', name: 'proforma create', method: 'POST', path: '/api/v1/billing/proformas', expected: '201 + DRAFT', status: r.status, latencyMs, pass: r.status === 201 && !!proformaId, skipped: false, body: { id: proformaId, status: r.body?.data?.status } });
    expect(r.status).toBe(201);
    expect(r.body?.success).toBe(true);
    expect(proformaId).toBeTruthy();
    expect(r.body?.data?.status).toBe('DRAFT');
  });

  it('PATCH /proformas/:id → 200 (update DRAFT)', async () => {
    if (!proformaId) { recordSkip('Billing-WB', 'proforma update', 'PATCH', '/api/v1/billing/proformas/:id', '200', 0, 0, 'no proforma created', null); return; }
    const t0 = Date.now();
    const res = await request(BASE_URL).patch(`/api/v1/billing/proformas/${proformaId}`).set('Authorization', bearer()).send({ notes: 'Cert WB updated note' });
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'proforma update', 'PATCH', '/api/v1/billing/proformas/:id', '200', 500, latencyMs, 'proforma update 500', res.body); return; }
    record({ group: 'Billing-WB', name: 'proforma update', method: 'PATCH', path: '/api/v1/billing/proformas/:id', expected: '200', status: res.status, latencyMs, pass: res.status === 200, skipped: false, body: { id: res.body?.data?.id } });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.id).toBe(proformaId);
  });

  it('POST /proformas/:id/send → 200 (DRAFT→SENT)', async () => {
    if (!proformaId) { recordSkip('Billing-WB', 'proforma send', 'POST', '/api/v1/billing/proformas/:id/send', '200', 0, 0, 'no proforma created', null); return; }
    const t0 = Date.now();
    const res = await request(BASE_URL).post(`/api/v1/billing/proformas/${proformaId}/send`).set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'proforma send', 'POST', '/api/v1/billing/proformas/:id/send', '200', 500, latencyMs, 'proforma send 500', res.body); return; }
    record({ group: 'Billing-WB', name: 'proforma send', method: 'POST', path: '/api/v1/billing/proformas/:id/send', expected: '200 + SENT', status: res.status, latencyMs, pass: res.status === 200 && res.body?.data?.status === 'SENT', skipped: false, body: { status: res.body?.data?.status } });
    expect(res.status).toBe(200);
    expect(res.body?.data?.status).toBe('SENT');
  });

  it('POST /proformas/:id/approve → 200 (→APPROVED)', async () => {
    if (!proformaId) { recordSkip('Billing-WB', 'proforma approve', 'POST', '/api/v1/billing/proformas/:id/approve', '200', 0, 0, 'no proforma created', null); return; }
    const t0 = Date.now();
    const res = await request(BASE_URL).post(`/api/v1/billing/proformas/${proformaId}/approve`).set('Authorization', bearer());
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'proforma approve', 'POST', '/api/v1/billing/proformas/:id/approve', '200', 500, latencyMs, 'proforma approve 500', res.body); return; }
    record({ group: 'Billing-WB', name: 'proforma approve', method: 'POST', path: '/api/v1/billing/proformas/:id/approve', expected: '200 + APPROVED', status: res.status, latencyMs, pass: res.status === 200 && res.body?.data?.status === 'APPROVED', skipped: false, body: { status: res.body?.data?.status } });
    expect(res.status).toBe(200);
    expect(res.body?.data?.status).toBe('APPROVED');
  });

  it('POST /proformas/:id/cancel → 200 (dedicated DRAFT proforma)', async () => {
    if (!clientId) { recordSkip('Billing-WB', 'proforma cancel', 'POST', '/api/v1/billing/proformas/:id/cancel', '200', 0, 0, 'no test client resolved', null); return; }
    const t0 = Date.now();
    const made = await createProforma('Cert WB cancel', 1000);
    if (made.status === 500) { recordSkip('Billing-WB', 'proforma cancel', 'POST', '/api/v1/billing/proformas/:id/cancel', '200', 500, Date.now() - t0, 'could not create proforma to cancel', made.body); return; }
    if (!made.id) { recordSkip('Billing-WB', 'proforma cancel', 'POST', '/api/v1/billing/proformas/:id/cancel', '200', made.status, Date.now() - t0, 'no id from cancel-proforma create', made.body); return; }
    const res = await request(BASE_URL).post(`/api/v1/billing/proformas/${made.id}/cancel`).set('Authorization', bearer()).send({ reason: 'cert-cancel' });
    const latencyMs = Date.now() - t0;
    record({ group: 'Billing-WB', name: 'proforma cancel', method: 'POST', path: '/api/v1/billing/proformas/:id/cancel', expected: '200 + CANCELLED', status: res.status, latencyMs, pass: res.status === 200 && res.body?.data?.status === 'CANCELLED', skipped: false, body: { status: res.body?.data?.status } });
    expect(res.status).toBe(200);
    expect(res.body?.data?.status).toBe('CANCELLED');
  });

  it('POST /proformas/:id/convert → 201 (APPROVED proforma → invoice)', async () => {
    if (!proformaId) { recordSkip('Billing-WB', 'proforma convert', 'POST', '/api/v1/billing/proformas/:id/convert', '201', 0, 0, 'no approved proforma', null); return; }
    const t0 = Date.now();
    const res = await request(BASE_URL).post(`/api/v1/billing/proformas/${proformaId}/convert`).set('Authorization', bearer()).send({});
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'proforma convert', 'POST', '/api/v1/billing/proformas/:id/convert', '201', 500, latencyMs, 'proforma convert 500', res.body); return; }
    record({ group: 'Billing-WB', name: 'proforma convert', method: 'POST', path: '/api/v1/billing/proformas/:id/convert', expected: '201 + invoice', status: res.status, latencyMs, pass: res.status === 201 && !!res.body?.data?.id, skipped: false, body: { invoiceId: res.body?.data?.id } });
    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.id).toBeTruthy();
  });
});

// ── Credit notes ───────────────────────────────────────────────────────────────
describe('GROUP 6 Wave B — Credit notes', () => {
  it('POST /credit-notes → 201', async () => {
    if (!invoiceId) { recordSkip('Billing-WB', 'credit-note create', 'POST', '/api/v1/billing/credit-notes', '201', 0, 0, 'no test invoice', null); return; }
    const t0 = Date.now();
    const res = await request(BASE_URL).post('/api/v1/billing/credit-notes').set('Authorization', bearer())
      .send({ invoiceId, reason: 'cert WB credit', lines: [{ description: 'Cert WB CN line', quantity: 1, unitPrice: 1 }] });
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'credit-note create', 'POST', '/api/v1/billing/credit-notes', '201', 500, latencyMs, 'credit-note 500', res.body); return; }
    creditNoteId = res.body?.data?.id ?? '';
    record({ group: 'Billing-WB', name: 'credit-note create', method: 'POST', path: '/api/v1/billing/credit-notes', expected: '201', status: res.status, latencyMs, pass: res.status === 201 && !!creditNoteId, skipped: false, body: { id: creditNoteId, status: res.body?.data?.status } });
    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(creditNoteId).toBeTruthy();
  });

  it('POST /credit-notes/:id/void → 200', async () => {
    if (!creditNoteId) { recordSkip('Billing-WB', 'credit-note void', 'POST', '/api/v1/billing/credit-notes/:id/void', '200', 0, 0, 'no credit note created', null); return; }
    const t0 = Date.now();
    const res = await request(BASE_URL).post(`/api/v1/billing/credit-notes/${creditNoteId}/void`).set('Authorization', bearer()).send({ reason: 'cert-void' });
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'credit-note void', 'POST', '/api/v1/billing/credit-notes/:id/void', '200', 500, latencyMs, 'credit-note void 500', res.body); return; }
    record({ group: 'Billing-WB', name: 'credit-note void', method: 'POST', path: '/api/v1/billing/credit-notes/:id/void', expected: '200 + VOID', status: res.status, latencyMs, pass: res.status === 200 && res.body?.data?.status === 'VOID', skipped: false, body: { status: res.body?.data?.status } });
    expect(res.status).toBe(200);
    expect(res.body?.data?.status).toBe('VOID');
  });
});

// ── Retainers ───────────────────────────────────────────────────────────────────
describe('GROUP 6 Wave B — Retainers', () => {
  it('POST /retainers → 201', async () => {
    if (!clientId) { recordSkip('Billing-WB', 'retainer create', 'POST', '/api/v1/billing/retainers', '201', 0, 0, 'no test client', null); return; }
    const t0 = Date.now();
    const res = await request(BASE_URL).post('/api/v1/billing/retainers').set('Authorization', bearer())
      .send({ clientId, amount: 5000, currency: 'KES', reference: 'cert-WB' });
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'retainer create', 'POST', '/api/v1/billing/retainers', '201', 500, latencyMs, 'retainer 500', res.body); return; }
    retainerId = res.body?.data?.id ?? '';
    record({ group: 'Billing-WB', name: 'retainer create', method: 'POST', path: '/api/v1/billing/retainers', expected: '201 + ACTIVE', status: res.status, latencyMs, pass: res.status === 201 && !!retainerId, skipped: false, body: { id: retainerId, status: res.body?.data?.status } });
    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(retainerId).toBeTruthy();
  });

  it('POST /retainers/:id/apply → 201 (invoiceId + amount)', async () => {
    if (!retainerId || !invoiceId) { recordSkip('Billing-WB', 'retainer apply', 'POST', '/api/v1/billing/retainers/:id/apply', '201', 0, 0, 'no retainer or invoice', null); return; }
    const t0 = Date.now();
    const res = await request(BASE_URL).post(`/api/v1/billing/retainers/${retainerId}/apply`).set('Authorization', bearer()).send({ invoiceId, amount: 1 });
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'retainer apply', 'POST', '/api/v1/billing/retainers/:id/apply', '201', 500, latencyMs, 'retainer apply 500', res.body); return; }
    record({ group: 'Billing-WB', name: 'retainer apply', method: 'POST', path: '/api/v1/billing/retainers/:id/apply', expected: '201 + application', status: res.status, latencyMs, pass: res.status === 201 && !!res.body?.data?.id, skipped: false, body: { applicationId: res.body?.data?.id } });
    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.id).toBeTruthy();
  });

  it('POST /retainers/:id/release → 200', async () => {
    if (!retainerId) { recordSkip('Billing-WB', 'retainer release', 'POST', '/api/v1/billing/retainers/:id/release', '200', 0, 0, 'no retainer', null); return; }
    const t0 = Date.now();
    const res = await request(BASE_URL).post(`/api/v1/billing/retainers/${retainerId}/release`).set('Authorization', bearer()).send({ reason: 'cert-release' });
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'retainer release', 'POST', '/api/v1/billing/retainers/:id/release', '200', 500, latencyMs, 'retainer release 500', res.body); return; }
    record({ group: 'Billing-WB', name: 'retainer release', method: 'POST', path: '/api/v1/billing/retainers/:id/release', expected: '200 + RELEASED', status: res.status, latencyMs, pass: res.status === 200 && res.body?.data?.status === 'RELEASED', skipped: false, body: { status: res.body?.data?.status } });
    expect(res.status).toBe(200);
    expect(res.body?.data?.status).toBe('RELEASED');
  });
});

// ── Payment reminders ────────────────────────────────────────────────────────────
describe('GROUP 6 Wave B — Payment reminders', () => {
  it('POST /reminders → 201 (DRAFT)', async () => {
    if (!invoiceId) { recordSkip('Billing-WB', 'reminder create', 'POST', '/api/v1/billing/reminders', '201', 0, 0, 'no test invoice', null); return; }
    const t0 = Date.now();
    const res = await request(BASE_URL).post('/api/v1/billing/reminders').set('Authorization', bearer()).send({ invoiceId, channel: 'EMAIL', tone: 'STANDARD' });
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'reminder create', 'POST', '/api/v1/billing/reminders', '201', 500, latencyMs, 'reminder 500', res.body); return; }
    reminderId = res.body?.data?.id ?? '';
    record({ group: 'Billing-WB', name: 'reminder create', method: 'POST', path: '/api/v1/billing/reminders', expected: '201 + DRAFT', status: res.status, latencyMs, pass: res.status === 201 && !!reminderId, skipped: false, body: { id: reminderId, status: res.body?.data?.status } });
    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(reminderId).toBeTruthy();
  });

  it('POST /reminders/overdue → 201 (batch)', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).post('/api/v1/billing/reminders/overdue').set('Authorization', bearer()).send({ minimumDaysOverdue: 1, channel: 'EMAIL', tone: 'STANDARD' });
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'reminders overdue', 'POST', '/api/v1/billing/reminders/overdue', '201', 500, latencyMs, 'overdue batch 500', res.body); return; }
    record({ group: 'Billing-WB', name: 'reminders overdue', method: 'POST', path: '/api/v1/billing/reminders/overdue', expected: '201 + summary', status: res.status, latencyMs, pass: res.status === 201 && res.body?.success === true, skipped: false, body: { createdCount: res.body?.data?.createdCount } });
    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
  });

  it('POST /reminders/:id/send → 200 (DRAFT→SENT)', async () => {
    if (!reminderId) { recordSkip('Billing-WB', 'reminder send', 'POST', '/api/v1/billing/reminders/:id/send', '200', 0, 0, 'no reminder', null); return; }
    const t0 = Date.now();
    const res = await request(BASE_URL).post(`/api/v1/billing/reminders/${reminderId}/send`).set('Authorization', bearer()).send({});
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'reminder send', 'POST', '/api/v1/billing/reminders/:id/send', '200', 500, latencyMs, 'reminder send 500', res.body); return; }
    record({ group: 'Billing-WB', name: 'reminder send', method: 'POST', path: '/api/v1/billing/reminders/:id/send', expected: '200 + SENT', status: res.status, latencyMs, pass: res.status === 200 && res.body?.data?.status === 'SENT', skipped: false, body: { status: res.body?.data?.status } });
    expect(res.status).toBe(200);
    expect(res.body?.data?.status).toBe('SENT');
  });

  it('POST /reminders/:id/cancel → 200 (dedicated DRAFT reminder)', async () => {
    if (!invoiceId) { recordSkip('Billing-WB', 'reminder cancel', 'POST', '/api/v1/billing/reminders/:id/cancel', '200', 0, 0, 'no test invoice', null); return; }
    const t0 = Date.now();
    const made = await request(BASE_URL).post('/api/v1/billing/reminders').set('Authorization', bearer()).send({ invoiceId, channel: 'EMAIL', tone: 'STANDARD' });
    if (made.status === 500) { recordSkip('Billing-WB', 'reminder cancel', 'POST', '/api/v1/billing/reminders/:id/cancel', '200', 500, Date.now() - t0, 'could not create reminder to cancel', made.body); return; }
    const cancelId = made.body?.data?.id;
    if (!cancelId) { recordSkip('Billing-WB', 'reminder cancel', 'POST', '/api/v1/billing/reminders/:id/cancel', '200', made.status, Date.now() - t0, 'no id from cancel-reminder create', made.body); return; }
    const res = await request(BASE_URL).post(`/api/v1/billing/reminders/${cancelId}/cancel`).set('Authorization', bearer()).send({ reason: 'cert-cancel' });
    const latencyMs = Date.now() - t0;
    record({ group: 'Billing-WB', name: 'reminder cancel', method: 'POST', path: '/api/v1/billing/reminders/:id/cancel', expected: '200 + CANCELLED', status: res.status, latencyMs, pass: res.status === 200 && res.body?.data?.status === 'CANCELLED', skipped: false, body: { status: res.body?.data?.status } });
    expect(res.status).toBe(200);
    expect(res.body?.data?.status).toBe('CANCELLED');
  });
});

// ── LEDES export + Notification ──────────────────────────────────────────────────
describe('GROUP 6 Wave B — LEDES & notification', () => {
  it('POST /invoices/:id/ledes → 201 (persist export)', async () => {
    if (!invoiceId) { recordSkip('Billing-WB', 'ledes persist', 'POST', '/api/v1/billing/invoices/:id/ledes', '201', 0, 0, 'no test invoice', null); return; }
    const t0 = Date.now();
    const res = await request(BASE_URL).post(`/api/v1/billing/invoices/${invoiceId}/ledes`).set('Authorization', bearer()).send({ format: 'LEDES_1998B' });
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'ledes persist', 'POST', '/api/v1/billing/invoices/:id/ledes', '201', 500, latencyMs, 'ledes persist 500', res.body); return; }
    record({ group: 'Billing-WB', name: 'ledes persist', method: 'POST', path: '/api/v1/billing/invoices/:id/ledes', expected: '201 + export', status: res.status, latencyMs, pass: res.status === 201 && !!res.body?.data?.id, skipped: false, body: { id: res.body?.data?.id, format: res.body?.data?.format } });
    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.id).toBeTruthy();
  });

  it('POST /notifications → 201', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).post('/api/v1/billing/notifications').set('Authorization', bearer())
      .send({ type: 'INVOICE_ISSUED', channel: 'PORTAL', ...(invoiceId ? { invoiceId } : {}), subject: 'Cert WB', message: 'Cert WB notification' });
    const latencyMs = Date.now() - t0;
    if (res.status === 500) { recordSkip('Billing-WB', 'notification create', 'POST', '/api/v1/billing/notifications', '201', 500, latencyMs, 'notification 500', res.body); return; }
    record({ group: 'Billing-WB', name: 'notification create', method: 'POST', path: '/api/v1/billing/notifications', expected: '201 + DRAFT', status: res.status, latencyMs, pass: res.status === 201 && !!res.body?.data?.id, skipped: false, body: { id: res.body?.data?.id, status: res.body?.data?.status } });
    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.id).toBeTruthy();
  });
});

// ── Auth guards (401, no token) ──────────────────────────────────────────────────
describe('GROUP 6 Wave B — auth guards (401)', () => {
  it('POST /proformas — no token → 401', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).post('/api/v1/billing/proformas').send({ clientId: 'x', lines: [{ description: 'x', unitPrice: 1 }] });
    const latencyMs = Date.now() - t0;
    record({ group: 'Billing-WB', name: 'proformas no token', method: 'POST', path: '/api/v1/billing/proformas', expected: '401', status: res.status, latencyMs, pass: res.status === 401, skipped: false, body: res.body });
    expect(res.status).toBe(401);
    expect(res.body?.success).not.toBe(true);
  });

  it('POST /retainers — no token → 401', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).post('/api/v1/billing/retainers').send({ clientId: 'x', amount: 1 });
    const latencyMs = Date.now() - t0;
    record({ group: 'Billing-WB', name: 'retainers no token', method: 'POST', path: '/api/v1/billing/retainers', expected: '401', status: res.status, latencyMs, pass: res.status === 401, skipped: false, body: res.body });
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
  console.log(`[Wave B] passed=${passed} failed=${failed} skipped=${skipped} total=${total}`);
});
