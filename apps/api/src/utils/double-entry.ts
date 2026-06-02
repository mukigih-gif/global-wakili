import Decimal from 'decimal.js';

/**
 * Pure synchronous double-entry balance check — no database required.
 *
 * Asserts that sum(line.debit) == sum(line.credit) across all provided lines.
 * Accepts Prisma.Decimal, decimal.js Decimal, string, or number — all are
 * internally normalized through decimal.js for precision-safe comparison.
 *
 * Throws UNBALANCED_JOURNAL (HTTP 422) on failure.
 * Call this before any direct journalEntry.create to enforce the invariant.
 */
export function assertLinesBalanced(
  lines: ReadonlyArray<{
    debit: { toString(): string } | string | number;
    credit: { toString(): string } | string | number;
  }>,
  reference: string,
): void {
  const totalDebit = lines.reduce(
    (sum, l) => sum.plus(new Decimal(String(l.debit))),
    new Decimal(0),
  );
  const totalCredit = lines.reduce(
    (sum, l) => sum.plus(new Decimal(String(l.credit))),
    new Decimal(0),
  );

  if (!totalDebit.equals(totalCredit)) {
    throw Object.assign(
      new Error(
        `Journal ${reference} is unbalanced: debits=${totalDebit.toFixed(2)} credits=${totalCredit.toFixed(2)}`,
      ),
      {
        statusCode: 422,
        code: 'UNBALANCED_JOURNAL',
        details: {
          reference,
          totalDebit: totalDebit.toString(),
          totalCredit: totalCredit.toString(),
        },
      },
    );
  }
}
