import Decimal from 'decimal.js';

/**
 * Pure VAT and WHT calculation utilities — no database required.
 *
 * These functions encode the Kenya tax calculation rules used by VATService
 * and WHTService. Extracting them as pure functions enables unit testing
 * without a database connection while keeping the service logic consistent.
 *
 * Kenya context:
 *   Standard VAT rate:  16%
 *   WHT on legal fees:   5% (residents), 20% (non-residents)
 *   WHT on dividends:   15% (residents), 10% (non-residents, treaty-dependent)
 */

function toDecimal(value: unknown): Decimal {
  if (value === null || value === undefined || value === '') return new Decimal(0);
  const d = new Decimal(String(value));
  return d.isFinite() ? d : new Decimal(0);
}

// ---------------------------------------------------------------------------
// WHT calculations
// ---------------------------------------------------------------------------

/**
 * Normalizes a WHT rate to a decimal multiplier.
 *
 * Inputs > 1 are treated as percentages and divided by 100.
 * Inputs ≤ 1 are used as-is.
 * Negative values and NaN return zero.
 *
 * Examples:
 *   normalizeWhtRate(5)    → 0.05   (5% → decimal)
 *   normalizeWhtRate(0.05) → 0.05   (already decimal)
 *   normalizeWhtRate(20)   → 0.20   (20% → decimal)
 *   normalizeWhtRate(0)    → 0
 *   normalizeWhtRate(-1)   → 0
 */
export function normalizeWhtRate(
  value: { toString(): string } | string | number,
): string {
  const d = toDecimal(value);
  if (d.lt(0)) return '0.000000';
  if (d.gt(1)) {
    return d.div(100).toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toFixed(6);
  }
  return d.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toFixed(6);
}

/**
 * Computes the withholding tax amount.
 *
 * withholdingAmount = baseAmount × normalizedRate  (2dp, ROUND_HALF_UP)
 *
 * The rate parameter is a RAW rate (e.g. '5' for 5% or '0.05' for 5%).
 * normalizeWhtRate is applied internally.
 *
 * Throws WHT_BASE_AMOUNT_INVALID if baseAmount ≤ 0.
 * Throws WHT_RATE_INVALID if rate ≤ 0 after normalization.
 */
export function calculateWhtAmount(
  baseAmount: { toString(): string } | string | number,
  withholdingRate: { toString(): string } | string | number,
): string {
  const base = toDecimal(baseAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const normalizedRate = new Decimal(normalizeWhtRate(withholdingRate));

  if (base.lte(0)) {
    throw Object.assign(
      new Error('WHT base amount must be greater than zero'),
      { statusCode: 422, code: 'WHT_BASE_AMOUNT_INVALID' },
    );
  }

  if (normalizedRate.lte(0)) {
    throw Object.assign(
      new Error('WHT rate must be greater than zero'),
      { statusCode: 422, code: 'WHT_RATE_INVALID' },
    );
  }

  return base.mul(normalizedRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

// ---------------------------------------------------------------------------
// VAT calculations
// ---------------------------------------------------------------------------

export type VatAdjustmentEntry = {
  type: string;
  amount: { toString(): string } | string | number;
};

/**
 * Computes net VAT payable from output VAT, input VAT, and adjustments.
 *
 * netVatPayable = outputVat − inputVat + adjustmentsTotal
 *
 * Adjustment sign rules (Kenya eTIMS):
 *   INPUT_VAT and VAT_REFUND types  → SUBTRACT from net payable
 *   All other types (OUTPUT_VAT etc.) → ADD to net payable
 *
 * Result is rounded to 2dp ROUND_HALF_UP.
 */
export function calculateNetVatPayable(
  outputVat: { toString(): string } | string | number,
  inputVat: { toString(): string } | string | number,
  adjustments: VatAdjustmentEntry[] = [],
): string {
  const output = toDecimal(outputVat).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const input = toDecimal(inputVat).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const adjustmentsTotal = adjustments.reduce((sum, adj) => {
    const amount = toDecimal(adj.amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const type = String(adj.type ?? '').toUpperCase();
    if (type === 'INPUT_VAT' || type === 'VAT_REFUND') {
      return sum.minus(amount);
    }
    return sum.plus(amount);
  }, new Decimal(0));

  return output.minus(input).plus(adjustmentsTotal).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

/**
 * Validates VAT period parameters and returns the period date range.
 * Throws INVALID_VAT_YEAR or INVALID_VAT_MONTH for invalid inputs.
 */
export function validateVatPeriod(year: number, month: number): {
  periodStart: Date;
  periodEnd: Date;
} {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw Object.assign(
      new Error('Invalid VAT year'),
      { statusCode: 422, code: 'INVALID_VAT_YEAR' },
    );
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw Object.assign(
      new Error('Invalid VAT month'),
      { statusCode: 422, code: 'INVALID_VAT_MONTH' },
    );
  }

  return {
    periodStart: new Date(year, month - 1, 1),
    periodEnd: new Date(year, month, 1),
  };
}

/**
 * Computes the VAT amount on a taxable base at a given percentage rate.
 * vatAmount = base × (rate / 100)  if rate > 1
 * vatAmount = base × rate          if rate ≤ 1
 *
 * Result is 2dp ROUND_HALF_UP.
 */
export function calculateVatAmount(
  base: { toString(): string } | string | number,
  ratePercent: { toString(): string } | string | number,
): string {
  const baseD = toDecimal(base).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const rateD = toDecimal(ratePercent);
  const normalizedRate = rateD.gt(1) ? rateD.div(100) : rateD;
  return baseD.mul(normalizedRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}
