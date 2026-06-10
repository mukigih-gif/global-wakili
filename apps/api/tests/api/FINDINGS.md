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

## RBAC & AUTH SECURITY (10 Jun 2026)

### F-13 CRITICAL — RBAC permission system incomplete
- Tenants had only ADMIN/USER roles; no role→permission wiring for staff roles,
  so non-admin users could not be granted scoped access.
- Status: FIXED — 11 default roles created with correct permissions
  (seed-default-roles.ts); 7 role test users seeded; PlatformOnboardingService
  .provisionTenant now seeds roles for every future tenant. Verified live:
  7/7 role logins 200; CLERK denied gated client access (403). Fixed: 10 Jun 2026

### F-14 MEDIUM — HR module uses a separate, bypass-only permission system
- HR routes use requireHrPermission(HR_PERMISSIONS.*) (hr-permission.map.ts) with
  colon-format keys (hr:employee:view) that are NOT in the 267-row catalog.
- HR access is granted ONLY to MANAGING_PARTNER / SUPER_ADMIN / SYSTEM_ADMIN
  (isSuperUser bypass), or a JWT permissions array the token never emits.
- Consequence: a dedicated HR_MANAGER role cannot be granted HR access via
  Role↔Permission; HR_MANAGER currently has payroll/client/reporting only.
- Fix: connect HR RBAC to the catalog (DB-backed check like rbac.ts), or add
  hr:* permissions and emit them in the JWT.
- Status: OPEN — audit HR permissions in Gate 3

### F-15 MEDIUM — Password expiry not enforced
- User.passwordExpiresAt / passwordChangedAt / pcExpiryDate fields exist but are
  never checked at login (no references in auth.controller / middleware).
- Consequence: expired passwords still authenticate.
- Fix: enforce passwordExpiresAt at login; set it whenever a password is set.
- Status: OPEN — implement in auth bounded context

### F-16 MEDIUM — No password complexity policy
- Only adminPassword min(8) on firm registration; login password min(1).
- No upper/lower/digit/special requirement; no shared password validator.
- Fix: shared password-policy validator at all set-password points.
- Status: OPEN — implement password validator (attachment points limited by F-12)

### F-17 HIGH — No MFA (Multi-Factor Authentication) enforced
- No TOTP, SMS OTP, or email OTP enforced at login.
- Scaffolding exists but is unenforced: LoginSchema has optional mfaCode and the
  User model has mfaSecret — neither is validated in the login flow.
- Required for a legal platform handling confidential client data; Kenya Data
  Protection Act requires reasonable security measures.
- Fix: implement/enforce TOTP (Google Authenticator) as a minimum.
- Status: OPEN — required before go-live

### F-18 HIGH — No forgot-password / password-reset flow
- No POST /auth/forgot-password and no POST /auth/reset-password endpoints exist.
- Users are locked out permanently if a password is forgotten; the only recovery
  path is a direct DB update (not acceptable in production).
- Fix: forgot-password email flow with a time-limited reset token.
- Status: OPEN — required before go-live

### F-19 MEDIUM — Account lockout after failed attempts unverified
- failedLoginAttempts exists on User; auth.controller increments it on wrong
  password; a lockout check exists (isLocked / lockedUntil, ~line 567).
- NOT verified end-to-end: that lockout actually fires at a threshold and
  auto-unlocks after a timeout. If not enforced, brute force is possible.
- Fix: verify lockout fires at 5 attempts, auto-unlocks after 30 min.
- Status: OPEN — verify and complete implementation

### F-20 HIGH — No domain/SSO login for firm staff
- No SAML 2.0 or OpenID Connect for corporate domain login.
- Law firms using Microsoft 365 or Google Workspace cannot enforce domain-level
  authentication; staff must use separate Global Wakili credentials.
- OAuth Google/Microsoft exists (F-01 fixed) but only for individual OAuth —
  not domain-enforced SSO.
- Fix: implement SAML 2.0 or OIDC for domain login; allow a firm admin to
  configure their domain (e.g. @lawfirm.co.ke) so all @lawfirm.co.ke users
  authenticate through the firm's IdP.
- Status: OPEN — required before enterprise go-live

### F-05 LOW — Client portal endpoints not RBAC-gated (mitigated by self-scoping)
- File: client.routes.ts:74-84 — GET /clients/:id/portal/{dashboard,matters} have
  NO requirePermissions, unlike every other client route.
- Live probe (lowpriv = CLERK, zero client permissions), 10 Jun 2026:
    GET /api/v1/clients                       → 403  (denied: no client.viewClient) PASS
    GET /api/v1/clients/:id/portal/dashboard  → 404  (NOT 403: route is ungated;
      controller self-scopes portalUserId = req.user.sub → no record → 404, no leak) FAIL
    GET /api/v1/matters                       → 200  (CLERK has matter.view_matter) PASS
- Net: RBAC role scoping is correct (client denied, matter allowed). The portal
  routes lack an RBAC gate, but self-scoping prevents cross-client data exposure.
- Fix: add requirePermissions(client.viewPortal) to the two portal routes
  (defense-in-depth).
- Status: OPEN — portal routes still ungated (low severity; self-scoped, no data leak)

### F-21 INFO — Invite User: Option A (temp password) is interim only
- Current implementation uses an admin-set temporary password.
- Future implementation must use an email token invite flow:
  1. Admin enters name + email + role only (no password)
  2. System generates a time-limited secure token (expires 24h)
  3. Email sent to the new user with a set-password link
  4. User sets their own password on first login
  5. Token invalidated after use
- This is the correct flow for a production legal platform.
- Depends on: F-18 (password reset flow) + notification/email service wired (Gate 8).
- Status: DEFERRED — implement in Gate 8 alongside F-18; replace Option A with the
  token flow before firm go-live.
