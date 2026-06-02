-- D-05 Gate 2: Index Audit — add all missing FK and composite indexes
-- Covers 53 models, 80 indexes. Every statement uses IF NOT EXISTS.
-- All indexes are idempotent and safe to re-run.
-- Priority composites verified: AuditLog(tenantId,createdAt) ✓
--   TrustTransaction(trustAccountId,tenantId) ✓
--   Matter(tenantId,status) ✓
--   JournalEntry(accountingPeriodId,tenantId) — added here ✓

-- Session
CREATE INDEX IF NOT EXISTS "Session_tenantId_idx" ON "Session"("tenantId");

-- Role
CREATE INDEX IF NOT EXISTS "Role_parentRoleId_idx" ON "Role"("parentRoleId");

-- Permission
CREATE INDEX IF NOT EXISTS "Permission_tenantId_idx" ON "Permission"("tenantId");

-- RateLimitLog
CREATE INDEX IF NOT EXISTS "RateLimitLog_userId_idx" ON "RateLimitLog"("userId");

-- AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_deviceId_idx" ON "AuditLog"("deviceId");

-- DataLineage
CREATE INDEX IF NOT EXISTS "DataLineage_tenantId_idx" ON "DataLineage"("tenantId");

-- Workflow
CREATE INDEX IF NOT EXISTS "Workflow_tenantId_idx" ON "Workflow"("tenantId");

-- Approval
CREATE INDEX IF NOT EXISTS "Approval_escalatedTo_idx" ON "Approval"("escalatedTo");
CREATE INDEX IF NOT EXISTS "Approval_delegatedFrom_idx" ON "Approval"("delegatedFrom");
CREATE INDEX IF NOT EXISTS "Approval_delegatedTo_idx" ON "Approval"("delegatedTo");

-- Contract
CREATE INDEX IF NOT EXISTS "Contract_createdById_idx" ON "Contract"("createdById");

-- ContractVersion
CREATE INDEX IF NOT EXISTS "ContractVersion_createdById_idx" ON "ContractVersion"("createdById");

-- ExpressService
CREATE INDEX IF NOT EXISTS "ExpressService_tenantId_idx" ON "ExpressService"("tenantId");

-- ExpenseEntry
CREATE INDEX IF NOT EXISTS "ExpenseEntry_recurringTemplateId_idx" ON "ExpenseEntry"("recurringTemplateId");

-- Matter
CREATE INDEX IF NOT EXISTS "Matter_branchId_idx" ON "Matter"("branchId");
CREATE INDEX IF NOT EXISTS "Matter_leadAdvocateId_idx" ON "Matter"("leadAdvocateId");

-- RateCard
CREATE INDEX IF NOT EXISTS "RateCard_createdById_idx" ON "RateCard"("createdById");

-- CourtHearing
CREATE INDEX IF NOT EXISTS "CourtHearing_createdById_idx" ON "CourtHearing"("createdById");

-- MatterProfitabilitySnapshot
CREATE INDEX IF NOT EXISTS "MatterProfitabilitySnapshot_createdById_idx" ON "MatterProfitabilitySnapshot"("createdById");

-- TimeEntry
CREATE INDEX IF NOT EXISTS "TimeEntry_billingRunId_idx" ON "TimeEntry"("billingRunId");

-- MatterTask
CREATE INDEX IF NOT EXISTS "MatterTask_createdById_idx" ON "MatterTask"("createdById");

-- Disbursement
CREATE INDEX IF NOT EXISTS "Disbursement_matterId_idx" ON "Disbursement"("matterId");

-- OfficeTransaction
CREATE INDEX IF NOT EXISTS "OfficeTransaction_reconciliationId_idx" ON "OfficeTransaction"("reconciliationId");

-- RecurringExpenseTemplate
CREATE INDEX IF NOT EXISTS "RecurringExpenseTemplate_expenseAccountId_idx" ON "RecurringExpenseTemplate"("expenseAccountId");
CREATE INDEX IF NOT EXISTS "RecurringExpenseTemplate_supplierId_idx" ON "RecurringExpenseTemplate"("supplierId");
CREATE INDEX IF NOT EXISTS "RecurringExpenseTemplate_branchId_idx" ON "RecurringExpenseTemplate"("branchId");
CREATE INDEX IF NOT EXISTS "RecurringExpenseTemplate_matterId_idx" ON "RecurringExpenseTemplate"("matterId");

