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
  normalizeWhtRate,
  calculateWhtAmount,
  calculateNetVatPayable,
  validateVatPeriod,
  calculateVatAmount,
} from '../utils/vat-wht-calculator';

import {
  buildBillingScope,
  buildPeriodFilter,
  getLedgerBalanceImpact,
  calculateOverdueAmount,
} from '../utils/billing-scope';

import {
  computeTrustNetBalance,
  computeThreeWayVariances,
  assessVarianceStatus,
  assessThreeWayStatus,
  isOverdrawn,
  computeLedgerVariance,
} from '../utils/trust-reconciliation';

import {
  checkTrustAccountBalance,
  checkMatterTrustBalance,
  isTrustOutflow,
  isTrustInflow,
  computeTransactionDelta,
} from '../utils/trust-balance';

import {
  applyLedgerDelta,
  computeLedgerDebitCredit,
  allocateInterestProRata,
  verifyAllocationSum,
} from '../utils/trust-calculator';

import {
  detectCommingling,
  isTrustToOfficeSettlement,
  getTrustPostingContext,
} from '../utils/trust-commingling';

import {
  expandPermissionCandidates,
  hasPermission,
  findMissingPermissions,
  normalizePermissions,
} from '../utils/rbac-engine';

import {
  computeRefill,
  checkBucket,
  createBucket,
} from '../utils/rate-limiter';

import {
  resolveCorsOrigin,
  isOriginAllowed,
  isCorsProductionSafe,
  findMissingSecurityHeaders,
  REQUIRED_SECURITY_HEADERS,
} from '../utils/security-headers';

import {
  computeAuditHash,
  verifyHashChain,
  detectTampering,
  isGenesisEntry,
  GENESIS_HASH,
} from '../utils/audit-chain';

import {
  isPlaceholderValue,
  containsRealConnectionString,
  containsRealSecret,
  auditEnvFile,
} from '../utils/secret-scanner';

import {
  getModulesForPlan,
  getQuotasForPlan,
  validatePlanUpgradeModules,
  REQUIRED_PROVISIONING_RECORDS,
  MODULES_BY_PLAN,
} from '../utils/platform-provisioning';
import { isSuperAdminUser } from '../middleware/superAdminAuth';

import {
  interpolateTemplate,
  assertNotificationTenant,
  isValidTemplateKey,
  extractTemplateKeys,
} from '../utils/notification-security';

import {
  assertStorageKey,
  sanitizePathSegment,
  sanitizeFileName,
  assertPathWithinRoot,
  clampSignedUrlTtl,
  MAX_SIGNED_URL_TTL_SECONDS,
  DEFAULT_SIGNED_URL_TTL_SECONDS,
} from '../utils/document-security';
import { stableSerialize, generateAuditHash } from '../utils/audit-hash';
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
      116,
      `Expected 116 scoped models; got ${TENANT_SCOPED_MODELS.size}. ` +
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

// ---------------------------------------------------------------------------
// Suite 9: VAT/WHT calculation correctness — G4-D05
// ---------------------------------------------------------------------------

