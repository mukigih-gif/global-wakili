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
- Status: OPEN

### F-07 MEDIUM — GET /clients/:id/dashboard returns 500
- File: ClientDashboardService.getInternalDashboard
- Candidate: schema drift or null-handling crash on client with no activity
- Fix: audit selected fields against live schema, add null guards
- Status: OPEN
