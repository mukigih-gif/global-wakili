-- Migration: Client Issues Ticketing + Client Prospects Pipeline (CRM)
-- Adds tenant-level client issues ticketing and CRM prospect pipeline.
-- All models are tenant-scoped and additive only.

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE "ClientIssueStatus" AS ENUM (
  'OPEN', 'IN_PROGRESS', 'WAITING_ON_CLIENT', 'ESCALATED', 'RESOLVED', 'CLOSED'
);
CREATE TYPE "ClientIssuePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "ClientIssueCategory" AS ENUM (
  'GENERAL', 'BILLING', 'DOCUMENT', 'MATTER_UPDATE',
  'TRUST_ACCOUNT', 'LEGAL_ADVICE', 'COMPLAINT', 'OTHER'
);
CREATE TYPE "ProspectSource" AS ENUM (
  'REFERRAL', 'WEBSITE', 'SOCIAL_MEDIA', 'COLD_OUTREACH',
  'WALK_IN', 'EVENT', 'ADVERTISEMENT', 'EXISTING_CLIENT', 'OTHER'
);
CREATE TYPE "PipelineStage" AS ENUM (
  'INITIAL_CONTACT', 'NEEDS_ASSESSMENT', 'PROPOSAL_SENT',
  'NEGOTIATION', 'RETAINER_SIGNED', 'CONVERTED', 'LOST', 'DORMANT'
);
CREATE TYPE "ProspectStatus"       AS ENUM ('ACTIVE', 'CONVERTED', 'LOST', 'DORMANT');
CREATE TYPE "ProspectActivityType" AS ENUM (
  'CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP', 'PROPOSAL', 'DEMO', 'NOTE'
);

-- ── ClientIssue ───────────────────────────────────────────────────────────────

CREATE TABLE "ClientIssue" (
    "id"              TEXT                 NOT NULL,
    "tenantId"        TEXT                 NOT NULL,
    "clientId"        TEXT                 NOT NULL,
    "matterId"        TEXT,
    "raisedByUserId"  TEXT,
    "assignedToId"    TEXT,
    "status"          "ClientIssueStatus"  NOT NULL DEFAULT 'OPEN',
    "priority"        "ClientIssuePriority" NOT NULL DEFAULT 'NORMAL',
    "category"        "ClientIssueCategory" NOT NULL DEFAULT 'GENERAL',
    "subject"         TEXT                 NOT NULL,
    "description"     TEXT                 NOT NULL,
    "resolvedAt"      TIMESTAMP(3),
    "closedAt"        TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "metadata"        JSONB,
    "createdAt"       TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientIssue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientIssue_tenantId_idx"    ON "ClientIssue"("tenantId");
CREATE INDEX "ClientIssue_clientId_idx"    ON "ClientIssue"("clientId");
CREATE INDEX "ClientIssue_matterId_idx"    ON "ClientIssue"("matterId");
CREATE INDEX "ClientIssue_status_idx"      ON "ClientIssue"("status");
CREATE INDEX "ClientIssue_priority_idx"    ON "ClientIssue"("priority");
CREATE INDEX "ClientIssue_assignedToId_idx" ON "ClientIssue"("assignedToId");

ALTER TABLE "ClientIssue"
    ADD CONSTRAINT "ClientIssue_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientIssue"
    ADD CONSTRAINT "ClientIssue_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientIssue"
    ADD CONSTRAINT "ClientIssue_matterId_fkey"
    FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientIssue"
    ADD CONSTRAINT "ClientIssue_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientIssue"
    ADD CONSTRAINT "ClientIssue_raisedByUserId_fkey"
    FOREIGN KEY ("raisedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── ClientIssueComment ────────────────────────────────────────────────────────

CREATE TABLE "ClientIssueComment" (
    "id"         TEXT         NOT NULL,
    "tenantId"   TEXT         NOT NULL,
    "issueId"    TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "body"       TEXT         NOT NULL,
    "isInternal" BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientIssueComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientIssueComment_tenantId_idx" ON "ClientIssueComment"("tenantId");
CREATE INDEX "ClientIssueComment_issueId_idx"  ON "ClientIssueComment"("issueId");

ALTER TABLE "ClientIssueComment"
    ADD CONSTRAINT "ClientIssueComment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientIssueComment"
    ADD CONSTRAINT "ClientIssueComment_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "ClientIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientIssueComment"
    ADD CONSTRAINT "ClientIssueComment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ClientProspect ────────────────────────────────────────────────────────────

CREATE TABLE "ClientProspect" (
    "id"                TEXT               NOT NULL,
    "tenantId"          TEXT               NOT NULL,
    "branchId"          TEXT,
    "name"              TEXT               NOT NULL,
    "email"             TEXT,
    "phoneNumber"       TEXT,
    "company"           TEXT,
    "source"            "ProspectSource"   NOT NULL DEFAULT 'REFERRAL',
    "stage"             "PipelineStage"    NOT NULL DEFAULT 'INITIAL_CONTACT',
    "status"            "ProspectStatus"   NOT NULL DEFAULT 'ACTIVE',
    "estimatedValue"    DECIMAL(18,2),
    "currency"          TEXT               NOT NULL DEFAULT 'KES',
    "practiceArea"      TEXT,
    "notes"             TEXT,
    "assignedToId"      TEXT,
    "expectedCloseDate" TIMESTAMP(3),
    "convertedClientId" TEXT,
    "convertedAt"       TIMESTAMP(3),
    "lostReason"        TEXT,
    "metadata"          JSONB,
    "createdAt"         TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientProspect_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientProspect_tenantId_idx"    ON "ClientProspect"("tenantId");
CREATE INDEX "ClientProspect_stage_idx"       ON "ClientProspect"("stage");
CREATE INDEX "ClientProspect_status_idx"      ON "ClientProspect"("status");
CREATE INDEX "ClientProspect_assignedToId_idx" ON "ClientProspect"("assignedToId");
CREATE INDEX "ClientProspect_source_idx"      ON "ClientProspect"("source");

ALTER TABLE "ClientProspect"
    ADD CONSTRAINT "ClientProspect_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientProspect"
    ADD CONSTRAINT "ClientProspect_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientProspect"
    ADD CONSTRAINT "ClientProspect_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── ProspectActivity ──────────────────────────────────────────────────────────

CREATE TABLE "ProspectActivity" (
    "id"           TEXT                  NOT NULL,
    "tenantId"     TEXT                  NOT NULL,
    "prospectId"   TEXT                  NOT NULL,
    "userId"       TEXT                  NOT NULL,
    "activityType" "ProspectActivityType" NOT NULL,
    "subject"      TEXT                  NOT NULL,
    "notes"        TEXT,
    "outcome"      TEXT,
    "scheduledAt"  TIMESTAMP(3),
    "completedAt"  TIMESTAMP(3),
    "metadata"     JSONB,
    "createdAt"    TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProspectActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProspectActivity_tenantId_idx"   ON "ProspectActivity"("tenantId");
CREATE INDEX "ProspectActivity_prospectId_idx" ON "ProspectActivity"("prospectId");

ALTER TABLE "ProspectActivity"
    ADD CONSTRAINT "ProspectActivity_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProspectActivity"
    ADD CONSTRAINT "ProspectActivity_prospectId_fkey"
    FOREIGN KEY ("prospectId") REFERENCES "ClientProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProspectActivity"
    ADD CONSTRAINT "ProspectActivity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
