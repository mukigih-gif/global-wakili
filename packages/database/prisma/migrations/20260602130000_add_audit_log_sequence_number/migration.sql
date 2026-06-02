-- D-03 Gate 2: Add sequenceNumber to AuditLog and GlobalAuditLog
--
-- Purpose:
--   The audit chain previousHash fetch uses findFirst({ orderBy: createdAt desc }).
--   Two concurrent writes can read the same previousHash, forking the chain.
--   A database-level sequence provides a total ordering guarantee independent
--   of createdAt, eliminating the race condition.
--
-- Design:
--   BIGSERIAL assigns a globally-unique, monotonically-increasing integer to
--   every row. Existing rows receive sequential values automatically.
--   Application code orders by sequenceNumber DESC instead of createdAt DESC
--   to fetch the true last entry for chain continuity.
--
-- Safety:
--   BIGSERIAL is idempotent via IF NOT EXISTS column check.
--   Adding a BIGSERIAL column to an existing table is safe — PostgreSQL
--   fills all existing rows with sequential values from the new sequence.
--   No data is modified or deleted.
--
-- Service-layer changes (applied in same commit):
--   audit-logger.ts, MatterAuditService.ts, TimeTrackingService.ts,
--   TimerService.ts, TimeApprovalService.ts, MatterKYCService.ts —
--   all chain-fetches updated to ORDER BY sequenceNumber DESC.
--
-- Acceptance criteria:
--   Both tables have sequenceNumber column of type bigint with a sequence default.
--   All service chain-fetches use sequenceNumber ordering.
--   Concurrent inserts each receive a unique sequenceNumber — no forking.

-- AuditLog sequenceNumber
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AuditLog'
      AND column_name = 'sequenceNumber'
  ) THEN
    ALTER TABLE "AuditLog" ADD COLUMN "sequenceNumber" BIGSERIAL NOT NULL;
  END IF;
END $$;

-- GlobalAuditLog sequenceNumber
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'GlobalAuditLog'
      AND column_name = 'sequenceNumber'
  ) THEN
    ALTER TABLE "GlobalAuditLog" ADD COLUMN "sequenceNumber" BIGSERIAL NOT NULL;
  END IF;
END $$;

-- Indexes for efficient chain-fetch queries
CREATE INDEX IF NOT EXISTS "AuditLog_sequenceNumber_idx"
ON "AuditLog"("sequenceNumber");

-- Composite index: tenantId + sequenceNumber — the exact query pattern used by all chain-fetches
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_sequenceNumber_idx"
ON "AuditLog"("tenantId", "sequenceNumber");

CREATE INDEX IF NOT EXISTS "GlobalAuditLog_sequenceNumber_idx"
ON "GlobalAuditLog"("sequenceNumber");
