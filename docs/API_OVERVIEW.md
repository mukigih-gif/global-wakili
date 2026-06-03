# API Documentation Overview — Global Wakili Legal Enterprise

**Base URL:** `https://api.globalwakili.co.ke/api/v1`
**Auth:** `Authorization: Bearer <jwt>` + `x-tenant-id: <tenant-id>` on all tenant routes.

---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Email + password login → JWT |
| POST | `/auth/register` | Register a new law firm |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Current user profile |
| GET | `/auth/oauth/google` | Google OAuth redirect |
| GET | `/auth/oauth/microsoft` | Microsoft OAuth redirect |

---

## Core Modules

### Matters
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/matters` | Create matter |
| GET | `/matters` | List open matters (paginated) |
| GET | `/matters/:id` | Get matter detail |
| PATCH | `/matters/:id` | Update matter (triggers client notification if progressStage changes) |
| GET | `/matters/:id/overview` | Matter financial + activity overview |

### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/clients` | Create client |
| GET | `/clients` | List active clients |
| GET | `/clients/:id` | Client detail |
| PATCH | `/clients/:id` | Update client |
| GET | `/clients/:id/dashboard` | Internal client dashboard |
| GET | `/clients/:id/portal/dashboard` | Client portal view |
| GET | `/clients/issues` | Client issues list |
| POST | `/clients/issues` | Raise client issue |
| GET | `/clients/prospects` | Prospect list |
| GET | `/clients/prospects/pipeline` | Kanban pipeline view |
| POST | `/clients/prospects` | Create prospect |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tasks` | Create task |
| GET | `/tasks/search` | Search tasks |
| GET | `/tasks/dashboard` | Task dashboard (overdue, due-soon) |
| GET | `/tasks/:id` | Task detail + comments |
| PATCH | `/tasks/:id` | Update task |
| POST | `/tasks/:id/complete` | Mark complete |
| DELETE | `/tasks/:id` | Cancel task |
| POST | `/tasks/:id/comments` | Add comment |
| GET | `/tasks/:id/comments` | List comments |
| POST | `/tasks/:id/reminders` | Set reminder (→ notification queue) |
| POST | `/tasks/:id/calendar-link` | Link to calendar |

---

## Finance

### Billing / Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/billing/invoices` | Create invoice |
| GET | `/billing/invoices` | List invoices |
| GET | `/billing/invoices/:id` | Invoice detail |
| PATCH | `/billing/invoices/:id` | Update invoice |
| POST | `/billing/invoices/:id/cancel` | Cancel invoice (terminal) |

### Trust Accounting
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trust/accounts` | List trust accounts |
| POST | `/trust/transactions` | Create trust transaction (overdraw check) |
| GET | `/trust/transactions` | List transactions |
| POST | `/trust/reconciliation` | Run three-way reconciliation |

### Finance / Journals
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/finance/journals` | Post journal entry (double-entry enforced) |
| GET | `/finance/journals` | List journal entries |
| GET | `/finance/accounts` | Chart of accounts |

---

## Court & Legal

### Court Hearings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/court/hearings` | Schedule hearing |
| GET | `/court/hearings` | List hearings |
| GET | `/court/hearings/:id` | Hearing detail |
| PATCH | `/court/hearings/:id` | Update outcome/status |
| GET | `/court/dashboard` | Dashboard (overdue, upcoming) |

### Court Filings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/court/filings` | Record filing (clerk/advocate) |
| GET | `/court/filings` | List filings |
| PATCH | `/court/filings/:id` | Update status, attach scan URL |
| GET | `/court/filings/dashboard` | Filing dashboard |

### Tenders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tenders` | Create tender record |
| GET | `/tenders` | List tenders |
| GET | `/tenders/:id` | Tender detail + activities + documents |
| PATCH | `/tenders/:id/status` | Update tender status |
| POST | `/tenders/:id/activities` | Log tender activity |
| POST | `/tenders/:id/documents` | Attach tender document |
| GET | `/tenders/dashboard` | Deadline dashboard |

---

## Documents & Reception

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/documents` | Upload document (malware scanned) |
| GET | `/documents/search` | Search documents |
| GET | `/documents/:id/download` | Get signed download URL (TTL 900s) |
| POST | `/documents/:id/version` | Create new version |

### Reception
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reception` | Log reception entry (visitor/call/doc) |
| GET | `/reception` | List reception logs |
| GET | `/reception/dashboard` | Reception dashboard |
| POST | `/reception/:id/handoff` | Request handoff (doc bridge, notification) |

---

## AI Platform

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/execute` | Run AI analysis (scope required) |
| GET | `/ai/artifacts` | List AI artifacts |
| GET | `/ai/artifacts/:id` | Artifact detail |
| GET | `/ai/capabilities` | Available AI scopes and status |
| GET | `/ai/providers` | Provider registry |

**AI Scopes:** `document-analysis`, `contract-review`, `matter-risk`, `deadline-intelligence`, `billing-insights`, `trust-compliance-alerts`, `drafting-assistant`, `knowledge-base`, `legal-research`, `client-intake-assistant`

---

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/notifications/send` | Send notification (EMAIL/SMS/PUSH/SYSTEM_ALERT) |
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark as read |
| GET | `/notifications/preferences` | User preferences |

---

## Platform (Super Admin Only)

All `/platform/*` routes require `requireSuperAdmin` middleware.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/platform/tenants` | List tenants |
| POST | `/platform/tenants/:id/provision` | Provision tenant (4 records) |
| GET | `/platform/monitoring/overview` | Platform health overview |
| GET | `/platform/tickets` | Support tickets |
| POST | `/platform/tickets` | Create support ticket |

---

## System

| Endpoint | Description |
|----------|-------------|
| `GET /ping` | Uptime probe (returns `pong`) |
| `GET /health` | Health check (JSON) |
| `GET /metrics` | Prometheus metrics (bearer token optional) |

---

## Error Format

All errors return:
```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "requestId": "req-uuid",
  "details": { ... }
}
```

Common codes: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404),
`UNBALANCED_JOURNAL` (422), `TRUST_INSUFFICIENT_BALANCE` (422),
`RATE_LIMIT_EXCEEDED` (429), `INTERNAL_SERVER_ERROR` (500).

---

## Pagination

All list endpoints accept `page` (default 1) and `limit` (default 25–50, max 100).

Response meta:
```json
{
  "data": [...],
  "meta": {
    "total": 250,
    "page": 1,
    "limit": 25,
    "totalPages": 10
  }
}
```
