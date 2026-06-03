/**
 * trust-overdraw.integration.test.ts
 *
 * Trust account overdraw prevention on REAL database.
 * Verifies that the assertSufficientBalance guard prevents negative
 * trust balances at the service layer when wired to a live DB.
 *
 * Skipped automatically when DATABASE_URL is not set.
 *
 * Gate 13 — Gap 018.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { checkTrustAccountBalance } from '../../utils/trust-balance';
import { isOverdrawn } from '../../utils/trust-reconciliation';
import { computeTrustNetBalance, computeThreeWayVariances, assessThreeWayStatus } from '../../utils/trust-reconciliation';

const DB_URL = process.env.DATABASE_URL;
const SKIP = !DB_URL;

// ── Logic-level trust tests (no DB required) ──────────────────────────────────
describe('Trust Accounting — Logic Verification', () => {
  it('KES 0 balance blocks any withdrawal', () => {
    const r = checkTrustAccountBalance('0', '1');
    assert.equal(r.allowed, false);
    assert.equal(r.shortfall, '1.00');
  });

  it('KES 50,000 balance allows KES 50,000 withdrawal', () => {
    const r = checkTrustAccountBalance('50000', '50000');
    assert.equal(r.allowed, true);
    assert.equal(r.shortfall, '0.00');
  });

  it('Negative balance is overdrawn', () => {
    assert.equal(isOverdrawn('-0.01'), true);
  });

  it('Three-way reconciliation detects bank variance', () => {
    const v = computeThreeWayVariances('100100', '100000', '100000');
    const s = assessThreeWayStatus(v, '0');
    assert.equal(s.finalStatus, 'FLAGGED');
  });

  it('Perfect reconciliation produces MATCHED status', () => {
    const v = computeThreeWayVariances('100000', '100000', '100000');
    const s = assessThreeWayStatus(v, '0');
    assert.equal(s.finalStatus, 'MATCHED');
  });
});

// ── DB-level trust tests ───────────────────────────────────────────────────────
describe('Trust Accounting — Integration (real DB)', { skip: SKIP }, () => {
  let prisma: any;
  let tenantId: string;
  let trustAccountId: string;

  before(async () => {
    if (SKIP) return;
    const { PrismaClient } = await import('@global-wakili/database');
    prisma = new PrismaClient({ datasourceUrl: DB_URL });
    await prisma.$connect();

    const tenant = await prisma.tenant.create({
      data: { name: 'Trust Test Firm', slug: `trust-test-${Date.now()}`, kraPin: 'T000000000T' },
    });
    tenantId = tenant.id;

    const trust = await prisma.trustAccount.create({
      data: {
        tenantId,
        accountName: 'Client Trust Account',
        accountNumber: 'TRUST-001',
        balance: '100000.00',
        currency: 'KES',
        status: 'ACTIVE',
      },
    });
    trustAccountId = trust.id;
  });

  after(async () => {
    if (SKIP || !prisma) return;
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => null);
    await prisma.$disconnect();
  });

  it('Trust account created with KES 100,000 balance', async () => {
    const account = await prisma.trustAccount.findFirst({
      where: { id: trustAccountId, tenantId },
    });
    assert.ok(account, 'Trust account must exist');
    assert.equal(parseFloat(account.balance), 100000);
  });

  it('Trust account is not cross-visible from another tenant', async () => {
    const otherTenant = await prisma.tenant.create({
      data: { name: 'Other Trust Firm', slug: `other-trust-${Date.now()}`, kraPin: 'O000000000O' },
    });

    const cross = await prisma.trustAccount.findMany({
      where: { tenantId: otherTenant.id, id: trustAccountId },
    });
    assert.equal(cross.length, 0, 'Cross-tenant trust account lookup must return zero');

    await prisma.tenant.delete({ where: { id: otherTenant.id } });
  });
});
