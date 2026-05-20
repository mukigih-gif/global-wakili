-- Migration A: Baseline existing Neon drift.
-- Purpose: record columns already confirmed in Neon.
-- Safety: all statements are idempotent and nullable.
-- No DROP. No RENAME. No data rewrite.

ALTER TABLE "AIReviewTask" ADD COLUMN IF NOT EXISTS "caseNumber" TEXT;
ALTER TABLE "AIReviewTask" ADD COLUMN IF NOT EXISTS "matterCode" TEXT;

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "caseNumber" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "matterCode" TEXT;

ALTER TABLE "ReconciliationMatch" ADD COLUMN IF NOT EXISTS "caseNumber" TEXT;
ALTER TABLE "ReconciliationMatch" ADD COLUMN IF NOT EXISTS "matterCode" TEXT;

ALTER TABLE "ReportExport" ADD COLUMN IF NOT EXISTS "caseNumber" TEXT;
ALTER TABLE "ReportExport" ADD COLUMN IF NOT EXISTS "matterCode" TEXT;

ALTER TABLE "ReportRun" ADD COLUMN IF NOT EXISTS "caseNumber" TEXT;
ALTER TABLE "ReportRun" ADD COLUMN IF NOT EXISTS "matterCode" TEXT;
