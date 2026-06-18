/**
 * Committed coverage for hasTenantWhere composite-key + spoof-detection behavior (e353612).
 * Imports the ACTUAL shipped function (no reimplementation). Complements the legacy
 * 1-arg cases already in tenant-isolation.test.ts.
 *
 * Run: npx tsx --test apps/api/src/__tests__/tenant-extension-guard.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { hasTenantWhere } from '../../../../packages/database/src/tenant-extension';

const REAL = 'tenant-REAL';
const SPOOF = 'tenant-WRONG';

describe('hasTenantWhere — composite-key + spoof detection (2-arg, e353612)', () => {
  // ── TRUE NEGATIVES — must be BLOCKED (false) ──────────────────────────────
  it('1) blocks composite key with SPOOFED nested tenantId (!= real)', () => {
    assert.equal(
      hasTenantWhere({ tenantId_reference: { tenantId: SPOOF, reference: 'INV-1' } }, REAL),
      false,
    );
  });

  it('2) blocks top-level SPOOFED tenantId (!= real)', () => {
    assert.equal(hasTenantWhere({ id: 'r1', tenantId: SPOOF }, REAL), false);
  });

  it('3) blocks where with no tenantId anywhere', () => {
    assert.equal(hasTenantWhere({ id: 'r1' }, REAL), false);
  });

  // ── TRUE POSITIVES — must PASS (true) ─────────────────────────────────────
  it('4) accepts journal idempotency composite (tenantId_reference, matching)', () => {
    assert.equal(
      hasTenantWhere({ tenantId_reference: { tenantId: REAL, reference: 'INV-1' } }, REAL),
      true,
    );
  });

  it('5) accepts accountBalance composite (tenantId_accountId, matching)', () => {
    assert.equal(
      hasTenantWhere({ tenantId_accountId: { tenantId: REAL, accountId: 'acc-1' } }, REAL),
      true,
    );
  });

  it('6) accepts top-level matching tenantId', () => {
    assert.equal(hasTenantWhere({ id: 'r1', tenantId: REAL }, REAL), true);
  });

  // ── LEGACY 1-arg regression guard (presence semantics preserved) ──────────
  it('7a) legacy 1-arg: top-level tenantId present -> true', () => {
    assert.equal(hasTenantWhere({ tenantId: 'tenant-a' }), true);
  });

  it('7b) legacy 1-arg: missing tenantId -> false', () => {
    assert.equal(hasTenantWhere({ id: 'r1' }), false);
  });

  // ── extra defensive edge: composite whose nested object lacks tenantId ─────
  it('8) blocks composite key whose nested object has no tenantId', () => {
    assert.equal(hasTenantWhere({ some_other_key: { foo: 'x' } }, REAL), false);
  });
});
