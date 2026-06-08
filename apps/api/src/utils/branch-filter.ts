/**
 * Branch isolation utility.
 *
 * Policy (as confirmed with stakeholders):
 *   - MANAGING_PARTNER and PARTNER → firm-wide access (all branches)
 *   - FIRM_ADMIN → firm-wide access (administrative oversight)
 *   - All other roles (ASSOCIATE, PUPIL, ADVOCATE, ACCOUNTANT, CLERK, etc.)
 *     → own branch only
 *
 * If a user has no branchId assigned, they fall through to firm-wide access
 * so they are not locked out of their own data.
 */

/** Roles that can see data across all branches. */
const FIRM_WIDE_ROLES = new Set([
  'MANAGING_PARTNER',
  'PARTNER',
  'FIRM_ADMIN',
  'SUPER_ADMIN',
  'SYSTEM_ADMIN',
  'SYSTEM_SUPPORT',
  'ADMIN',
]);

type UserContext = {
  primaryRole?: string | null;
  branchId?: string | null;
  isSuperAdmin?: boolean;
};

/**
 * Returns a Prisma `where` fragment for branch filtering.
 * Returns `{}` for firm-wide roles so no branch constraint is added.
 * Returns `{ branchId: userBranchId }` for branch-restricted roles.
 */
export function getBranchFilter(user: UserContext): { branchId?: string } {
  if (user.isSuperAdmin) return {};

  const role = (user.primaryRole ?? '').toUpperCase();

  if (FIRM_WIDE_ROLES.has(role)) return {};

  // No branch assigned — let them see firm-wide rather than locking them out
  if (!user.branchId) return {};

  return { branchId: user.branchId };
}

/**
 * Returns the effective branchId for write operations.
 * Branch-restricted users must write to their own branch.
 * Firm-wide users can pass an explicit branchId or leave undefined.
 */
export function getWriteBranchId(
  user: UserContext,
  requestedBranchId?: string | null,
): string | undefined {
  if (user.isSuperAdmin) return requestedBranchId ?? undefined;

  const role = (user.primaryRole ?? '').toUpperCase();

  if (FIRM_WIDE_ROLES.has(role)) return requestedBranchId ?? undefined;

  // Branch-restricted: always write to their branch, ignore override
  return user.branchId ?? requestedBranchId ?? undefined;
}

export function isFirmWideRole(user: UserContext): boolean {
  if (user.isSuperAdmin) return true;
  return FIRM_WIDE_ROLES.has((user.primaryRole ?? '').toUpperCase());
}