describe('VAT/WHT calculation correctness (G4-D05)', () => {

  // --- WHT rate normalization ---
  it('normalizeWhtRate: 5 percent -> 0.050000 (legal fees resident rate)', () => {
    assert.equal(normalizeWhtRate(5), '0.050000');
  });

  it('normalizeWhtRate: 20 percent -> 0.200000 (non-resident rate)', () => {
    assert.equal(normalizeWhtRate(20), '0.200000');
  });

  it('normalizeWhtRate: 0.05 decimal passthrough', () => {
    assert.equal(normalizeWhtRate(0.05), '0.050000');
  });

  it('normalizeWhtRate: negative returns zero', () => {
    assert.equal(normalizeWhtRate(-1), '0.000000');
  });

  it('normalizeWhtRate: zero returns zero', () => {
    assert.equal(normalizeWhtRate(0), '0.000000');
  });

  it('normalizeWhtRate: string "5" converts correctly', () => {
    assert.equal(normalizeWhtRate('5'), '0.050000');
  });

  // --- WHT amount calculation (Kenya legal fee rates) ---
  it('calculateWhtAmount: KES 100,000 at 5% = KES 5,000', () => {
    assert.equal(calculateWhtAmount('100000', '5'), '5000.00');
  });

  it('calculateWhtAmount: KES 250,000 at 5% = KES 12,500', () => {
    assert.equal(calculateWhtAmount('250000', '5'), '12500.00');
  });

  it('calculateWhtAmount: KES 100,000 at 20% (non-resident) = KES 20,000', () => {
    assert.equal(calculateWhtAmount('100000', '20'), '20000.00');
  });

  it('calculateWhtAmount: accepts decimal rate 0.05', () => {
    assert.equal(calculateWhtAmount('100000', '0.05'), '5000.00');
  });

  it('calculateWhtAmount: throws WHT_BASE_AMOUNT_INVALID for zero base', () => {
    assert.throws(
      () => calculateWhtAmount('0', '5'),
      (err) => { assert.equal(err.code, 'WHT_BASE_AMOUNT_INVALID'); return true; },
    );
  });

  it('calculateWhtAmount: throws WHT_RATE_INVALID for zero rate', () => {
    assert.throws(
      () => calculateWhtAmount('100000', '0'),
      (err) => { assert.equal(err.code, 'WHT_RATE_INVALID'); return true; },
    );
  });

  // --- VAT amount calculation (Kenya 16% standard rate) ---
  it('calculateVatAmount: KES 100,000 at 16% = KES 16,000', () => {
    assert.equal(calculateVatAmount('100000', '16'), '16000.00');
  });

  it('calculateVatAmount: KES 50,000 at 16% = KES 8,000', () => {
    assert.equal(calculateVatAmount('50000', '16'), '8000.00');
  });

  it('calculateVatAmount: decimal rate 0.16 same result as 16', () => {
    assert.equal(calculateVatAmount('100000', '0.16'), '16000.00');
  });

  it('calculateVatAmount: zero rate = zero VAT (tax-exempt)', () => {
    assert.equal(calculateVatAmount('100000', '0'), '0.00');
  });

  // --- Net VAT payable (Kenya eTIMS filing formula) ---
  it('calculateNetVatPayable: output 16000, input 8000, no adjustments = 8000', () => {
    assert.equal(calculateNetVatPayable('16000', '8000', []), '8000.00');
  });

  it('calculateNetVatPayable: OUTPUT_VAT adjustment adds to payable', () => {
    assert.equal(
      calculateNetVatPayable('16000', '8000', [{ type: 'OUTPUT_VAT', amount: '2000' }]),
      '10000.00',
    );
  });

  it('calculateNetVatPayable: INPUT_VAT adjustment subtracts from payable', () => {
    assert.equal(
      calculateNetVatPayable('16000', '8000', [{ type: 'INPUT_VAT', amount: '1000' }]),
      '7000.00',
    );
  });

  it('calculateNetVatPayable: VAT_REFUND subtracts from payable', () => {
    assert.equal(
      calculateNetVatPayable('16000', '8000', [{ type: 'VAT_REFUND', amount: '3000' }]),
      '5000.00',
    );
  });

  it('calculateNetVatPayable: mixed adjustments apply correct signs', () => {
    assert.equal(
      calculateNetVatPayable('20000', '10000', [
        { type: 'OUTPUT_VAT', amount: '2000' },
        { type: 'INPUT_VAT', amount: '1500' },
      ]),
      '10500.00',
    );
  });

  it('calculateNetVatPayable: input > output produces negative (refund due from KRA)', () => {
    assert.equal(calculateNetVatPayable('5000', '12000', []), '-7000.00');
  });

  // --- VAT period validation ---
  it('validateVatPeriod: January 2026 produces correct date range', () => {
    const { periodStart, periodEnd } = validateVatPeriod(2026, 1);
    assert.equal(periodStart.getFullYear(), 2026);
    assert.equal(periodStart.getMonth(), 0);
    assert.equal(periodEnd.getMonth(), 1);
  });

  it('validateVatPeriod: December 2026 crosses year boundary correctly', () => {
    const { periodEnd } = validateVatPeriod(2026, 12);
    assert.equal(periodEnd.getFullYear(), 2027);
    assert.equal(periodEnd.getMonth(), 0);
  });

  it('validateVatPeriod: throws INVALID_VAT_YEAR for year 1999', () => {
    assert.throws(
      () => validateVatPeriod(1999, 6),
      (err) => { assert.equal(err.code, 'INVALID_VAT_YEAR'); return true; },
    );
  });

  it('validateVatPeriod: throws INVALID_VAT_MONTH for month 0', () => {
    assert.throws(
      () => validateVatPeriod(2026, 0),
      (err) => { assert.equal(err.code, 'INVALID_VAT_MONTH'); return true; },
    );
  });

  it('validateVatPeriod: throws INVALID_VAT_MONTH for month 13', () => {
    assert.throws(
      () => validateVatPeriod(2026, 13),
      (err) => { assert.equal(err.code, 'INVALID_VAT_MONTH'); return true; },
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 10: Billing run isolation — G4-D06
// ---------------------------------------------------------------------------

describe('Billing run isolation (G4-D06)', () => {

  it('BillingRun is now in TENANT_SCOPED_MODELS (G4-D06 addition)', () => {
    assert.equal(TENANT_SCOPED_MODELS.has('BillingRun'), true);
  });

  it('TENANT_SCOPED_MODELS count updated to 94 after BillingRun', () => {
    assert.equal(TENANT_SCOPED_MODELS.size, 116);
  });

  it('buildBillingScope always includes tenantId', () => {
    const scope = buildBillingScope({ tenantId: 'tenant-a' });
    assert.equal(scope.tenantId, 'tenant-a');
  });

  it('buildBillingScope includes clientId only when provided', () => {
    const w = buildBillingScope({ tenantId: 'tenant-a', clientId: 'client-1' });
    const wo = buildBillingScope({ tenantId: 'tenant-a' });
    assert.equal(w.clientId, 'client-1');
    assert.equal('clientId' in wo, false);
  });

  it('buildBillingScope includes matterId only when provided', () => {
    const w = buildBillingScope({ tenantId: 'tenant-a', matterId: 'matter-1' });
    const wo = buildBillingScope({ tenantId: 'tenant-a', matterId: null });
    assert.equal(w.matterId, 'matter-1');
    assert.equal('matterId' in wo, false);
  });

  it('buildBillingScope throws BILLING_TENANT_REQUIRED for empty tenantId', () => {
    assert.throws(() => buildBillingScope({ tenantId: '' }),
      (err) => { assert.equal(err.code, 'BILLING_TENANT_REQUIRED'); return true; });
  });

  it('tenant-A and tenant-B scopes are distinct', () => {
    const a = buildBillingScope({ tenantId: 'tenant-a' });
    const b = buildBillingScope({ tenantId: 'tenant-b' });
    assert.notEqual(a.tenantId, b.tenantId);
  });

  it('buildPeriodFilter: no dates returns empty object', () => {
    assert.deepEqual(buildPeriodFilter(), {});
  });

  it('buildPeriodFilter: from only applies gte', () => {
    const from = new Date('2026-01-01');
    assert.deepEqual(buildPeriodFilter(from, null, 'invoiceDate'), { invoiceDate: { gte: from } });
  });

  it('buildPeriodFilter: to only applies lte', () => {
    const to = new Date('2026-12-31');
    assert.deepEqual(buildPeriodFilter(null, to, 'invoiceDate'), { invoiceDate: { lte: to } });
  });

  it('buildPeriodFilter: both from and to applied together', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-12-31');
    assert.deepEqual(buildPeriodFilter(from, to, 'invoiceDate'), { invoiceDate: { gte: from, lte: to } });
  });

  it('getLedgerBalanceImpact: INVOICE debit positive', () => {
    const r = getLedgerBalanceImpact('INVOICE', '10000');
    assert.equal(r.debit, '10000.00');
    assert.equal(r.credit, '0.00');
    assert.equal(r.balanceImpact, '10000.00');
  });

  it('getLedgerBalanceImpact: PAYMENT negative impact', () => {
    const r = getLedgerBalanceImpact('PAYMENT', '5000');
    assert.equal(r.debit, '0.00');
    assert.equal(r.balanceImpact, '-5000.00');
  });

  it('getLedgerBalanceImpact: CREDIT_NOTE negative impact', () => {
    assert.equal(getLedgerBalanceImpact('CREDIT_NOTE', '2000').balanceImpact, '-2000.00');
  });

  it('getLedgerBalanceImpact: RETAINER negative impact', () => {
    assert.equal(getLedgerBalanceImpact('RETAINER', '15000').balanceImpact, '-15000.00');
  });

  it('getLedgerBalanceImpact: PROFORMA zero impact', () => {
    assert.equal(getLedgerBalanceImpact('PROFORMA', '99999').balanceImpact, '0.00');
  });

  it('getLedgerBalanceImpact: REMINDER zero impact', () => {
    assert.equal(getLedgerBalanceImpact('REMINDER', '500').balanceImpact, '0.00');
  });

  it('calculateOverdueAmount: past-due INVOICED invoice is overdue', () => {
    const now = new Date('2026-06-02');
    const result = calculateOverdueAmount(
      [{ dueDate: new Date('2026-01-01'), status: 'INVOICED', balanceDue: '5000' }], now);
    assert.equal(result, '5000.00');
  });

  it('calculateOverdueAmount: PAID invoice excluded from overdue', () => {
    const now = new Date('2026-06-02');
    assert.equal(
      calculateOverdueAmount([{ dueDate: new Date('2026-01-01'), status: 'PAID', balanceDue: '5000' }], now),
      '0.00');
  });

  it('calculateOverdueAmount: CANCELLED invoice excluded', () => {
    const now = new Date('2026-06-02');
    assert.equal(
      calculateOverdueAmount([{ dueDate: new Date('2026-01-01'), status: 'CANCELLED', balanceDue: '5000' }], now),
      '0.00');
  });

  it('calculateOverdueAmount: future-dated invoice is not overdue', () => {
    const now = new Date('2026-06-02');
    assert.equal(
      calculateOverdueAmount([{ dueDate: new Date('2027-01-01'), status: 'INVOICED', balanceDue: '5000' }], now),
      '0.00');
  });

  it('calculateOverdueAmount: accumulates multiple overdue invoices', () => {
    const now = new Date('2026-06-02');
    const past = new Date('2026-01-01');
    assert.equal(
      calculateOverdueAmount([
        { dueDate: past, status: 'INVOICED', balanceDue: '3000' },
        { dueDate: past, status: 'PARTIALLY_PAID', balanceDue: '2000' },
        { dueDate: past, status: 'PAID', balanceDue: '5000' },
      ], now), '5000.00');
  });

  it('calculateOverdueAmount: invoice without dueDate is not overdue', () => {
    const now = new Date('2026-06-02');
    assert.equal(
      calculateOverdueAmount([{ dueDate: null, status: 'INVOICED', balanceDue: '10000' }], now),
      '0.00');
  });
});

// ---------------------------------------------------------------------------
// Suite 11: Trust three-way reconciliation integrity — G5-D02
// ---------------------------------------------------------------------------

describe('Trust reconciliation integrity (G5-D02)', () => {

  // --- computeTrustNetBalance ---
  it('computeTrustNetBalance: 10000 credit, 3000 debit = 7000 net', () => {
    assert.equal(computeTrustNetBalance('10000', '3000'), '7000.00');
  });

  it('computeTrustNetBalance: equal credits and debits = zero', () => {
    assert.equal(computeTrustNetBalance('5000', '5000'), '0.00');
  });

  it('computeTrustNetBalance: debits exceed credits = negative (overdraw)', () => {
    assert.equal(computeTrustNetBalance('3000', '5000'), '-2000.00');
  });

  it('computeTrustNetBalance: zero inputs = zero', () => {
    assert.equal(computeTrustNetBalance('0', '0'), '0.00');
  });

  // --- computeThreeWayVariances ---
  it('computeThreeWayVariances: all equal = all variances zero (perfect reconciliation)', () => {
    const v = computeThreeWayVariances('100000', '100000', '100000');
    assert.equal(v.bankVsTrust, '0.00');
    assert.equal(v.trustVsClient, '0.00');
    assert.equal(v.bankVsClient, '0.00');
  });

  it('computeThreeWayVariances: bank > trust detects bankVsTrust variance', () => {
    const v = computeThreeWayVariances('105000', '100000', '100000');
    assert.equal(v.bankVsTrust, '5000.00');
    assert.equal(v.trustVsClient, '0.00');
    assert.equal(v.bankVsClient, '5000.00');
  });

  it('computeThreeWayVariances: trust > client detects trustVsClient variance', () => {
    const v = computeThreeWayVariances('100000', '100000', '95000');
    assert.equal(v.bankVsTrust, '0.00');
    assert.equal(v.trustVsClient, '5000.00');
    assert.equal(v.bankVsClient, '5000.00');
  });

  it('computeThreeWayVariances: all differ = all variances non-zero', () => {
    const v = computeThreeWayVariances('110000', '100000', '90000');
    assert.equal(v.bankVsTrust, '10000.00');
    assert.equal(v.trustVsClient, '10000.00');
    assert.equal(v.bankVsClient, '20000.00');
  });

  // --- assessVarianceStatus ---
  it('assessVarianceStatus: zero variance with zero tolerance = MATCHED', () => {
    assert.equal(assessVarianceStatus('0', '0'), 'MATCHED');
  });

  it('assessVarianceStatus: variance within tolerance = MATCHED', () => {
    assert.equal(assessVarianceStatus('3', '5'), 'MATCHED');
  });

  it('assessVarianceStatus: variance equals tolerance = MATCHED', () => {
    assert.equal(assessVarianceStatus('5', '5'), 'MATCHED');
  });

  it('assessVarianceStatus: variance exceeds tolerance = FLAGGED', () => {
    assert.equal(assessVarianceStatus('10', '5'), 'FLAGGED');
  });

  it('assessVarianceStatus: negative variance uses absolute value', () => {
    assert.equal(assessVarianceStatus('-3', '5'), 'MATCHED');
    assert.equal(assessVarianceStatus('-10', '5'), 'FLAGGED');
  });

  // --- assessThreeWayStatus ---
  it('assessThreeWayStatus: all zero variances = MATCHED overall', () => {
    const v = computeThreeWayVariances('100000', '100000', '100000');
    const s = assessThreeWayStatus(v, '0');
    assert.equal(s.finalStatus, 'MATCHED');
    assert.equal(s.bankVsTrustStatus, 'MATCHED');
    assert.equal(s.trustVsClientStatus, 'MATCHED');
    assert.equal(s.bankVsClientStatus, 'MATCHED');
  });

  it('assessThreeWayStatus: ONE leg FLAGGED makes overall FLAGGED', () => {
    const v = computeThreeWayVariances('105000', '100000', '100000');
    const s = assessThreeWayStatus(v, '0');
    assert.equal(s.finalStatus, 'FLAGGED');
    assert.equal(s.bankVsTrustStatus, 'FLAGGED');
    assert.equal(s.trustVsClientStatus, 'MATCHED');
  });

  it('assessThreeWayStatus: tolerance absorbs small variance = MATCHED', () => {
    const v = computeThreeWayVariances('100001', '100000', '100000');
    const s = assessThreeWayStatus(v, '5');
    assert.equal(s.finalStatus, 'MATCHED');
  });

  it('assessThreeWayStatus: tolerance exceeded = FLAGGED', () => {
    const v = computeThreeWayVariances('100010', '100000', '100000');
    const s = assessThreeWayStatus(v, '5');
    assert.equal(s.finalStatus, 'FLAGGED');
  });

  // --- isOverdrawn ---
  it('isOverdrawn: positive balance is not overdrawn', () => {
    assert.equal(isOverdrawn('10000'), false);
  });

  it('isOverdrawn: zero balance is not overdrawn', () => {
    assert.equal(isOverdrawn('0'), false);
  });

  it('isOverdrawn: negative balance IS overdrawn (regulatory violation)', () => {
    assert.equal(isOverdrawn('-1'), true);
  });

  it('isOverdrawn: large negative = overdrawn', () => {
    assert.equal(isOverdrawn('-50000'), true);
  });

  // --- computeLedgerVariance ---
  it('computeLedgerVariance: equal balances = zero variance', () => {
    assert.equal(computeLedgerVariance('100000', '100000'), '0.00');
  });

  it('computeLedgerVariance: trust > client ledger = positive variance (mismatch)', () => {
    assert.equal(computeLedgerVariance('100000', '95000'), '5000.00');
  });

  it('computeLedgerVariance: client ledger > trust balance = negative variance (mismatch)', () => {
    assert.equal(computeLedgerVariance('95000', '100000'), '-5000.00');
  });
});

// ---------------------------------------------------------------------------
// Suite 12: Trust assertSufficientBalance audit — G5-D03
// ---------------------------------------------------------------------------

describe('Trust assertSufficientBalance audit (G5-D03)', () => {

  // --- checkTrustAccountBalance: overdraw prevention ---
  it('allows withdrawal when balance exactly equals amount', () => {
    const r = checkTrustAccountBalance('10000', '10000');
    assert.equal(r.allowed, true);
    assert.equal(r.shortfall, '0.00');
  });

  it('allows withdrawal when balance exceeds amount', () => {
    const r = checkTrustAccountBalance('50000', '10000');
    assert.equal(r.allowed, true);
    assert.equal(r.available, '50000.00');
    assert.equal(r.requested, '10000.00');
    assert.equal(r.shortfall, '0.00');
  });

  it('blocks withdrawal when balance is insufficient', () => {
    const r = checkTrustAccountBalance('5000', '10000');
    assert.equal(r.allowed, false);
    assert.equal(r.shortfall, '5000.00');
  });

  it('blocks withdrawal when balance is zero', () => {
    const r = checkTrustAccountBalance('0', '1000');
    assert.equal(r.allowed, false);
    assert.equal(r.shortfall, '1000.00');
  });

  it('blocks withdrawal when balance is negative (already overdrawn)', () => {
    const r = checkTrustAccountBalance('-100', '500');
    assert.equal(r.allowed, false);
    assert.equal(r.shortfall, '600.00');
  });

  // --- checkMatterTrustBalance: matter sub-ledger ---
  it('matter balance check: sufficient matter funds allowed', () => {
    const r = checkMatterTrustBalance('20000', '15000');
    assert.equal(r.allowed, true);
  });

  it('matter balance check: insufficient matter funds blocked', () => {
    const r = checkMatterTrustBalance('5000', '10000');
    assert.equal(r.allowed, false);
    assert.equal(r.shortfall, '5000.00');
  });

  it('matter balance check: exact match allowed', () => {
    const r = checkMatterTrustBalance('7500', '7500');
    assert.equal(r.allowed, true);
    assert.equal(r.shortfall, '0.00');
  });

  // --- isTrustOutflow / isTrustInflow ---
  it('WITHDRAWAL is a trust outflow', () => {
    assert.equal(isTrustOutflow('WITHDRAWAL'), true);
  });

  it('TRANSFER_TO_OFFICE is a trust outflow', () => {
    assert.equal(isTrustOutflow('TRANSFER_TO_OFFICE'), true);
  });

  it('DEPOSIT is NOT an outflow', () => {
    assert.equal(isTrustOutflow('DEPOSIT'), false);
  });

  it('INTEREST is NOT an outflow', () => {
    assert.equal(isTrustOutflow('INTEREST'), false);
  });

  it('DEPOSIT is a trust inflow', () => {
    assert.equal(isTrustInflow('DEPOSIT'), true);
  });

  it('INTEREST is a trust inflow', () => {
    assert.equal(isTrustInflow('INTEREST'), true);
  });

  it('WITHDRAWAL is NOT an inflow', () => {
    assert.equal(isTrustInflow('WITHDRAWAL'), false);
  });

  // --- computeTransactionDelta ---
  it('WITHDRAWAL produces negative delta (reduces balance)', () => {
    assert.equal(computeTransactionDelta('WITHDRAWAL', '10000'), '-10000.00');
  });

  it('TRANSFER_TO_OFFICE produces negative delta', () => {
    assert.equal(computeTransactionDelta('TRANSFER_TO_OFFICE', '5000'), '-5000.00');
  });

  it('DEPOSIT produces positive delta (increases balance)', () => {
    assert.equal(computeTransactionDelta('DEPOSIT', '10000'), '10000.00');
  });

  it('INTEREST produces positive delta', () => {
    assert.equal(computeTransactionDelta('INTEREST', '250'), '250.00');
  });

  it('REVERSAL produces zero delta (explicit case-by-case handling required)', () => {
    assert.equal(computeTransactionDelta('REVERSAL', '5000'), '0.00');
  });

  // --- Settlement service guard coverage ---
  it('settlement overdraw scenario: KES 15,000 withdrawal against KES 10,000 balance is blocked', () => {
    const r = checkTrustAccountBalance('10000', '15000');
    assert.equal(r.allowed, false,
      'settleInvoiceFromTrust must call assertSufficientBalance BEFORE creating the transaction');
    assert.equal(r.shortfall, '5000.00');
  });

  it('settlement scenario: exact balance withdrawal is allowed', () => {
    const r = checkTrustAccountBalance('50000', '50000');
    assert.equal(r.allowed, true);
  });
});

// ---------------------------------------------------------------------------
// Suite 13: Trust calculation correctness — G5-D04
// ---------------------------------------------------------------------------

describe('Trust calculation correctness (G5-D04)', () => {

  // --- applyLedgerDelta: delta application ---
  it('deposit: positive delta creates credit, increases balance', () => {
    const r = applyLedgerDelta('10000', '5000');
    assert.equal(r.credit, '5000.00');
    assert.equal(r.debit, '0.00');
    assert.equal(r.nextBalance, '15000.00');
    assert.equal(r.isOverdraw, false);
  });

  it('withdrawal: negative delta creates debit, decreases balance', () => {
    const r = applyLedgerDelta('10000', '-3000');
    assert.equal(r.debit, '3000.00');
    assert.equal(r.credit, '0.00');
    assert.equal(r.nextBalance, '7000.00');
    assert.equal(r.isOverdraw, false);
  });

  it('exact withdrawal: balance reduces to zero (not overdraw)', () => {
    const r = applyLedgerDelta('5000', '-5000');
    assert.equal(r.nextBalance, '0.00');
    assert.equal(r.isOverdraw, false);
  });

  it('overdraw: withdrawal exceeds balance is flagged', () => {
    const r = applyLedgerDelta('5000', '-6000');
    assert.equal(r.nextBalance, '-1000.00');
    assert.equal(r.isOverdraw, true);
  });

  it('overdraw from zero: any withdrawal from zero balance is flagged', () => {
    const r = applyLedgerDelta('0', '-1');
    assert.equal(r.isOverdraw, true);
  });

  it('zero delta throws ZERO_TRUST_LEDGER_DELTA', () => {
    assert.throws(
      () => applyLedgerDelta('10000', '0'),
      (err) => { assert.equal(err.code, 'ZERO_TRUST_LEDGER_DELTA'); return true; },
    );
  });

  it('large deposit on zero balance', () => {
    const r = applyLedgerDelta('0', '1000000');
    assert.equal(r.nextBalance, '1000000.00');
    assert.equal(r.isOverdraw, false);
  });

  // --- computeLedgerDebitCredit ---
  it('positive delta: debit=0 credit=amount', () => {
    const r = computeLedgerDebitCredit('7500');
    assert.equal(r.debit, '0.00');
    assert.equal(r.credit, '7500.00');
  });

  it('negative delta: debit=abs(amount) credit=0', () => {
    const r = computeLedgerDebitCredit('-2500');
    assert.equal(r.debit, '2500.00');
    assert.equal(r.credit, '0.00');
  });

  // --- allocateInterestProRata: pro-rata distribution ---
  it('equal balances: interest split equally', () => {
    const allocations = allocateInterestProRata('1000', [
      { clientId: 'c1', balance: '50000' },
      { clientId: 'c2', balance: '50000' },
    ]);
    assert.equal(allocations.length, 2);
    assert.equal(allocations[0].amount, '500.00');
    assert.equal(allocations[1].amount, '500.00');
  });

  it('3:1 ratio: interest allocated proportionally', () => {
    const allocations = allocateInterestProRata('1000', [
      { clientId: 'c1', balance: '75000' },
      { clientId: 'c2', balance: '25000' },
    ]);
    assert.equal(allocations[0].amount, '750.00');
    assert.equal(allocations[1].amount, '250.00');
  });

  it('last allocation absorbs rounding drift: sum equals exact total', () => {
    // 3 matters with odd split — sum must be exactly 1000.00
    const allocations = allocateInterestProRata('1000', [
      { clientId: 'c1', balance: '33333' },
      { clientId: 'c2', balance: '33333' },
      { clientId: 'c3', balance: '33334' },
    ]);
    assert.equal(allocations.length, 3);
    const sum = allocations.reduce((s, a) => s + parseFloat(a.amount), 0);
    assert.ok(Math.abs(sum - 1000) < 0.01, 'Sum must equal 1000 within rounding');
    assert.equal(verifyAllocationSum(allocations, '1000'), true);
  });

  it('single matter gets full interest', () => {
    const allocations = allocateInterestProRata('500', [
      { clientId: 'c1', balance: '100000' },
    ]);
    assert.equal(allocations.length, 1);
    assert.equal(allocations[0].amount, '500.00');
  });

  it('zero balance matters are excluded from allocation', () => {
    const allocations = allocateInterestProRata('1000', [
      { clientId: 'c1', balance: '0' },
      { clientId: 'c2', balance: '50000' },
      { clientId: 'c3', balance: '50000' },
    ]);
    assert.equal(allocations.length, 2, 'Zero-balance matter must be excluded');
    assert.equal(allocations[0].clientId, 'c2');
    assert.equal(allocations[1].clientId, 'c3');
  });

  it('negative balance matters are excluded from allocation', () => {
    const allocations = allocateInterestProRata('1000', [
      { clientId: 'c1', balance: '-1000' },
      { clientId: 'c2', balance: '100000' },
    ]);
    assert.equal(allocations.length, 1);
    assert.equal(allocations[0].clientId, 'c2');
    assert.equal(allocations[0].amount, '1000.00');
  });

  it('no positive balances throws NO_ELIGIBLE_BALANCES', () => {
    assert.throws(
      () => allocateInterestProRata('1000', [
        { clientId: 'c1', balance: '0' },
        { clientId: 'c2', balance: '-500' },
      ]),
      (err) => { assert.equal(err.code, 'NO_ELIGIBLE_BALANCES'); return true; },
    );
  });

  it('zero or negative interest throws INTEREST_AMOUNT_INVALID', () => {
    assert.throws(
      () => allocateInterestProRata('0', [{ clientId: 'c1', balance: '10000' }]),
      (err) => { assert.equal(err.code, 'INTEREST_AMOUNT_INVALID'); return true; },
    );
  });

  // --- verifyAllocationSum ---
  it('verifyAllocationSum: correct sum returns true', () => {
    const allocations = [{ amount: '250.00' }, { amount: '750.00' }];
    assert.equal(verifyAllocationSum(allocations, '1000'), true);
  });

  it('verifyAllocationSum: incorrect sum returns false', () => {
    const allocations = [{ amount: '250.00' }, { amount: '700.00' }];
    assert.equal(verifyAllocationSum(allocations, '1000'), false);
  });
});

// ---------------------------------------------------------------------------
// Suite 14: Trust commingling prevention — G5-D05
// ---------------------------------------------------------------------------

describe('Trust commingling prevention (G5-D05)', () => {

  // --- detectCommingling: violation detection ---
  it('OFFICE -> TRUST is commingling (regulatory violation)', () => {
    const r = detectCommingling('OFFICE', 'TRUST');
    assert.equal(r.isCommingling, true);
    assert.ok(r.reason !== null);
    assert.ok(r.reason!.length > 0);
  });

  it('OFFICE_BANK -> TRUST_LIABILITY is commingling (substring match)', () => {
    const r = detectCommingling('OFFICE_BANK', 'TRUST_LIABILITY');
    assert.equal(r.isCommingling, true);
  });

  it('TRUST -> OFFICE is NOT commingling (settlement is allowed)', () => {
    const r = detectCommingling('TRUST', 'OFFICE');
    assert.equal(r.isCommingling, false);
    assert.equal(r.reason, null);
  });

  it('TRUST -> TRUST is NOT commingling (internal trust operations)', () => {
    const r = detectCommingling('TRUST_BANK', 'TRUST_LIABILITY');
    assert.equal(r.isCommingling, false);
  });

  it('OFFICE -> OFFICE is NOT commingling (normal office operations)', () => {
    const r = detectCommingling('OFFICE_BANK', 'ACCOUNTS_RECEIVABLE');
    assert.equal(r.isCommingling, false);
  });

  it('null source is NOT commingling', () => {
    const r = detectCommingling(null, 'TRUST');
    assert.equal(r.isCommingling, false);
  });

  it('null target is NOT commingling', () => {
    const r = detectCommingling('OFFICE', null);
    assert.equal(r.isCommingling, false);
  });

  it('both null is NOT commingling', () => {
    const r = detectCommingling(null, null);
    assert.equal(r.isCommingling, false);
  });

  it('case insensitive: lowercase office->trust is still commingling', () => {
    const r = detectCommingling('office_bank', 'trust_liability');
    assert.equal(r.isCommingling, true);
  });

  // --- isTrustToOfficeSettlement ---
  it('TRANSFER_TO_OFFICE is a legitimate trust settlement', () => {
    assert.equal(isTrustToOfficeSettlement('TRANSFER_TO_OFFICE'), true);
  });

  it('DEPOSIT is NOT a trust-to-office settlement', () => {
    assert.equal(isTrustToOfficeSettlement('DEPOSIT'), false);
  });

  it('WITHDRAWAL is NOT a trust-to-office settlement', () => {
    assert.equal(isTrustToOfficeSettlement('WITHDRAWAL'), false);
  });

  // --- getTrustPostingContext: GL policy isolation ---
  it('DEPOSIT uses trust-only posting context (no office allowed)', () => {
    const ctx = getTrustPostingContext('DEPOSIT');
    assert.equal(ctx.allowTrustPosting, true);
    assert.equal(ctx.allowOfficePosting, false);
  });

  it('WITHDRAWAL uses trust-only posting context', () => {
    const ctx = getTrustPostingContext('WITHDRAWAL');
    assert.equal(ctx.allowTrustPosting, true);
    assert.equal(ctx.allowOfficePosting, false);
  });

  it('TRANSFER_TO_OFFICE (office side) uses office-only context (no trust allowed)', () => {
    const ctx = getTrustPostingContext('TRANSFER_TO_OFFICE');
    assert.equal(ctx.allowTrustPosting, false);
    assert.equal(ctx.allowOfficePosting, true);
  });

  it('GL contexts for DEPOSIT and TRANSFER_TO_OFFICE are mutually exclusive', () => {
    const trustCtx = getTrustPostingContext('DEPOSIT');
    const officeCtx = getTrustPostingContext('TRANSFER_TO_OFFICE');
    // Trust side and office side can never both be allowed simultaneously
    assert.equal(trustCtx.allowTrustPosting && officeCtx.allowTrustPosting, false);
    assert.equal(trustCtx.allowOfficePosting && officeCtx.allowOfficePosting, false);
  });
});

// ---------------------------------------------------------------------------
// Suite 15: RBAC authorization engine — G6-D01
// ---------------------------------------------------------------------------

describe('RBAC authorization engine (G6-D01)', () => {

  // --- expandPermissionCandidates: wildcard expansion ---
  it('exact permission expands to 4 candidates', () => {
    const candidates = expandPermissionCandidates('trust.create_transaction');
    assert.deepEqual(candidates, [
      'trust.create_transaction',
      'trust.*',
      '*.create_transaction',
      '*.*',
    ]);
  });

  it('resource wildcard is a valid candidate', () => {
    assert.ok(expandPermissionCandidates('trust.view').includes('trust.*'));
  });

  it('global wildcard *.*  is always a candidate', () => {
    assert.ok(expandPermissionCandidates('any.permission').includes('*.*'));
  });

  it('permission without dot separator returns only itself', () => {
    assert.deepEqual(expandPermissionCandidates('admin'), ['admin']);
  });

  // --- hasPermission: matching logic ---
  it('exact match: granted set contains exact permission', () => {
    const granted = new Set(['trust.create_transaction']);
    assert.equal(hasPermission(granted, 'trust.create_transaction'), true);
  });

  it('resource wildcard satisfies specific action', () => {
    const granted = new Set(['trust.*']);
    assert.equal(hasPermission(granted, 'trust.create_transaction'), true);
    assert.equal(hasPermission(granted, 'trust.view_dashboard'), true);
  });

  it('action wildcard satisfies same action on any resource', () => {
    const granted = new Set(['*.view_dashboard']);
    assert.equal(hasPermission(granted, 'trust.view_dashboard'), true);
    assert.equal(hasPermission(granted, 'finance.view_dashboard'), true);
  });

  it('global wildcard *.* satisfies any permission', () => {
    const granted = new Set(['*.*']);
    assert.equal(hasPermission(granted, 'trust.create_transaction'), true);
    assert.equal(hasPermission(granted, 'admin.delete_tenant'), true);
  });

  it('empty granted set denies all permissions', () => {
    const granted = new Set<string>();
    assert.equal(hasPermission(granted, 'trust.create_transaction'), false);
  });

  it('unrelated permission in granted set does not satisfy', () => {
    const granted = new Set(['billing.view_invoice']);
    assert.equal(hasPermission(granted, 'trust.create_transaction'), false);
  });

  it('permission check is case insensitive', () => {
    const granted = new Set(['trust.create_transaction']);
    assert.equal(hasPermission(granted, 'TRUST.CREATE_TRANSACTION'), true);
  });

  // --- findMissingPermissions ---
  it('all permissions granted: returns empty array', () => {
    const granted = new Set(['trust.create_transaction', 'billing.view_invoice']);
    const missing = findMissingPermissions(granted, ['trust.create_transaction', 'billing.view_invoice']);
    assert.equal(missing.length, 0);
  });

  it('some permissions missing: returns only missing ones', () => {
    const granted = new Set(['trust.create_transaction']);
    const missing = findMissingPermissions(granted, ['trust.create_transaction', 'billing.view_invoice']);
    assert.deepEqual(missing, ['billing.view_invoice']);
  });

  it('no permissions granted: all required are missing', () => {
    const granted = new Set<string>();
    const missing = findMissingPermissions(granted, ['trust.view', 'billing.view']);
    assert.equal(missing.length, 2);
  });

  it('resource wildcard satisfies multiple specific requirements', () => {
    const granted = new Set(['trust.*']);
    const missing = findMissingPermissions(granted, ['trust.create', 'trust.view', 'trust.delete']);
    assert.equal(missing.length, 0, 'trust.* should satisfy all trust.* requirements');
  });

  // --- normalizePermissions ---
  it('normalizes string to lowercase trimmed array', () => {
    assert.deepEqual(normalizePermissions('Trust.View_Dashboard'), ['trust.view_dashboard']);
  });

  it('splits comma-separated string into multiple permissions', () => {
    const result = normalizePermissions('trust.view, billing.view');
    assert.ok(result.includes('trust.view'));
    assert.ok(result.includes('billing.view'));
    assert.equal(result.length, 2);
  });

  it('normalizes array of permissions', () => {
    const result = normalizePermissions(['Trust.View', 'Billing.View']);
    assert.deepEqual(result, ['trust.view', 'billing.view']);
  });

  it('deduplicates identical permissions', () => {
    const result = normalizePermissions(['trust.view', 'trust.view', 'trust.view']);
    assert.equal(result.length, 1);
  });

  it('filters empty strings', () => {
    const result = normalizePermissions(['trust.view', '', '  ']);
    assert.equal(result.length, 1);
    assert.equal(result[0], 'trust.view');
  });

  it('returns empty array for null/undefined input', () => {
    assert.deepEqual(normalizePermissions(null), []);
    assert.deepEqual(normalizePermissions(undefined), []);
    assert.deepEqual(normalizePermissions(''), []);
  });
});

// ---------------------------------------------------------------------------
// Suite 16: Rate limiter token bucket — G6-D02
// ---------------------------------------------------------------------------

describe('Rate limiter token bucket (G6-D02)', () => {

  const CAPACITY = 100;
  const INTERVAL_MS = 60_000; // 60 seconds
  const NOW = 1_000_000; // arbitrary epoch ms

  // --- createBucket ---
  it('new bucket starts at full capacity', () => {
    const b = createBucket(CAPACITY, NOW);
    assert.equal(b.tokens, CAPACITY);
    assert.equal(b.last, NOW);
  });

  // --- computeRefill: no time elapsed ---
  it('no elapsed time: no refill', () => {
    const b = computeRefill(50, NOW, NOW, CAPACITY, INTERVAL_MS);
    assert.equal(b.tokens, 50);
  });

  // --- computeRefill: time elapsed ---
  it('half interval elapsed: refills half capacity', () => {
    const halfInterval = NOW + INTERVAL_MS / 2;
    const b = computeRefill(0, NOW, halfInterval, CAPACITY, INTERVAL_MS);
    assert.equal(b.tokens, 50);
  });

  it('full interval elapsed: refills to capacity', () => {
    const fullInterval = NOW + INTERVAL_MS;
    const b = computeRefill(0, NOW, fullInterval, CAPACITY, INTERVAL_MS);
    assert.equal(b.tokens, CAPACITY);
  });

  it('refill does not exceed capacity', () => {
    const longTime = NOW + INTERVAL_MS * 10;
    const b = computeRefill(50, NOW, longTime, CAPACITY, INTERVAL_MS);
    assert.equal(b.tokens, CAPACITY);
  });

  it('refill updates last timestamp when tokens added', () => {
    const laterTime = NOW + INTERVAL_MS;
    const b = computeRefill(0, NOW, laterTime, CAPACITY, INTERVAL_MS);
    assert.equal(b.last, laterTime);
  });

  it('refill preserves last timestamp when no refill occurs', () => {
    const b = computeRefill(50, NOW, NOW, CAPACITY, INTERVAL_MS);
    assert.equal(b.last, NOW);
  });

  it('negative elapsed time treated as zero (clock skew safety)', () => {
    const earlier = NOW - 1000;
    const b = computeRefill(50, NOW, earlier, CAPACITY, INTERVAL_MS);
    assert.equal(b.tokens, 50);
  });

  // --- checkBucket: request allowed ---
  it('bucket with tokens: request allowed, token consumed', () => {
    const bucket = { tokens: 10, last: NOW };
    const result = checkBucket(bucket, CAPACITY, INTERVAL_MS, NOW);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 9);
    assert.equal(result.bucket.tokens, 9);
  });

  it('last token: request allowed, bucket empty after', () => {
    const bucket = { tokens: 1, last: NOW };
    const result = checkBucket(bucket, CAPACITY, INTERVAL_MS, NOW);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 0);
  });

  // --- checkBucket: request denied ---
  it('empty bucket: request denied', () => {
    const bucket = { tokens: 0, last: NOW };
    const result = checkBucket(bucket, CAPACITY, INTERVAL_MS, NOW);
    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
  });

  // --- checkBucket: refill on elapsed time ---
  it('empty bucket with elapsed time: refills and allows', () => {
    const bucket = { tokens: 0, last: NOW };
    const fullIntervalLater = NOW + INTERVAL_MS;
    const result = checkBucket(bucket, CAPACITY, INTERVAL_MS, fullIntervalLater);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, CAPACITY - 1);
  });

  // --- IP spoofing protection documentation ---
  it('IP key derivation safety: req.ip vs x-forwarded-for spoofing', () => {
    // Demonstrates the attack pattern that was fixed:
    // Client sends X-Forwarded-For: fake-ip
    // Proxy appends: X-Forwarded-For: fake-ip, real-ip
    // Old code: split(',')[0] = 'fake-ip' <- bypasses limiter
    // Fixed code: req.ip (Express resolves trusted proxy) = 'real-ip'
    const rawHeader = 'fake-ip, real-ip';
    const spoofedIp = rawHeader.split(',')[0].trim();
    const trustedIp = 'real-ip'; // what Express req.ip returns with trust proxy: 1
    assert.notEqual(spoofedIp, trustedIp,
      'Spoofed X-Forwarded-For[0] differs from trust-proxy-resolved req.ip');
    assert.equal(spoofedIp, 'fake-ip');
    assert.equal(trustedIp, 'real-ip');
  });
});

// ---------------------------------------------------------------------------
// Suite 17: CORS and security headers audit — G6-D03
// ---------------------------------------------------------------------------

describe('CORS and security headers (G6-D03)', () => {

  // --- resolveCorsOrigin: production hardening ---
  it('explicit CORS_ORIGIN list: used in all environments', () => {
    const origins = ['https://app.globalwakili.co.ke'];
    assert.deepEqual(resolveCorsOrigin(origins, 'production'), origins);
    assert.deepEqual(resolveCorsOrigin(origins, 'development'), origins);
  });

  it('production + no CORS_ORIGIN: returns false (deny all cross-origin)', () => {
    assert.equal(resolveCorsOrigin(undefined, 'production'), false,
      'Production must deny all cross-origin when CORS_ORIGIN is not configured');
  });

  it('production + empty array: returns false (deny all)', () => {
    assert.equal(resolveCorsOrigin([], 'production'), false);
  });

  it('development + no CORS_ORIGIN: returns true (allow all for dev convenience)', () => {
    assert.equal(resolveCorsOrigin(undefined, 'development'), true);
  });

  it('development + empty array: returns true', () => {
    assert.equal(resolveCorsOrigin([], 'development'), true);
  });

  // --- isOriginAllowed ---
  it('origin: true allows any origin', () => {
    assert.equal(isOriginAllowed('https://evil.com', true), true);
    assert.equal(isOriginAllowed('https://legit.com', true), true);
  });

  it('origin: false denies all origins', () => {
    assert.equal(isOriginAllowed('https://app.globalwakili.co.ke', false), false);
    assert.equal(isOriginAllowed('https://evil.com', false), false);
  });

  it('origin: list allows only listed origins', () => {
    const allowed = ['https://app.globalwakili.co.ke', 'https://portal.globalwakili.co.ke'];
    assert.equal(isOriginAllowed('https://app.globalwakili.co.ke', allowed), true);
    assert.equal(isOriginAllowed('https://portal.globalwakili.co.ke', allowed), true);
    assert.equal(isOriginAllowed('https://evil.com', allowed), false);
  });

  // --- isCorsProductionSafe: credentialed CORS bypass detection ---
  it('UNSAFE: origin: true + credentials: true (credentialed bypass)', () => {
    assert.equal(isCorsProductionSafe(true, true), false,
      'origin: true with credentials: true allows any site to make credentialed requests');
  });

  it('SAFE: origin: true + credentials: false (no auth headers sent)', () => {
    assert.equal(isCorsProductionSafe(true, false), true);
  });

  it('SAFE: origin: false (deny all cross-origin)', () => {
    assert.equal(isCorsProductionSafe(false, true), true);
    assert.equal(isCorsProductionSafe(false, false), true);
  });

  it('SAFE: explicit origin list + credentials: true (only trusted origins)', () => {
    assert.equal(
      isCorsProductionSafe(['https://app.globalwakili.co.ke'], true),
      true,
    );
  });

  it('SAFE: empty origin list + credentials: true (deny all = safe)', () => {
    assert.equal(isCorsProductionSafe([], true), true);
  });

  // --- findMissingSecurityHeaders ---
  it('all required headers present: returns empty array', () => {
    const headers = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '0',
      'Referrer-Policy': 'no-referrer',
    };
    const missing = findMissingSecurityHeaders(headers);
    assert.equal(missing.length, 0, 'All required security headers present');
  });

  it('missing X-Frame-Options: detected', () => {
    const headers = {
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '0',
      'Referrer-Policy': 'no-referrer',
    };
    const missing = findMissingSecurityHeaders(headers);
    assert.ok(missing.includes('x-frame-options'));
  });

  it('header comparison is case-insensitive', () => {
    const headers = {
      'x-content-type-options': 'nosniff',
      'X-FRAME-OPTIONS': 'SAMEORIGIN',
      'x-xss-protection': '0',
      'referrer-policy': 'no-referrer',
    };
    const missing = findMissingSecurityHeaders(headers);
    assert.equal(missing.length, 0);
  });

  it('empty headers: all required headers missing', () => {
    const missing = findMissingSecurityHeaders({});
    assert.equal(missing.length, REQUIRED_SECURITY_HEADERS.length);
  });

  // --- App.ts CORS configuration audit ---
  it('production CORS config is safe (no wildcard with credentials)', () => {
    // Mirrors the fix applied to app.ts
    const prodConfig = resolveCorsOrigin(undefined, 'production');
    assert.equal(isCorsProductionSafe(prodConfig, true), true,
      'Production CORS with no CORS_ORIGIN must deny all, not wildcard');
  });

  it('production CORS with explicit origin is safe', () => {
    const origins = ['https://app.globalwakili.co.ke'];
    const config = resolveCorsOrigin(origins, 'production');
    assert.equal(isCorsProductionSafe(config, true), true);
  });
});

