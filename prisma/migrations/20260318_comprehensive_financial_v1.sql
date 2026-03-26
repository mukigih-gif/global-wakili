-- 1. Update User Table
-- Adds the hourly rate required for the WorklogController to calculate billable amounts.
ALTER TABLE "User" ADD COLUMN "hourlyRate" DECIMAL(18,2) NOT NULL DEFAULT 0.00;

-- 2. Create Worklog Table
-- Unifies both versions of the Worklog table with standardized constraints.
CREATE TABLE "Worklog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "billableAmount" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "status" TEXT NOT NULL DEFAULT 'PENDING_INVOICE', -- Options: PENDING_INVOICE, INVOICED, NON_BILLABLE
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints for Data Integrity
    CONSTRAINT "Worklog_matterId_fkey" 
        FOREIGN KEY ("matterId") REFERENCES "Matter" ("id") ON DELETE RESTRICT,
    CONSTRAINT "Worklog_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT
);

-- 3. Optimization Indexes
-- Critical for the 'InvoicingService' and 'ClientPortfolioService' to pull logs quickly.
CREATE INDEX "Worklog_matterId_idx" ON "Worklog"("matterId");
CREATE INDEX "Worklog_userId_idx" ON "Worklog"("userId");
CREATE INDEX "Worklog_status_idx" ON "Worklog"("status");