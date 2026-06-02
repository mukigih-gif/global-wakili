-- Migration: WIP-004 Passive Time Capture
-- Gate scope: Add PassiveCaptureEvent model + fix TimerSession.durationMinutes

-- Fix TimerSession missing durationMinutes column (schema/service mismatch bug)
ALTER TABLE "TimerSession" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER;

-- Create PassiveCaptureEvent table for background activity ingestion
CREATE TABLE "PassiveCaptureEvent" (
    "id"                   TEXT NOT NULL,
    "tenantId"             TEXT NOT NULL,
    "userId"               TEXT NOT NULL,
    "matterId"             TEXT,
    "activityType"         TEXT NOT NULL,
    "activitySource"       TEXT NOT NULL,
    "activityAt"           TIMESTAMP(3) NOT NULL,
    "durationMinutes"      INTEGER NOT NULL,
    "suggestedDescription" TEXT,
    "status"               TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "convertedTimeEntryId" TEXT,
    "metadata"             JSONB,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassiveCaptureEvent_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one event per user per source per timestamp
CREATE UNIQUE INDEX "PassiveCaptureEvent_tenantId_userId_activitySource_activityAt_key"
    ON "PassiveCaptureEvent"("tenantId", "userId", "activitySource", "activityAt");

-- Indexes for common query patterns
CREATE INDEX "PassiveCaptureEvent_tenantId_idx"   ON "PassiveCaptureEvent"("tenantId");
CREATE INDEX "PassiveCaptureEvent_userId_idx"     ON "PassiveCaptureEvent"("userId");
CREATE INDEX "PassiveCaptureEvent_matterId_idx"   ON "PassiveCaptureEvent"("matterId");
CREATE INDEX "PassiveCaptureEvent_status_idx"     ON "PassiveCaptureEvent"("status");
CREATE INDEX "PassiveCaptureEvent_activityAt_idx" ON "PassiveCaptureEvent"("activityAt");

-- Foreign keys
ALTER TABLE "PassiveCaptureEvent"
    ADD CONSTRAINT "PassiveCaptureEvent_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PassiveCaptureEvent"
    ADD CONSTRAINT "PassiveCaptureEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PassiveCaptureEvent"
    ADD CONSTRAINT "PassiveCaptureEvent_matterId_fkey"
    FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
