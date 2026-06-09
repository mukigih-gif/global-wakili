-- Add DRAFT and PENDING_APPROVAL states to InvoiceStatus for the invoice approval workflow.
-- Postgres 12+ allows ALTER TYPE ... ADD VALUE inside a migration transaction as long as
-- the new value is not USED in the same transaction (it is not here).
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
