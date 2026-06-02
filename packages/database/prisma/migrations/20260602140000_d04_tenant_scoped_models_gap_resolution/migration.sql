-- D-04 Gate 2: TENANT_SCOPED_MODELS gap resolution
--
-- Problem:
--   MatterParty, MatterLien, StatuteOfLimitations were registered in
--   TENANT_SCOPED_MODELS but had no tenantId column. The tenant extension
--   was injecting { tenantId: X } into queries for models without the field,
--   causing broken isolation and potential Prisma runtime errors.
--
--   DataLineage had tenantId but was missing from TENANT_SCOPED_MODELS,
--   leaving it completely unprotected by the extension.
--
--   OwnershipRecord had no guaranteed cascade isolation path.
--
-- Solution:
--   Add tenantId (nullable for migration safety) to MatterParty, MatterLien,
--   StatuteOfLimitations, and OwnershipRecord.
--   Backfill MatterParty, MatterLien, StatuteOfLimitations from parent Matter.
--   Add DataLineage and OwnershipRecord to TENANT_SCOPED_MODELS in code.
--   Remove phantom entries (BankAccount, RecurringExpense, Vendor) from set.
--
-- Safety:
--   All new columns are nullable — no existing row data is lost.
--   Backfill uses UPDATE ... FROM to set tenantId from parent Matter.
--   Idempotent via IF NOT EXISTS / DO $$ guards.
--   OwnershipRecord tenantId left NULL for existing rows; new rows are
--   stamped by the tenant extension on create.

-- -------------------------------------------------------------------
-- MatterParty.tenantId
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'MatterParty' AND column_name = 'tenantId'
  ) THEN
    ALTER TABLE "MatterParty" ADD COLUMN "tenantId" TEXT;
  END IF;
END $$;

-- Backfill tenantId from parent Matter
UPDATE "MatterParty" mp
SET "tenantId" = m."tenantId"
FROM "Matter" m
WHERE mp."matterId" = m."id"
  AND mp."tenantId" IS NULL;

CREATE INDEX IF NOT EXISTS "MatterParty_tenantId_idx"
ON "MatterParty"("tenantId");

-- -------------------------------------------------------------------
-- MatterLien.tenantId
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'MatterLien' AND column_name = 'tenantId'
  ) THEN
    ALTER TABLE "MatterLien" ADD COLUMN "tenantId" TEXT;
  END IF;
END $$;

-- Backfill tenantId from parent Matter
UPDATE "MatterLien" ml
SET "tenantId" = m."tenantId"
FROM "Matter" m
WHERE ml."matterId" = m."id"
  AND ml."tenantId" IS NULL;

CREATE INDEX IF NOT EXISTS "MatterLien_tenantId_idx"
ON "MatterLien"("tenantId");

-- -------------------------------------------------------------------
-- StatuteOfLimitations.tenantId
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'StatuteOfLimitations' AND column_name = 'tenantId'
  ) THEN
    ALTER TABLE "StatuteOfLimitations" ADD COLUMN "tenantId" TEXT;
  END IF;
END $$;

-- Backfill tenantId from parent Matter
UPDATE "StatuteOfLimitations" sol
SET "tenantId" = m."tenantId"
FROM "Matter" m
WHERE sol."matterId" = m."id"
  AND sol."tenantId" IS NULL;

CREATE INDEX IF NOT EXISTS "StatuteOfLimitations_tenantId_idx"
ON "StatuteOfLimitations"("tenantId");

-- -------------------------------------------------------------------
-- OwnershipRecord.tenantId
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'OwnershipRecord' AND column_name = 'tenantId'
  ) THEN
    ALTER TABLE "OwnershipRecord" ADD COLUMN "tenantId" TEXT;
  END IF;
END $$;

-- No automatic backfill for OwnershipRecord — resourceType/resourceId is
-- polymorphic and cannot be joined in a single SQL statement.
-- Existing rows will have NULL tenantId; new rows are stamped by the
-- tenant extension. A separate backfill script can be run per resource type.

CREATE INDEX IF NOT EXISTS "OwnershipRecord_tenantId_idx"
ON "OwnershipRecord"("tenantId");