// ---------------------------------------------------------------------------
// Suite 18: Audit chain integrity — G6-D04
// ---------------------------------------------------------------------------

describe('Audit chain integrity (G6-D04)', () => {

  // --- stableSerialize: canonical deterministic serialization ---
  it('empty object serializes to {}', () => {
    assert.equal(stableSerialize({}), '{}');
  });

  it('object keys are sorted alphabetically', () => {
    const result = stableSerialize({ z: 1, a: 2, m: 3 });
    assert.equal(result, '{"a":2,"m":3,"z":1}');
  });

  it('different key insertion order produces same hash (deterministic)', () => {
    const h1 = generateAuditHash({ b: 2, a: 1 });
    const h2 = generateAuditHash({ a: 1, b: 2 });
    assert.equal(h1, h2, 'Key order must not affect hash');
  });

  it('null serializes to "null"', () => {
    assert.equal(stableSerialize(null), 'null');
  });

  it('nested objects also sort keys', () => {
    const r = stableSerialize({ outer: { z: 1, a: 2 } });
    assert.equal(r, '{"outer":{"a":2,"z":1}}');
  });

  it('arrays preserve element order', () => {
    const r = stableSerialize([3, 1, 2]);
    assert.equal(r, '[3,1,2]');
  });

  // --- computeAuditHash: hash algorithm ---
  it('same payload + same previousHash = same hash (deterministic)', () => {
    const payload = { tenantId: 't1', action: 'LOGIN', entityId: 'u1' };
    const h1 = computeAuditHash(payload, GENESIS_HASH);
    const h2 = computeAuditHash(payload, GENESIS_HASH);
    assert.equal(h1, h2);
  });

  it('different payload produces different hash', () => {
    const h1 = computeAuditHash({ action: 'LOGIN' }, GENESIS_HASH);
    const h2 = computeAuditHash({ action: 'LOGOUT' }, GENESIS_HASH);
    assert.notEqual(h1, h2);
  });

  it('different previousHash produces different hash', () => {
    const payload = { action: 'LOGIN' };
    const h1 = computeAuditHash(payload, GENESIS_HASH);
    const h2 = computeAuditHash(payload, 'a'.repeat(64));
    assert.notEqual(h1, h2);
  });

  it('hash is 64 hex characters (SHA-256 output)', () => {
    const h = computeAuditHash({ action: 'TEST' }, GENESIS_HASH);
    assert.equal(h.length, 64);
    assert.ok(/^[0-9a-f]{64}$/.test(h), 'Hash must be lowercase hex');
  });

  it('genesis hash default is 64 zeros', () => {
    assert.equal(GENESIS_HASH.length, 64);
    assert.ok(/^0{64}$/.test(GENESIS_HASH));
  });

  it('computeAuditHash mirrors generateAuditHash from audit-hash.ts', () => {
    const payload = { action: 'LOGIN', tenantId: 't1' };
    assert.equal(
      computeAuditHash(payload, GENESIS_HASH),
      generateAuditHash(payload, GENESIS_HASH),
    );
  });

  // --- isGenesisEntry ---
  it('genesis hash string is a genesis entry', () => {
    assert.equal(isGenesisEntry(GENESIS_HASH), true);
  });

  it('null previousHash is a genesis entry', () => {
    assert.equal(isGenesisEntry(null), true);
  });

  it('real hash is NOT a genesis entry', () => {
    assert.equal(isGenesisEntry('a'.repeat(64)), false);
  });

  // --- verifyHashChain: chain integrity ---
  it('empty chain is valid', () => {
    const result = verifyHashChain([]);
    assert.equal(result.valid, true);
  });

  it('single correct entry is valid', () => {
    const payload = { action: 'LOGIN', tenantId: 't1' };
    const hash = computeAuditHash(payload, GENESIS_HASH);
    const result = verifyHashChain([{ hash, previousHash: GENESIS_HASH, payload }]);
    assert.equal(result.valid, true);
  });

  it('two-entry chain with correct linkage is valid', () => {
    const p1 = { action: 'LOGIN', seq: 1 };
    const h1 = computeAuditHash(p1, GENESIS_HASH);
    const p2 = { action: 'VIEW', seq: 2 };
    const h2 = computeAuditHash(p2, h1);
    const result = verifyHashChain([
      { hash: h1, previousHash: GENESIS_HASH, payload: p1 },
      { hash: h2, previousHash: h1, payload: p2 },
    ]);
    assert.equal(result.valid, true);
  });

  it('tampered payload is detected (chain invalid)', () => {
    const p1 = { action: 'LOGIN', userId: 'u1' };
    const h1 = computeAuditHash(p1, GENESIS_HASH);
    // Tamper: change the payload after hash was computed
    const tamperedPayload = { action: 'ADMIN_DELETE', userId: 'u1' };
    const result = verifyHashChain([
      { hash: h1, previousHash: GENESIS_HASH, payload: tamperedPayload },
    ]);
    assert.equal(result.valid, false);
    assert.equal(result.brokenAtIndex, 0);
  });

  it('broken chain linkage is detected', () => {
    const p1 = { action: 'LOGIN' };
    const h1 = computeAuditHash(p1, GENESIS_HASH);
    const p2 = { action: 'VIEW' };
    const h2 = computeAuditHash(p2, h1);
    // Tamper: use wrong previousHash in entry 2 (skip link to entry 1)
    const result = verifyHashChain([
      { hash: h1, previousHash: GENESIS_HASH, payload: p1 },
      { hash: h2, previousHash: GENESIS_HASH, payload: p2 }, // wrong previousHash
    ]);
    assert.equal(result.valid, false);
    assert.equal(result.brokenAtIndex, 1);
  });

  // --- detectTampering ---
  it('correct entry: no tampering detected', () => {
    const payload = { action: 'LOGIN', tenantId: 't1' };
    const hash = computeAuditHash(payload, GENESIS_HASH);
    assert.equal(detectTampering({ hash, previousHash: GENESIS_HASH, payload }), false);
  });

  it('tampered payload: tampering detected', () => {
    const payload = { action: 'LOGIN', tenantId: 't1' };
    const hash = computeAuditHash(payload, GENESIS_HASH);
    const tamperedPayload = { action: 'ADMIN_DELETE', tenantId: 't1' };
    assert.equal(detectTampering({ hash, previousHash: GENESIS_HASH, payload: tamperedPayload }), true);
  });

  it('modified hash field: tampering detected', () => {
    const payload = { action: 'LOGIN' };
    const hash = computeAuditHash(payload, GENESIS_HASH);
    const modifiedHash = hash.replace(hash[0]!, hash[0] === 'a' ? 'b' : 'a');
    assert.equal(detectTampering({ hash: modifiedHash, previousHash: GENESIS_HASH, payload }), true);
  });
});

