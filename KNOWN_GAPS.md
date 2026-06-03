# KNOWN_GAPS.md

# Global Wakili Legal Enterprise

## Known Gaps Register

Last Updated: 2026-06-03

---

## CLOSED GAPS (WIP-001 through WIP-006 — Resolved 2026-06-03)

Gap 001–005 | Control Plane | WIP-001 | CLOSED
Commit: e0ed954 — provision-tenant.ts + reprovision-all-tenants.ts CLI scripts

Gap 006 | Notification Platform | WIP-002 | CLOSED
Commit: e928be5 — SMTP, Africa's Talking SMS, FCM push, Reminder/Escalation/Digest engines, BullMQ worker

Gap 007 | Document Platform | WIP-003 | CLOSED
Commit: 808d630 — S3 adapter, VirusTotal malware scanning, Retention enforcement runner

Gap 008 | AI Platform | WIP-005 | CLOSED
Commit: c273990 — Anthropic Claude LLM, prompt injection protection, token tracking

Gap 009 | Passive Time Capture | WIP-004 | CLOSED
Commit: dd582bc — PassiveCaptureEvent schema, PassiveActivityService, WipGenerationService, BullMQ worker

Gap 010 | M-PESA | WIP-006 | CLOSED
Commit: 2438277 — MpesaStkPushService: Daraja OAuth, STK Push, callback parser, IP allowlist

Gap 011 | eTIMS | WIP-006 | CLOSED
Commit: 2438277 — eTimsClient: real KRA HTTP submission + status check, HMAC signing

Gap 012 | Microsoft Graph | WIP-006 | CLOSED
Commit: 2438277 — Real token exchange + Calendar sync (Google + Outlook)

Gap 013 | Google Workspace | WIP-006 | CLOSED
Commit: 2438277 — Real token exchange + Gmail/Calendar/Drive integration

Gap 014 | QuickBooks | WIP-006 | CLOSED
Commit: 2438277 — OAuth 2.0, invoice + journal sync

Gap 015 | Zoho ERP | WIP-006 | CLOSED
Commit: 2438277 — OAuth 2.0, invoice + journal sync, multi-region

Gap 016 | Bank Feeds | WIP-006 | PARTIAL
Status: Foundation exists (BankProvider interface, equity/KCB/NCBA stubs). Full statement
import and reconciliation pending external API access per bank.

---

## OPEN GAPS (Active)

---

Gap 017

Module:
Frontend

Issue:
Frontend at 25% completion. Three placeholder pages only (index, login stub, dashboard stub).
11 full domains required per MASTER_EXECUTION_CHARTER.md:
  1. Public Marketing Platform (SEO, lead gen, legal triage bots, booking workflows)
  2. Super Admin Platform (tenant lifecycle, billing, subscriptions, monitoring, incidents)
  3. Tenant Administration (staff, branches, permissions, configuration)
  4. Legal Practice Management (matters, workflows, hearings, contracts, litigation, tasks)
  5. Finance (journals, ledgers, billing, invoices, payments, reconciliation, procurement, vendors)
  6. Trust Accounting (trust ledgers, transactions, reconciliation, overdraw prevention)
  7. HR & Payroll (employees, payroll, leave, goals, performance)
  8. Analytics & Reporting (dashboards, KPIs, BI exports, scheduled reports)
  9. AI Platform UI (providers, prompt registry, artifact registry, review workflows)
  10. Notifications UI (email, SMS, push, in-app preferences)
  11. Client Portal (passwordless access, matter timelines, payments, secure vault)

Priority:
High

Status:
OPEN — Active (Phase 9 / Gate 12)

---

Gap 018

Module:
Testing Matrix

Issue:
365 unit tests pass (logic-level only). Missing:
  - Integration tests against real Neon DB (cross-tenant breach on actual data)
  - E2E flow: M-PESA STK Push → Journal Entry
  - E2E flow: eTIMS Invoice → Control Number → PDF
  - Load tests (50 concurrent users/tenant, p95 < 500ms SLA)
  - HR & Payroll compliance tests
  - Notification delivery tests
  - AI prompt injection tests on real provider

Priority:
High

Status:
OPEN (Phase 10 / Gate 13)

---

Gap 019

Module:
Production Infrastructure

Issue:
Missing:
  - Redis-backed rate limiter (in-memory does not support multi-instance)
  - Prometheus /metrics endpoint
  - Grafana/APM dashboard
  - Alerting rules (error rate, latency, health score)
  - OpenTelemetry distributed tracing
  - Log aggregation (Loki/Datadog/CloudWatch)
  - Uptime monitoring
  - Disaster recovery plan (RTO/RPO defined)
  - Backup restore test
  - CI/CD deploy pipeline (test+build+deploy-to-staging)
  - Production env var configuration and secrets rotation

Priority:
High

Status:
OPEN (Phase 12 / Gate 15)

---

Gap 020

Module:
Documentation

Issue:
Gate 14 committed 19 governance docs (gate records only).
Missing operational documentation:
  - /docs architecture overview
  - API documentation (paginated)
  - Deployment guide
  - Tenant isolation runbook
  - Finance & trust accounting runbooks
  - eTIMS / M-PESA operations guides
  - Disaster recovery procedures
  - On-call runbook

Priority:
Medium

Status:
OPEN (Phase 11 / Gate 14)

---

End of File
