# CLAUDE.md

# Global Wakili Legal Enterprise

## Engineering Constitution & Execution Framework

Version: 1.0
Status: Authoritative
Scope: Entire Repository

---

# 1. PROJECT IDENTITY

Global Wakili Legal Enterprise is a production-grade, multi-tenant Legal ERP, Practice Management, Legal Accounting, Trust Accounting, HR, Payroll, AI Operations, Reporting, Analytics, and Client Collaboration platform.

The system is designed primarily for law firms operating within Kenya while maintaining international-grade enterprise standards for security, auditability, tenant isolation, accounting integrity, operational resilience, and scalability.

This repository is already partially implemented.

The objective is not to rebuild.

The objective is to verify, preserve, harden, complete, test, document, and deploy.

---

# 2. NON-NEGOTIABLE EXECUTION PRINCIPLES

## Principle 1 � Preserve Before Replacing

Existing functionality must never be replaced without evidence.

Before proposing redesign:

* Verify implementation.
* Verify limitations.
* Verify risks.
* Document findings.

Working systems are enhanced, not rewritten.

---

## Principle 2 � One Bounded Context At A Time

Work must remain inside a single bounded context.

Examples:

* Trust Accounting
* Finance
* Platform Control Plane
* Notifications
* Matters
* HR
* Documents
* AI

Do not perform opportunistic refactors.

Do not jump across domains.

---

## Principle 3 � Verify Before Coding

No code changes are permitted before analysis.

Every task begins with:

1. Scope
2. Findings
3. Risks
4. Impacted Files
5. Proposed Plan
6. Test Plan
7. Rollback Plan

---

## Principle 4 � Approval Before Destructive Action

Never:

* delete files
* delete migrations
* reset databases
* rewrite modules
* run destructive scripts

without explicit approval.

---

## Principle 5 — Backend and Frontend Parity (added 2026-06-23)

REMINDER: Every backend fix, schema change, or API addition
MUST have a corresponding frontend check before the session
closes. This is not optional.

For every finding closed in a session, ask:
"Can a user actually see and use this in the browser?"

If YES → finding is fully closed.
If NO or PARTIAL → log a FINDING-FRONT-XXX immediately so
the gap is tracked and scheduled. Do not leave it as a
verbal note or a "FYI" — it must be in FINDINGS.md.

This applies RETROACTIVELY to every finding marked CLOSED
across all prior sessions and commits. Any closed finding
where the frontend does not yet reflect the backend change
must have a corresponding FINDING-FRONT-XXX logged.

Frontend work is only undertaken when explicitly requested.
The purpose of this principle is tracking visibility, not
forcing frontend changes into every backend session.

---

# 3. AUTHORITATIVE PROJECT STATUS

Verified Complete:

### Trust Accounting Hardening

Commit:
76f8ecf

Status:
Closed

Completed:

* TrustAccountId propagation
* Trust boundary enforcement
* Reconciliation isolation
* Tenant-safe trust logic
* Trust ledger integrity

---

### Platform Audit Hardening

Commit:
9732884

Status:
Closed

Completed:

* Security audit normalization
* Hash-chain persistence
* PreviousHash continuity
* Tamper-evident logging
* Failure reason persistence
* Severity classification

---

### Tenant Boundary Enforcement

Status:
Substantially Complete

Requires:
Final verification sweep.

---

# 3A. CURRENT GATE STATUS

(updated 18 Jun 2026)

