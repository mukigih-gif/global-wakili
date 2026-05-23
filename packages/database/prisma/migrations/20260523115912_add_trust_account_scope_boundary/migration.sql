-- Trust account scope boundary migration
-- Purpose:
--   Add trustAccountId to trust-relevant banking, ledger, and reconciliation records.
--   Add currency/service-contract fields needed by hardened Trust services.
--
-- Safety:
--   New trustAccountId columns are nullable for live-data migration safety.
--   Application code enforces trustAccountId for new Trust flows.
--   This migration does not rewrite historical rows.
--   This migration does not modify previously applied migration files.

-- -------------------------------------------------------------------
-- ClientTrustLedger trust-account boundary
-- -------------------------------------------------------------------

ALTER TABLE "ClientTrustLedger"
ADD COLUMN IF NOT EXISTS "trustAccountId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ClientTrustLedger_trustAccountId_fkey'
  ) THEN
    ALTER TABLE "ClientTrustLedger"
    ADD CONSTRAINT "ClientTrustLedger_trustAccountId_fkey"
    FOREIGN KEY ("trustAccountId")
    REFERENCES "TrustAccount"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ClientTrustLedger_trustAccountId_idx"
ON "ClientTrustLedger"("trustAccountId");

CREATE INDEX IF NOT EXISTS "ClientTrustLedger_tenantId_trustAccountId_idx"
ON "ClientTrustLedger"("tenantId", "trustAccountId");

CREATE INDEX IF NOT EXISTS "ClientTrustLedger_tenantId_trustAccountId_clientId_idx"
ON "ClientTrustLedger"("tenantId", "trustAccountId", "clientId");

CREATE INDEX IF NOT EXISTS "ClientTrustLedger_tenantId_trustAccountId_clientId_matterId_idx"
ON "ClientTrustLedger"("tenantId", "trustAccountId", "clientId", "matterId");

CREATE INDEX IF NOT EXISTS "ClientTrustLedger_tenantId_trustAccountId_transactionDate_idx"
ON "ClientTrustLedger"("tenantId", "trustAccountId", "transactionDate");

-- -------------------------------------------------------------------
-- TrustAccount currency and lookup boundary
-- -------------------------------------------------------------------

ALTER TABLE "TrustAccount"
ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'KES';

CREATE INDEX IF NOT EXISTS "TrustAccount_tenantId_isActive_idx"
ON "TrustAccount"("tenantId", "isActive");

-- -------------------------------------------------------------------
-- TrustTransaction service-contract fields
-- -------------------------------------------------------------------

ALTER TABLE "TrustTransaction"
ADD COLUMN IF NOT EXISTS "bankTransactionId" TEXT;

ALTER TABLE "TrustTransaction"
ADD COLUMN IF NOT EXISTS "createdById" TEXT;

ALTER TABLE "TrustTransaction"
ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "TrustTransaction"
ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'KES';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'TrustTransaction_bankTransactionId_fkey'
  ) THEN
    ALTER TABLE "TrustTransaction"
    ADD CONSTRAINT "TrustTransaction_bankTransactionId_fkey"
    FOREIGN KEY ("bankTransactionId")
    REFERENCES "BankTransaction"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TrustTransaction_tenantId_trustAccountId_idx"
ON "TrustTransaction"("tenantId", "trustAccountId");

CREATE INDEX IF NOT EXISTS "TrustTransaction_tenantId_trustAccountId_transactionDate_idx"
ON "TrustTransaction"("tenantId", "trustAccountId", "transactionDate");

CREATE INDEX IF NOT EXISTS "TrustTransaction_bankTransactionId_idx"
ON "TrustTransaction"("bankTransactionId");

CREATE INDEX IF NOT EXISTS "TrustTransaction_createdById_idx"
ON "TrustTransaction"("createdById");

-- -------------------------------------------------------------------
-- BankTransaction trust-account boundary
-- -------------------------------------------------------------------

ALTER TABLE "BankTransaction"
ADD COLUMN IF NOT EXISTS "trustAccountId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'BankTransaction_trustAccountId_fkey'
  ) THEN
    ALTER TABLE "BankTransaction"
    ADD CONSTRAINT "BankTransaction_trustAccountId_fkey"
    FOREIGN KEY ("trustAccountId")
    REFERENCES "TrustAccount"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "BankTransaction_trustAccountId_idx"
ON "BankTransaction"("trustAccountId");

CREATE INDEX IF NOT EXISTS "BankTransaction_tenantId_trustAccountId_idx"
ON "BankTransaction"("tenantId", "trustAccountId");

CREATE INDEX IF NOT EXISTS "BankTransaction_tenantId_trustAccountId_transactionDate_idx"
ON "BankTransaction"("tenantId", "trustAccountId", "transactionDate");

CREATE INDEX IF NOT EXISTS "BankTransaction_tenantId_trustAccountId_reference_idx"
ON "BankTransaction"("tenantId", "trustAccountId", "reference");

-- -------------------------------------------------------------------
-- ReconciliationRun trust-account boundary
-- -------------------------------------------------------------------

ALTER TABLE "ReconciliationRun"
ADD COLUMN IF NOT EXISTS "trustAccountId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ReconciliationRun_trustAccountId_fkey'
  ) THEN
    ALTER TABLE "ReconciliationRun"
    ADD CONSTRAINT "ReconciliationRun_trustAccountId_fkey"
    FOREIGN KEY ("trustAccountId")
    REFERENCES "TrustAccount"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ReconciliationRun_trustAccountId_idx"
ON "ReconciliationRun"("trustAccountId");

CREATE INDEX IF NOT EXISTS "ReconciliationRun_tenantId_trustAccountId_idx"
ON "ReconciliationRun"("tenantId", "trustAccountId");

CREATE INDEX IF NOT EXISTS "ReconciliationRun_trust_scope_period_idx"
ON "ReconciliationRun"("tenantId", "trustAccountId", "periodStart", "periodEnd");

-- -------------------------------------------------------------------
-- ReconciliationMatch trust-account boundary
-- -------------------------------------------------------------------

ALTER TABLE "ReconciliationMatch"
ADD COLUMN IF NOT EXISTS "trustAccountId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ReconciliationMatch_trustAccountId_fkey'
  ) THEN
    ALTER TABLE "ReconciliationMatch"
    ADD CONSTRAINT "ReconciliationMatch_trustAccountId_fkey"
    FOREIGN KEY ("trustAccountId")
    REFERENCES "TrustAccount"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ReconciliationMatch_trustAccountId_idx"
ON "ReconciliationMatch"("trustAccountId");

CREATE INDEX IF NOT EXISTS "ReconciliationMatch_tenantId_trustAccountId_idx"
ON "ReconciliationMatch"("tenantId", "trustAccountId");

CREATE INDEX IF NOT EXISTS "ReconciliationMatch_tenantId_trustAccountId_status_idx"
ON "ReconciliationMatch"("tenantId", "trustAccountId", "status");
