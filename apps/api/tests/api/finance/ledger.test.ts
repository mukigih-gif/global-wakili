// Phase 3 Group C — Ledger Book certification (certifies the certifiable slice).
// Per FINDING-FIN-C-001: /finance/ledger book + export + client sub-ledger are unbuilt;
// this certifies trial-balance integrity + closed-period posting block (the real controls).
// Closed-period test uses a historical unused month (2020-01) so the live tenant's
// active month is never locked.
import request from 'supertest';

jest.setTimeout(45000);

const BASE_URL = process.env.API_BASE_URL || 'https://global-wakili-api.onrender.com';
const EMAIL = process.env.TEST_ADMIN_EMAIL || '';
const PASS = process.env.TEST_ADMIN_PASSWORD || '';
const SLUG = process.env.TEST_TENANT_SLUG || '';

let token = '';
let manualAcct = ''; // an account with allowManualPosting:true — avoids LOCKED_ACCOUNT confound
const H = () => ({ authorization: `Bearer ${token}` });

// Single-account balanced journal (DR & CR the SAME manual-postable account) so the
// ONLY policy gate that can reject it is the accounting-period lock — isolates period-lock
// from account-lock (19/20 accounts are allowManualPosting:false on this tenant).
const periodProbeJournal = (y: number, m: number, day: number) => ({
  reference: `GROUPC-PERIODTEST-${Date.now()}-${day}`,
  description: 'Group C period-lock probe (single-account)',
  date: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  lines: [
    { accountId: manualAcct, debit: 100, credit: 0 },
    { accountId: manualAcct, debit: 0, credit: 100 },
  ],
});

beforeAll(async () => {
  const r = await request(BASE_URL)
    .post('/api/v1/auth/login')
    .send({ email: EMAIL, password: PASS, ...(SLUG ? { tenantSlug: SLUG } : {}) });
  token = r.body?.data?.token;
  const a = await request(BASE_URL).get('/api/v1/finance/accounts').set(H());
  const list = a.body?.data?.items || a.body?.data || [];
  manualAcct = (list.find((x: any) => x.allowManualPosting === true) || {}).id || '';
});

describe('Group C — Ledger Book (certifiable slice)', () => {
  it('0. setup: token + a manual-postable account', () => {
    expect(token.length).toBeGreaterThan(10);
    expect(manualAcct).toBeTruthy();
  });

  it('1. trial-balance integrity: Σdebits = Σcredits across all accounts', async () => {
    const r = await request(BASE_URL).get('/api/v1/finance/trial-balance').set(H());
    expect(r.status).toBe(200);
    const rows = r.body?.data || r.body;
    expect(Array.isArray(rows)).toBe(true);
    let dr = 0;
    let cr = 0;
    for (const a of rows) {
      dr += Number(a.debit);
      cr += Number(a.credit);
    }
    expect(dr).toBeCloseTo(cr, 2); // fundamental GL invariant
  });

  it('2. each trial-balance row: netBalance = debit − credit, no nulls', async () => {
    const r = await request(BASE_URL).get('/api/v1/finance/trial-balance').set(H());
    for (const a of r.body?.data || r.body) {
      expect(a.debit).not.toBeNull();
      expect(a.credit).not.toBeNull();
      expect(Number(a.netBalance)).toBeCloseTo(Number(a.debit) - Number(a.credit), 2);
    }
  });

  it('3. period-lock control: same journal POSTS when open, then is BLOCKED after close', async () => {
    // Unique historical month per run (avoids prior-run state); never the live active month.
    const stamp = Date.now();
    const y = 2000 + (stamp % 18); // 2000..2017
    const m = (Math.floor(stamp / 1000) % 12) + 1;

    // CONTROL: same single-account journal in an OPEN period must succeed (201) —
    // proves the account + amounts post fine, so any later block is the PERIOD, not the account.
    const open = await request(BASE_URL).post('/api/v1/finance/journals').set(H()).send(periodProbeJournal(y, m, 15));
    expect(open.status).toBe(201);

    // Close that period.
    const closed = await request(BASE_URL)
      .post('/api/v1/finance/period-close')
      .set(H())
      .send({ month: m, year: y, reason: 'Group C cert test' });
    expect(closed.status).toBeLessThan(400);

    // Now the SAME journal must be rejected — the only changed variable is the period state.
    const blocked = await request(BASE_URL).post('/api/v1/finance/journals').set(H()).send(periodProbeJournal(y, m, 20));
    expect(blocked.status).toBeGreaterThanOrEqual(400);
    // NOTE (FINDING-FIN-C-002): the rejection is masked as a generic "Posting policy
    // validation failed" without surfacing PERIOD_LOCKED — assert the policy rejection.
    expect(JSON.stringify(blocked.body)).toMatch(/policy|period|locked|closed/i);
  });

  it('4. no token → 401', async () => {
    const r = await request(BASE_URL).get('/api/v1/finance/trial-balance');
    expect(r.status).toBe(401);
  });

  // DOCUMENTED GAP (FINDING-FIN-C-001): the ledger-book endpoint is absent.
  it('5. GAP: GET /finance/ledger is absent (documents the gap)', async () => {
    const r = await request(BASE_URL).get('/api/v1/finance/ledger').set(H());
    expect([404, 400]).toContain(r.status);
  });
});
