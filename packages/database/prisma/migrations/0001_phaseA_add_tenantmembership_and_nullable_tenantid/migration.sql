BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS "TenantMembership" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT,
  "isOwner" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "invitedBy" TEXT,
  "invitedAt" TIMESTAMP,
  "acceptedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_role_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "tenantmembership_tenant_user_unique" ON "TenantMembership" ("tenantId", "userId");
ALTER TABLE "Matter" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TimeEntry" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ExpenseEntry" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ClientTrustLedger" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TrustTransaction" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "OfficeTransaction" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX IF NOT EXISTS "matter_tenant_idx" ON "Matter" ("tenantId");
CREATE INDEX IF NOT EXISTS "document_tenant_idx" ON "Document" ("tenantId");
CREATE INDEX IF NOT EXISTS "timeentry_tenant_idx" ON "TimeEntry" ("tenantId");
CREATE INDEX IF NOT EXISTS "expenseentry_tenant_idx" ON "ExpenseEntry" ("tenantId");
CREATE INDEX IF NOT EXISTS "clienttrustledger_tenant_idx" ON "ClientTrustLedger" ("tenantId");
CREATE INDEX IF NOT EXISTS "trusttransaction_tenant_idx" ON "TrustTransaction" ("tenantId");
CREATE INDEX IF NOT EXISTS "officetransaction_tenant_idx" ON "OfficeTransaction" ("tenantId");
COMMIT;
