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
| Phase 1 Group 8 HR | API Certification (HR) | NEXT |
| Phase 2 | Playwright E2E | PENDING |
| Phase 3 | Finance/Trust/Payroll Compliance | PENDING |
| Phase 4 | Multi-Tenant Breach | PENDING |
| Phase 5 | Production Readiness | PENDING |

## Completion Estimates

* Backend: ~82%
* Frontend: ~35%
* Tests: Phase 1 API 126/126 (50 Groups 1-5 + 16 Wave A + 19 Wave B + 12 Trust reads + 21 Reporting + 8 Trust writes)
* Overall: ~58%

## Recent Fixes

* FINDING-006-002: billing schema delegates added, migration applied, dashboard fix deployed
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
  * Still OPEN, tracked, not yet addressed: FINDING-007-010 (API-created invoices never journal-posted — billing-posting not HTTP-reachable, HIGH), FINDING-007-011 (architectural: unify the parallel role/permission systems onto rbac.ts, MEDIUM).

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