-- Invoice
CREATE INDEX IF NOT EXISTS "Invoice_billingRunId_idx" ON "Invoice"("billingRunId");
CREATE INDEX IF NOT EXISTS "Invoice_branchId_idx" ON "Invoice"("branchId");
CREATE INDEX IF NOT EXISTS "Invoice_cancelledById_idx" ON "Invoice"("cancelledById");

-- WithholdingTaxCertificate
CREATE INDEX IF NOT EXISTS "WithholdingTaxCertificate_receivedById_idx" ON "WithholdingTaxCertificate"("receivedById");
CREATE INDEX IF NOT EXISTS "WithholdingTaxCertificate_cancelledById_idx" ON "WithholdingTaxCertificate"("cancelledById");

-- JournalEntry
CREATE INDEX IF NOT EXISTS "JournalEntry_reversalOfId_idx" ON "JournalEntry"("reversalOfId");
CREATE INDEX IF NOT EXISTS "JournalEntry_accountingPeriodId_tenantId_idx" ON "JournalEntry"("accountingPeriodId", "tenantId");

-- PayrollRecord
CREATE INDEX IF NOT EXISTS "PayrollRecord_employeeProfileId_idx" ON "PayrollRecord"("employeeProfileId");

-- NotificationWebhookEvent
CREATE INDEX IF NOT EXISTS "NotificationWebhookEvent_notificationId_idx" ON "NotificationWebhookEvent"("notificationId");

-- Document
CREATE INDEX IF NOT EXISTS "Document_uploadedBy_idx" ON "Document"("uploadedBy");

-- ClientComplianceCheck
CREATE INDEX IF NOT EXISTS "ClientComplianceCheck_createdById_idx" ON "ClientComplianceCheck"("createdById");

-- ClientKycProfile
CREATE INDEX IF NOT EXISTS "ClientKycProfile_verifiedById_idx" ON "ClientKycProfile"("verifiedById");

