/**
 * Pure RBAC permission matching engine — no database required.
 *
 * Extracted from middleware/rbac.ts to enable unit testing of the
 * permission matching logic without a DB connection or HTTP request.
 *
 * Permission format: "resource.action"  (e.g. "trust.create_transaction")
 * Wildcards:
 *   "resource.*"  — all actions on a resource
 *   "*.action"    — a specific action on any resource
 *   "*.*"         — all permissions (super-admin equivalent)
 */

export type PermissionString = string;

/**
 * Expands a required permission string into the full set of permission
 * candidates that would satisfy it (including wildcards).
 *
 * Examples:
 *   "trust.create_transaction"
 *   → ["trust.create_transaction", "trust.*", "*.create_transaction", "*.*"]
 *
 *   "admin" (no dot separator)
 *   → ["admin"]
 */
export function expandPermissionCandidates(permission: string): string[] {
  const normalized = permission.trim().toLowerCase();
  const dotIndex = normalized.indexOf('.');

  if (dotIndex === -1) {
    return [normalized];
  }

  const resource = normalized.slice(0, dotIndex);
  const action = normalized.slice(dotIndex + 1);

  if (!resource || !action) {
    return [normalized];
  }

  return [
    normalized,
    `${resource}.*`,
    `*.${action}`,
    '*.*',
  ];
}

/**
 * Checks if a set of granted permissions satisfies a required permission.
 * Wildcard expansion is applied to the required permission.
 */
export function hasPermission(
  granted: ReadonlySet<string>,
  required: string,
): boolean {
  return expandPermissionCandidates(required).some((candidate) =>
    granted.has(candidate.toLowerCase()),
  );
}

/**
 * Checks if ALL required permissions are satisfied by the granted set.
 * Returns the list of missing permissions (empty = all satisfied).
 */
export function findMissingPermissions(
  granted: ReadonlySet<string>,
  required: string[],
): string[] {
  return required.filter((p) => !hasPermission(granted, p));
}

/**
 * Normalizes a permission string: trims, lowercases, deduplicates.
 * Accepts comma-separated strings or arrays.
 */
export function normalizePermissions(
  input: string | string[] | null | undefined,
): string[] {
  if (!input) return [];

  const raw = Array.isArray(input)
    ? input.flatMap((s) => (typeof s === 'string' ? s.split(',') : []))
    : String(input).split(',');

  return [
    ...new Set(
      raw
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}
