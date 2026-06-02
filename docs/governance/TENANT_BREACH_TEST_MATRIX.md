# Tenant Breach Test Matrix

**Gate:** 3 — Tenant Verification
**Date:** 2026-06-02
**Status:** Unit tests passing — integration tests deferred to Gate 13

---

## Overview

This document defines the complete tenant isolation verification matrix for Global Wakili Legal Enterprise. It covers:
1. Unit tests (can run without a database — currently passing)
2. Integration tests (require live Neon DB — Gate 13 scope)
3. Manual verification procedures for each isolation mechanism

---

## Test File

`apps/api/src/__tests__/tenant-isolation.test.ts`

**Run:**
```bash
cd apps/api
npm run test:tenant
```

**Results (Gate 3):**
- 62 tests, 6 suites
- Pass: 62 / Fail: 0
- Duration: ~500ms

---

## Unit Test Coverage (62 tests)

### Suite 1 — addTenantWhere (6 tests)
Verifies that the WHERE clause injection correctly applies tenant filtering.

| Test | Scenario | Expected |
|------|----------|---------|
| 1.1 | `where = undefined` | `{ tenantId: 'X' }` |
| 1.2 | `where = null` | `{ tenantId: 'X' }` |
| 1.3 | `where = {}` | `{ AND: [{}, { tenantId: 'X' }] }` |
| 1.4 | `where = { matterId: 'y' }` | `{ AND: [{ matterId: 'y' }, { tenantId: 'X' }] }` |
| 1.5 | Caller injects `tenantId: 'attacker'` | AND composition forces both conditions — attacker cannot escape |
| 1.6 | Complex nested where | Wraps entire structure in AND with tenantId |

### Suite 2 — addTenantToData (5 tests)
Verifies that CREATE/WRITE operations automatically stamp the correct tenantId.

| Test | Scenario | Expected |
|------|----------|---------|
| 2.1 | Plain object create | `{ ...data, tenantId: 'X' }` |
| 2.2 | Array (createMany) | Every item gets `tenantId: 'X'` |
| 2.3 | Non-object primitives | Pass through unchanged |
| 2.4 | Caller tries `tenantId: 'attacker'` | Extension overwrites — `tenantId` = authenticated tenant |
| 2.5 | Empty object | `{ tenantId: 'X' }` |

### Suite 3 — hasTenantWhere (7 tests)
Verifies the guard that blocks unsafe unique operations without tenantId.

| Test | Scenario | Expected |
|------|----------|---------|
| 3.1 | `{ tenantId: 'X' }` | `true` |
| 3.2 | `{ id: 'Y', tenantId: 'X' }` | `true` |
| 3.3 | `{ id: 'Y' }` | `false` — BLOCKED |
| 3.4 | `{}` | `false` — BLOCKED |
| 3.5 | `null` | `false` — BLOCKED |
| 3.6 | `undefined` | `false` — BLOCKED |
| 3.7 | Primitive strings/numbers | `false` — BLOCKED |

### Suite 4 — isTenantScopedModel (29 tests)
Verifies every critical model's isolation status.

**Scoped (must return true):** AuditLog, Matter, Invoice, TrustAccount, OfficeAccount, TrustTransaction, JournalEntry, ChartOfAccount, User, Role, DataLineage (G2), OwnershipRecord (G2), BankStatement (G3), TimerSession (G3), Disbursement (G3), DisbursementRequestNote (G3), RecurringExpenseTemplate (G3), WithholdingTaxCertificate (G3), PaymentRefund (G3)

**Unscoped (must return false):** GlobalAuditLog, WorkflowHistory, PermissionCondition (removed schema G3), BankAccount (phantom removed G2), RecurringExpense (phantom removed G2), Vendor (phantom removed G2), SensitiveField (removed schema G3), empty string, unknown-model, undefined

### Suite 5 — TENANT_SCOPED_MODELS integrity (4 tests)

| Test | Check |
|------|-------|
| 5.1 | Model count = 93 (fails immediately if any model added/removed without test update) |
| 5.2 | No phantom entries (BankAccount, RecurringExpense, Vendor all absent) |
| 5.3 | All 7 G3-D01 additions present |
| 5.4 | Both G2-D04 additions present |

