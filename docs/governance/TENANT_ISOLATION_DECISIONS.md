# Tenant Isolation Decisions

**Gate:** 2 — Schema Verification
**Date:** 2026-06-02
**Status:** Active

This document records formal isolation decisions for every Prisma model that is either:
- In `TENANT_SCOPED_MODELS` without a `tenantId` column, or
- Not in `TENANT_SCOPED_MODELS` (cascade-only or platform-global)

It is a gate-governance artefact — every model must have a decision recorded here or a `tenantId` column in the schema.

---

## Decision Register

### D-04-001: MatterParty — tenantId added

**Model:** `MatterParty`
**Previous state:** In `TENANT_SCOPED_MODELS` with no `tenantId` column — extension was injecting broken filters
**Decision:** Add `tenantId String?`; backfill from parent `Matter.tenantId` via migration `20260602140000`
**Rationale:** MatterParty is a first-class legal record (opposing counsel, witnesses, counterparties). Explicit tenantId is required for both query isolation and regulatory compliance. Cascade-only isolation was insufficient given the model's sensitivity.
**Status:** ✅ Fixed in Gate 2

---

### D-04-002: MatterLien — tenantId added

**Model:** `MatterLien`
**Previous state:** In `TENANT_SCOPED_MODELS` with no `tenantId` column — broken extension
**Decision:** Add `tenantId String?`; backfill from parent `Matter.tenantId` via migration `20260602140000`
**Rationale:** Liens are financial encumbrances with legal standing. Explicit tenantId enforces that lien queries never return cross-tenant results regardless of query path.
**Status:** ✅ Fixed in Gate 2

---

### D-04-003: StatuteOfLimitations — tenantId added

**Model:** `StatuteOfLimitations`
**Previous state:** In `TENANT_SCOPED_MODELS` with no `tenantId` column — broken extension
**Decision:** Add `tenantId String?`; backfill from parent `Matter.tenantId` via migration `20260602140000`
**Rationale:** Statute deadlines are compliance-critical. A cross-tenant statute leak (wrong firm seeing another firm's deadline) would be a serious confidentiality breach.
**Status:** ✅ Fixed in Gate 2

---

### D-04-004: DataLineage — added to TENANT_SCOPED_MODELS

**Model:** `DataLineage`
**Previous state:** Has `tenantId String` in schema but NOT in `TENANT_SCOPED_MODELS` — unprotected
**Decision:** Add to `TENANT_SCOPED_MODELS`
**Rationale:** DataLineage tracks data transformation provenance within a tenant context. Without extension protection, cross-tenant lineage queries were possible.
**Status:** ✅ Fixed in Gate 2

---

### D-04-005: OwnershipRecord — tenantId added + added to TENANT_SCOPED_MODELS

**Model:** `OwnershipRecord`
**Previous state:** No `tenantId`, not in `TENANT_SCOPED_MODELS`. Isolation depended on `User.tenantId` which is nullable (platform admins have no tenantId).
**Decision:** Add `tenantId String?`; add to `TENANT_SCOPED_MODELS`; new records stamped by extension on create
**Rationale:** OwnershipRecord controls access to resources. Without explicit tenantId, a platform admin query path could return resource ownership records across tenants.
**Backfill note:** Existing rows have NULL tenantId (polymorphic join not possible in a single migration). Run a backfill script per resourceType before enforcing NOT NULL.
**Status:** ✅ Fixed in Gate 2 (nullable; NOT NULL enforcement deferred to separate migration after backfill)

---

### D-04-006: WorkflowHistory — CASCADE isolation accepted

**Model:** `WorkflowHistory`
**tenantId:** None
**In TENANT_SCOPED_MODELS:** No
**Isolation path:** `WorkflowHistory.workflowId` → `Workflow.tenantId`
**Decision:** CASCADE-only isolation is architecturally correct. WorkflowHistory is always accessed through a specific Workflow, which is itself tenant-scoped. Direct `db.workflowHistory.findMany({})` without a `workflowId` filter has no business use case.
**Constraint:** Application code must always filter by `workflowId` when querying WorkflowHistory. This constraint is enforced by the `WorkflowHistory` foreign key to `Workflow` — orphaned history records cannot exist.
**Review trigger:** If direct WorkflowHistory queries are ever added to any route or service, tenantId must be added before deployment.
**Status:** ✅ Accepted — CASCADE isolation documented

---

### D-04-007: PermissionCondition — CASCADE isolation accepted

**Model:** `PermissionCondition`
**tenantId:** None
**In TENANT_SCOPED_MODELS:** No
**Isolation path:** `PermissionCondition.permissionId` → `Permission.tenantId`
**Decision:** CASCADE-only isolation is architecturally correct. PermissionConditions are sub-records of Permission. No query path exists that returns PermissionConditions without first identifying the parent Permission, which is tenant-scoped.
**Constraint:** Application code must always filter by `permissionId`. Permission is in TENANT_SCOPED_MODELS and protected by the extension.
**Review trigger:** If direct PermissionCondition queries are added outside of permission management flows, tenantId must be added.
**Status:** ✅ Accepted — CASCADE isolation documented

---

### D-04-008: Session — nullable tenantId by design

**Model:** `Session`
**tenantId:** `String?` (nullable)
**In TENANT_SCOPED_MODELS:** Yes
**Decision:** Nullable `tenantId` is intentional. Platform super-admin sessions operate without a tenant context. Tenant-scoped queries on Session correctly exclude platform admin sessions (no `tenantId` match) — this is the desired behaviour.
**Constraint:** Tenant-scoped sessions must have `tenantId` set at creation. Platform sessions must NOT have `tenantId` set. The extension enforces this split automatically.
**Status:** ✅ Accepted — nullable tenantId by design

---

## Phantom Entry Cleanup

The following entries were in `TENANT_SCOPED_MODELS` but correspond to models that do not exist in the Prisma schema. They were removed in Gate 2 to prevent false safety assumptions:

| Removed Entry | Likely Intended Model | Action |
|---------------|----------------------|--------|
| `BankAccount` | `BankStatement` / `OfficeAccount` | Removed — phantom |
| `RecurringExpense` | `RecurringExpenseTemplate` | Removed — phantom |
| `Vendor` | `Supplier` | Removed — phantom |

The actual models (`BankStatement`, `RecurringExpenseTemplate`, `Supplier`) should be assessed in Gate 3 for TENANT_SCOPED_MODELS inclusion.

---

## Models Requiring Gate 3 Follow-Up

These models were not assessed in Gate 2 and need Gate 3 review:

| Model | Reason for Deferral |
|-------|---------------------|
| `BankStatement` | Not in TENANT_SCOPED_MODELS — check tenantId presence |
| `RecurringExpenseTemplate` | Not in TENANT_SCOPED_MODELS — check tenantId presence |
| `TimerSession` | Not in TENANT_SCOPED_MODELS — check tenantId presence |
| `Disbursement` | Not in TENANT_SCOPED_MODELS — check tenantId presence |
| `DisbursementRequestNote` | Not in TENANT_SCOPED_MODELS — check tenantId presence |
| `WithholdingTaxCertificate` | Not in TENANT_SCOPED_MODELS — check tenantId presence |
| `PaymentRefund` | Not in TENANT_SCOPED_MODELS — check tenantId presence |
