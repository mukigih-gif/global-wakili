-- packages/database/prisma/migrations/0002_billing_fiscal_hardening/migration.sql

ALTER TABLE "Invoice"
ADD COLUMN IF NOT EXISTS "whtAmount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "balanceDue" DECIMAL(18, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "fiscalSignature" TEXT,
ADD COLUMN IF NOT EXISTS "cuSerialNumber" TEXT,
ADD COLUMN IF NOT EXISTS "cuInvoiceNumber" TEXT,
ADD COLUMN IF NOT EXISTS "etimsQrCode" TEXT,
ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancelledById" TEXT,
ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
ADD COLUMN IF NOT EXISTS "voidFiscalRecord" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Invoice"
SET
  "balanceDue" = "total" - "whtAmount"
WHERE "balanceDue" = 0
  AND "total" IS NOT NULL;

ALTER TABLE "InvoiceLine"
ADD COLUMN IF NOT EXISTS "taxRate" DECIMAL(18, 4) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "taxMode" TEXT NOT NULL DEFAULT 'VATABLE',
ADD COLUMN IF NOT EXISTS "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
ADD COLUMN IF NOT EXISTS "isWhtApplicable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "whtRate" DECIMAL(18, 4) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "whtAmount" DECIMAL(18, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "InvoiceSequence" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceSequence_tenantId_prefix_year_key"
ON "InvoiceSequence" ("tenantId", "prefix", "year");

CREATE INDEX IF NOT EXISTS "InvoiceSequence_tenantId_idx"
ON "InvoiceSequence" ("tenantId");

CREATE INDEX IF NOT EXISTS "Invoice_whtAmount_idx"
ON "Invoice" ("whtAmount");

CREATE INDEX IF NOT EXISTS "Invoice_balanceDue_idx"
ON "Invoice" ("balanceDue");

CREATE INDEX IF NOT EXISTS "Invoice_etimsStatus_idx"
ON "Invoice" ("etimsStatus");

CREATE INDEX IF NOT EXISTS "Invoice_cancelledAt_idx"
ON "Invoice" ("cancelledAt");

CREATE INDEX IF NOT EXISTS "InvoiceLine_sourceType_sourceId_idx"
ON "InvoiceLine" ("sourceType", "sourceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_cancelledById_fkey'
  ) THEN
    ALTER TABLE "Invoice"
    ADD CONSTRAINT "Invoice_cancelledById_fkey"
    FOREIGN KEY ("cancelledById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceSequence_tenantId_fkey'
  ) THEN
    ALTER TABLE "InvoiceSequence"
    ADD CONSTRAINT "InvoiceSequence_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_wht_non_negative'
  ) THEN
    ALTER TABLE "Invoice"
    ADD CONSTRAINT "invoice_wht_non_negative"
    CHECK ("whtAmount" >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_balance_due_non_negative'
  ) THEN
    ALTER TABLE "Invoice"
    ADD CONSTRAINT "invoice_balance_due_non_negative"
    CHECK ("balanceDue" >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_balance_due_consistency'
  ) THEN
    ALTER TABLE "Invoice"
    ADD CONSTRAINT "invoice_balance_due_consistency"
    CHECK ("balanceDue" <= "total");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_line_tax_mode_valid'
  ) THEN
    ALTER TABLE "InvoiceLine"
    ADD CONSTRAINT "invoice_line_tax_mode_valid"
    CHECK ("taxMode" IN ('VATABLE', 'EXEMPT', 'ZERO_RATED', 'NON_VATABLE'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_line_wht_non_negative'
  ) THEN
    ALTER TABLE "InvoiceLine"
    ADD CONSTRAINT "invoice_line_wht_non_negative"
    CHECK ("whtAmount" >= 0 AND "whtRate" >= 0);
  END IF;
END $$;