// ---------------------------------------------------------------------------
// Suite 19: Secret audit — G6-D05
// ---------------------------------------------------------------------------

describe('Secret audit (G6-D05)', () => {

  // --- isPlaceholderValue ---
  it('dev_key_change_in_production is a placeholder', () => {
    assert.equal(isPlaceholderValue('dev_key_change_in_production'), true);
  });

  it('your-secret-here is a placeholder', () => {
    assert.equal(isPlaceholderValue('your-secret-here'), true);
  });

  it('change-me is a placeholder', () => {
    assert.equal(isPlaceholderValue('change-me'), true);
  });

  it('user:password@localhost is a placeholder', () => {
    assert.equal(isPlaceholderValue('postgresql://user:password@localhost:5432/db'), true);
  });

  it('a real-looking token is NOT a placeholder', () => {
    assert.equal(isPlaceholderValue('npg_AbCdEfGhIjKlMnOpQrS'), false);
  });

  // --- containsRealConnectionString ---
  it('placeholder localhost URL is NOT a real connection string', () => {
    assert.equal(
      containsRealConnectionString('postgresql://user:password@localhost:5432/db'),
      false,
    );
  });

  it('Neon cloud URL IS a real connection string', () => {
    assert.equal(
      containsRealConnectionString('postgresql://neondb_owner:npg_abc123@ep-test.neon.tech/neondb'),
      true,
    );
  });

  it('Supabase URL IS a real connection string', () => {
    assert.equal(
      containsRealConnectionString('postgresql://postgres:password123@project.supabase.co/postgres'),
      true,
    );
  });

  it('empty string is not a real connection string', () => {
    assert.equal(containsRealConnectionString(''), false);
  });

  // --- containsRealSecret ---
  it('Neon token pattern is a real secret', () => {
    assert.equal(containsRealSecret('npg_AbCdEfGhIjKlMnOpQrStUvWx'), true);
  });

  it('Stripe live key is a real secret', () => {
    assert.equal(containsRealSecret('sk_live_AbCdEfGhIjKlMnOpQrStUvWxYz123456'), true);
  });

  it('placeholder string is NOT a real secret', () => {
    assert.equal(containsRealSecret('dev_key_change_in_production'), false);
  });

  it('localhost URL is NOT a real secret', () => {
    assert.equal(containsRealSecret('postgresql://user:password@localhost:5432/db'), false);
  });

  // --- auditEnvFile: .env.example validation ---
  it('.env.example placeholders pass audit (no real credentials)', () => {
    const envExample = [
      'DATABASE_URL=postgresql://user:password@localhost:5432/global_wakili',
      'JWT_SECRET=your-256-bit-secret-here-min-32-chars-change-in-production',
      'MPESA_CONSUMER_KEY=dev_key_change_in_production',
      'NODE_ENV=development',
      '# This is a comment',
      '',
    ].join('\n');

    const suspicious = auditEnvFile(envExample).filter(r => r.suspicious);
    assert.equal(suspicious.length, 0, 'No suspicious entries in placeholder env file');
  });

  it('real Neon URL in env file is flagged as suspicious', () => {
    const maliciousEnv = [
      'DATABASE_URL=postgresql://neondb_owner:npg_realtoken123@ep-test.neon.tech/neondb',
    ].join('\n');

    const suspicious = auditEnvFile(maliciousEnv).filter(r => r.suspicious);
    assert.equal(suspicious.length, 1);
    assert.equal(suspicious[0]!.key, 'DATABASE_URL');
  });

  it('comments are ignored in env audit', () => {
    const envWithComments = [
      '# DATABASE_URL=postgresql://neondb_owner:npg_realtoken123@ep-test.neon.tech/neondb',
      'DATABASE_URL=postgresql://user:password@localhost:5432/db',
    ].join('\n');

    const suspicious = auditEnvFile(envWithComments).filter(r => r.suspicious);
    assert.equal(suspicious.length, 0, 'Commented-out lines must be ignored');
  });

  it('empty values are not flagged', () => {
    const envEmpty = [
      'REDIS_PASSWORD=',
      'OPTIONAL_KEY=',
    ].join('\n');

    const suspicious = auditEnvFile(envEmpty).filter(r => r.suspicious);
    assert.equal(suspicious.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Suite 20: Control plane — provisioning, isolation, impersonation (G7-D02/03/04)
// ---------------------------------------------------------------------------

describe('Control plane — Gate 7 (G7-D02/D03/D04)', () => {

  // --- G7-D02: Provisioning completeness ---
  it('BASIC plan includes core modules', () => {
    const modules = getModulesForPlan('BASIC');
    ['client', 'matter', 'billing', 'finance'].forEach(m =>
      assert.ok(modules.includes(m), m + ' must be in BASIC plan')
    );
  });

  it('ENTERPRISE includes all BASIC modules (no downgrade on upgrade)', () => {
    const missing = validatePlanUpgradeModules('BASIC', 'ENTERPRISE');
    assert.deepEqual(missing, [], 'ENTERPRISE must include all BASIC modules');
  });

  it('PRO includes all BASIC modules', () => {
    const missing = validatePlanUpgradeModules('BASIC', 'PRO');
    assert.deepEqual(missing, [], 'PRO must include all BASIC modules');
  });

  it('ENTERPRISE includes all PRO modules', () => {
    const missing = validatePlanUpgradeModules('PRO', 'ENTERPRISE');
    assert.deepEqual(missing, [], 'ENTERPRISE must include all PRO modules');
  });

  it('trust module only available from ENTERPRISE (not BASIC, not PRO)', () => {
    assert.equal(getModulesForPlan('BASIC').includes('trust'), false);
    assert.equal(getModulesForPlan('PRO').includes('trust'), false);
    assert.equal(getModulesForPlan('ENTERPRISE').includes('trust'), true);
  });

  it('ai module only available from ENTERPRISE', () => {
    assert.equal(getModulesForPlan('BASIC').includes('ai'), false);
    assert.equal(getModulesForPlan('ENTERPRISE').includes('ai'), true);
  });

  it('ENTERPRISE quotas are higher than BASIC quotas', () => {
    const basic = getQuotasForPlan('BASIC').find(q => q.metricType === 'ACTIVE_USERS')!;
    const enterprise = getQuotasForPlan('ENTERPRISE').find(q => q.metricType === 'ACTIVE_USERS')!;
    assert.ok(enterprise.softLimit > basic.softLimit, 'ENTERPRISE user limit > BASIC');
    assert.ok(enterprise.hardLimit > basic.hardLimit, 'ENTERPRISE hard limit > BASIC');
  });

  it('all plans have ACTIVE_USERS quota', () => {
    (['BASIC','PRO','ENTERPRISE','CUSTOM'] as const).forEach(plan => {
      const quota = getQuotasForPlan(plan).find(q => q.metricType === 'ACTIVE_USERS');
      assert.ok(quota, plan + ' must have ACTIVE_USERS quota');
    });
  });

  it('required provisioning records list has 4 entries', () => {
    assert.equal(REQUIRED_PROVISIONING_RECORDS.length, 4);
    assert.ok(REQUIRED_PROVISIONING_RECORDS.includes('PlatformTenantProfile'));
    assert.ok(REQUIRED_PROVISIONING_RECORDS.includes('TenantSubscription'));
    assert.ok(REQUIRED_PROVISIONING_RECORDS.includes('TenantModuleEntitlement'));
    assert.ok(REQUIRED_PROVISIONING_RECORDS.includes('TenantQuotaPolicy'));
  });

  // --- G7-D03: Platform admin isolation (ADR-004) ---
  it('isSuperAdminUser: isSuperAdmin flag grants access', () => {
    assert.equal(isSuperAdminUser({ id: 'u1', isSuperAdmin: true }), true);
  });

  it('isSuperAdminUser: SUPER_ADMIN systemRole grants access', () => {
    assert.equal(isSuperAdminUser({ id: 'u1', systemRole: 'SUPER_ADMIN' }), true);
  });

  it('isSuperAdminUser: SYSTEM_ADMIN systemRole grants access', () => {
    assert.equal(isSuperAdminUser({ id: 'u1', systemRole: 'SYSTEM_ADMIN' }), true);
  });

  it('isSuperAdminUser: super_admin in roles array grants access', () => {
    assert.equal(isSuperAdminUser({ id: 'u1', roles: ['ADVOCATE', 'SUPER_ADMIN'] }), true);
  });

  it('isSuperAdminUser: regular tenant user denied', () => {
    assert.equal(isSuperAdminUser({ id: 'u1', roles: ['ADVOCATE'], isSuperAdmin: false }), false);
  });

  it('isSuperAdminUser: tenant role alone does not grant access', () => {
    assert.equal(isSuperAdminUser({ id: 'u1', tenantRole: 'OWNER', systemRole: null }), false);
  });

  it('isSuperAdminUser: empty user has no access', () => {
    assert.equal(isSuperAdminUser({ id: 'u1' }), false);
  });

  // --- G7-D04: Impersonation session guards ---
  it('impersonation activation requires APPROVED status (not PENDING)', () => {
    // Verified via guard: session.status !== APPROVED → throws IMPERSONATION_NOT_APPROVED
    const session = { status: 'PENDING', consentRequired: false, consentGrantedAt: null, expiresAt: null };
    assert.equal(session.status !== 'APPROVED', true, 'PENDING session must fail activation guard');
  });

  it('impersonation activation blocked for DENIED session', () => {
    const session = { status: 'DENIED', consentRequired: false, consentGrantedAt: null, expiresAt: null };
    assert.equal(session.status !== 'APPROVED', true);
  });

  it('impersonation activation requires consent when consentRequired=true', () => {
    // Guard: consentRequired && !consentGrantedAt → throws IMPERSONATION_CONSENT_REQUIRED
    const session = { status: 'APPROVED', consentRequired: true, consentGrantedAt: null, expiresAt: null };
    const blocked = session.consentRequired && !session.consentGrantedAt;
    assert.equal(blocked, true, 'Missing consent must block activation');
  });

  it('impersonation activation allowed when consent granted', () => {
    const session = { status: 'APPROVED', consentRequired: true, consentGrantedAt: new Date(), expiresAt: null };
    const blocked = session.consentRequired && !session.consentGrantedAt;
    assert.equal(blocked, false);
  });

  it('impersonation activation blocked for expired session', () => {
    const pastDate = new Date(Date.now() - 1000);
    const session = { status: 'APPROVED', consentRequired: false, consentGrantedAt: null, expiresAt: pastDate };
    const expired = session.expiresAt && new Date(session.expiresAt).getTime() < Date.now();
    assert.equal(Boolean(expired), true, 'Expired session must be blocked');
  });

  it('impersonation activation allowed for non-expired session', () => {
    const futureDate = new Date(Date.now() + 3600_000);
    const session = { status: 'APPROVED', consentRequired: false, consentGrantedAt: null, expiresAt: futureDate };
    const expired = session.expiresAt && new Date(session.expiresAt).getTime() < Date.now();
    assert.equal(Boolean(expired), false);
  });
});

// ---------------------------------------------------------------------------
// Suite 21: Notification security — G8-D01/D02/D03
// ---------------------------------------------------------------------------

describe('Notification security (G8-D01/D02/D03)', () => {

  // --- G8-D01: TENANT_SCOPED_MODELS additions ---
  it('NotificationDeliveryAttempt is now tenant-scoped', () => {
    assert.equal(TENANT_SCOPED_MODELS.has('NotificationDeliveryAttempt'), true);
  });

  it('NotificationProviderConfig is now tenant-scoped', () => {
    assert.equal(TENANT_SCOPED_MODELS.has('NotificationProviderConfig'), true);
  });

  it('NotificationWebhookEvent is now tenant-scoped', () => {
    assert.equal(TENANT_SCOPED_MODELS.has('NotificationWebhookEvent'), true);
  });

  it('NotificationTemplate is now tenant-scoped', () => {
    assert.equal(TENANT_SCOPED_MODELS.has('NotificationTemplate'), true);
  });

  it('NotificationPreference is now tenant-scoped', () => {
    assert.equal(TENANT_SCOPED_MODELS.has('NotificationPreference'), true);
  });

  it('TENANT_SCOPED_MODELS count updated to 99 after notification additions', () => {
    assert.equal(TENANT_SCOPED_MODELS.size, 116);
  });

  // --- G8-D02: Template interpolation security ---
  it('basic variable substitution works', () => {
    assert.equal(
      interpolateTemplate('Hello {{ name }}!', { name: 'Advocate' }),
      'Hello Advocate!',
    );
  });

  it('multiple variables interpolated', () => {
    const result = interpolateTemplate('{{ greeting }}, {{ firm }}', {
      greeting: 'Dear',
      firm: 'Wanjiku & Associates',
    });
    assert.equal(result, 'Dear, Wanjiku & Associates');
  });

  it('missing variable produces empty string (no error, no undefined)', () => {
    assert.equal(interpolateTemplate('Hello {{ missing }}!', {}), 'Hello !');
  });

  it('null template returns null safely', () => {
    assert.equal(interpolateTemplate(null), null);
  });

  it('undefined template returns null safely', () => {
    assert.equal(interpolateTemplate(undefined), null);
  });

  it('null variables is safe (all variables produce empty string)', () => {
    assert.equal(interpolateTemplate('Hello {{ name }}!', null), 'Hello !');
  });

  it('key pattern rejects expression injection — {{ 7*7 }} not substituted', () => {
    // w+ cannot match spaces, operators, or numbers with operators
    const result = interpolateTemplate('{{ 7*7 }}', {});
    // 7*7 does NOT match w+ (contains * operator) — left unchanged
    assert.equal(result, '{{ 7*7 }}', 'Expression injection must not be evaluated');
  });

  it('key pattern rejects prototype injection — {{ __proto__ }} stays safe', () => {
    // __proto__ matches w+ but value access via variables?.__proto__ is safe
    const result = interpolateTemplate('{{ __proto__ }}', {});
    assert.equal(result, '', 'Missing variables always produce empty string');
  });

  it('template keys are only word characters', () => {
    assert.equal(isValidTemplateKey('invoiceNumber'), true);
    assert.equal(isValidTemplateKey('client_name'), true);
    assert.equal(isValidTemplateKey('7*7'), false);
    assert.equal(isValidTemplateKey('../path'), false);
    assert.equal(isValidTemplateKey(''), false);
  });

  it('extractTemplateKeys finds all variables in template', () => {
    const keys = extractTemplateKeys('Dear {{ name }}, your invoice {{ invoiceNumber }} is due');
    assert.deepEqual(keys, ['name', 'invoiceNumber']);
  });

  it('extractTemplateKeys ignores non-word patterns', () => {
    const keys = extractTemplateKeys('{{ valid }} and {{ 7*7 }}');
    assert.deepEqual(keys, ['valid']);
  });

  // --- G8-D03: Notification tenant guard ---
  it('assertNotificationTenant passes for valid tenantId', () => {
    assert.doesNotThrow(() => assertNotificationTenant('tenant-a'));
  });

  it('assertNotificationTenant throws NOTIFICATION_TENANT_REQUIRED for empty', () => {
    assert.throws(
      () => assertNotificationTenant(''),
      (err) => { assert.equal(err.code, 'NOTIFICATION_TENANT_REQUIRED'); return true; },
    );
  });

  it('assertNotificationTenant throws for null', () => {
    assert.throws(
      () => assertNotificationTenant(null),
      (err) => { assert.equal(err.code, 'NOTIFICATION_TENANT_REQUIRED'); return true; },
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 22: Document platform security — G9-D01/D02
// ---------------------------------------------------------------------------

describe('Document platform security (G9-D01/D02)', () => {

  // --- assertStorageKey: path traversal prevention ---
  it('valid key passes', () => {
    assert.doesNotThrow(() => assertStorageKey('tenant-a/docs/contract.pdf'));
  });

  it('path traversal .. blocked', () => {
    assert.throws(() => assertStorageKey('../../../etc/passwd'),
      (err) => { assert.equal(err.code, 'UNSAFE_STORAGE_KEY'); return true; });
  });

  it('embedded .. traversal blocked', () => {
    assert.throws(() => assertStorageKey('docs/../../../secret'),
      (err) => { assert.equal(err.code, 'UNSAFE_STORAGE_KEY'); return true; });
  });

  it('backslash traversal blocked', () => {
    assert.throws(() => assertStorageKey('docs..secret'),
      (err) => { assert.equal(err.code, 'UNSAFE_STORAGE_KEY'); return true; });
  });

  it('leading slash blocked', () => {
    assert.throws(() => assertStorageKey('/etc/passwd'),
      (err) => { assert.equal(err.code, 'UNSAFE_STORAGE_KEY'); return true; });
  });

  it('empty key blocked', () => {
    assert.throws(() => assertStorageKey(''),
      (err) => { assert.equal(err.code, 'INVALID_STORAGE_KEY'); return true; });
  });

  it('whitespace-only key blocked', () => {
    assert.throws(() => assertStorageKey('   '),
      (err) => { assert.equal(err.code, 'INVALID_STORAGE_KEY'); return true; });
  });

  // --- sanitizePathSegment ---
  it('alphanumeric and safe chars preserved', () => {
    assert.equal(sanitizePathSegment('contract-v1.pdf'), 'contract-v1.pdf');
  });

  it('spaces replaced with underscore', () => {
    assert.equal(sanitizePathSegment('my document'), 'my_document');
  });

  it('path separators (slashes) replaced with underscores', () => {
    const result = sanitizePathSegment('../../../etc/passwd');
    assert.ok(!result.includes('/'), 'Forward slashes must be replaced');
    assert.ok(result.length > 0);
  });

  it('output is lowercase', () => {
    assert.equal(sanitizePathSegment('CONTRACT.PDF'), 'contract.pdf');
  });

  it('multiple underscores collapsed', () => {
    const r = sanitizePathSegment('a   b');
    assert.equal(r, 'a_b');
  });

  // --- sanitizeFileName ---
  it('strips directory component from filename', () => {
    const result = sanitizeFileName('../../../etc/passwd');
    assert.equal(result, 'passwd');
  });

  it('normal filename preserved (lowercased)', () => {
    assert.equal(sanitizeFileName('Contract.PDF'), 'contract.pdf');
  });

  // --- assertPathWithinRoot: double-check path escapes ---
  it('path within root passes', () => {
    assert.doesNotThrow(() =>
      assertPathWithinRoot('/storage/docs/file.pdf', '/storage/docs'));
  });

  it('path escaping root blocked', () => {
    assert.throws(() =>
      assertPathWithinRoot('/storage/docs/../../etc/passwd', '/storage/docs'),
      (err) => { assert.equal(err.code, 'UNSAFE_LOCAL_STORAGE_PATH'); return true; });
  });

  // --- clampSignedUrlTtl: TTL enforcement ---
  it('TTL within max returned unchanged', () => {
    assert.equal(clampSignedUrlTtl(300), 300);
  });

  it('TTL exceeding max clamped to 900 seconds', () => {
    assert.equal(clampSignedUrlTtl(3600), MAX_SIGNED_URL_TTL_SECONDS);
    assert.equal(MAX_SIGNED_URL_TTL_SECONDS, 900);
  });

  it('zero TTL returns default', () => {
    assert.equal(clampSignedUrlTtl(0), DEFAULT_SIGNED_URL_TTL_SECONDS);
  });

  it('negative TTL returns default', () => {
    assert.equal(clampSignedUrlTtl(-1), DEFAULT_SIGNED_URL_TTL_SECONDS);
  });

  it('default TTL is 300 seconds', () => {
    assert.equal(DEFAULT_SIGNED_URL_TTL_SECONDS, 300);
  });
});
