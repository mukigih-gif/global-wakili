import Decimal from 'decimal.js';

/**
 * Pure trust accounting calculation utilities — no database required.
 *
 * Extracted from ClientTrustLedgerService and TrustInterestService to
 * enable unit testing of trust arithmetic without a DB connection.
 *
 * Kenya Trust Accounting rules encoded here:
 *   - Client trust ledger entries are immutable — each write creates a new row
 *   - Balance is the running total: currentBalance + delta
 *   - Negative balance is a regulatory violation — must never occur
 *   - Pro-rata interest distributes proportional to positive matter balances
 *   - Last allocation absorbs rounding drift (sum of parts = exact total)
 */

function toDecimal(v: unknown): Decimal {
  if (v === null || v === undefined || v === '') return new Decimal(0);
  const d = new Decimal(String(v));
  return d.isFinite() ? d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP) : new Decimal(0);
}

// ---------------------------------------------------------------------------
// Client trust ledger delta application
// ---------------------------------------------------------------------------

export type LedgerDeltaResult = {
  debit: string;
  credit: string;
  nextBalance: string;
  isOverdraw: boolean;
};

/**
 * Applies a signed delta to a client trust ledger entry.
 *
 * delta > 0 → credit (inflow: deposit, interest)
 * delta < 0 → debit (outflow: withdrawal, transfer)
 * delta = 0 → invalid (throws ZERO_TRUST_LEDGER_DELTA)
 *
 * Returns the projected debit/credit split and next running balance.
 * isOverdraw = true if nextBalance would go negative.
 */
export function applyLedgerDelta(
  currentBalance: unknown,
  delta: unknown,
): LedgerDeltaResult {
  const balance = toDecimal(currentBalance);
  const d = toDecimal(delta);

  if (d.eq(0)) {
    throw Object.assign(
      new Error('Client trust ledger delta cannot be zero'),
      { statusCode: 400, code: 'ZERO_TRUST_LEDGER_DELTA' },
    );
  }

  const nextBalance = balance.plus(d);
  const debit = d.lt(0) ? d.abs().toFixed(2) : '0.00';
  const credit = d.gt(0) ? d.toFixed(2) : '0.00';

  return {
    debit,
    credit,
    nextBalance: nextBalance.toFixed(2),
    isOverdraw: nextBalance.lt(0),
  };
}

/**
 * Computes the debit/credit split for a ledger entry from a signed delta.
 * Used independently when only the debit/credit values are needed.
 */
export function computeLedgerDebitCredit(delta: unknown): {
  debit: string;
  credit: string;
} {
  const d = toDecimal(delta);
  return {
    debit: d.lt(0) ? d.abs().toFixed(2) : '0.00',
    credit: d.gt(0) ? d.toFixed(2) : '0.00',
  };
}

// ---------------------------------------------------------------------------
// Pro-rata interest allocation
// ---------------------------------------------------------------------------

export type MatterBalance = {
  clientId: string;
  matterId?: string | null;
  balance: unknown;
};

export type InterestAllocation = {
  clientId: string;
  matterId?: string | null;
  ledgerBalance: string;
  amount: string;
};

/**
 * Allocates trust interest pro-rata across client matter balances.
 *
 * Algorithm:
 *   1. Filter to matters with positive balance only
 *   2. For each matter: amount = totalInterest × (matterBalance / totalPositive)
 *   3. Last allocation = totalInterest − sum(all others) to absorb rounding drift
 *
 * Throws if no positive balances (nothing to allocate to).
 * Throws if totalInterest ≤ 0.
 *
 * Returns allocations in the same order as input (filtered to positive only).
 */
export function allocateInterestProRata(
  totalInterest: unknown,
  matters: MatterBalance[],
): InterestAllocation[] {
  const interest = toDecimal(totalInterest);

  if (interest.lte(0)) {
    throw Object.assign(
      new Error('Total interest amount must be greater than zero'),
      { statusCode: 422, code: 'INTEREST_AMOUNT_INVALID' },
    );
  }

  const positiveBalances = matters
    .map((m) => ({ ...m, balanceDecimal: toDecimal(m.balance) }))
    .filter((m) => m.balanceDecimal.gt(0));

  if (positiveBalances.length === 0) {
    throw Object.assign(
      new Error('No positive client trust ledger balances found for interest allocation'),
      { statusCode: 422, code: 'NO_ELIGIBLE_BALANCES' },
    );
  }

  const totalEligible = positiveBalances.reduce(
    (sum, m) => sum.plus(m.balanceDecimal),
    new Decimal(0),
  );

  let allocatedSoFar = new Decimal(0);

  return positiveBalances.map((m, index) => {
    const isLast = index === positiveBalances.length - 1;
    const amount = isLast
      ? interest.minus(allocatedSoFar).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      : interest.times(m.balanceDecimal).div(totalEligible).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    allocatedSoFar = allocatedSoFar.plus(amount);

    return {
      clientId: m.clientId,
      matterId: m.matterId ?? null,
      ledgerBalance: m.balanceDecimal.toFixed(2),
      amount: amount.toFixed(2),
    };
  });
}

/**
 * Verifies that the sum of all interest allocations equals the expected total.
 * Used as a post-allocation integrity check.
 */
export function verifyAllocationSum(
  allocations: { amount: unknown }[],
  expectedTotal: unknown,
): boolean {
  const actual = allocations.reduce(
    (sum, a) => sum.plus(toDecimal(a.amount)),
    new Decimal(0),
  ).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return actual.equals(toDecimal(expectedTotal).toDecimalPlaces(2, Decimal.ROUND_HALF_UP));
}
