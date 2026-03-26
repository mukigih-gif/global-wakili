-- Track Matter Closure
ALTER TABLE "Matter" ADD COLUMN "closedAt" DATETIME;
ALTER TABLE "Matter" ADD COLUMN "closedBy" TEXT;

-- Audit Log for Financial Actions
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "matterId" TEXT,
    "userId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("matterId") REFERENCES "Matter"("id"),
    FOREIGN KEY ("userId") REFERENCES "User"("id")
);

CREATE INDEX "AuditLog_matterId_idx" ON "AuditLog"("matterId");