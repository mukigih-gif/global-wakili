import { InvoiceStatus } from '@prisma/client';

/**
 * Invoice status states where no further financial operations are permitted.
 *
 * CANCELLED: Invoice voided. No payments, no allocations, no status changes.
 * ETIMS_REJECTED: Fiscal document rejected by KRA eTIMS. The underlying debt
 *   may still exist legally, but the fiscal document is invalid. No payment
 *   should be applied until the invoice is corrected, resubmitted, or cancelled.
 */
export const TERMINAL_INVOICE_STATUSES = new Set<InvoiceStatus>([
  InvoiceStatus.CANCELLED,
  InvoiceStatus.ETIMS_REJECTED,
]);

/**
 * Valid status transitions for the invoice state machine.
 *
 *   INVOICED       → PARTIALLY_PAID, PAID, CANCELLED
 *   PARTIALLY_PAID → INVOICED (reversal), PAID, CANCELLED (via credit note)
 *   PAID           → PARTIALLY_PAID (reversal), INVOICED (full reversal)
 *   ETIMS_REJECTED → CANCELLED (only valid exit — requires explicit cancellation)
 *   CANCELLED      → (terminal — no valid transitions)
 *
 * Automated payment status recalculation (INVOICED ↔ PARTIALLY_PAID ↔ PAID)
 * is handled by PaymentStatusService. Manual transitions (CANCELLED, fiscal)
 * go through InvoiceService.cancelInvoice or the eTIMS workflow.
 */
export const VALID_INVOICE_TRANSITIONS: ReadonlyMap<InvoiceStatus, ReadonlySet<InvoiceStatus>> =
  new Map([
    [
      InvoiceStatus.INVOICED,
      new Set([InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.CANCELLED]),
    ],
    [
      InvoiceStatus.PARTIALLY_PAID,
      new Set([InvoiceStatus.INVOICED, InvoiceStatus.PAID, InvoiceStatus.CANCELLED]),
    ],
    [
      InvoiceStatus.PAID,
      new Set([InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.INVOICED]),
    ],
    [
      InvoiceStatus.ETIMS_REJECTED,
      new Set([InvoiceStatus.CANCELLED]),
    ],
    [
      InvoiceStatus.CANCELLED,
      new Set<InvoiceStatus>(),
    ],
  ]);

/**
 * Asserts that the invoice is not in a terminal state before financial operations.
 * Throws INVOICE_STATUS_TERMINAL (409) for CANCELLED or ETIMS_REJECTED invoices.
 */
export function assertInvoiceNotTerminal(
  status: InvoiceStatus,
  invoiceNumber: string,
): void {
  if (status === InvoiceStatus.CANCELLED) {
    throw Object.assign(
      new Error(`Invoice ${invoiceNumber} is cancelled and cannot be modified.`),
      { statusCode: 409, code: 'INVOICE_CANCELLED' },
    );
  }

  if (status === InvoiceStatus.ETIMS_REJECTED) {
    throw Object.assign(
      new Error(
        `Invoice ${invoiceNumber} has been rejected by KRA eTIMS. ` +
        'Correct and resubmit, or cancel the invoice before processing payments.',
      ),
      { statusCode: 409, code: 'INVOICE_ETIMS_REJECTED' },
    );
  }
}

/**
 * Returns true if the given status is terminal (no further operations permitted).
 */
export function isInvoiceTerminal(status: InvoiceStatus): boolean {
  return TERMINAL_INVOICE_STATUSES.has(status);
}