| Gate | Name | Status |
|------|------|--------|
| Phase 0 | Schema & Seed Validation | COMPLETE |
| Phase 1 Groups 1-5 | API Certification (Auth/Clients/Users/Password Reset/Matters) | COMPLETE — 50/50 |
| Phase 1 Group 6 Wave A | API Certification (Billing reads) | COMPLETE — 16/16 billing reads passing |
| Phase 1 Group 6 Wave B | API Certification (Billing writes) | COMPLETE — 19/19 billing writes passing |
| Phase 1 Group 7 Trust reads | API Certification (Trust reads) | COMPLETE — 12/12 trust reads passing |
| Phase 1 Group 9 Reporting | API Certification (Reporting reads+writes) | COMPLETE — 21/21 passing |
| Phase 1 Group 7 Trust writes | API Certification (Trust writes: create-account/deposit/withdrawal/overdraw/transfer/interest/auth) | COMPLETE — 8/8 (f7d15fc; live-verified; blocker FINDING-007-002 closed) |
| Phase 1 Group 8 HR | API Certification (HR) | COMPLETE — 13/13 (6e1ef0e; FINDING-008-002 dept fixed dcdf568, FINDING-008-003 disciplinary fixed d8c7e12 + Employee seed) |
| Dashboard route sweep | Audit-layer routing across dashboard/procurement mounts | COMPLETE — 18/18 mounts clean (99c1ab3 audit layer + 9ef458b Tasks/Documents schema fix; FINDING-008-006 CLOSED) |
| Phase 2 | Playwright E2E | PENDING |
| Phase 3 | Finance/Trust/Payroll Compliance | PENDING |
| Phase 4 | Multi-Tenant Breach | PENDING |
| Phase 5 | Production Readiness | PENDING |

## Completion Estimates

* Backend: ~82%
* Frontend: ~35%
* Tests: Phase 1 API 139/139 (50 Groups 1-5 + 16 Wave A + 19 Wave B + 12 Trust reads + 21 Reporting + 8 Trust writes + 13/13 HR)
* Overall: ~58%

## Recent Fixes

