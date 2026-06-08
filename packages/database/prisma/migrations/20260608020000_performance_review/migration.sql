-- PerformanceReview — structured review cycle with self + manager stages
CREATE TABLE "PerformanceReview" (
    "id"                 TEXT NOT NULL,
    "tenantId"           TEXT NOT NULL,
    "employeeId"         TEXT NOT NULL,
    "reviewerId"         TEXT,
    "cycleName"          TEXT NOT NULL,
    "periodStart"        TIMESTAMP(3) NOT NULL,
    "periodEnd"          TIMESTAMP(3) NOT NULL,
    "dueDate"            TIMESTAMP(3),
    "status"             TEXT NOT NULL DEFAULT 'DRAFT',
    "selfRating"         TEXT,
    "selfScore"          DECIMAL(5,2),
    "selfComments"       TEXT,
    "managerRating"      TEXT,
    "managerScore"       DECIMAL(5,2),
    "managerComments"    TEXT,
    "finalRating"        TEXT,
    "finalScore"         DECIMAL(5,2),
    "completedAt"        TIMESTAMP(3),
    "completedById"      TEXT,
    "cancellationReason" TEXT,
    "cancelledById"      TEXT,
    "cancelledAt"        TIMESTAMP(3),
    "createdById"        TEXT,
    "updatedById"        TEXT,
    "metadata"           JSONB,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PerformanceReview_tenantId_idx"   ON "PerformanceReview"("tenantId");
CREATE INDEX "PerformanceReview_employeeId_idx" ON "PerformanceReview"("employeeId");
CREATE INDEX "PerformanceReview_reviewerId_idx" ON "PerformanceReview"("reviewerId");
CREATE INDEX "PerformanceReview_status_idx"     ON "PerformanceReview"("status");
CREATE INDEX "PerformanceReview_periodStart_idx" ON "PerformanceReview"("periodStart");

ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PerformanceGoal — goals attached to a review cycle
CREATE TABLE "PerformanceGoal" (
    "id"                  TEXT NOT NULL,
    "tenantId"            TEXT NOT NULL,
    "performanceReviewId" TEXT NOT NULL,
    "employeeId"          TEXT NOT NULL,
    "title"               TEXT NOT NULL,
    "description"         TEXT,
    "weight"              DECIMAL(5,2),
    "target"              TEXT,
    "metric"              TEXT,
    "status"              TEXT NOT NULL DEFAULT 'ACTIVE',
    "selfScore"           DECIMAL(5,2),
    "managerScore"        DECIMAL(5,2),
    "createdById"         TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceGoal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PerformanceGoal_tenantId_idx"            ON "PerformanceGoal"("tenantId");
CREATE INDEX "PerformanceGoal_performanceReviewId_idx" ON "PerformanceGoal"("performanceReviewId");
CREATE INDEX "PerformanceGoal_employeeId_idx"          ON "PerformanceGoal"("employeeId");

ALTER TABLE "PerformanceGoal" ADD CONSTRAINT "PerformanceGoal_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerformanceGoal" ADD CONSTRAINT "PerformanceGoal_performanceReviewId_fkey"
    FOREIGN KEY ("performanceReviewId") REFERENCES "PerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PerformanceGoal" ADD CONSTRAINT "PerformanceGoal_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
