BEGIN;
DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM "Matter" WHERE "tenantId" IS NULL;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'Phase B aborted: % Matter rows have NULL tenantId', cnt;
  END IF;
END$$;
ALTER TABLE "Matter" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Document" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "TimeEntry" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ExpenseEntry" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ClientTrustLedger" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "TrustTransaction" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "OfficeTransaction" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX IF EXISTS "Invoice_invoiceNumber_key";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "invoice_tenant_invoice_number_unique" ON "Invoice" ("tenantId","invoiceNumber");
DROP INDEX IF EXISTS "Matter_caseNumber_key";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "matter_tenant_case_number_unique" ON "Matter" ("tenantId","caseNumber");
DROP INDEX IF EXISTS "TrustAccount_accountNumber_key";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "trustaccount_tenant_account_number_unique" ON "TrustAccount" ("tenantId","accountNumber");
DROP INDEX IF EXISTS "Client_kraPin_key";
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "client_tenant_krapin_unique" ON "Client" ("tenantId","kraPin");
COMMIT;
