-- D-02 Gate 2: Add @unique constraint to GlobalAuditLog.hash
--
-- Purpose:
--   GlobalAuditLog.hash must be globally unique to enforce tamper-evidence.
--   AuditLog.hash already has @unique (applied in earlier migrations).
--   This migration brings GlobalAuditLog into parity.
--
-- Safety:
--   Uses IF NOT EXISTS / DO $$ guards — idempotent, safe to re-run.
--   If duplicate hashes exist in GlobalAuditLog the constraint will fail.
--   In that case: investigate duplicate rows before re-applying.
--
-- Acceptance criteria:
--   ALTER TABLE succeeds → GlobalAuditLog_hash_key constraint visible in pg_constraint.
--   Attempt to INSERT a duplicate hash must return unique violation error.

-- AddUniqueConstraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'GlobalAuditLog_hash_key'
      AND conrelid = '"GlobalAuditLog"'::regclass
  ) THEN
    ALTER TABLE "GlobalAuditLog"
    ADD CONSTRAINT "GlobalAuditLog_hash_key" UNIQUE ("hash");
  END IF;
END $$;

-- CreateIndex: createdAt index for chain-ordering queries (supports D-03 sequenceNumber migration)
CREATE INDEX IF NOT EXISTS "GlobalAuditLog_createdAt_idx"
ON "GlobalAuditLog"("createdAt");