* FIN-E-002 CLOSED (2026-06-23, d961779) — VatAdjustment model added (model + VatAdjustmentType/Status enums; tenant-scoped in the isolation extension); migration `20260621000000_reconcile_dept_vatadjustment_schema` reconciled from a 0-byte file to real SQL. VAT adjustments now persist; void works; summary adjustments leg is real. 7/7 live verification passed; tsc clean. Remaining GL-posting gap split out as FIN-E-005 (Class IV, separate scope).
* FINDING-INFRA-001 CLOSED (2026-06-23, d961779) — migration/ledger drift resolved: live objects previously applied via `db push` were never recorded; the reconcile migration was recorded on live via `prisma migrate resolve --applied` (no SQL re-run, no data change). `prisma migrate status` now clean (38 migrations), live-vs-schema drift empty. **`prisma migrate deploy` is now the authoritative schema path.**
* **STANDING RULE (2026-06-23): `prisma db push` is PROHIBITED on the shared Neon DB.** It silently mutates the live schema without a migration, leaving the ledger behind (root cause of INFRA-001 and the FIN-E-002 0-byte migration). All schema changes go through `prisma migrate dev` → reviewed migration → `migrate deploy`. Never `db push`.
* FINDING-006-002: billing schema delegates added, migration applied, dashboard fix deployed — RE-VERIFIED & CLOSED 2026-06-20 (all billing models present in schema + migration 20260611161954; Wave A 16/16 + Wave B 19/19 live; prior OPEN was stale)
* FIX D: drop Invoice.createdById in proforma convert
* FIX E: add CreditNote void fields + migration
* Trust journal-posting writes UNBLOCKED & VERIFIED LIVE (18 Jun 2026) — deposit/withdrawal/transfer/interest now post end-to-end in production (previously 500'd at every layer; never worked). Fix chain:
  * 4180794 — overdraw race → atomic conditional balance update
  * 8b356ea — Gap C: removed spurious MULTI_CURRENCY_POLICY_VIOLATION on single-currency journals
  * ef03a6f — Gap A: `systemPosting` flag lets system postings target allowManualPosting:false accounts
  * ec3e950 — Gap B: missing AccountingPeriod treated as OPEN (only CLOSED/LOCKED blocks)
  * 76e6be1 — P2028: raised interactive-transaction timeout 5s→30s
  * 033ba04 + f9c2697 — Option-A guard-safe findFirst/updateMany for journal idempotency + account-balance rebuild
  * e353612 — Option B (root fix): tenant guard accepts composite-key `where` with a matching nested tenantId; tightens top-level to exact-match
  * 3343102 — committed guard tests (9/9; 365/365 tenant-isolation regression green)
  * bbfbba6 — preserve headers/ip in synthetic in-transaction request; harden normalizeIp/normalizeUserAgent vs missing headers
  * Live evidence: deposit 201 (~3.9s); 5-way concurrent withdrawal race on a 2000 balance → 2×201 / 3×422 INSUFFICIENT_TRUST_ACCOUNT_BALANCE, final balance 0 — overdraw atomic guard re-proven under real concurrency (exactly the available funds withdrawn; no overspend, no negative)
* OPEN follow-ups (must close before Group 7 cert tests): FINDING-007-002 (matter-level TOCTOU race, HIGH), FINDING-007-005 (period create/close), FINDING-007-006 (balance projection off-tx)
* Period / payment / RBAC fix batch (18 Jun 2026) — all live-verified against production:
  * FINDING-007-005 CLOSED — `ensureOpenPeriod` helper unifies period enforcement: lazy auto-creates an OPEN AccountingPeriod on first post (server-local month), replacing Gap B's "missing = OPEN (no row)" hack AND `assertPeriodOpen`'s hard 404; both enforcement paths reconciled, close/lock now meaningful (70c2db9). Live-verified: period `2026-06` auto-created over HTTP.
  * FINDING-007-008 CLOSED — removed dead `Branch.isMain`/`isDefault` findFirst lookups (never existed in schema → PrismaClientValidationError 500'd ALL payment posting before reaching the period check); now resolves to tenant's oldest branch (3480c09). Live-verified: payment receipt posts 201 end-to-end.
  * FINDING-007-009 CLOSED — payment/finance privilege gates now also check the authoritative `tenantRole` enum (FIRM_ADMIN) + `CFO` role, not just the shadowing custom Role.name (e94c0ca). Live-verified: admin (FIRM_ADMIN/"ADMIN") → 201; accounts (ACCOUNTANT) → 403 (no over-grant).
  * Still OPEN, tracked: FINDING-007-011 (architectural: unify the parallel role/permission systems onto rbac.ts, MEDIUM).
* Finance Core Closeout — COMPLETE (2026-06-20):
  * FINDING-006-002 CLOSED — re-verified (was stale): all billing models present in schema + migration 20260611161954; Wave A 16/16 + Wave B 19/19 live. (See Recent Fixes above; 7e83c28.)
  * FINDING-007-010 CLOSED (e7ec79b) — wired `BillingPostingService.postInvoiceIssued` into the invoice approval transition (`approval.controller.ts`: DRAFT/PENDING_APPROVAL → INVOICED + GL post in ONE tx; removed the silent `.catch(()=>{})` so a failed post fails the approval). Local-verified (dev DB) AND live-verified (production onrender): invoice 10,000 + 16% VAT → DR 1200 AR 11,600 / CR 4000 Income 10,000 / CR 2100 VAT 1,600 (balanced); approve → 200; journal physically present + balanced; idempotent re-run → 1 journal. Closes the "GL silently understated for all API invoices" gap.
  * FINDING-007-014 CLOSED (a54da9a) — GET /finance/journals (and /journals/:id) 500'd: `JournalService` ordered nested `lines` by `createdAt`, a field absent on `JournalLine` → Prisma validation error. Fixed to `id: 'asc'`. Live-verified: GET /finance/journals → 200, 10 journals incl. the BILLING-INVOICE entry (3 lines).
  * FINDING-AUTH-001 — tracked, STILL BLOCKED (external): production email simulated (no SMTP_HOST/SENDGRID_API_KEY in render.yaml — sync:false); code is ready, needs real credentials. Not a code fix.
  * Follow-ups logged: FINDING-007-012 (approval/posting not fully atomic, retry-safe, LOW), FINDING-007-013 (billing posting bypasses shared TransactionEngine — parallel mechanism / drift risk, MEDIUM; needs convergence or ADR).
  * TODO-011 logged + scoped + positioned BEFORE Phase 2 (full file-coverage + cross-module interconnection validation across finance/trust/billing/procurement/payments/payroll/vendors/documents; 00ef6b6 + 3bd842a).
  * NET: of the 3 Finance Core findings — 006-002 & 007-010 CLOSED (007-014 also found+closed); AUTH-001 externally blocked. Next: Phase 3 (v3.1 Groups A–I).
* Dashboard route sweep (18 Jun 2026):
  * 99c1ab3 — routed 7 audit services (dashboards + procurement) through `logSecurityEvent`, matching the AI/reporting/approval pattern; fixed procurement catch-all ordering. Closes the dashboard audit-layer bug.
  * FINDING-008-006 CLOSED (9ef458b) — Tasks & Documents dashboard access scopes filtered on `matter.partnerId`/`matter.assignedLawyerId`, neither of which exists on the deployed `Matter` model (only `leadAdvocateId`); the phantom relation filters 500'd with PrismaClientValidationError. Option A: collapsed both phantom branches onto `leadAdvocateId`, no schema change. Live-verified 200/200 on both hosts. Dashboard route sweep now 18/18 clean.

---

# 4. OPEN WORKSTREAMS

## WIP-001

Control Plane Provisioning

Required:

* PlatformTenantProfile
* TenantSubscription
* TenantModuleEntitlement
* TenantQuotaPolicy
* TenantUsageMetric

Status:
Open

---

## WIP-002

Notification Platform

Required:

* Email
* SMS
* In-App
* Push
* Workflow
* Reminder Engine
* Escalation Engine
* Digest Engine
* Delivery Tracking
* Notification Preferences

Future Integrations:

* Outlook
* Gmail
* Twilio
* Africa's Talking
* Firebase Cloud Messaging

Status:
Partial

---

## WIP-003

Tenant Document Platform

Required:

* Signed URLs
* Malware Scanning
* Upload Scanning
* Retention Policies
* Version History
* Matter Indexing
* Audit Tracking

Status:
Partial

---

## WIP-004

Passive Time Capture

Required:

* Email Activity
* Calendar Activity
* Document Activity
* Matter Activity
* Queue Processing
* WIP Generation
* Approval Workflows

Status:
Not Started

---

## WIP-005

AI Legal Operations

Required:

* Generative Document Assembly
* Variable Extraction
* Prompt Registry
* Prompt Auditing
* Artifact Management
* Review Workflows
* Contract Risk Radar
* Semantic Search
* Prompt Injection Protection

Status:
Partial

---

## WIP-006

External Integrations

Required:

* Microsoft Graph
* Google Workspace
* QuickBooks
* Zoho
* M-PESA
* eTIMS
* Bank Feeds

Status:
Partial

---

## WIP-014

Invoice payment → journal entry posting (accounting gap #7)

Status:
Open

---

## WIP-015

VAT → tax compliance posting

Status:
Open

---

## WIP-016

Payment receipt generation

Status:
Open

---

## WIP-017

Matter progress/workflow status UI

Status:
Open

---

## WIP-018

Disbursement detail view

Status:
Open

---

## WIP-019

Global search expansion (invoices, DRNs, documents)

Status:
Open

---

## WIP-020

Summary tabs linking

Status:
Open

---

## WIP-021

Invoice estimate vs actual alert

Status:
Open

---

# 5. ARCHITECTURAL DECISIONS

## ADR-001

Tenant Isolation

Every tenant-aware query must enforce tenant filtering.

No exceptions.

Applies to:

* findUnique
* findFirst
* findMany
* create
* update
* updateMany
* delete
* upsert
* aggregate
* groupBy

---

## ADR-002

Control Plane Separation

Platform Administration and Tenant Administration remain isolated.

No shared access paths.

No shared services without authorization controls.

---

## ADR-003

Audit Immutability

Critical actions must create immutable audit records.

Audit chains must preserve:

* hash
* previousHash
* timestamp
* actor
* entity
* action

---

## ADR-004

Trust Accounting Integrity

Trust funds must remain isolated.

No commingling.

No negative trust balances.

No cross-trust allocations.

---

# 6. REQUIRED EXECUTION GATES

Gate 1
Repository Assessment

Gate 2
Schema Verification

Gate 3
Tenant Verification

Gate 4
Finance Verification

Gate 5
Trust Verification

Gate 6
Security Verification

Gate 7
Control Plane Closure

Gate 8
Notification Closure

Gate 9
Document Platform Closure

Gate 10
AI Platform Closure

Gate 11
External Integrations

Gate 12
Frontend Completion

Gate 13
Testing Matrix

Gate 14
Documentation

Gate 15
Production Readiness

Gate 16
Go-Live Review

Do not skip gates.

---

# 7. REQUIRED TESTING MATRIX

Every major subsystem must eventually pass:

## Tenant Tests

* Cross-Tenant Breach Tests
* Tenant Isolation Tests
* Role Boundary Tests

## Finance Tests

* Journal Integrity Tests
* Posting Tests
* Invoice Tests
* Payment Tests

## Trust Tests

* Trust Overdraw Prevention
* Trust Ledger Integrity
* Three-Way Reconciliation

## Security Tests

* Authorization Tests
* Rate Limit Tests
* Audit Verification
* Injection Tests

## AI Tests

* Prompt Injection Tests
* Context Isolation Tests
* Artifact Verification

---

# 8. INTEGRATION REQUIREMENTS

## M-PESA

Invoice
? Payment Request
? STK Push
? Callback
? Receipt
? Journal Entry
? Audit Event

---

## eTIMS

Invoice
? Submission
? Control Number
? QR Code
? PDF Stamping
? Audit Event

---

## QuickBooks

Invoice
? Queue
? OAuth
? Sync
? Audit Event

---

## Zoho ERP

Journal
? Queue
? Sync
? Audit Event

---

## Microsoft Graph

Required:

* Mail
* Calendar
* Teams
* Files
* Contacts

---

## Google Workspace

Required:

* Gmail
* Calendar
* Drive
* Docs

---

# 9. DOCUMENTATION REQUIREMENTS

Final documentation must include:

* Architecture
* Tenant Isolation
* Finance
* Trust Accounting
* Notifications
* Documents
* AI
* Integrations
* Deployment
* Operations
* Disaster Recovery
* CI/CD

Stored under:

/docs

---

# 10. GIT DISCIPLINE

Before every commit recommendation provide:

* git status
* git diff
* test results
* risk summary

Never recommend commits blindly.

---

# 11. DEFINITION OF DONE

The project is not complete until:

* All execution gates pass.
* All WIPs are closed.
* All critical tests pass.
* Documentation is complete.
* Deployment readiness is verified.
* Security review is complete.
* Tenant isolation is verified.
* Finance integrity is verified.
* Trust accounting integrity is verified.
* Production go-live review is approved.

Only then may Global Wakili Legal Enterprise be considered production-ready.

---

# 12. PLANNED SEED ARCHITECTURE (pre-Phase-2 requirement)

Status: PLANNED — not yet built. Required before Phase 2 Playwright
begins (E2E needs realistic, complete seed data to test against).

Structure (prisma/seeds/, one file per bounded context, numbered
for dependency order):

```
00_platform.seed.ts        01_tenants.seed.ts
02_users.seed.ts           03_clients.seed.ts
04_contacts.seed.ts        05_matters.seed.ts
06_documents.seed.ts       07_calendar.seed.ts
08_tasks.seed.ts           09_workflows.seed.ts
10_finance.seed.ts         11_trust.seed.ts
12_payroll.seed.ts         13_hr.seed.ts
14_notifications.seed.ts   15_ai.seed.ts
16_reporting.seed.ts       17_dashboard.seed.ts
18_integrations.seed.ts    19_security.seed.ts
22_billing.seed.ts         23_tax_compliance.seed.ts
24_procurement.seed.ts     25_tenders.seed.ts
26_court_filing.seed.ts    27_approvals.seed.ts
28_accounting_periods.seed.ts
master.seed.ts (orchestrator — calls all above in dependency order)
```

Refinements agreed (2026-06-19):

- 20_stress.seed.ts: REMOVED from default master.seed.ts run. Kept
  as a separate, optional script invoked only for load/stress
  testing -- not run by default, to keep Playwright/dev seeding fast.

- 19_security.seed.ts: sequence AFTER FINDING-007-011 (role/
  permission system unification) is resolved -- avoid baking in
  test fixtures for a permission system about to be restructured.

- 22_billing.seed.ts: formalizes Group 6 Billing test data
  (invoices, proformas, credit notes, retainers, payment reminders).

- 23_tax_compliance.seed.ts: VatAdjustment records, WHT
  certificates, eTIMS submission records (simulation mode), VAT
  return periods. Supports v3.1 Groups E/F.
  Depends on: 10_finance, 22_billing.
  Slot: after billing (22), before reporting (16 in numbering, but
  sequenced after 22 per the agreed build order) -- i.e. tax
  compliance is seeded once billing data exists to derive VAT/WHT
  from.

- 24/25/26/27 (procurement, tenders, court filing, approvals):
  Models exist in schema -- seedable. Controllers/routes may be
  partial. Seed what exists, log gaps per comprehensive-seeding
  directive. (Updated 2026-06-29: superseded the prior "PLACEHOLDERS
  ONLY -- domains unbuilt" note. 24_procurement built 2026-06-29.
  Run a final "all placeholders removed" verification of this §12
  once 24-27 are all seeded.)

- 28_accounting_periods.seed.ts: seeds a valid OPEN AccountingPeriod
  per tenant -- directly relevant to FINDING-007-005, ensures every
  tenant starts with a valid period during testing rather than
  relying on the lazy-create-on-first-post path.

- NEW: 21_validation.seed.ts (or folded into master.seed.ts) --
  after seeding completes, run a basic read-query against every
  seeded model, assert no errors. Direct lesson from this session:
  would have caught the Department/Payroll/Tasks/Documents
  dead-field bugs before they reached production. Acts as a
  schema-drift early-warning system going forward.

Sequencing: own dedicated session, scoped properly first (same
discipline as any multi-session build) -- not squeezed into a
tail-end of unrelated work.

---

# 13. CONFIRMED SESSION SEQUENCE (as of 2026-06-20)

0. GW-EOS governance migration -- CLAUDE.md, SESSION_EXECUTION_
   PROTOCOL.md, PROJECT_STATUS.md, COMPLETED_GATES.md,
   KNOWN_GAPS.md, EXECUTION_ROADMAP.md, CERTIFICATION_POLICY.md,
   CHANGE_CONTROL.md, DEFINITION_OF_DONE.md, QUALITY_STANDARDS.md,
   RISK_MANAGEMENT.md, ARCHITECTURE_DECISIONS.md -- own dedicated
   session, real data only (no placeholder/illustrative content)
1. TODO-010 -- full repo-wide file/path audit -- fixed position:
   immediately after Step 0, before Step 2
2. F-17 (MFA) -- own dedicated session, full scoping first
3. Seed architecture (Section 12) -- own dedicated session
4. Phase 2 Playwright -- begins only after seed architecture in place

## UPDATED 2026-06-23 — AGREED STANDING OPERATING PROCEDURE (supersedes the 2026-06-20 list above for sequencing)

The authoritative session sequence from 2026-06-23 onward:

1. Complete Phase 3 Groups F through I (backend only, same
   discipline as A-E — certify what exists, log what doesn't).
   (Group F WHT = DONE/DEFERRED, FINDING-FIN-F-001. Groups G/H
   need scope definitions from the external v3.1 roadmap before
   recon; I = financial reports.)
2. Frontend sprint — close ALL FINDING-FRONT items (current
   FRONT-001…007 plus any added by Groups F-I) in one focused pass.
3. Seed architecture (Section 12) — build alongside or
   immediately after the frontend sprint.
4. Phase 2 Playwright — begins only once frontend sprint + seed
   architecture are BOTH complete.

Hard rules:
- Do NOT mix frontend work into Phase 3 backend sessions.
- Do NOT start Playwright before the frontend sprint is done.
- Log any new frontend gap discovered during Phase 3 as
  FINDING-FRONT-XXX immediately — do not defer logging (Principle 5).
- No thin code: never write placeholder/token cert tests just to
  show green; certify real behavior or DEFER + log a finding.
