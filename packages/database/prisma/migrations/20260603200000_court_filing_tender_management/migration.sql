-- Migration: Court Filing Registry + Legal Tender Management
-- Closes the clerk filing gap and adds full tender management for law firms.

-- ── Court Filing Enums ────────────────────────────────────────────────────────
CREATE TYPE "CourtFilingType"   AS ENUM ('APPLICATION','PETITION','NOTICE_OF_MOTION','AFFIDAVIT','WRITTEN_SUBMISSIONS','PLEADING','RESPONSE','REPLY','NOTICE_OF_APPEAL','MEMORANDUM','OTHER');
CREATE TYPE "CourtFilingStatus" AS ENUM ('PREPARED','FILED','RECEIVED_BY_COURT','REJECTED_BY_COURT','SERVED','COMPLETED');

-- ── CourtFiling ───────────────────────────────────────────────────────────────
CREATE TABLE "CourtFiling" (
    "id"         TEXT                 NOT NULL,
    "tenantId"   TEXT                 NOT NULL,
    "matterId"   TEXT                 NOT NULL,
    "hearingId"  TEXT,
    "filingType" "CourtFilingType"    NOT NULL DEFAULT 'OTHER',
    "status"     "CourtFilingStatus"  NOT NULL DEFAULT 'PREPARED',
    "title"      TEXT                 NOT NULL,
    "courtRef"   TEXT,
    "filedAt"    TIMESTAMP(3),
    "filedById"  TEXT,
    "receivedAt" TIMESTAMP(3),
    "dueDate"    TIMESTAMP(3),
    "documentId" TEXT,
    "scanUrl"    TEXT,
    "notes"      TEXT,
    "metadata"   JSONB,
    "createdAt"  TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourtFiling_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CourtFiling_tenantId_idx"    ON "CourtFiling"("tenantId");
CREATE INDEX "CourtFiling_matterId_idx"    ON "CourtFiling"("matterId");
CREATE INDEX "CourtFiling_hearingId_idx"   ON "CourtFiling"("hearingId");
CREATE INDEX "CourtFiling_status_idx"      ON "CourtFiling"("status");
CREATE INDEX "CourtFiling_filingType_idx"  ON "CourtFiling"("filingType");
CREATE INDEX "CourtFiling_dueDate_idx"     ON "CourtFiling"("dueDate");
ALTER TABLE "CourtFiling" ADD CONSTRAINT "CourtFiling_tenantId_fkey"  FOREIGN KEY ("tenantId")  REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourtFiling" ADD CONSTRAINT "CourtFiling_matterId_fkey"  FOREIGN KEY ("matterId")  REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourtFiling" ADD CONSTRAINT "CourtFiling_hearingId_fkey" FOREIGN KEY ("hearingId") REFERENCES "CourtHearing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourtFiling" ADD CONSTRAINT "CourtFiling_filedById_fkey" FOREIGN KEY ("filedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Tender Enums ──────────────────────────────────────────────────────────────
CREATE TYPE "TenderCategory"     AS ENUM ('GOODS','WORKS','SERVICES','CONSULTANCY','OTHER');
CREATE TYPE "TenderStatus"       AS ENUM ('IDENTIFIED','DOCUMENTS_PREPARATION','SUBMITTED','EVALUATION','AWARDED','NOT_AWARDED','CANCELLED','WITHDRAWN');
CREATE TYPE "TenderOutcome"      AS ENUM ('AWARDED','NOT_AWARDED','DISQUALIFIED','WITHDRAWN','CANCELLED');
CREATE TYPE "TenderActivityType" AS ENUM ('DOCUMENT_PREPARED','SUBMISSION_MADE','CLARIFICATION_SENT','CLARIFICATION_RECEIVED','EVALUATION_ATTENDED','AWARD_RECEIVED','APPEAL_FILED','NOTE');

-- ── TenderRecord ──────────────────────────────────────────────────────────────
CREATE TABLE "TenderRecord" (
    "id"             TEXT             NOT NULL,
    "tenantId"       TEXT             NOT NULL,
    "matterId"       TEXT,
    "tenderNumber"   TEXT,
    "tenderName"     TEXT             NOT NULL,
    "issuedBy"       TEXT,
    "category"       "TenderCategory" NOT NULL DEFAULT 'GOODS',
    "status"         "TenderStatus"   NOT NULL DEFAULT 'IDENTIFIED',
    "estimatedValue" DECIMAL(18,2),
    "currency"       TEXT             NOT NULL DEFAULT 'KES',
    "openingDate"    TIMESTAMP(3),
    "deadline"       TIMESTAMP(3),
    "submittedAt"    TIMESTAMP(3),
    "outcomeDate"    TIMESTAMP(3),
    "outcome"        "TenderOutcome",
    "outcomeNotes"   TEXT,
    "assignedToId"   TEXT,
    "clientId"       TEXT,
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenderRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TenderRecord_tenantId_idx"   ON "TenderRecord"("tenantId");
CREATE INDEX "TenderRecord_matterId_idx"   ON "TenderRecord"("matterId");
CREATE INDEX "TenderRecord_status_idx"     ON "TenderRecord"("status");
CREATE INDEX "TenderRecord_deadline_idx"   ON "TenderRecord"("deadline");
CREATE INDEX "TenderRecord_assignedToId_idx" ON "TenderRecord"("assignedToId");
ALTER TABLE "TenderRecord" ADD CONSTRAINT "TenderRecord_tenantId_fkey"   FOREIGN KEY ("tenantId")   REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenderRecord" ADD CONSTRAINT "TenderRecord_matterId_fkey"   FOREIGN KEY ("matterId")   REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenderRecord" ADD CONSTRAINT "TenderRecord_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── TenderActivity ────────────────────────────────────────────────────────────
CREATE TABLE "TenderActivity" (
    "id"           TEXT                  NOT NULL,
    "tenantId"     TEXT                  NOT NULL,
    "tenderId"     TEXT                  NOT NULL,
    "userId"       TEXT                  NOT NULL,
    "activityType" "TenderActivityType"  NOT NULL,
    "subject"      TEXT                  NOT NULL,
    "notes"        TEXT,
    "documentId"   TEXT,
    "completedAt"  TIMESTAMP(3),
    "metadata"     JSONB,
    "createdAt"    TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenderActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TenderActivity_tenantId_idx"  ON "TenderActivity"("tenantId");
CREATE INDEX "TenderActivity_tenderId_idx"  ON "TenderActivity"("tenderId");
ALTER TABLE "TenderActivity" ADD CONSTRAINT "TenderActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenderActivity" ADD CONSTRAINT "TenderActivity_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "TenderRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenderActivity" ADD CONSTRAINT "TenderActivity_userId_fkey"   FOREIGN KEY ("userId")   REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── TenderDocument ────────────────────────────────────────────────────────────
CREATE TABLE "TenderDocument" (
    "id"         TEXT         NOT NULL,
    "tenantId"   TEXT         NOT NULL,
    "tenderId"   TEXT         NOT NULL,
    "documentId" TEXT,
    "title"      TEXT         NOT NULL,
    "docType"    TEXT         NOT NULL,
    "scanUrl"    TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenderDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TenderDocument_tenantId_idx" ON "TenderDocument"("tenantId");
CREATE INDEX "TenderDocument_tenderId_idx" ON "TenderDocument"("tenderId");
ALTER TABLE "TenderDocument" ADD CONSTRAINT "TenderDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenderDocument" ADD CONSTRAINT "TenderDocument_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "TenderRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
