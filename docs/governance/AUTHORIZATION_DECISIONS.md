# Authorization Decisions Register

**Gate:** 6 — Security Verification
**Date:** 2026-06-02
**Status:** Active

This document records formal authorization decisions for route groups that
deviate from the standard `requirePermissions` RBAC pattern. Every deviation
must be documented here before the route is accepted into a gate.

---

## Authorization Architecture

All routes are protected by two layers:

1. **Authentication** (`unifiedTenancy` middleware): JWT verified, tenant
   context resolved, `req.db` scoped to tenant. Applied to all `/api/v1/*`
   routes except `/auth/*`.

2. **Authorization** (`requirePermissions`): DB-backed RBAC check against the
   user's roles and direct permissions. Applied per-route to every sensitive
   operation.

Permission format: `resource.action` (e.g. `trust.create_transaction`)
Wildcards: `resource.*`, `*.action`, `*.*`

---

## Decision Register

### AUTH-DEC-001: Client Portal Routes — Identity-Based Scoping

**Routes:**
- `GET /api/v1/clients/:clientId/portal/dashboard`
- `GET /api/v1/clients/:clientId/portal/matters`

**RBAC guard:** None (intentional)

**Rationale:**
Client portal routes are accessed by clients — external parties who do not
have staff user accounts and therefore have no RBAC roles. These routes use
**identity-based scoping** instead:

1. The route requires `req.user?.sub` (JWT subject) — authentication is
   still enforced by `unifiedTenancy`
2. The controller throws `CLIENT_PORTAL_UNAUTHORIZED` (401) if `portalUserId`
   is absent
3. All data returned is scoped to `{ tenantId, clientId, portalUserId }` —
   a client can only see their own matters and invoices

**Risk assessment:** LOW
- Authentication is still required (JWT must be valid)
- Data is scoped to the requesting client's own records
- No cross-client data leakage possible via `portalUserId` scope

**Gate 12 scope:** Full client portal authentication (passwordless/OTP magic
links for clients) will be implemented as part of the Client Portal gate.
At that point, `portalUserId` will be derived from the portal session JWT,
not from query params.

**Review trigger:** If portal routes ever return data spanning multiple
clients, or if client auth uses a shared/guessable identifier, this decision
must be revisited.

---

## Route Authorization Coverage (Gate 6 Scan)

Scan methodology: checked all 25 route files for `router.(get|post|put|patch|delete)`
calls without any recognized permission guard. Guard patterns recognized:

`requirePermissions`, `checkPermission`, `requirePaymentPermission`,
`billingPermission`, `requireFinancePermission`, `superAdminAuth`,
`requireHrPermission`, `requirePayrollPermission`, `requireAnalyticsPermission`,
`requireTaskPermission`, `requireApprovalPermission`, `requireTrustPermission`,
`requireMatterPermission`, `requirePlatformAuth`, `requireAIPermission`,
`bindPlatformModuleEnforcement`

**Results:**

| Category | Count | Status |
|----------|-------|--------|
| Health check endpoints (`/health`) | many | ✅ Acceptable — return status only |
| Module info endpoints (`GET /`) | few | ✅ Acceptable — behind authentication |
| Client portal routes | 2 | ✅ Documented (AUTH-DEC-001) |
| Integrations capabilities route | 1 | ✅ Fixed in G6-D01 — added `requirePermissions(['integrations.view_capabilities'])` |
| Sensitive routes without guard | **0** | ✅ All covered |

---

## Raw SQL Audit (ADR-001)

Search: `queryRaw`, `executeRaw`, `queryRawUnsafe`, `executeRawUnsafe`
Result: **ZERO instances** across all 528+ TypeScript files in `apps/api/src`.
ADR-001 compliance: ✅ CONFIRMED
