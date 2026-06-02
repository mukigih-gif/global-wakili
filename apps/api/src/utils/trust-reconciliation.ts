import Decimal from 'decimal.js';

/**
 * Pure trust reconciliation calculation utilities — no database required.
 *
 * Extracted from ThreeWayReconciliationService and TrustViolationService to
 * enable unit testing of reconciliation logic without a DB connection.
 *
 * Kenya Trust Accounting context:
 *   Three-way reconciliation verifies that:
 *     bankTotal (bank statement balance)
 *   = trustTotal (system trust transaction net: credits - debits)
 *   = clientTotal (client sub-ledger net: credits - debits)
 *
 *   Any variance triggers FLAGGED status and requires investigation or
 *   written explanation before the period can be signed off.
 */

function toDecimal(v: unknown): Decimal {
  if (v === null || v === undefined || v === '') return new Decimal(0);
  const d = new Decimal(String(v));
  return d.isFinite() ? d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP) : new Decimal(0);
}

export type ReconciliationVariances = {
  bankVsTrust: string;
  trustVsClient: string;
  bankVsClient: string;
};

export type ReconciliationLegStatus = 'MATCHED' | 'FLAGGED';

export type ThreeWayStatus = {
  bankVsTrustStatus: ReconciliationLegStatus;
  trustVsClientStatus: ReconciliationLegStatus;
  bankVsClientStatus: ReconciliationLegStatus;
  finalStatus: ReconciliationLegStatus;
};

/**
 * Computes the net balance from raw debit/credit totals.
 * Standard trust ledger formula: net = credit − debit.
 * A positive result means net funds available.
 */
export function computeTrustNetBalance(
  credits: unknown,
  debits: unknown,
): string {
  return toDecimal(credits).minus(toDecimal(debits)).toFixed(2);
}

/**
 * Computes all three reconciliation variances.
 *
 * bankVsTrust   = bank − trust   (negative = trust overstates bank)
 * trustVsClient = trust − client (negative = client overstates trust)
 * bankVsClient  = bank − client  (redundant check, should be zero if both above are zero)
 */
export function computeThreeWayVariances(
  bankTotal: unknown,
  trustTotal: unknown,
  clientTotal: unknown,
): ReconciliationVariances {
  const bank = toDecimal(bankTotal);
  const trust = toDecimal(trustTotal);
  const client = toDecimal(clientTotal);

  return {
    bankVsTrust: bank.minus(trust).toFixed(2),
    trustVsClient: trust.minus(client).toFixed(2),
    bankVsClient: bank.minus(client).toFixed(2),
  };
}

/**
 * Returns MATCHED if |variance| <= tolerance, otherwise FLAGGED.
 * A tolerance of 0 means exact match required.
 */
export function assessVarianceStatus(
  variance: unknown,
  tolerance: unknown = 0,
): ReconciliationLegStatus {
  const v = toDecimal(variance).abs();
  const t = toDecimal(tolerance).abs();
  return v.lte(t) ? 'MATCHED' : 'FLAGGED';
}

/**
 * Computes the status for all three reconciliation legs and the overall run.
 *
 * finalStatus is MATCHED only if ALL three legs are MATCHED.
 * A single FLAGGED leg makes the entire run FLAGGED.
 */
export function assessThreeWayStatus(
  variances: ReconciliationVariances,
  tolerance: unknown = 0,
): ThreeWayStatus {
  const bankVsTrustStatus = assessVarianceStatus(variances.bankVsTrust, tolerance);
  const trustVsClientStatus = assessVarianceStatus(variances.trustVsClient, tolerance);
  const bankVsClientStatus = assessVarianceStatus(variances.bankVsClient, tolerance);

  const finalStatus: ReconciliationLegStatus =
    bankVsTrustStatus === 'MATCHED' &&
    trustVsClientStatus === 'MATCHED' &&
    bankVsClientStatus === 'MATCHED'
      ? 'MATCHED'
      : 'FLAGGED';

  return {
    bankVsTrustStatus,
    trustVsClientStatus,
    bankVsClientStatus,
    finalStatus,
  };
}

/**
 * Returns true if the balance represents an overdraw (negative value).
 * An overdrawn trust account or matter ledger is a regulatory violation.
 */
export function isOverdrawn(balance: unknown): boolean {
  return toDecimal(balance).lt(0);
}

/**
 * Computes the ledger variance for a single trust account.
 * variance = trustAccountBalance − clientLedgerTotal
 * A non-zero variance indicates the system balance differs from sub-ledger.
 */
export function computeLedgerVariance(
  trustAccountBalance: unknown,
  clientLedgerTotal: unknown,
): string {
  return toDecimal(trustAccountBalance).minus(toDecimal(clientLedgerTotal)).toFixed(2);
}
