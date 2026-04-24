-- packages/database/prisma/migrations/0006_payment_allocation_accounting_hardening/migration.sql

ALTER TABLE "PaymentReceipt"
ADD COLUMN IF NOT EXISTS "unallocatedAmount" DECIMAL(18, 2) NOT NULL DEFAULT 0;

UPDATE "PaymentReceipt" pr
SET "unallocatedAmount" = GREATEST(
  pr."amount" - COALESCE(alloc."allocatedAmount", 0),
  0
)
FROM (
  SELECT
    "paymentReceiptId",
    SUM("amountApplied") AS "allocatedAmount"
  FROM "PaymentReceiptAllocation"
  GROUP BY "paymentReceiptId"
) alloc
WHERE pr."id" = alloc."paymentReceiptId";

UPDATE "PaymentReceipt"
SET "unallocatedAmount" = "amount"
WHERE "id" NOT IN (
  SELECT DISTINCT "paymentReceiptId"
  FROM "PaymentReceiptAllocation"
);

ALTER TABLE "PaymentReceiptAllocation"
ADD COLUMN IF NOT EXISTS "allocationType" TEXT NOT NULL DEFAULT 'CASH',
ADD COLUMN IF NOT EXISTS "withholdingTaxCertificateId" TEXT;

CREATE INDEX IF NOT EXISTS "PaymentReceipt_unallocatedAmount_idx"
ON "PaymentReceipt" ("unallocatedAmount");

CREATE INDEX IF NOT EXISTS "PaymentReceiptAllocation_allocationType_idx"
ON "PaymentReceiptAllocation" ("allocationType");

CREATE INDEX IF NOT EXISTS "PaymentReceiptAllocation_whtCertificateId_idx"
ON "PaymentReceiptAllocation" ("withholdingTaxCertificateId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_receipt_unallocated_non_negative'
  ) THEN
    ALTER TABLE "PaymentReceipt"
    ADD CONSTRAINT "payment_receipt_unallocated_non_negative"
    CHECK ("unallocatedAmount" >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_allocation_type_valid'
  ) THEN
    ALTER TABLE "PaymentReceiptAllocation"
    ADD CONSTRAINT "payment_allocation_type_valid"
    CHECK ("allocationType" IN ('CASH', 'WHT_CERTIFICATE'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'WithholdingTaxCertificate'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentReceiptAllocation_whtCertificate_fkey'
  ) THEN
    ALTER TABLE "PaymentReceiptAllocation"
    ADD CONSTRAINT "PaymentReceiptAllocation_whtCertificate_fkey"
    FOREIGN KEY ("withholdingTaxCertificateId") REFERENCES "WithholdingTaxCertificate"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;