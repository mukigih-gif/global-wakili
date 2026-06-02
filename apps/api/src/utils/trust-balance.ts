import Decimal from 'decimal.js';

/**
 * Pure trust balance guard utilities — no database required.
 *
 * These functions encode the trust overdraw prevention rules used by
 * TrustAccountService.assertSufficientBalance and
 * TrustPolicyService.assertNoNegativeMatterBalance.
 *
 * Kenya Trust Law requirement: no trust account or client matter
 * sub-account may have a negative balance at any time.
 */

function toDecimal(v: unknown): Decimal {
  if (v === null || v === undefined || v === '') return new Decimal(0);
  const d = new Decimal(String(v));
  return d.isFinite() ? d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP) : new Decimal(0);
}

export type TrustBalanceCheckResult = {
  allowed: boolean;
  available: string;
  requested: string;
  shortfall: string;
};

/**
 * Checks whether a trust account has sufficient balance for a withdrawal/transfer.
 *
 * Returns allowed=true if currentBalance >= amount.
 * Returns allowed=false with shortfall if currentBalance < amount.
 * Does NOT throw — callers decide how to handle the result.
 */
export function checkTrustAccountBalance(
  currentBalance: unknown,
  requestedAmount: unknown,
): TrustBalanceCheckResult {
  const balance = toDecimal(currentBalance);
  const amount = toDecimal(requestedAmount);
  const shortfall = Decimal.max(amount.minus(balance), new Decimal(0));

  return {
    allowed: balance.gte(amount),
    available: balance.toFixed(2),
    requested: amount.toFixed(2),
    shortfall: shortfall.toFixed(2),
  };
}

/**
 * Checks whether a client matter sub-ledger has sufficient trust funds.
 * Identical logic to account-level check but applied to the matter ledger.
 *
 * matterBalance = sum(clientTrustLedger.credit) - sum(clientTrustLedger.debit)
 * for the specific trustAccountId + clientId + matterId combination.
 */
export function checkMatterTrustBalance(
  matterLedgerBalance: unknown,
  requestedAmount: unknown,
): TrustBalanceCheckResult {
  return checkTrustAccountBalance(matterLedgerBalance, requestedAmount);
}

/**
 * Identifies the trust outflow transaction types.
 * WITHDRAWAL and TRANSFER_TO_OFFICE reduce the trust account balance.
 * All other types (DEPOSIT, INTEREST, REVERSAL, ADJUSTMENT) do not.
 */
export function isTrustOutflow(transactionType: string): boolean {
  return transactionType === 'WITHDRAWAL' || transactionType === 'TRANSFER_TO_OFFICE';
}

/**
 * Identifies the trust inflow transaction types.
 */
export function isTrustInflow(transactionType: string): boolean {
  return transactionType === 'DEPOSIT' || transactionType === 'INTEREST';
}

/**
 * Computes the balance delta for a trust transaction.
 * Outflows produce a negative delta (reduce balance).
 * Inflows produce a positive delta (increase balance).
 * Other types (REVERSAL, ADJUSTMENT) may require explicit handling.
 */
export function computeTransactionDelta(
  transactionType: string,
  amount: unknown,
): string {
  const a = toDecimal(amount);
  if (isTrustOutflow(transactionType)) {
    return a.negated().toFixed(2);
  }
  if (isTrustInflow(transactionType)) {
    return a.toFixed(2);
  }
  return '0.00';
}
