ALTER TABLE "PaymentReceipt"
ADD COLUMN IF NOT EXISTS "reversedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "reversedById" TEXT,
ADD COLUMN IF NOT EXISTS "reversalReason" TEXT;

CREATE INDEX IF NOT EXISTS "PaymentReceipt_reversedById_idx"
ON "PaymentReceipt" ("reversedById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentReceipt_reversedById_fkey'
  ) THEN
    ALTER TABLE "PaymentReceipt"
    ADD CONSTRAINT "PaymentReceipt_reversedById_fkey"
    FOREIGN KEY ("reversedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PaymentReceiptSequence" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentReceiptSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentReceiptSequence_tenantId_prefix_year_key"
ON "PaymentReceiptSequence" ("tenantId", "prefix", "year");

CREATE INDEX IF NOT EXISTS "PaymentReceiptSequence_tenantId_idx"
ON "PaymentReceiptSequence" ("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentReceiptSequence_tenantId_fkey'
  ) THEN
    ALTER TABLE "PaymentReceiptSequence"
    ADD CONSTRAINT "PaymentReceiptSequence_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PaymentReceipt_tenantId_reference_idx"
ON "PaymentReceipt" ("tenantId", "reference");

CREATE INDEX IF NOT EXISTS "PaymentReceipt_tenantId_receiptNumber_idx"
ON "PaymentReceipt" ("tenantId", "receiptNumber");

CREATE INDEX IF NOT EXISTS "PaymentReceiptAllocation_tenantId_invoiceId_idx"
ON "PaymentReceiptAllocation" ("tenantId", "invoiceId");

CREATE INDEX IF NOT EXISTS "PaymentReceiptAllocation_tenantId_paymentReceiptId_idx"
ON "PaymentReceiptAllocation" ("tenantId", "paymentReceiptId");