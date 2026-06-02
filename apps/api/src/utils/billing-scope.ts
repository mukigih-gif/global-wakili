import Decimal from 'decimal.js';

/**
 * Pure billing scope and isolation utilities — no database required.
 *
 * Extracted from billing.service.ts to enable isolation testing without a DB.
 * These functions encode the tenant isolation rules for all billing queries.
 */

export type BillingScopeInput = {
  tenantId: string;
  clientId?: string | null;
  matterId?: string | null;
  from?: Date | null;
  to?: Date | null;
};

export type LedgerItemType =
  | 'INVOICE'
  | 'PROFORMA'
  | 'CREDIT_NOTE'
  | 'PAYMENT'
  | 'RETAINER'
  | 'REMINDER';

export type LedgerBillingItem = {
  id: string;
  type: LedgerItemType;
  date: Date | null;
  debit: string;
  credit: string;
  balanceImpact: string;
};

function toDecimal(v: unknown): Decimal {
  if (v === null || v === undefined || v === '') return new Decimal(0);
  const d = new Decimal(String(v));
  return d.isFinite() ? d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP) : new Decimal(0);
}

/**
 * Builds the tenant-scoped WHERE clause for all billing queries.
 *
 * ALWAYS injects tenantId. Optionally adds clientId and matterId.
 * Throws BILLING_TENANT_REQUIRED if tenantId is missing or empty.
 */
export function buildBillingScope(input: BillingScopeInput): {
  tenantId: string;
  clientId?: string;
  matterId?: string;
} {
  const tenantId = input.tenantId?.trim();

  if (!tenantId) {
    throw Object.assign(
      new Error('tenantId is required for all billing queries'),
      { statusCode: 422, code: 'BILLING_TENANT_REQUIRED' },
    );
  }

  return {
    tenantId,
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(input.matterId ? { matterId: input.matterId } : {}),
  };
}

/**
 * Builds an optional date-range filter for a given field.
 * Returns an empty object if neither from nor to are provided.
 */
export function buildPeriodFilter(
  from?: Date | null,
  to?: Date | null,
  field = 'createdAt',
): Record<string, unknown> {
  if (!from && !to) return {};

  return {
    [field]: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    },
  };
}

/**
 * Computes the balance impact for a ledger item by type.
 *
 * INVOICE:    debit = amount,  credit = 0,      impact = +amount  (client owes)
 * CREDIT_NOTE: debit = 0,     credit = amount,  impact = -amount  (reduces debt)
 * PAYMENT:    debit = 0,      credit = amount,  impact = -amount  (reduces debt)
 * RETAINER:   debit = 0,      credit = amount,  impact = -amount  (reduces debt)
 * PROFORMA/REMINDER: all zero (no financial impact)
 */
export function getLedgerBalanceImpact(
  type: LedgerItemType,
  amount: unknown,
): { debit: string; credit: string; balanceImpact: string } {
  const d = toDecimal(amount);

  switch (type) {
    case 'INVOICE':
      return {
        debit: d.toFixed(2),
        credit: '0.00',
        balanceImpact: d.toFixed(2),
      };
    case 'CREDIT_NOTE':
    case 'PAYMENT':
    case 'RETAINER':
      return {
        debit: '0.00',
        credit: d.toFixed(2),
        balanceImpact: d.mul(-1).toFixed(2),
      };
    case 'PROFORMA':
    case 'REMINDER':
    default:
      return { debit: '0.00', credit: '0.00', balanceImpact: '0.00' };
  }
}

type OverdueInvoice = {
  dueDate?: Date | string | null;
  status?: string | null;
  balanceDue?: unknown;
  outstandingAmount?: unknown;
};

const SETTLED_STATUSES = new Set(['PAID', 'CANCELLED', 'VOID']);

/**
 * Calculates the total overdue amount from a list of invoices.
 *
 * An invoice is overdue when:
 *   - it has a dueDate in the past (before `asOf`)
 *   - its status is NOT PAID, CANCELLED, or VOID
 *
 * Returns total overdue balance as a 2dp string.
 */
export function calculateOverdueAmount(
  invoices: OverdueInvoice[],
  asOf: Date = new Date(),
): string {
  return invoices
    .reduce((sum, invoice) => {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;

      if (!dueDate || dueDate >= asOf) return sum;

      if (SETTLED_STATUSES.has(String(invoice.status ?? '').toUpperCase())) {
        return sum;
      }

      return sum.plus(toDecimal(invoice.balanceDue ?? invoice.outstandingAmount ?? 0));
    }, new Decimal(0))
    .toFixed(2);
}

/**
 * Computes billing totals from the component arrays.
 *
 * Invoiced  = sum of invoice amounts
 * Paid      = sum of payment amounts
 * Credited  = sum of credit note amounts
 * Retainer  = sum of retainer amounts
 * Outstanding = sum of invoice balanceDue fields
 */
export function calculateBillingTotals(params: {
  invoices: Array<{ amount?: unknown; balanceDue?: unknown }>;
  payments: Array<{ amount?: unknown }>;
  creditNotes: Array<{ amount?: unknown }>;
  retainers: Array<{ amount?: unknown }>;
}): {
  invoicedAmount: string;
  paidAmount: string;
  creditedAmount: string;
  retainerAmount: string;
  outstandingAmount: string;
} {
  const sum = (items: Array<Record<string, unknown>>, key: string) =>
    items.reduce((acc, item) => acc.plus(toDecimal(item[key])), new Decimal(0)).toFixed(2);

  return {
    invoicedAmount: sum(params.invoices as any, 'amount'),
    paidAmount: sum(params.payments as any, 'amount'),
    creditedAmount: sum(params.creditNotes as any, 'amount'),
    retainerAmount: sum(params.retainers as any, 'amount'),
    outstandingAmount: sum(params.invoices as any, 'balanceDue'),
  };
}
