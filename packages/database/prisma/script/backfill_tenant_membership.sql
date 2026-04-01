BEGIN;

-- 1. Create TenantMembership rows from existing User.tenantId (if present)
INSERT INTO "TenantMembership" ("tenantId", "userId", "roleId", "isOwner", "createdAt", "updatedAt")
SELECT u."tenantId", u."id", NULL, false, now(), now()
FROM "User" u
WHERE u."tenantId" IS NOT NULL
ON CONFLICT ("tenantId", "userId") DO NOTHING;

-- 2. Backfill Matter.tenantId from Branch
UPDATE "Matter" m
SET "tenantId" = b."tenantId"
FROM "Branch" b
WHERE m."branchId" = b."id" AND (m."tenantId" IS NULL OR m."tenantId" = '');

-- 3. Backfill Document.tenantId from Matter
UPDATE "Document" d
SET "tenantId" = m."tenantId"
FROM "Matter" m
WHERE d."matterId" = m."id" AND (d."tenantId" IS NULL OR d."tenantId" = '');

-- 4. Backfill TimeEntry and ExpenseEntry from Matter
UPDATE "TimeEntry" t
SET "tenantId" = m."tenantId"
FROM "Matter" m
WHERE t."matterId" = m."id" AND (t."tenantId" IS NULL OR t."tenantId" = '');

UPDATE "ExpenseEntry" e
SET "tenantId" = m."tenantId"
FROM "Matter" m
WHERE e."matterId" = m."id" AND (e."tenantId" IS NULL OR e."tenantId" = '');

-- 5. Backfill TrustTransaction and OfficeTransaction from their parent accounts
UPDATE "TrustTransaction" tt
SET "tenantId" = ta."tenantId"
FROM "TrustAccount" ta
WHERE tt."trustAccountId" = ta."id" AND (tt."tenantId" IS NULL OR tt."tenantId" = '');

UPDATE "OfficeTransaction" ot
SET "tenantId" = oa."tenantId"
FROM "OfficeAccount" oa
WHERE ot."officeAccountId" = oa."id" AND (ot."tenantId" IS NULL OR ot."tenantId" = '');

-- 6. Backfill ClientTrustLedger from Client
UPDATE "ClientTrustLedger" ctl
SET "tenantId" = c."tenantId"
FROM "Client" c
WHERE ctl."clientId" = c."id" AND (ctl."tenantId" IS NULL OR ctl."tenantId" = '');

COMMIT;