### Suite 6 — Unsafe operation guard simulation (11 tests)

| Test | Model | Operation | Where has tenantId? | Result |
|------|-------|-----------|---------------------|--------|
| 6.1 | AuditLog | findUnique | ❌ | BLOCKED |
| 6.2 | AuditLog | findUnique | ✅ | allowed |
| 6.3 | Matter | update | ❌ | BLOCKED |
| 6.4 | Matter | update | ✅ | allowed |
| 6.5 | Invoice | delete | ❌ | BLOCKED |
| 6.6 | JournalEntry | upsert | ❌ | BLOCKED |
| 6.7 | GlobalAuditLog | findUnique | ❌ | allowed (not scoped) |
| 6.8 | — | findMany | — | not in unsafe set (addTenantWhere handles it) |
| BREACH-1 | AuditLog | findUnique | ❌ | BLOCKED — attacker cannot lookup by ID only |
| BREACH-2 | TrustTransaction | update | ❌ | BLOCKED — trust data cannot be modified without tenant context |
| BREACH-3 | PaymentRefund | update | ❌ | BLOCKED — G3-D01 pattern confirmed |

---

## Integration Tests (Gate 13 Scope)

These tests require a live database and will be implemented in Gate 13.

### Cross-tenant read isolation
```
GIVEN tenant_a has 10 AuditLog records
AND   tenant_b has 5 AuditLog records
WHEN  req.db for tenant_a calls auditLog.findMany({})
THEN  exactly 10 records are returned (not 15)
AND   all records have tenantId = tenant_a
```

### Cross-tenant create isolation
```
GIVEN req.db for tenant_a creates a new Matter
WHEN  req.db for tenant_b calls matter.findMany({})
THEN  the new Matter is NOT in the results
```

### Trust accounting isolation
```
GIVEN tenant_a has TrustAccount 'trust-a' with balance 100,000 KES
WHEN  req.db for tenant_b calls trustTransaction.findMany({})
THEN  zero records are returned
AND   the trust-a balance is not visible
```

### Socket room isolation
```
GIVEN client_a is connected and authenticated as tenant_a
AND   client_b is connected and authenticated as tenant_b
WHEN  emitFinanceUpdate('tenant_a', { balance: 100000 }) is called
THEN  client_a receives the event
AND   client_b does NOT receive the event
```

### Unsafe op guard (integration)
```
GIVEN req.db for tenant_a
WHEN  auditLog.findUnique({ where: { id: 'some-id' } }) is called
THEN  an error is thrown: 'Unsafe tenant-scoped AuditLog.findUnique blocked'
```

---

## Isolation Mechanisms Summary

| Mechanism | Where enforced | Status |
|-----------|---------------|--------|
| Query filtering (findMany, count, aggregate) | `addTenantWhere` in extension | ✅ Unit tested |
| Write stamping (create, createMany) | `addTenantToData` in extension | ✅ Unit tested |
| Unsafe op guard (findUnique, update, delete, upsert) | `hasTenantWhere` check in extension | ✅ Unit tested |
| Socket room scoping | `socket.join('tenant:{id}')` + `io.to(TENANT_ROOM)` | ✅ G3-D03 |
| JWT auth on socket | `io.use(verifyToken)` middleware | ✅ G3-D03 |
| Anti-spoofing on create | tenantId overwrite in `addTenantToData` | ✅ Unit tested |
| Anti-spoofing on query | tenantId AND composition in `addTenantWhere` | ✅ Unit tested |

---

## Models Missing from TENANT_SCOPED_MODELS (Documented Exceptions)

| Model | Rationale | Document |
|-------|-----------|----------|
| WorkflowHistory | CASCADE via Workflow.tenantId | TENANT_ISOLATION_DECISIONS.md D-04-006 |
| PermissionCondition | CASCADE via Permission.tenantId | TENANT_ISOLATION_DECISIONS.md D-04-007 |
| Session | Nullable tenantId by design (platform admin) | TENANT_ISOLATION_DECISIONS.md D-04-008 |
| GlobalAuditLog | Platform-global model; no tenant scope by design | ADR-002 |
| DataLineage | Present ✅ (added Gate 2) | — |
