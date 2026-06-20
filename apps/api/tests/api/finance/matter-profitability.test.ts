// Phase 3 Group A — Matter Profitability certification (certifies ACTUAL contract).
// NOTE: v3.1 Group A assumed GET /reports/matter-profitability + rich metrics;
// reality is GET /matters/:id/profitability with a flat inline calc. See FINDING-MAT-001.
import request from 'supertest';

jest.setTimeout(30000);

const BASE_URL = process.env.API_BASE_URL || 'https://global-wakili-api.onrender.com';
const EMAIL = process.env.TEST_ADMIN_EMAIL || '';
const PASS = process.env.TEST_ADMIN_PASSWORD || '';
const SLUG = process.env.TEST_TENANT_SLUG || '';

let token = '';
let matterId = '';

beforeAll(async () => {
  const r = await request(BASE_URL)
    .post('/api/v1/auth/login')
    .send({ email: EMAIL, password: PASS, ...(SLUG ? { tenantSlug: SLUG } : {}) });
  token = r.body?.data?.token;
  const m = await request(BASE_URL)
    .get('/api/v1/matters?limit=1')
    .set('authorization', `Bearer ${token}`);
  const list = m.body?.data?.items || m.body?.data || [];
  matterId = Array.isArray(list) && list[0] ? list[0].id : '';
});

describe('Group A — Matter Profitability (actual contract)', () => {
  it('0. setup: have auth token and a matter', () => {
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
    expect(matterId).toBeTruthy();
  });

  it('1. GET /matters/:id/profitability → 200 with the documented fields', async () => {
    const r = await request(BASE_URL)
      .get(`/api/v1/matters/${matterId}/profitability`)
      .set('authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    const d = r.body.data;
    for (const f of ['matterId', 'totalTimeValue', 'feesBilled', 'feesPaid', 'totalDisbursements', 'totalExpenses', 'grossProfit']) {
      expect(d).toHaveProperty(f);
    }
  });

  it('2. grossProfit invariant: feesBilled − (disbursements + expenses)', async () => {
    const r = await request(BASE_URL)
      .get(`/api/v1/matters/${matterId}/profitability`)
      .set('authorization', `Bearer ${token}`);
    const d = r.body.data;
    expect(Number(d.grossProfit)).toBeCloseTo(
      Number(d.feesBilled) - (Number(d.totalDisbursements) + Number(d.totalExpenses)),
      2,
    );
  });

  it('3. all amounts are finite numbers ≥ 0 where expected', async () => {
    const r = await request(BASE_URL)
      .get(`/api/v1/matters/${matterId}/profitability`)
      .set('authorization', `Bearer ${token}`);
    const d = r.body.data;
    for (const f of ['totalTimeValue', 'feesBilled', 'feesPaid', 'totalDisbursements', 'totalExpenses']) {
      expect(Number.isFinite(Number(d[f]))).toBe(true);
      expect(Number(d[f])).toBeGreaterThanOrEqual(0);
    }
  });

  it('4. unknown matterId → 404 (tenant-scoped, no leak)', async () => {
    const r = await request(BASE_URL)
      .get('/api/v1/matters/nonexistent-xyz/profitability')
      .set('authorization', `Bearer ${token}`);
    expect([404, 400]).toContain(r.status);
  });

  it('5. no token → 401', async () => {
    const r = await request(BASE_URL).get(`/api/v1/matters/${matterId}/profitability`);
    expect(r.status).toBe(401);
  });

  // DOCUMENTED GAP (FINDING-MAT-001): the v3.1-spec report endpoint does not exist.
  it('6. GAP: GET /reports/matter-profitability is absent (documents the gap)', async () => {
    const r = await request(BASE_URL)
      .get(`/api/v1/reports/matter-profitability?matterId=${matterId}`)
      .set('authorization', `Bearer ${token}`);
    expect([404, 400, 403]).toContain(r.status); // not implemented — tracked in FINDING-MAT-001
  });
});
