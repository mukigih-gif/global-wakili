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

(updated 11 Jun 2026)

| Gate | Name | Status |
|------|------|--------|
| Phase 0 | Schema & Seed Validation | COMPLETE |
| Phase 1 Groups 1-5 | API Certification (Auth/Clients/Users/Password Reset/Matters) | COMPLETE — 50/50 |
| Phase 1 Group 6 Wave A | API Certification (Billing reads) | COMPLETE — 16/16 billing reads passing |
| Phase 1 Group 6 Wave B + Groups 7-9 | API Certification (Billing writes, Trust, HR, Reporting) | NEXT |
| Phase 2 | Playwright E2E | PENDING |
| Phase 3 | Finance/Trust/Payroll Compliance | PENDING |
| Phase 4 | Multi-Tenant Breach | PENDING |
| Phase 5 | Production Readiness | PENDING |

## Completion Estimates

* Backend: ~82%
* Frontend: ~35%
* Tests: Phase 1 API 66/66
* Overall: ~58%

## Recent Fixes

* FINDING-006-002: billing schema delegates added, migration applied, dashboard fix deployed

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
