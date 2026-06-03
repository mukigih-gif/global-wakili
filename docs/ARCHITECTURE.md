# Global Wakili Legal Enterprise — Architecture

## Platform Overview

Global Wakili is a multi-tenant, production-grade Legal ERP built primarily
for Kenyan law firms. It combines:
- Legal Practice Management
- Trust Accounting (Law Society of Kenya compliant)
- Legal Accounting & Finance
- HR & Payroll (PAYE, NHIF, NSSF)
- AI Legal Operations (Anthropic Claude, governed)
- Document Management (cloud storage, malware scanning)
- Client Collaboration Portal
- External Integrations (eTIMS, M-PESA, QuickBooks, Zoho, Graph, Google)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Node.js + Express + TypeScript |
| Database | PostgreSQL via Neon Serverless (Prisma ORM) |
| Frontend | Next.js 14 (App Router) + React 18 + Tailwind CSS |
| Auth | JWT (access token) + bcryptjs |
| Queue | BullMQ + Redis (noop fallback in dev) |
| Real-time | Socket.IO with JWT auth + tenant room isolation |
| AI | Anthropic Claude via @anthropic-ai/sdk |
| Email | Nodemailer (SMTP / SendGrid) |
| SMS | Africa's Talking (Kenya primary) + Twilio (fallback) |
| Push | Firebase Cloud Messaging (FCM) |
| Storage | AWS S3 (production) / local filesystem (dev) |
| Malware | VirusTotal API |

---

## Repository Structure

```
global-wakili/
├── apps/
│   ├── api/          — Express API server
│   │   └── src/
│   │       ├── modules/      — Domain modules (26+)
│   │       ├── middleware/   — Auth, tenant, rate limiter
│   │       ├── utils/        — Pure utilities (tested)
│   │       ├── config/       — Env, DB, permissions
│   │       └── scripts/      — CLI provisioning scripts
│   └── web/          — Next.js 14 frontend
│       └── src/
│           ├── app/          — Next.js App Router pages
│           ├── components/   — Shared UI components
│           ├── context/      — React auth context
│           └── lib/          — API client, utils
├── packages/
│   └── database/     — Prisma schema + tenant extension
├── docs/
│   └── governance/   — Gate closure records
└── scripts/          — Report generation
```

---

## Multi-Tenancy Architecture

**Decision:** Application-level tenant enforcement (ADR-001).

Every Prisma query on a tenant-scoped model is intercepted by a
Prisma client extension (`packages/database/src/tenant-extension.ts`).

The extension:
1. Injects `tenantId` into all `findMany`/`findFirst` WHERE clauses
2. Blocks `findUnique`/`update`/`delete`/`upsert` without `tenantId`
3. Injects `tenantId` into all `create`/`createMany` data payloads
4. Prevents caller-supplied `tenantId` from being overridden

**108 models** are registered as tenant-scoped.
Raw SQL paths (`$queryRaw`, `$executeRaw`) must also enforce tenant filtering
per ADR-001 — no un-parameterized or non-tenant-scoped raw SQL is permitted.

---

## Authentication Flow

```
Client → POST /auth/login (email, password, x-tenant-id header)
       ← JWT access token (15 min) + refresh token

Protected routes → Authorization: Bearer <token>
                   x-tenant-id: <tenant-id>

JWT payload: { sub: userId, tenantId, role, isSuperAdmin }
```

Single-window login: the login page routes the user to the correct
portal after authentication based on role:
- `isSuperAdmin` → `/admin/dashboard` (Platform Control Plane)
- `role = CLIENT` → `/portal/dashboard` (Client Portal)
- All others → `/app/dashboard` (Tenant ERP)

---

## Control Plane Separation (ADR-004)

Platform administration (`/platform/*` routes) requires `requireSuperAdmin`
middleware applied globally before any individual route handler.

Super Admin check: `isSuperAdmin` flag OR `SUPER_ADMIN/SYSTEM_ADMIN` systemRole
OR `super_admin` in roles array.

Tenant users with platform permissions in their role set cannot access
platform operations — `requireSuperAdmin` is the primary air-gap.

---

## Audit Architecture (ADR-002)

Critical events write immutable `AuditLog` records with:
- `hash` — SHA-256 of the event payload
- `previousHash` — links to the previous audit entry
- `sequenceNumber` — race-condition-free ordering

The hash chain is tamper-evident: any modification to a historical record
breaks the chain. Verified by `computeAuditHash` / `verifyHashChain` utilities.

---

## Trust Accounting Architecture (ADR-003)

Trust funds are strictly isolated:
- No commingling of trust and office funds
- No negative trust balances permitted (overdraw prevention)
- No cross-trust allocations

Every trust transaction calls `assertSufficientBalance` before creating
any debit entry. Three-way reconciliation (bank vs trust ledger vs client
ledger) is run periodically via `computeThreeWayVariances`.

---

## External Integration Architecture

All external integrations use simulation fallback when credentials are absent:

| Integration | Env Var | Credential Source |
|------------|---------|-------------------|
| eTIMS (KRA) | `ETIMS_BASE_URL` | KRA portal |
| M-PESA | `MPESA_CONSUMER_KEY` | Safaricom Daraja |
| Google | `GOOGLE_CLIENT_SECRET` | Google Cloud Console |
| Microsoft Graph | `MS365_CLIENT_SECRET` | Azure portal |
| QuickBooks | `QB_CLIENT_SECRET` | Intuit Developer |
| Zoho | `ZOHO_CLIENT_SECRET` | Zoho API Console |
| Anthropic | `ANTHROPIC_API_KEY` | Anthropic Console |

Simulation mode logs to console and returns plausible fake data.
No integration crashes when credentials are absent.

---

## AI Platform Architecture

```
Request → AIPolicyService.validateExecutionGuardrails()
        → detectPromptInjection() — 9 attack patterns blocked
        → AIProviderRegistry.resolveProviderForScope()
        → AIPromptAuditService.createAudit()
        → callAnthropic() OR dispatchScope() (rules-based)
        → db.aIArtifact.create()
        → db.aIReviewTask.create() (if requiresHumanReview)
        → AIUsageLogService.finishExecution() with token counts
```

All external LLM outputs require human review (`requiresHumanReview: true`).
Prompt caching is enabled for system prompts via `cache_control: ephemeral`.
