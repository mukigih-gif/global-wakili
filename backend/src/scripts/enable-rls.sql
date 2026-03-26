-- ==========================================
-- ROW-LEVEL SECURITY (RLS) SETUP
-- Enable RLS on all tenant-scoped tables
-- ==========================================

-- Create app-specific settings for tenant context
ALTER DATABASE postgres SET app.current_tenant TO '';

-- Enable RLS on critical tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Matter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Approval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseEntry" ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- USER RLS POLICY
-- ==========================================
CREATE POLICY tenant_isolation_user ON "User"
  USING ("tenantId" = current_setting('app.current_tenant')::text 
    OR "systemRole" != 'NONE');

-- ==========================================
-- MATTER RLS POLICY
-- ==========================================
CREATE POLICY tenant_isolation_matter ON "Matter"
  USING (
    "branchId" IN (
      SELECT id FROM "Branch" 
      WHERE "tenantId" = current_setting('app.current_tenant')::text
    )
  );

-- ==========================================
-- INVOICE RLS POLICY
-- ==========================================
CREATE POLICY tenant_isolation_invoice ON "Invoice"
  USING (
    "matterId" IN (
      SELECT id FROM "Matter" 
      WHERE "branchId" IN (
        SELECT id FROM "Branch" 
        WHERE "tenantId" = current_setting('app.current_tenant')::text
      )
    )
  );

-- ==========================================
-- CLIENT RLS POLICY
-- ==========================================
CREATE POLICY tenant_isolation_client ON "Client"
  USING ("tenantId" = current_setting('app.current_tenant')::text);

-- ==========================================
-- AUDIT LOG RLS POLICY (IMMUTABLE)
-- ==========================================
CREATE POLICY tenant_isolation_auditlog ON "AuditLog"
  USING ("tenantId" = current_setting('app.current_tenant')::text);

-- Prevent updates to audit logs
CREATE POLICY audit_log_immutable_update ON "AuditLog"
  AS PERMISSIVE
  FOR UPDATE
  USING (FALSE);

-- Prevent deletes to audit logs
CREATE POLICY audit_log_immutable_delete ON "AuditLog"
  AS PERMISSIVE
  FOR DELETE
  USING (FALSE);

-- ==========================================
-- DOCUMENT RLS POLICY
-- ==========================================
CREATE POLICY tenant_isolation_document ON "Document"
  USING ("tenantId" = current_setting('app.current_tenant')::text);

-- ==========================================
-- TIME ENTRY RLS POLICY
-- ==========================================
CREATE POLICY tenant_isolation_timeentry ON "TimeEntry"
  USING (
    "matterId" IN (
      SELECT id FROM "Matter" 
      WHERE "branchId" IN (
        SELECT id FROM "Branch" 
        WHERE "tenantId" = current_setting('app.current_tenant')::text
      )
    )
  );

-- ==========================================
-- EXPENSE ENTRY RLS POLICY
-- ==========================================
CREATE POLICY tenant_isolation_expenseentry ON "ExpenseEntry"
  USING (
    "matterId" IN (
      SELECT id FROM "Matter" 
      WHERE "branchId" IN (
        SELECT id FROM "Branch" 
        WHERE "tenantId" = current_setting('app.current_tenant')::text
      )
    )
  );