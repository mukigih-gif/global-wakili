-- CreateTable: EmployeeOnboarding — HR onboarding checklist tracking
CREATE TABLE "EmployeeOnboarding" (
    "id"         TEXT NOT NULL,
    "tenantId"   TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "email"      TEXT NOT NULL,
    "position"   TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "startDate"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "steps"      JSONB NOT NULL DEFAULT '{}',
    "status"     TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeOnboarding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployeeOnboarding_tenantId_idx" ON "EmployeeOnboarding"("tenantId");
CREATE INDEX "EmployeeOnboarding_status_idx"   ON "EmployeeOnboarding"("status");

ALTER TABLE "EmployeeOnboarding" ADD CONSTRAINT "EmployeeOnboarding_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
