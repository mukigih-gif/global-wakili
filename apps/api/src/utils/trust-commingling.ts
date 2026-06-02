/**
 * Pure trust commingling detection utilities — no database required.
 *
 * Trust accounting law prohibits the mixing of client trust funds with
 * office operating funds. These utilities detect and describe commingling
 * violations at the account-purpose level.
 *
 * Architecture note:
 *   Commingling is also prevented at the GL posting level via:
 *   - PostingPolicyService: TRUST_COMMINGLING issue (mixed trust+office in one journal)
 *   - TrustTransactionService: separate trust-only and office-only journal postings
 *   This utility provides the explicit service-layer guard.
 *
 * Kenya trust law context:
 *   - Client trust funds must be held in a dedicated trust bank account
 *   - Office funds must be kept in a separate office operating account
 *   - Commingling is a regulatory violation subject to professional sanctions
 */

export type AccountPurpose = string;

export type ComminglingCheckResult = {
  isCommingling: boolean;
  reason: string | null;
};

/**
 * Detects whether a proposed posting from sourcePurpose → targetPurpose
 * would constitute an illegal commingling of trust and office funds.
 *
 * BLOCKED: OFFICE → TRUST  (office funds deposited as client trust funds)
 * ALLOWED: TRUST → OFFICE  (trust settlement — goes through formal workflow)
 * ALLOWED: TRUST → TRUST   (internal trust operations)
 * ALLOWED: OFFICE → OFFICE (normal office operations)
 *
 * Matching is case-insensitive and substring-based (e.g. 'OFFICE_BANK' matches
 * 'OFFICE', 'TRUST_BANK' matches 'TRUST').
 */
export function detectCommingling(
  sourcePurpose: AccountPurpose | null | undefined,
  targetPurpose: AccountPurpose | null | undefined,
): ComminglingCheckResult {
  const from = String(sourcePurpose ?? '').toUpperCase();
  const to = String(targetPurpose ?? '').toUpperCase();

  if (from.includes('OFFICE') && to.includes('TRUST')) {
    return {
      isCommingling: true,
      reason: 'Office funds cannot be posted as client trust funds without a trust receipt workflow',
    };
  }

  return { isCommingling: false, reason: null };
}

/**
 * Returns true if the transaction type is a legitimate TRUST → OFFICE transfer.
 * This is the ONLY allowed cross-type movement (client invoice settlement).
 */
export function isTrustToOfficeSettlement(transactionType: string | null | undefined): boolean {
  return String(transactionType ?? '').toUpperCase() === 'TRANSFER_TO_OFFICE';
}

/**
 * Returns the GL posting policy context for a trust transaction type.
 * Inflows/outflows use trust-only context.
 * TRANSFER_TO_OFFICE office-side posting uses office-only context.
 * The contexts are never mixed in a single GL journal.
 */
export function getTrustPostingContext(transactionType: string): {
  allowTrustPosting: boolean;
  allowOfficePosting: boolean;
} {
  if (isTrustToOfficeSettlement(transactionType)) {
    // Office-side settlement — separate journal, office only
    return { allowTrustPosting: false, allowOfficePosting: true };
  }

  // Trust-side journal (deposits, withdrawals, interest) — trust only
  return { allowTrustPosting: true, allowOfficePosting: false };
}
