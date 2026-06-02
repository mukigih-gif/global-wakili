# Gate 2 Index Audit

**Gate:** 2 — Schema Verification
**Date:** 2026-06-02
**Status:** Complete

---

## Method

A programmatic audit was run across all 168 Prisma models in `schema.prisma`. For each model:
1. All `@relation(fields:[...])` scalars were extracted as "true FK fields"
2. All `@@index`, `@@unique`, field-level `@unique`, and `@id` were collected as "indexed fields"
3. Any FK scalar not covered by an index was flagged as missing
4. `tenantId` fields without a standalone index were flagged separately
5. Priority composite indexes were explicitly verified

---

## Priority Composites

| Index | Status | Notes |
|-------|--------|-------|
| `AuditLog(tenantId, createdAt)` | ✅ Pre-existing | Core chain-fetch query path |
| `AuditLog(tenantId, sequenceNumber)` | ✅ Added in D-03 | Race-condition fix query path |
| `TrustTransaction(trustAccountId, tenantId)` | ✅ Pre-existing | Trust ledger lookup |
| `Matter(tenantId, status)` | ✅ Pre-existing | Matter list/filter path |
| `JournalEntry(accountingPeriodId, tenantId)` | ✅ Added in D-05 | Period-close query path — was missing |

---

## Summary

| Category | Count | Resolution |
|----------|-------|------------|
| Models audited | 168 | All 168 passed post-fix |
| FK fields missing indexes | 75 | All added in D-05 |
| `tenantId` fields missing indexes | 5 | All added in D-05 |
| Priority composites missing | 1 | `JournalEntry(accountingPeriodId, tenantId)` added |
| Total new indexes in migration | **80** | Migration `20260602150000` |

---

## Indexes Added (80 total)

### Security / Isolation critical (tenantId indexes)
| Model | New Index |
|-------|-----------|
| Session | `tenantId` |
| Permission | `tenantId` |
| DataLineage | `tenantId` |
| Workflow | `tenantId` |
| ExpressService | `tenantId` |

### Priority composite
| Model | New Index |
|-------|-----------|
| JournalEntry | `(accountingPeriodId, tenantId)` — period-close query path |

### Finance & Trust module
| Model | New Indexes |
|-------|------------|
| JournalEntry | `reversalOfId` |
| TrustAccount | `branchId` |
| OfficeAccount | `branchId` |
| TrustTransaction | `reconciliationId`, `clientId` |
| Invoice | `billingRunId`, `branchId`, `cancelledById` |
| PaymentReceipt | `createdById` |
| CreditNote | `createdById` |
| PaymentRefund | `requestedById`, `approvedById`, `rejectedById`, `paidById`, `paymentReceiptAllocationId` |
| AccountingPeriod | `closedById` |
| OfficeTransaction | `reconciliationId` |
| ComplianceReport | `createdById`, `clientId` |
| WithholdingTaxCertificate | `receivedById`, `cancelledById` |

### Matter & Legal module
| Model | New Indexes |
|-------|------------|
| Matter | `branchId`, `leadAdvocateId` |
| Contract | `createdById` |
| ContractVersion | `createdById` |
| CourtHearing | `createdById` |
| MatterProfitabilitySnapshot | `createdById` |
| MatterTask | `createdById` |
| RateCard | `createdById` |
| Disbursement | `matterId` |
| DisbursementRequestNote | `clientId`, `matterId`, `createdById` |
| ClientComplianceCheck | `createdById` |
| ClientKycProfile | `verifiedById` |

### HR & Payroll module
| Model | New Indexes |
|-------|------------|
| EmployeeProfile | `reportingManagerId` |
| Attendance | `employeeProfileId` |
| LeaveRequest | `employeeProfileId`, `approvedById` |
| EmployeePerformance | `employeeProfileId`, `reviewedById` |
| EmployeeGoal | `employeeProfileId` |
| EmployeeDocument | `employeeProfileId`, `verifiedById` |
| CommissionPayout | `payrollBatchId`, `matterId`, `approvedById` |
| PayrollBatch | `generatedById`, `approvedById` |
| PayrollRecord | `employeeProfileId` |
| Payslip | `employeeProfileId` |

### Procurement module
| Model | New Indexes |
|-------|------------|
| PurchaseOrder | `quotationId`, `branchId`, `matterId` |
| RequestForQuotation | `branchId`, `matterId` |
| RecurringExpenseTemplate | `expenseAccountId`, `supplierId`, `branchId`, `matterId` |
| ExpenseEntry | `recurringTemplateId` |

### Core / Platform
| Model | New Indexes |
|-------|------------|
| Role | `parentRoleId` |
| RateLimitLog | `userId` |
| AuditLog | `deviceId` |
| Approval | `escalatedTo`, `delegatedFrom`, `delegatedTo` |
| CalendarEvent | `creatorId` |
| CalendarReminder | `createdById` |
| BankStatement | `importedById` |
| Document | `uploadedBy` |
| NotificationWebhookEvent | `notificationId` |
| TimeEntry | `billingRunId` |
| PlatformConfigVersion | `platformGlobalSettingId` |

---

## Pre-existing Indexes Verified

The following models already had correct FK coverage — no changes needed:

`AuditLog(tenantId,createdAt)`, `AuditLog(tenantId,sequenceNumber)`, `Matter(tenantId,status)`, `Matter(tenantId,matterCode)`, `TrustTransaction(trustAccountId,tenantId)`, `TrustTransaction(tenantId,trustAccountId,transactionDate)`, `BankTransaction(tenantId,trustAccountId)`, `TenantMembership(tenantId,userId)`, `Invoice(invoiceNumber)`, `JournalEntry(accountingPeriodId)` (single), and all other models with comprehensive pre-existing indexes.

---

## Deferred Items

These fields were identified in the wider audit pass but are non-FK reference strings (not true Prisma FK relations) — they don't require indexes for correctness, only for optional query optimisation:

- `AuditLog.correlationId` — string correlation tag, not a FK
- `Notification.entityId` — polymorphic string reference
- `AIReviewTask.entityId` — polymorphic string reference
- `GlobalAuditLog.requestId` — logging reference, not a FK
- `BankTransaction.externalId` — external system string ID
- `PlatformWebhookLog.requestId` — logging reference

These should be evaluated in Gate 5 (Security Verification) and Gate 7 (Platform Control Plane) when those query patterns are profiled.

---

## Acceptance Criteria Verification

- [x] All 168 models audited
- [x] All FK columns indexed — 0 remaining gaps
- [x] All `tenantId` fields indexed — 0 remaining gaps
- [x] Priority composites: all 5 verified ✅
- [x] Migration `20260602150000` committed with 80 `CREATE INDEX IF NOT EXISTS` statements
- [x] This document committed to `docs/governance/`