-- PurchaseOrder
CREATE INDEX IF NOT EXISTS "PurchaseOrder_quotationId_idx" ON "PurchaseOrder"("quotationId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_branchId_idx" ON "PurchaseOrder"("branchId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_matterId_idx" ON "PurchaseOrder"("matterId");

-- CalendarEvent
CREATE INDEX IF NOT EXISTS "CalendarEvent_creatorId_idx" ON "CalendarEvent"("creatorId");

-- CalendarReminder
CREATE INDEX IF NOT EXISTS "CalendarReminder_createdById_idx" ON "CalendarReminder"("createdById");

-- DisbursementRequestNote
CREATE INDEX IF NOT EXISTS "DisbursementRequestNote_clientId_idx" ON "DisbursementRequestNote"("clientId");
CREATE INDEX IF NOT EXISTS "DisbursementRequestNote_matterId_idx" ON "DisbursementRequestNote"("matterId");
CREATE INDEX IF NOT EXISTS "DisbursementRequestNote_createdById_idx" ON "DisbursementRequestNote"("createdById");

-- EmployeeProfile
CREATE INDEX IF NOT EXISTS "EmployeeProfile_reportingManagerId_idx" ON "EmployeeProfile"("reportingManagerId");

-- Attendance
CREATE INDEX IF NOT EXISTS "Attendance_employeeProfileId_idx" ON "Attendance"("employeeProfileId");

-- LeaveRequest
CREATE INDEX IF NOT EXISTS "LeaveRequest_employeeProfileId_idx" ON "LeaveRequest"("employeeProfileId");
CREATE INDEX IF NOT EXISTS "LeaveRequest_approvedById_idx" ON "LeaveRequest"("approvedById");

-- EmployeePerformance
CREATE INDEX IF NOT EXISTS "EmployeePerformance_employeeProfileId_idx" ON "EmployeePerformance"("employeeProfileId");
CREATE INDEX IF NOT EXISTS "EmployeePerformance_reviewedById_idx" ON "EmployeePerformance"("reviewedById");

-- EmployeeGoal
CREATE INDEX IF NOT EXISTS "EmployeeGoal_employeeProfileId_idx" ON "EmployeeGoal"("employeeProfileId");

-- EmployeeDocument
CREATE INDEX IF NOT EXISTS "EmployeeDocument_employeeProfileId_idx" ON "EmployeeDocument"("employeeProfileId");
CREATE INDEX IF NOT EXISTS "EmployeeDocument_verifiedById_idx" ON "EmployeeDocument"("verifiedById");

-- CommissionPayout
CREATE INDEX IF NOT EXISTS "CommissionPayout_payrollBatchId_idx" ON "CommissionPayout"("payrollBatchId");
CREATE INDEX IF NOT EXISTS "CommissionPayout_matterId_idx" ON "CommissionPayout"("matterId");
CREATE INDEX IF NOT EXISTS "CommissionPayout_approvedById_idx" ON "CommissionPayout"("approvedById");

-- TrustAccount
CREATE INDEX IF NOT EXISTS "TrustAccount_branchId_idx" ON "TrustAccount"("branchId");

-- OfficeAccount
CREATE INDEX IF NOT EXISTS "OfficeAccount_branchId_idx" ON "OfficeAccount"("branchId");

-- TrustTransaction
CREATE INDEX IF NOT EXISTS "TrustTransaction_reconciliationId_idx" ON "TrustTransaction"("reconciliationId");
CREATE INDEX IF NOT EXISTS "TrustTransaction_clientId_idx" ON "TrustTransaction"("clientId");

-- RequestForQuotation
CREATE INDEX IF NOT EXISTS "RequestForQuotation_branchId_idx" ON "RequestForQuotation"("branchId");
CREATE INDEX IF NOT EXISTS "RequestForQuotation_matterId_idx" ON "RequestForQuotation"("matterId");

-- PaymentRefund
CREATE INDEX IF NOT EXISTS "PaymentRefund_requestedById_idx" ON "PaymentRefund"("requestedById");
CREATE INDEX IF NOT EXISTS "PaymentRefund_approvedById_idx" ON "PaymentRefund"("approvedById");
CREATE INDEX IF NOT EXISTS "PaymentRefund_rejectedById_idx" ON "PaymentRefund"("rejectedById");
CREATE INDEX IF NOT EXISTS "PaymentRefund_paidById_idx" ON "PaymentRefund"("paidById");
CREATE INDEX IF NOT EXISTS "PaymentRefund_paymentReceiptAllocationId_idx" ON "PaymentRefund"("paymentReceiptAllocationId");

-- PaymentReceipt
CREATE INDEX IF NOT EXISTS "PaymentReceipt_createdById_idx" ON "PaymentReceipt"("createdById");

-- CreditNote
CREATE INDEX IF NOT EXISTS "CreditNote_createdById_idx" ON "CreditNote"("createdById");

-- ComplianceReport
CREATE INDEX IF NOT EXISTS "ComplianceReport_createdById_idx" ON "ComplianceReport"("createdById");
CREATE INDEX IF NOT EXISTS "ComplianceReport_clientId_idx" ON "ComplianceReport"("clientId");

-- AccountingPeriod
CREATE INDEX IF NOT EXISTS "AccountingPeriod_closedById_idx" ON "AccountingPeriod"("closedById");

-- PayrollBatch
CREATE INDEX IF NOT EXISTS "PayrollBatch_generatedById_idx" ON "PayrollBatch"("generatedById");
CREATE INDEX IF NOT EXISTS "PayrollBatch_approvedById_idx" ON "PayrollBatch"("approvedById");

-- Payslip
CREATE INDEX IF NOT EXISTS "Payslip_employeeProfileId_idx" ON "Payslip"("employeeProfileId");

-- BankStatement
CREATE INDEX IF NOT EXISTS "BankStatement_importedById_idx" ON "BankStatement"("importedById");

-- PlatformConfigVersion
CREATE INDEX IF NOT EXISTS "PlatformConfigVersion_platformGlobalSettingId_idx" ON "PlatformConfigVersion"("platformGlobalSettingId");
