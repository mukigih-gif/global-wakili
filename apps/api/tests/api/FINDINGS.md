# Global Wakili — API Certification Findings Log

This file is the permanent record. API_CERTIFICATION_REPORT.md is
regenerated on every test run — findings logged here survive reruns.

---

## GROUP 1 — Auth Endpoints (9 Jun 2026)

### F-01 HIGH — OAuth callback path mismatch
- File: auth.controller.ts lines 1047 and 1123
- Callbacks registered at double-auth path
- Initiate handlers advertise single-auth redirect_uri
- Real Google/Microsoft redirect returns 401 — OAuth login never completes
- Fix required before portal goes live
- Status: VERIFIED LIVE (9 Jun 2026) — callbacks re-registered at the single-auth
  path (/oauth/{google,microsoft}/callback). Live probe of
  GET /api/v1/auth/oauth/google/callback returns 400 (handler reached); pre-deploy
  the same path returned 401 (unrouted), confirming the fix is deployed.

### F-02 LOW — POST /auth/logout returns 204 not 200
- Inconsistent with the rest of the API envelope
- Endpoint correct; certification test aligned to 204
- Document only — no fix required
- Status: ACCEPTED (no fix)

### F-03 INFO — POST /auth/refresh not implemented
- Substituted with GET /auth/session for token validation
- Implement before mobile client support
- Status: OPEN (deferred)

---

## GROUP 2 — Client Endpoints (10 Jun 2026)

### F-04 LOW — No client DELETE endpoint
- File: client.routes.ts — routes cover POST/PATCH/GET only; no DELETE
- Consequence: clients created via API cannot be removed via API (live test
  data, e.g. __CERT_TEST_CLIENT__, persists; cleanup needs direct DB access)
- Status: ACCEPTED for certification (Option B). Consider soft-delete/archive
  endpoint before GA

### F-06 MEDIUM — PATCH /clients/:id returns 500
- File: ClientService.ts line 367
- Candidate: db.client.update where clause missing tenantId
- Tenant-isolation guard rejects mutation without tenantId
- Fix: add tenantId to where clause in update call
- Status: VERIFIED LIVE — 10 Jun 2026

### F-07 MEDIUM — GET /clients/:id/dashboard returns 500
- File: ClientDashboardService.getInternalDashboard
- Candidate: schema drift or null-handling crash on client with no activity
- Fix: audit selected fields against live schema, add null guards
- Status: OPEN

**Status update (10 Jun 2026) — ROOT CAUSE CONFIRMED & FIXED:**
- Diagnosed from the live 500 response body (raw Prisma error — see F-08).
- Actual cause: ClientDashboardService portalUser select referenced
  `firstName`/`lastName`, which do NOT exist on the User model (User has
  `name`). Prisma: "Unknown field `firstName` for select statement on model
  `User`." Not schema drift; not null-handling.
- Why typecheck missed it: the tenant-wrapped client (ClientDashboardDbClient)
  does not enforce strict Prisma `select` typing.
- Fix applied: portalUser.select now uses `name` (ClientDashboardService.ts:135).
- Status: VERIFIED LIVE — 10 Jun 2026

### F-08 LOW — 500 responses leak raw Prisma error to the client
- Observed: GET /clients/:id/dashboard 500 returned the full Prisma query echo,
  model field list, and internal error message in the response body.
- Risk: information disclosure (DB model/schema internals to any caller).
- Confirmed location: the registered error handler is the inline app.use((err,...))
  at app.ts:115-142; line 138 returned err.message verbatim for 5xx.
- Note: middleware/global-error-handler.ts (globalErrorHandler) is DEAD CODE —
  defined but never registered. An initial fix there (f2db4aa) had no effect and
  was reverted.
- Fix: app.ts:138 now returns generic 'Internal Server Error' for 5xx; full error
  logged server-side via console.error. 4xx messages/codes unchanged.
- Status: VERIFIED LIVE — 10 Jun 2026 (forced 500 returns generic body, no Prisma leak)

### BUG-A LOW — Client list sort by status not implemented
- Sort by status field is not in the allowed sort fields list
- Currently unimplemented — returns unsorted list silently
- Fix scope: add status to allowed sort fields in controller + service
- Status: DEFERRED — feature gap, not a blocker
- Refs: GET /clients → client.controller.ts:21 → ClientService.listActive
  (orderBy hardcoded at ClientService.ts:426); route schema
  client.routes.ts:22-26 strips any sortBy param

## GROUP 3 — Matter Endpoints (10 Jun 2026)

### F-09 MEDIUM — PATCH /matters/:id returns 500
- File: MatterService.ts line 974-978
- Cause: update where clause missing tenantId — same pattern as F-06
- Fix: where: { id, tenantId } added — matches F-06 fix
- Status: VERIFIED LIVE — 10 Jun 2026 (PATCH /matters/:id now 200)

### F-10 LOW — Matter inline handlers leak raw error on 500
- File: matter.routes.ts — 14 inline catch blocks (154, 212, 227, 241, 255, 280,
  297, 353, 368, 385, 433, 567, 608, 657)
- Cause: `catch (e) { res.status(500).json({ error: String(e) }) }` responded
  directly, bypassing the global handler, leaking String(e) (raw/Prisma error)
- Fix: generic 'Internal Server Error' to client + server-side console.error
  (MATTER_ROUTE_ERROR); all 14 occurrences replaced
- Status: FIXED IN CODE — verified by typecheck (no live 500 trigger available)

### F-11 MEDIUM — Disbursement create gated by view-only permission
- File: matter.routes.ts line 160 (POST /:matterId/disbursements)
- Cause: create gated by matter.viewMatter (read) while approve/reject/mark-paid
  use matter.updateMatter — a view-only user could create financial DRNs
- Fix: gate POST disbursements with matter.updateMatter (Option A)
- Status: FIXED IN CODE — verified by typecheck (RBAC gate; no destructive live probe)

## FRONTEND — Web App (10 Jun 2026)

### BUG-B MEDIUM — New Matter form: client not preselected from client profile
- File: apps/web/src/app/(app)/app/matters/new/page.tsx
- Cause: page never read ?clientId= from the URL (no useSearchParams); form.clientId
  initialized to '' so the dropdown defaulted to empty even when navigated from a
  client profile (clients/[id]/page.tsx:357 links /app/matters/new?clientId=ID)
- Fix: import useSearchParams; const searchParams = useSearchParams();
  clientId: searchParams.get('clientId') ?? '' — presets the client dropdown
- Status: FIXED IN CODE — web typecheck 0 errors (frontend; visual confirmation pending)
