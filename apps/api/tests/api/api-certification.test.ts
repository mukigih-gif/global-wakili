import request from 'supertest';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

jest.setTimeout(10000);

const BASE_URL = process.env.API_BASE_URL || 'https://global-wakili-api.vercel.app';
const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD || '';
const TEST_TENANT_SLUG = process.env.TEST_TENANT_SLUG || '';

// Throwaway address that must never match a real account (avoids locking the real admin).
const WRONG_EMAIL = 'test@doesnotexist-wakili.co.ke';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Evidence = {
  group: string; name: string; method: string; path: string;
  expected: string; status: number; latencyMs: number; pass: boolean; body: unknown;
};
const evidence: Evidence[] = [];
const record = (e: Evidence) => { evidence.push(e); return e; };

let authToken = '';

beforeAll(() => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      'Missing TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD. ' +
      'Copy apps/api/.env.test.example to apps/api/.env.test and fill in.',
    );
  }
});

// Space out requests to avoid the rate limiter (express-rate-limit is active).
afterEach(async () => { await sleep(500); });

describe('GROUP 1 — Auth endpoints', () => {
  it('POST /auth/login — valid credentials → 200 + token', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, ...(TEST_TENANT_SLUG ? { tenantSlug: TEST_TENANT_SLUG } : {}) });
    const latencyMs = Date.now() - t0;
    record({ group: 'Auth', name: 'login valid', method: 'POST', path: '/api/v1/auth/login',
      expected: '200 + token', status: res.status, latencyMs, pass: res.status === 200, body: res.body });

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(typeof res.body?.data?.token).toBe('string');
    expect(res.body.data.token.length).toBeGreaterThan(10);
    expect(res.body.data.tokenType).toBe('Bearer');
    expect(String(res.body.data.user.email).toLowerCase()).toBe(TEST_EMAIL.toLowerCase());
    authToken = res.body.data.token;
  });

  it('POST /auth/login — wrong password → 401', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({ email: WRONG_EMAIL, password: 'definitely-wrong-password' });
    const latencyMs = Date.now() - t0;
    record({ group: 'Auth', name: 'login wrong password', method: 'POST', path: '/api/v1/auth/login',
      expected: '401', status: res.status, latencyMs, pass: res.status === 401, body: res.body });

    expect(res.status).toBe(401);
    expect(res.body?.error).toBeDefined();
    expect(res.body?.data?.token).toBeUndefined();
    expect(res.body?.code).toBe('REQUEST_FAILED');
    expect(latencyMs).toBeLessThan(10000);
  });

  it('GET /auth/session — valid token → 200  (substitute for missing POST /auth/refresh)', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL)
      .get('/api/v1/auth/session')
      .set('Authorization', `Bearer ${authToken}`);
    const latencyMs = Date.now() - t0;
    record({ group: 'Auth', name: 'session valid token (refresh substitute)', method: 'GET', path: '/api/v1/auth/session',
      expected: '200', status: res.status, latencyMs, pass: res.status === 200, body: res.body });

    expect(authToken).not.toBe('');
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data).toBeDefined();
    expect(latencyMs).toBeLessThan(10000);
    // GAP: POST /api/v1/auth/refresh is not implemented — documented in report.
  });

  it('POST /auth/logout → 200/204 (idempotent, no auth required)', async () => {
    const t0 = Date.now();
    const withTok = await request(BASE_URL)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${authToken}`);
    const latencyMs = Date.now() - t0;
    await sleep(500);
    const noTok = await request(BASE_URL).post('/api/v1/auth/logout');
    // Live deployment returns 204 No Content (a valid success) — 200 with a JSON
    // envelope is also accepted. Only assert body.success when a 200 body is present.
    const ok = (s: number) => s === 200 || s === 204;
    record({ group: 'Auth', name: 'logout', method: 'POST', path: '/api/v1/auth/logout',
      expected: '200/204', status: withTok.status, latencyMs, pass: ok(withTok.status), body: withTok.body });

    expect(ok(withTok.status)).toBe(true);
    if (withTok.status === 200) expect(withTok.body?.success).toBe(true);
    expect(ok(noTok.status)).toBe(true);
    if (noTok.status === 200) expect(noTok.body?.success).toBe(true);
    expect(latencyMs).toBeLessThan(10000);
  });

  it('GET /auth/me — no token → 401', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/auth/me');
    const latencyMs = Date.now() - t0;
    record({ group: 'Auth', name: 'me no token', method: 'GET', path: '/api/v1/auth/me',
      expected: '401', status: res.status, latencyMs, pass: res.status === 401, body: res.body });

    expect(res.status).toBe(401);
    expect(res.body?.error ?? res.body?.message).toBeDefined();
    expect(res.body?.data?.user).toBeUndefined();
    expect(res.body?.success).not.toBe(true);
    expect(latencyMs).toBeLessThan(10000);
  });

  // ── SSO / OAuth social login ────────────────────────────────────────────────
  it('GET /auth/oauth/google — initiates flow → 302 to Google', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/auth/oauth/google').redirects(0);
    const latencyMs = Date.now() - t0;
    const loc = String(res.headers.location ?? '');
    const pass = res.status === 302 && /accounts\.google\.com/.test(loc);
    record({ group: 'SSO', name: 'google initiate', method: 'GET', path: '/api/v1/auth/oauth/google',
      expected: '302 → accounts.google.com', status: res.status, latencyMs, pass, body: { location: loc } });
    expect(res.status).toBe(302);
    expect(loc).toContain('accounts.google.com');
  });

  it('GET /auth/oauth/microsoft — initiates flow → 302 to Microsoft', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/auth/oauth/microsoft').redirects(0);
    const latencyMs = Date.now() - t0;
    const loc = String(res.headers.location ?? '');
    const pass = res.status === 302 && /login\.microsoftonline\.com/.test(loc);
    record({ group: 'SSO', name: 'microsoft initiate', method: 'GET', path: '/api/v1/auth/oauth/microsoft',
      expected: '302 → login.microsoftonline.com', status: res.status, latencyMs, pass, body: { location: loc } });
    expect(res.status).toBe(302);
    expect(loc).toContain('login.microsoftonline.com');
  });

  it('GET /auth/oauth/google/callback (registered path) — no code → 400', async () => {
    const t0 = Date.now();
    const res = await request(BASE_URL).get('/api/v1/auth/oauth/google/callback').redirects(0);
    const latencyMs = Date.now() - t0;
    record({ group: 'SSO', name: 'google callback no code', method: 'GET',
      path: '/api/v1/auth/oauth/google/callback',
      expected: '400 OAuth code required', status: res.status, latencyMs, pass: res.status === 400, body: res.body });
    expect(res.status).toBe(400);
  });

  afterAll(() => {
    const dir = join(__dirname);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const pass = evidence.filter((e) => e.pass).length;
    const lines = [
      '# API CERTIFICATION REPORT',
      '',
      `**Target:** ${BASE_URL}`,
      `**Generated:** ${new Date().toISOString()}`,
      `**Login user:** ${TEST_EMAIL || '(unset)'}`,
      '',
      '## GROUP 1 — Auth endpoints',
      '',
      `Result: **${pass}/${evidence.length} passed**`,
      '',
      '| Test | Method | Path | Expected | Status | Latency (ms) | Pass |',
      '|------|--------|------|----------|--------|--------------|------|',
      ...evidence.map((e) => `| ${e.name} | ${e.method} | ${e.path} | ${e.expected} | ${e.status} | ${e.latencyMs} | ${e.pass ? 'PASS' : 'FAIL'} |`),
      '',
      '### Notes / Gaps',
      '- `POST /api/v1/auth/refresh` is **not implemented** — substituted with `GET /api/v1/auth/session` for token validation.',
      '- Root-level `/health`, `/ping`, `/metrics` are not routed on the Vercel deployment (only `/api/*`).',
      '- **SSO path bug:** OAuth callbacks are registered at `/api/v1/auth/auth/oauth/{google,microsoft}/callback` (double `auth`) but the initiate handlers default `redirect_uri` to the single-`auth` path — a provider redirect there never reaches the handler (live observed: 401, not a successful 200/302). See `auth.controller.ts:1037,1047,1050,1126`.',
    ];
    writeFileSync(join(dir, 'API_CERTIFICATION_REPORT.md'), lines.join('\n'));
  });
});
