import crypto from 'crypto';

/**
 * Pure audit hash chain verification utilities — no database required.
 *
 * Extracted from audit-hash.ts and audit-logger.ts to enable unit testing
 * of the tamper-evident chain logic.
 *
 * Chain algorithm (from audit-hash.ts):
 *   hash[n] = SHA-256( stableSerialize(payload[n]) + ':' + hash[n-1] )
 *   hash[0] = SHA-256( stableSerialize(payload[0]) + ':' + '0'.repeat(64) )
 *
 * Tamper-evidence property:
 *   Modifying any entry's payload changes its hash.
 *   All subsequent hashes depend on the modified hash → chain breaks.
 *   An auditor can detect tampering by re-computing hashes and comparing.
 *
 * Gate 2 hardening applied:
 *   - GlobalAuditLog.hash @unique (D-02): duplicate hashes rejected at DB
 *   - AuditLog.sequenceNumber (D-03): race-free chain ordering
 */

export const GENESIS_HASH = '0'.repeat(64);

export type ChainEntry = {
  hash: string;
  previousHash: string | null;
  payload: Record<string, unknown>;
};

export type ChainVerificationResult = {
  valid: boolean;
  brokenAtIndex: number | null;
  reason: string | null;
};

/**
 * Computes the canonical, deterministic string representation of an object.
 * Keys are sorted alphabetically to ensure the same output regardless of
 * key insertion order. This is the same algorithm used in audit-hash.ts.
 */
function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const sorted = Object.keys(obj).sort();
  const entries = sorted.map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`);
  return `{${entries.join(',')}}`;
}

/**
 * Computes the expected hash for a given payload and previous hash.
 * Mirrors audit-hash.ts: generateAuditHash(payload, previousHash).
 */
export function computeAuditHash(
  payload: Record<string, unknown>,
  previousHash: string = GENESIS_HASH,
): string {
  const canonical = stableSerialize(payload);
  return crypto
    .createHash('sha256')
    .update(`${canonical}:${previousHash}`, 'utf8')
    .digest('hex');
}

/**
 * Returns true if the given previousHash is the genesis sentinel
 * ('0'.repeat(64)) — meaning this is the first entry in the chain.
 */
export function isGenesisEntry(previousHash: string | null | undefined): boolean {
  return previousHash === GENESIS_HASH || previousHash === null || previousHash === undefined;
}

/**
 * Verifies the integrity of an ordered sequence of audit log entries.
 *
 * For each entry[n]:
 *   1. Re-compute expected hash from payload + previousHash
 *   2. Compare against stored hash[n]
 *   3. Verify hash[n] matches hash[n-1] from the previous entry (chain linkage)
 *
 * Returns the index of the first broken link, or valid=true if intact.
 */
export function verifyHashChain(entries: ChainEntry[]): ChainVerificationResult {
  if (entries.length === 0) {
    return { valid: true, brokenAtIndex: null, reason: null };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;

    // Verify hash[n] = SHA-256(payload[n] + ':' + previousHash[n])
    const expectedHash = computeAuditHash(entry.payload, entry.previousHash ?? GENESIS_HASH);

    if (entry.hash !== expectedHash) {
      return {
        valid: false,
        brokenAtIndex: i,
        reason: `Entry ${i}: stored hash does not match computed hash (payload may have been tampered)`,
      };
    }

    // Verify chain linkage: previousHash[n] must equal hash[n-1]
    if (i > 0) {
      const prevEntry = entries[i - 1]!;
      if (entry.previousHash !== prevEntry.hash) {
        return {
          valid: false,
          brokenAtIndex: i,
          reason: `Entry ${i}: previousHash does not match hash of entry ${i - 1} (chain broken)`,
        };
      }
    }
  }

  return { valid: true, brokenAtIndex: null, reason: null };
}

/**
 * Detects whether a single entry has been tampered with by re-computing
 * its hash and comparing it to the stored value.
 */
export function detectTampering(entry: ChainEntry): boolean {
  const expected = computeAuditHash(entry.payload, entry.previousHash ?? GENESIS_HASH);
  return entry.hash !== expected;
}
