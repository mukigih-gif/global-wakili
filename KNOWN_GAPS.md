# KNOWN_GAPS.md

# Global Wakili Legal Enterprise

## Known Gaps Register

Last Updated: 2026-06-03

---

Gap 001

Module:
Control Plane

Issue:
PlatformTenantProfile provisioning automation incomplete.
Gate 7 verified the provisioning service logic is correct (4 records per tenant).
A live provisioning script / seed command for real tenant onboarding is still required.

Priority:
Critical

Status:
Open

WIP Reference:
WIP-001

---

Gap 002

Module:
Control Plane

Issue:
TenantSubscription provisioning automation incomplete.

Priority:
Critical

Status:
Open

WIP Reference:
WIP-001

---

Gap 003

Module:
Control Plane

Issue:
TenantModuleEntitlement provisioning automation incomplete.

Priority:
Critical

Status:
Open

WIP Reference:
WIP-001

---

Gap 004

Module:
Control Plane

Issue:
TenantQuotaPolicy provisioning automation incomplete.

Priority:
Critical

Status:
Open

WIP Reference:
WIP-001

---

Gap 005

Module:
Control Plane

Issue:
TenantUsageMetric provisioning automation incomplete.

Priority:
Critical

Status:
Open

WIP Reference:
WIP-001

---

Gap 006

Module:
Notification Platform

Issue:
Notification delivery ecosystem incomplete (50% per PROJECT_STATUS.md).
Missing: email delivery, SMS (Twilio / Africa's Talking), push (Firebase Cloud Messaging),
in-app notifications, reminder engine, escalation engine, digest engine,
delivery tracking, user notification preferences.
Microsoft Outlook and Gmail integration also required (WIP-002).

Priority:
High

Status:
Open

WIP Reference:
WIP-002

---

Gap 007

Module:
Document Storage

Issue:
Document platform feature completion incomplete (60% per PROJECT_STATUS.md).
Missing: malware scanning verification, retention policies, version history,
enhanced matter indexing.

Priority:
High

Status:
Open

WIP Reference:
WIP-003

---

Gap 008

Module:
AI Platform

Issue:
AI Legal Operations platform incomplete (45% per PROJECT_STATUS.md).
All external LLM providers have executionSupported: false — rules-only engine currently active.
Missing: generative document assembly, variable extraction, prompt auditing,
artifact governance, review workflows, contract risk radar, semantic precedent search,
real LLM provider integration (Anthropic/OpenAI/Azure/Gemini/Bedrock).

Priority:
High

Status:
Open

WIP Reference:
WIP-005

---

Gap 009

Module:
Passive Time Capture

Issue:
Passive Time Capture architecture not implemented (NOT STARTED per MASTER_EXECUTION_CHARTER.md).
TimeEntry model exists. No background activity ingestion, no email/calendar/document tracking,
no queue processing, no WIP generation, no approval workflow.

Priority:
High

Status:
Open

WIP Reference:
WIP-004

---

Gap 010

Module:
External Integrations — M-PESA

Issue:
M-PESA Daraja integration stubbed — no real Daraja API calls.
File: apps/api/src/modules/integrations/banking/providers/mpesa.service.ts
Returns empty transactions. No STK Push, no callback handler, no receipt, no journal entry posting.
Required flow per charter: Invoice → Payment Request → STK Push → Callback → Receipt → Journal Entry → Audit Event.
External dependency: Safaricom Daraja API credentials (2–4 weeks to obtain).

Priority:
Critical

Status:
Open

WIP Reference:
WIP-006

---

Gap 011

Module:
External Integrations — eTIMS

Issue:
KRA eTIMS integration client stubbed — no real KRA HTTP calls.
File: apps/api/src/modules/integrations/etims/eTimsClient.ts
Service and queue layers complete. HTTP client returns mock responses only.
Required flow per charter: Invoice Finalization → Submission → Control Number → QR Code → PDF Stamping → Audit Event.
External dependency: KRA eTIMS API credentials (2–4 weeks to obtain).

Priority:
Critical

Status:
Open

WIP Reference:
WIP-006

---

Gap 012

Module:
External Integrations — Microsoft Graph

Issue:
Microsoft Graph integration stubbed.
File: apps/api/src/modules/calendar/ExternalSyncService.ts
OAuth URL generation works. Token exchange returns placeholder. No calendar sync, no mail read,
no contacts, Teams, or Files integration.
Required areas: Mail, Calendar, Contacts, Teams, Files, Webhooks.

Priority:
Medium

Status:
Open

WIP Reference:
WIP-006

---

Gap 013

Module:
External Integrations — Google Workspace

Issue:
Google Workspace integration stubbed.
OAuth URL generation works. Token exchange returns placeholder. No Gmail, Calendar, Drive, or Docs sync.

Priority:
Medium

Status:
Open

WIP Reference:
WIP-006

---

Gap 014

Module:
External Integrations — QuickBooks Online

Issue:
QuickBooks integration not implemented — zero files in codebase.
Required flow per charter: Invoice → Posting Queue → OAuth Validation → Synchronisation → Audit Event.

Priority:
Medium

Status:
Open

WIP Reference:
WIP-006

---

Gap 015

Module:
External Integrations — Zoho ERP

Issue:
Zoho ERP integration not implemented — zero files in codebase.
Required flow per charter: Journal → Aggregation → Synchronisation → Audit Event.

Priority:
Medium

Status:
Open

WIP Reference:
WIP-006

---

Gap 016

Module:
External Integrations — Bank Feeds

Issue:
Bank feed integrations not started (listed in WIP-006 and charter integration requirements).

Priority:
Medium

Status:
Open

WIP Reference:
WIP-006

---

Gap 017

Module:
Frontend

Issue:
Frontend at 25% completion (PROJECT_STATUS.md, HANDOVER_NOTES.md).
Only 3 placeholder pages exist (index, login stub, dashboard stub).
Required per MASTER_EXECUTION_CHARTER.md — 11 domains outstanding:
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
Open

WIP Reference:
WIP-004 (passive time capture UI), WIP-005 (AI UI)

---

Gap 018

Module:
Testing

Issue:
Comprehensive integration and E2E testing matrix incomplete.
365 unit tests pass (logic-level). Missing:
- Integration tests against real Neon DB (cross-tenant breach on actual data)
- E2E flow tests for M-PESA (STK Push → Journal Entry)
- E2E flow tests for eTIMS (Invoice → Control Number → PDF)
- Load tests (50 concurrent users/tenant, p95 < 500ms SLA)
- HR & Payroll compliance tests
- Notification delivery tests
- AI fuzzing / prompt injection tests

Priority:
High

Status:
Open

---

Gap 019

Module:
Production Infrastructure

Issue:
Production readiness incomplete per GATE_15 and PROJECT_STATUS.md.
Missing: Redis-backed rate limiter (current in-memory limiter does not support multi-instance deployment),
Prometheus /metrics endpoint, Grafana/APM integration, alerting rules,
distributed tracing (OpenTelemetry), log aggregation, uptime monitoring,
disaster recovery plan, RTO/RPO definition, backup restore test, CI/CD deploy pipeline,
full environment variable configuration for production.

Priority:
High

Status:
Open

---

Gap 020

Module:
Documentation

Issue:
Documentation partial per PROJECT_STATUS.md.
Gate 14 committed 19 governance docs covering gates, not operational documentation.
Missing: full /docs architecture, API documentation, deployment guide,
operational runbooks, disaster recovery procedures, tenant isolation runbook,
finance/trust runbooks, eTIMS/M-PESA operations guides.

Priority:
Medium

Status:
Open

---

End of File
