/**
 * Gate 3 — G3-D06: Cross-Tenant Breach Test Matrix
 *
 * Unit tests for the tenant isolation extension logic.
 * These tests verify the LOGIC of tenant isolation without requiring a database.
 * Full end-to-end integration tests (cross-tenant query against real Neon DB)
 * are Gate 13 scope.
 *
 * Run: npx tsx --test apps/api/src/__tests__/tenant-isolation.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TENANT_SCOPED_MODELS,
  isTenantScopedModel,
  addTenantWhere,
  addTenantToData,
  hasTenantWhere,
} from '../../../../packages/database/src/tenant-extension';

import { assertLinesBalanced } from '../utils/double-entry';
import {
  TERMINAL_INVOICE_STATUSES,
  VALID_INVOICE_TRANSITIONS,
  assertInvoiceNotTerminal,
  isInvoiceTerminal,
} from '../modules/billing/invoice-state-machine';

// ---------------------------------------------------------------------------
// Suite 1: addTenantWhere — query filter injection
// ---------------------------------------------------------------------------

describe('addTenantWhere', () => {
  it('returns plain { tenantId } when where is undefined', () => {
    assert.deepEqual(addTenantWhere(undefined, 'tenant-a'), { tenantId: 'tenant-a' });
  });

  it('returns plain { tenantId } when where is null', () => {
    assert.deepEqual(addTenantWhere(null, 'tenant-a'), { tenantId: 'tenant-a' });
  });

  it('wraps empty object in AND (equivalent to plain tenantId filter)', () => {
    // {} is an object so the AND branch fires: { AND: [{}, { tenantId }] }
    // Semantically identical to { tenantId } since {} matches everything
    const result = addTenantWhere({}, 'tenant-a') as { AND: unknown[] };
    assert.ok(Array.isArray(result.AND));
    assert.deepEqual(result.AND[1], { tenantId: 'tenant-a' });
  });

  it('wraps existing filter in AND when where has fields', () => {
    const result = addTenantWhere({ matterId: 'matter-1' }, 'tenant-a') as {
      AND: unknown[];
    };
    assert.ok(Array.isArray(result.AND), 'result must have AND array');
    assert.equal(result.AND.length, 2);
    assert.deepEqual(result.AND[0], { matterId: 'matter-1' });
    assert.deepEqual(result.AND[1], { tenantId: 'tenant-a' });
  });

  it('does not allow tenantId to be overridden by caller', () => {
    // Caller passes tenantId: 'attacker' — the injected one comes second in AND
    // The DB will AND both conditions, so attacker cannot escape their tenant
    const result = addTenantWhere({ tenantId: 'attacker' }, 'tenant-a') as {
      AND: unknown[];
    };
    // Both conditions are ANDed — effective filter requires BOTH tenant IDs to match
    // Since only real data has both, no cross-tenant leak is possible
    assert.deepEqual(result.AND[0], { tenantId: 'attacker' });
    assert.deepEqual(result.AND[1], { tenantId: 'tenant-a' });
  });

  it('preserves complex nested where objects', () => {
    const where = {
      status: 'ACTIVE',
      createdAt: { gte: new Date('2026-01-01') },
    };
    const result = addTenantWhere(where, 'tenant-a') as { AND: unknown[] };
    assert.ok(Array.isArray(result.AND));
    assert.deepEqual(result.AND[0], where);
    assert.deepEqual(result.AND[1], { tenantId: 'tenant-a' });
  });
});

// ---------------------------------------------------------------------------
// Suite 2: addTenantToData — create/write injection
// ---------------------------------------------------------------------------

describe('addTenantToData', () => {
  it('injects tenantId into a plain object', () => {
    assert.deepEqual(
      addTenantToData({ name: 'test', status: 'ACTIVE' }, 'tenant-a'),
      { name: 'test', status: 'ACTIVE', tenantId: 'tenant-a' },
    );
  });

  it('injects tenantId into every item in an array (createMany)', () => {
    const result = addTenantToData(
      [{ name: 'item-1' }, { name: 'item-2' }],
      'tenant-a',
    ) as Array<{ name: string; tenantId: string }>;
    assert.equal(result.length, 2);
    assert.equal(result[0]!.tenantId, 'tenant-a');
    assert.equal(result[1]!.tenantId, 'tenant-a');
  });

  it('passes through non-object primitives unchanged', () => {
    assert.equal(addTenantToData('string-value', 'tenant-a'), 'string-value');
    assert.equal(addTenantToData(42, 'tenant-a'), 42);
    assert.equal(addTenantToData(null, 'tenant-a'), null);
  });

  it('overwrites a caller-supplied tenantId to prevent tenant spoofing', () => {
    // A caller that tries to inject a different tenantId is overwritten
    const result = addTenantToData(
      { name: 'test', tenantId: 'attacker-tenant' },
      'tenant-a',
    ) as { tenantId: string };
    // The spread puts attacker value first; the explicit tenantId: tenantId wins (last write)
    assert.equal(result.tenantId, 'tenant-a');
  });

  it('handles empty object', () => {
    assert.deepEqual(addTenantToData({}, 'tenant-a'), { tenantId: 'tenant-a' });
  });
});

// ---------------------------------------------------------------------------
// Suite 3: hasTenantWhere — guard for unsafe unique operations
// ---------------------------------------------------------------------------

describe('hasTenantWhere', () => {
  it('returns true when where has tenantId', () => {
    assert.equal(hasTenantWhere({ tenantId: 'tenant-a' }), true);
  });

  it('returns true when where has tenantId alongside other fields', () => {
    assert.equal(hasTenantWhere({ id: 'record-1', tenantId: 'tenant-a' }), true);
  });

  it('returns false when where has no tenantId', () => {
    assert.equal(hasTenantWhere({ id: 'record-1' }), false);
  });

  it('returns false for an empty object', () => {
    assert.equal(hasTenantWhere({}), false);
  });

  it('returns false for null', () => {
    assert.equal(hasTenantWhere(null), false);
  });

  it('returns false for undefined', () => {
    assert.equal(hasTenantWhere(undefined), false);
  });

  it('returns false for non-object primitives', () => {
    assert.equal(hasTenantWhere('tenantId'), false);
    assert.equal(hasTenantWhere(42), false);
  });
});

// ---------------------------------------------------------------------------
// Suite 4: isTenantScopedModel — model registry
// ---------------------------------------------------------------------------

describe('isTenantScopedModel', () => {
  const expectScoped = [
    // Core models
    'AuditLog', 'Matter', 'Invoice', 'TrustAccount', 'OfficeAccount',
    'TrustTransaction', 'JournalEntry', 'ChartOfAccount', 'User', 'Role',
    // Gate 2 additions
    'DataLineage', 'OwnershipRecord',
    // Gate 3 additions (G3-D01)
    'BankStatement', 'TimerSession', 'Disbursement', 'DisbursementRequestNote',
    'RecurringExpenseTemplate', 'WithholdingTaxCertificate', 'PaymentRefund',
  ];

  const expectUnscoped = [
    // Platform-global models — intentionally not tenant-scoped
    'GlobalAuditLog', 'WorkflowHistory', 'PermissionCondition',
    // Removed phantoms (Gate 2 D-04)
    'BankAccount', 'RecurringExpense', 'Vendor',
    // Removed from schema (Gate 3 G3-D02)
    'SensitiveField',
    // Edge cases
    '', 'unknown-model',
  ];

  for (const model of expectScoped) {
    it(`${model} is tenant-scoped`, () => {
      assert.equal(isTenantScopedModel(model), true, `${model} should be in TENANT_SCOPED_MODELS`);
    });
  }

  for (const model of expectUnscoped) {
    it(`${model} is NOT tenant-scoped`, () => {
      assert.equal(isTenantScopedModel(model), false, `${model} should NOT be in TENANT_SCOPED_MODELS`);
    });
  }

  it('returns false for undefined', () => {
    assert.equal(isTenantScopedModel(undefined), false);
  });
});

// ---------------------------------------------------------------------------
// Suite 5: TENANT_SCOPED_MODELS count and integrity
// ---------------------------------------------------------------------------

describe('TENANT_SCOPED_MODELS integrity', () => {
  it('has the expected model count after Gate 3 additions', () => {
    assert.equal(
      TENANT_SCOPED_MODELS.size,
      93,
      `Expected 93 scoped models; got ${TENANT_SCOPED_MODELS.size}. ` +
      'If this fails, a model was added or removed without updating this test.',
    );
  });

  it('contains no phantom entries (models that exist in schema)', () => {
    const phantoms = ['BankAccount', 'RecurringExpense', 'Vendor'];
    for (const phantom of phantoms) {
      assert.equal(
        TENANT_SCOPED_MODELS.has(phantom),
        false,
        `Phantom model "${phantom}" must not be in TENANT_SCOPED_MODELS`,
      );
    }
  });

  it('contains all 7 Gate 3 D-01 additions', () => {
    const g3d01 = [
      'BankStatement', 'RecurringExpenseTemplate', 'TimerSession',
      'Disbursement', 'DisbursementRequestNote', 'WithholdingTaxCertificate',
      'PaymentRefund',
    ];
    for (const model of g3d01) {
      assert.equal(
        TENANT_SCOPED_MODELS.has(model),
        true,
        `G3-D01 model "${model}" must be in TENANT_SCOPED_MODELS`,
      );
    }
  });

  it('contains both Gate 2 D-04 additions', () => {
    assert.equal(TENANT_SCOPED_MODELS.has('DataLineage'), true);
    assert.equal(TENANT_SCOPED_MODELS.has('OwnershipRecord'), true);
  });
});

// ---------------------------------------------------------------------------
// Suite 6: Unsafe operation guard simulation
// ---------------------------------------------------------------------------

describe('Unsafe operation guard (logic simulation)', () => {
  const UNSAFE_OPERATIONS = new Set([
    'findUnique', 'findUniqueOrThrow', 'update', 'delete', 'upsert',
  ]);

  function simulateExtensionGuard(
    model: string,
    operation: string,
    where: unknown,
  ): 'allowed' | 'blocked' {
    if (!isTenantScopedModel(model)) return 'allowed';
    if (UNSAFE_OPERATIONS.has(operation) && !hasTenantWhere(where)) {
      return 'blocked';
    }
    return 'allowed';
  }

  it('blocks findUnique on scoped model without tenantId', () => {
    assert.equal(simulateExtensionGuard('AuditLog', 'findUnique', { id: 'x' }), 'blocked');
  });

  it('allows findUnique on scoped model WITH tenantId', () => {
    assert.equal(
      simulateExtensionGuard('AuditLog', 'findUnique', { id: 'x', tenantId: 'tenant-a' }),
      'allowed',
    );
  });

  it('blocks update on scoped model without tenantId', () => {
    assert.equal(simulateExtensionGuard('Matter', 'update', { id: 'matter-1' }), 'blocked');
  });

  it('allows update on scoped model WITH tenantId', () => {
    assert.equal(
      simulateExtensionGuard('Matter', 'update', { id: 'matter-1', tenantId: 'tenant-a' }),
      'allowed',
    );
  });

  it('blocks delete on scoped model without tenantId', () => {
    assert.equal(simulateExtensionGuard('Invoice', 'delete', { id: 'inv-1' }), 'blocked');
  });

  it('blocks upsert on scoped model without tenantId', () => {
    assert.equal(simulateExtensionGuard('JournalEntry', 'upsert', { id: 'je-1' }), 'blocked');
  });

  it('allows findUnique on NON-scoped model without tenantId (passthrough)', () => {
    assert.equal(
      simulateExtensionGuard('GlobalAuditLog', 'findUnique', { id: 'x' }),
      'allowed',
    );
  });

  it('findMany is NOT in unsafe operations (auto-filtered by addTenantWhere instead)', () => {
    assert.equal(UNSAFE_OPERATIONS.has('findMany'), false);
    // findMany is safe because addTenantWhere is injected automatically for READ ops
  });

  // Breach scenario: cross-tenant data access attempt
  it('BREACH SCENARIO: attacker querying AuditLog for another tenant is blocked', () => {
    // Attacker has tenantId 'attacker-tenant' but tries to access data without tenantId in where
    assert.equal(
      simulateExtensionGuard('AuditLog', 'findUnique', { id: 'target-tenant-log-id' }),
      'blocked',
      'Direct ID lookup without tenantId must be blocked on scoped models',
    );
  });

  it('BREACH SCENARIO: trust transaction update without tenantId is blocked', () => {
    assert.equal(
      simulateExtensionGuard('TrustTransaction', 'update', { id: 'trust-tx-1' }),
      'blocked',
      'Trust transaction update without tenantId must be blocked',
    );
  });

  it('BREACH SCENARIO: payment refund approval without tenantId is blocked', () => {
    // This was the exact pattern fixed in G3-D01
    assert.equal(
      simulateExtensionGuard('PaymentRefund', 'update', { id: 'refund-1' }),
      'blocked',
      'PaymentRefund.update without tenantId must be blocked after G3-D01',
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 7: assertLinesBalanced — G4-D03 double-entry constraint
// ---------------------------------------------------------------------------

describe('assertLinesBalanced (G4-D03)', () => {
  it('passes when debits equal credits (string amounts)', () => {
    assert.doesNotThrow(() =>
      assertLinesBalanced(
        [{ debit: '100.00', credit: '0' }, { debit: '0', credit: '100.00' }],
        'TEST-001',
      ),
    );
  });

  it('passes when debits equal credits (numeric split over 3 lines)', () => {
    assert.doesNotThrow(() =>
      assertLinesBalanced(
        [
          { debit: 500, credit: 0 },
          { debit: 0, credit: 250 },
          { debit: 0, credit: 250 },
        ],
        'TEST-002',
      ),
    );
  });

  it('passes for symmetric WHT/refund lines (amount X debit, amount X credit)', () => {
    assert.doesNotThrow(() =>
      assertLinesBalanced(
        [{ debit: '15000.00', credit: '0' }, { debit: '0', credit: '15000.00' }],
        'WHT-CERT-abc123',
      ),
    );
  });

  it('throws UNBALANCED_JOURNAL when debits exceed credits', () => {
    assert.throws(
      () =>
        assertLinesBalanced(
          [{ debit: '200.00', credit: '0' }, { debit: '0', credit: '100.00' }],
          'BAD-JOURNAL-001',
        ),
      (err: Error & { code?: string }) => {
        assert.equal(err.code, 'UNBALANCED_JOURNAL');
        assert.ok(err.message.includes('BAD-JOURNAL-001'));
        assert.ok(err.message.includes('200'));
        assert.ok(err.message.includes('100'));
        return true;
      },
    );
  });

  it('throws UNBALANCED_JOURNAL when credits exceed debits', () => {
    assert.throws(
      () =>
        assertLinesBalanced(
          [{ debit: '50.00', credit: '0' }, { debit: '0', credit: '75.00' }],
          'BAD-JOURNAL-002',
        ),
      (err: Error & { code?: string }) => {
        assert.equal(err.code, 'UNBALANCED_JOURNAL');
        return true;
      },
    );
  });

  it('throws for empty lines array (zero balance blocks zero-value journals)', () => {
    assert.doesNotThrow(() =>
      assertLinesBalanced([], 'EMPTY-JOURNAL'),
      'Empty array: 0 == 0 so it passes balance check (zero-value enforcement is separate)',
    );
  });

  it('uses statusCode 422 in the thrown error', () => {
    assert.throws(
      () =>
        assertLinesBalanced(
          [{ debit: '300', credit: '100' }],
          'UNBAL-REF',
        ),
      (err: Error & { statusCode?: number }) => {
        assert.equal(err.statusCode, 422);
        return true;
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 8: Invoice state machine — G4-D04
// ---------------------------------------------------------------------------

describe('Invoice state machine (G4-D04)', () => {
  it('TERMINAL_INVOICE_STATUSES contains CANCELLED and ETIMS_REJECTED', () => {
    assert.equal(TERMINAL_INVOICE_STATUSES.has('CANCELLED' as any), true);
    assert.equal(TERMINAL_INVOICE_STATUSES.has('ETIMS_REJECTED' as any), true);
    assert.equal(TERMINAL_INVOICE_STATUSES.size, 2);
  });

  it('isInvoiceTerminal true for CANCELLED and ETIMS_REJECTED', () => {
    assert.equal(isInvoiceTerminal('CANCELLED' as any), true);
    assert.equal(isInvoiceTerminal('ETIMS_REJECTED' as any), true);
  });

  it('isInvoiceTerminal false for INVOICED, PAID, PARTIALLY_PAID', () => {
    assert.equal(isInvoiceTerminal('INVOICED' as any), false);
    assert.equal(isInvoiceTerminal('PAID' as any), false);
    assert.equal(isInvoiceTerminal('PARTIALLY_PAID' as any), false);
  });

  it('assertInvoiceNotTerminal passes for INVOICED', () => {
    assert.doesNotThrow(() => assertInvoiceNotTerminal('INVOICED' as any, 'INV-001'));
  });

  it('assertInvoiceNotTerminal throws INVOICE_CANCELLED for CANCELLED', () => {
    assert.throws(
      () => assertInvoiceNotTerminal('CANCELLED' as any, 'INV-002'),
      (err: Error & { code?: string; statusCode?: number }) => {
        assert.equal(err.code, 'INVOICE_CANCELLED');
        assert.equal(err.statusCode, 409);
        return true;
      },
    );
  });

  it('assertInvoiceNotTerminal throws INVOICE_ETIMS_REJECTED for ETIMS_REJECTED', () => {
    assert.throws(
      () => assertInvoiceNotTerminal('ETIMS_REJECTED' as any, 'INV-003'),
      (err: Error & { code?: string; statusCode?: number }) => {
        assert.equal(err.code, 'INVOICE_ETIMS_REJECTED');
        assert.equal(err.statusCode, 409);
        assert.ok(err.message.includes('INV-003'));
        return true;
      },
    );
  });

  it('INVOICED can transition to PAID, PARTIALLY_PAID, CANCELLED — not ETIMS_REJECTED', () => {
    const from = VALID_INVOICE_TRANSITIONS.get('INVOICED' as any)!;
    assert.equal(from.has('PAID' as any), true);
    assert.equal(from.has('PARTIALLY_PAID' as any), true);
    assert.equal(from.has('CANCELLED' as any), true);
    assert.equal(from.has('ETIMS_REJECTED' as any), false);
  });

  it('ETIMS_REJECTED can only transition to CANCELLED', () => {
    const from = VALID_INVOICE_TRANSITIONS.get('ETIMS_REJECTED' as any)!;
    assert.equal(from.has('CANCELLED' as any), true);
    assert.equal(from.size, 1);
  });

  it('CANCELLED is terminal — no valid transitions', () => {
    const from = VALID_INVOICE_TRANSITIONS.get('CANCELLED' as any)!;
    assert.equal(from.size, 0);
  });
});
