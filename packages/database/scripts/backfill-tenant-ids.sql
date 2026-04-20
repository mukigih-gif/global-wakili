SELECT COUNT(*) AS matter_nulls FROM "Matter" WHERE "tenantId" IS NULL;
SELECT COUNT(*) AS document_nulls FROM "Document" WHERE "tenantId" IS NULL;
SELECT COUNT(*) AS timeentry_nulls FROM "TimeEntry" WHERE "tenantId" IS NULL;
SELECT COUNT(*) AS expenseentry_nulls FROM "ExpenseEntry" WHERE "tenantId" IS NULL;
SELECT COUNT(*) AS clienttrustledger_nulls FROM "ClientTrustLedger" WHERE "tenantId" IS NULL;
SELECT COUNT(*) AS trusttransaction_nulls FROM "TrustTransaction" WHERE "tenantId" IS NULL;
SELECT COUNT(*) AS officetransaction_nulls FROM "OfficeTransaction" WHERE "tenantId" IS NULL;