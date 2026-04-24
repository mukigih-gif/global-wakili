-- packages/database/prisma/migrations/0004_billing_audit_wht_certificate/migration.sql

ALTER TABLE "Invoice"
ADD COLUMN IF NOT EXISTS "clientId" TEXT;

UPDATE "Invoice" i
SET "clientId" = m."clientId"
FROM "Matter" m
WHERE i."matterId" = m."id"
  AND i."clientId" IS NULL;

CREATE INDEX IF NOT EXISTS "Invoice_clientId_idx"
ON "Invoice" ("clientId");

CREATE INDEX IF NOT EXISTS "Invoice_tenantId_clientId_idx"
ON "Invoice" ("tenantId", "clientId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_clientId_fkey'
  ) THEN
    ALTER TABLE "Invoice"
    ADD CONSTRAINT "Invoice_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "JournalLine_tenantId_reference_idx"
ON "JournalLine" ("tenantId", "reference");

CREATE INDEX IF NOT EXISTS "JournalEntry_source_idx"
ON "JournalEntry" ("tenantId", "sourceModule", "sourceEntityType", "sourceEntityId");

CREATE TABLE IF NOT EXISTS "WithholdingTaxCertificate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "matterId" TEXT,
  "clientId" TEXT,
  "certificateNumber" TEXT NOT NULL,
  "certificateDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(18, 2) NOT NULL,
  "payerName" TEXT,
  "payerPin" TEXT,
  "receivedById" TEXT,
  "documentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "notes" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "cancelledById" TEXT,
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WithholdingTaxCertificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WithholdingTaxCertificate_tenantId_certificateNumber_key"
ON "WithholdingTaxCertificate" ("tenantId", "certificateNumber");

CREATE INDEX IF NOT EXISTS "WithholdingTaxCertificate_tenantId_idx"
ON "WithholdingTaxCertificate" ("tenantId");

CREATE INDEX IF NOT EXISTS "WithholdingTaxCertificate_invoiceId_idx"
ON "WithholdingTaxCertificate" ("invoiceId");

CREATE INDEX IF NOT EXISTS "WithholdingTaxCertificate_matterId_idx"
ON "WithholdingTaxCertificate" ("matterId");

CREATE INDEX IF NOT EXISTS "WithholdingTaxCertificate_clientId_idx"
ON "WithholdingTaxCertificate" ("clientId");

CREATE INDEX IF NOT EXISTS "WithholdingTaxCertificate_status_idx"
ON "WithholdingTaxCertificate" ("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WithholdingTaxCertificate_tenantId_fkey'
  ) THEN
    ALTER TABLE "WithholdingTaxCertificate"
    ADD CONSTRAINT "WithholdingTaxCertificate_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WithholdingTaxCertificate_invoiceId_fkey'
  ) THEN
    ALTER TABLE "WithholdingTaxCertificate"
    ADD CONSTRAINT "WithholdingTaxCertificate_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WithholdingTaxCertificate_matterId_fkey'
  ) THEN
    ALTER TABLE "WithholdingTaxCertificate"
    ADD CONSTRAINT "WithholdingTaxCertificate_matterId_fkey"
    FOREIGN KEY ("matterId") REFERENCES "Matter"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WithholdingTaxCertificate_clientId_fkey'
  ) THEN
    ALTER TABLE "WithholdingTaxCertificate"
    ADD CONSTRAINT "WithholdingTaxCertificate_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WithholdingTaxCertificate_receivedById_fkey'
  ) THEN
    ALTER TABLE "WithholdingTaxCertificate"
    ADD CONSTRAINT "WithholdingTaxCertificate_receivedById_fkey"
    FOREIGN KEY ("receivedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WithholdingTaxCertificate_cancelledById_fkey'
  ) THEN
    ALTER TABLE "WithholdingTaxCertificate"
    ADD CONSTRAINT "WithholdingTaxCertificate_cancelledById_fkey"
    FOREIGN KEY ("cancelledById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wht_certificate_amount_positive'
  ) THEN
    ALTER TABLE "WithholdingTaxCertificate"
    ADD CONSTRAINT "wht_certificate_amount_positive"
    CHECK ("amount" > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wht_certificate_status_valid'
  ) THEN
    ALTER TABLE "WithholdingTaxCertificate"
    ADD CONSTRAINT "wht_certificate_status_valid"
    CHECK ("status" IN ('RECEIVED', 'VERIFIED', 'REJECTED', 'CANCELLED'));
  END IF;
END $$;