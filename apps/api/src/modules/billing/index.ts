/**
 * Billing Module Entry Point
 *
 * Status:
 * - Billing has not yet been fully implemented.
 * - This index intentionally exports only the currently available boot-safe
 *   route surface so the API can mount cleanly.
 *
 * Pending full implementation:
 * - BillingService
 * - InvoiceService
 * - InvoiceLineService
 * - PaymentAllocationService
 * - CreditNoteService
 * - ProformaInvoiceService
 * - BillingPostingService
 * - KRA/eTIMS billing bridge
 * - billing.controller
 * - billing.validators
 * - billing.types
 * - billing.dashboard
 */

export { default as billingRoutes } from './billing.routes';
export { default } from './billing.routes';