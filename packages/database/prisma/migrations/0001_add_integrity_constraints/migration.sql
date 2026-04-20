CREATE UNIQUE INDEX IF NOT EXISTS "unique_platform_user_email"
ON "User" ("email")
WHERE "tenantId" IS NULL;

ALTER TABLE "Invoice"
ADD CONSTRAINT "invoice_amounts_non_negative"
CHECK (
  "total" >= 0
  AND "netAmount" >= 0
  AND "subTotal" >= 0
  AND "taxAmount" >= 0
  AND "paidAmount" >= 0
) NOT VALID;

ALTER TABLE "Invoice"
ADD CONSTRAINT "invoice_total_consistency"
CHECK ("total" >= "netAmount") NOT VALID;

ALTER TABLE "JournalLine"
ADD CONSTRAINT "journal_line_single_sided"
CHECK (
  ("debit" > 0 AND "credit" = 0)
  OR
  ("credit" > 0 AND "debit" = 0)
) NOT VALID;

ALTER TABLE "Invoice"
VALIDATE CONSTRAINT "invoice_amounts_non_negative";

ALTER TABLE "Invoice"
VALIDATE CONSTRAINT "invoice_total_consistency";

ALTER TABLE "JournalLine"
VALIDATE CONSTRAINT "journal_line_single_sided";