# GLOBAL WAKILI LEGAL ENTERPRISE
## Enterprise UAT Certification Pack — Part 1 of 4
### Platform Administration · Tenant Administration · User Management · Role Management · Permissions · Branches · Clients · Contacts · Matters

**Classification:** Confidential — Internal QA Use Only  
**Version:** 1.0  
**Date:** June 2026  
**Prepared by:** Global Wakili QA Directorate  
**Status:** DRAFT — Pending Sign-Off

---

## DOCUMENT CONVENTIONS

| Risk Rating | Definition |
|---|---|
| CRITICAL | System-wide failure, data loss, security breach, regulatory violation |
| HIGH | Module failure, incorrect financial calculation, access control breach |
| MEDIUM | Feature degradation, UX failure, incorrect non-critical data |
| LOW | Cosmetic, minor UX, non-blocking defect |

| Test Category | Code |
|---|---|
| Smoke Test | SMK |
| Functional Test | FNC |
| Negative Test | NEG |
| Permission Test | PRM |
| Multi-Tenant Isolation | MTI |
| Audit Trail | AUD |
| Compliance | CMP |
| Performance | PRF |
| Integration | INT |
| Disaster Recovery | DRV |

---

# MODULE 1: PLATFORM ADMINISTRATION

## 1.1 Smoke Tests

### GW-PA-SMK-001
**Objective:** Verify platform API is live and responding  
**Preconditions:** Render deployment active; DATABASE_URL connected  
**Steps:**
1. Send GET request to `https://global-wakili-api.onrender.com/api/v1/health`
2. Record HTTP status code and response body
3. Check `success: true` in response

**Expected Result:** HTTP 200, `{ "success": true, "status": "ok" }`  
**Pass Criteria:** Response time < 3 seconds; status code 200  
**Risk Rating:** CRITICAL

---

### GW-PA-SMK-002
**Objective:** Verify platform super admin can authenticate  
**Preconditions:** Super admin account `superadmin@globalwakili.co.ke` exists  
**Steps:**
1. POST `/api/v1/auth/login` with `{ email, password }` (no tenantSlug)
2. Confirm HTTP 200 response
3. Confirm JWT token returned in `data.token`
4. Confirm `data.user.systemRole === "SUPER_ADMIN"`

**Expected Result:** Token returned, systemRole = SUPER_ADMIN  
**Pass Criteria:** Login succeeds in < 2 seconds with correct role  
**Risk Rating:** CRITICAL

---

### GW-PA-SMK-003
**Objective:** Verify platform admin dashboard loads  
**Preconditions:** Super admin logged in  
**Steps:**
1. Navigate to `/admin/dashboard`
2. Confirm page renders without errors
3. Confirm tenant count, revenue, incident count visible

**Expected Result:** Dashboard renders with platform KPIs  
**Pass Criteria:** Page loads in < 3 seconds, no console errors  
**Risk Rating:** HIGH

---

### GW-PA-SMK-004
**Objective:** Verify Neon PostgreSQL database connectivity  
**Preconditions:** `DATABASE_URL` set in Render environment  
**Steps:**
1. GET `/api/v1/platform/health`
2. Confirm `db: "UP"` in response
3. Run `SELECT 1` via Prisma health check

**Expected Result:** `db: "UP"` in health endpoint  
**Pass Criteria:** DB responds within 1 second  
**Risk Rating:** CRITICAL

---

## 1.2 Functional Tests

### GW-PA-FNC-001
**Objective:** Platform admin can view all tenants  
**Preconditions:** Super admin authenticated; 3+ tenants exist  
**Steps:**
1. GET `/api/v1/platform/tenants?limit=100`
2. Confirm response contains array of tenant objects
3. Confirm each tenant has: id, name, slug, status, plan, createdAt

**Expected Result:** All tenants returned with complete data  
**Pass Criteria:** All registered tenants appear; pagination works  
**Risk Rating:** HIGH

---

### GW-PA-FNC-002
**Objective:** Platform admin can view platform monitoring metrics  
**Preconditions:** Super admin authenticated  
**Steps:**
1. Navigate to `/admin/monitoring`
2. Confirm API status, DB status, Queue status, Uptime displayed
3. Click Refresh — verify metrics update

**Expected Result:** All health indicators display current status  
**Pass Criteria:** Real-time status shown; no stale data  
**Risk Rating:** HIGH

---

### GW-PA-FNC-003
**Objective:** Platform admin can view audit log  
**Preconditions:** Super admin authenticated; audit events exist  
**Steps:**
1. GET `/api/v1/audit?limit=100`
2. Confirm audit entries with action, entityType, tenantId, hash
3. Filter by action type
4. Confirm hash chain order is sequential

**Expected Result:** Paginated audit log with all required fields  
**Pass Criteria:** Entries ordered by sequenceNumber; hash chain intact  
**Risk Rating:** CRITICAL

---

### GW-PA-FNC-004
**Objective:** Platform admin can view incident log  
**Preconditions:** Super admin authenticated  
**Steps:**
1. Navigate to `/admin/incidents`
2. Confirm incidents list with severity, status, affected tenants
3. Create test incident via POST `/api/v1/platform/incidents`

**Expected Result:** Incident created and visible in list  
**Pass Criteria:** Incident persists; severity classification correct  
**Risk Rating:** MEDIUM

---

### GW-PA-FNC-005
**Objective:** Platform admin can manage subscriptions  
**Preconditions:** Super admin authenticated; tenant has subscription  
**Steps:**
1. GET `/api/v1/platform/subscriptions`
2. Confirm plan, status, amount, currentPeriodEnd for each tenant
3. Update subscription plan for Demo Law Firm

**Expected Result:** Subscription data accurate and updatable  
**Pass Criteria:** Plan change reflected immediately  
**Risk Rating:** HIGH

---

## 1.3 Negative Tests

### GW-PA-NEG-001
**Objective:** Non-super-admin cannot access platform endpoints  
**Preconditions:** Firm admin (FIRM_ADMIN) authenticated as tenant user  
**Steps:**
1. POST `/api/v1/auth/login` as `admin@yourlawfirm.co.ke`
2. GET `/api/v1/platform/tenants` with firm admin token
3. Record HTTP response code

**Expected Result:** HTTP 403 Forbidden — RBAC_PERMISSION_DENIED  
**Pass Criteria:** Platform endpoints reject firm-level tokens  
**Risk Rating:** CRITICAL

---

### GW-PA-NEG-002
**Objective:** Platform health endpoint not accessible without authentication  
**Preconditions:** No token in request  
**Steps:**
1. GET `/api/v1/platform/tenants` without Authorization header
2. Record response

**Expected Result:** HTTP 401 Unauthorized  
**Pass Criteria:** Unauthenticated access blocked  
**Risk Rating:** HIGH

---

### GW-PA-NEG-003
**Objective:** Invalid platform admin token rejected  
**Preconditions:** Expired or forged JWT  
**Steps:**
1. Construct JWT with wrong signature
2. Send GET `/api/v1/platform/tenants` with forged token
3. Record response

**Expected Result:** HTTP 401 Unauthorized — invalid signature  
**Pass Criteria:** JWT validation blocks forged tokens  
**Risk Rating:** CRITICAL

---

## 1.4 Permission Tests

### GW-PA-PRM-001
**Objective:** Only SUPER_ADMIN and SYSTEM_ADMIN can access platform control plane  
**Preconditions:** User accounts with roles: SUPER_ADMIN, FIRM_ADMIN, ASSOCIATE  
**Steps:**
1. Test GET `/api/v1/platform/tenants` with SUPER_ADMIN token → expect 200
2. Test same endpoint with FIRM_ADMIN token → expect 403
3. Test same endpoint with ASSOCIATE token → expect 403

**Expected Result:** Only SUPER_ADMIN receives 200  
**Pass Criteria:** All non-super-admin roles rejected  
**Risk Rating:** CRITICAL

---

### GW-PA-PRM-002
**Objective:** Platform admin cannot access tenant data without impersonation  
**Preconditions:** Super admin authenticated  
**Steps:**
1. GET `/api/v1/clients` with super admin token, without x-tenant-id header
2. Record response

**Expected Result:** 400 or 403 — tenant context required  
**Pass Criteria:** Cross-context access requires explicit tenant scoping  
**Risk Rating:** HIGH

---

## 1.5 Multi-Tenant Isolation Tests

### GW-PA-MTI-001
**Objective:** Tenant A data cannot be accessed via Tenant B context  
**Preconditions:** Two tenants: Demo Law Firm, Alpha Advocates  
**Steps:**
1. Authenticate as Demo Law Firm admin
2. Get a Demo Law Firm client ID (e.g. `cmpyop70k00062enbe0vfbpb8`)
3. Authenticate as Alpha Advocates admin
4. GET `/api/v1/clients/{demo_client_id}` with Alpha Advocates x-tenant-id
5. Record response

**Expected Result:** HTTP 404 or 403 — client not found in Tenant B  
**Pass Criteria:** Cross-tenant data access blocked at DB layer  
**Risk Rating:** CRITICAL

---

### GW-PA-MTI-002
**Objective:** URL manipulation cannot expose other tenant data  
**Preconditions:** Two active tenants with non-overlapping data  
**Steps:**
1. Authenticate as Tenant B
2. Enumerate known Tenant A matter IDs
3. Attempt GET `/api/v1/matters/{tenant_a_matter_id}` with Tenant B header
4. Record response

**Expected Result:** 404 — matter not found  
**Pass Criteria:** Tenant extension enforces WHERE tenantId = authenticated tenant on every query  
**Risk Rating:** CRITICAL

---

## 1.6 Audit Trail Tests

### GW-PA-AUD-001
**Objective:** Platform admin login creates audit entry  
**Preconditions:** Audit logging enabled; super admin account exists  
**Steps:**
1. Login as super admin
2. Query `SELECT * FROM "AuditLog" WHERE action = 'LOGIN' ORDER BY "createdAt" DESC LIMIT 1`
3. Confirm entry has: userId, tenantId, hash, previousHash, success=true

**Expected Result:** Login event recorded in AuditLog  
**Pass Criteria:** Entry exists; hash chain continuous; no missing fields  
**Risk Rating:** HIGH

---

### GW-PA-AUD-002
**Objective:** Audit hash chain cannot be tampered without detection  
**Preconditions:** 10+ audit log entries exist  
**Steps:**
1. Record hash of entry N and previousHash of entry N+1
2. Modify a field in entry N directly in DB
3. Recompute expected hash for entry N
4. Compare recomputed hash to stored hash of entry N+1's previousHash

**Expected Result:** Mismatch detected — hash chain broken  
**Pass Criteria:** Any tampering creates detectable chain break  
**Risk Rating:** CRITICAL

---

## 1.7 Compliance Tests

### GW-PA-CMP-001
**Objective:** Kenya Data Protection Act 2019 — data erasure request workflow  
**Preconditions:** Data erasure request form live at `/legal/data-erasure`  
**Steps:**
1. Navigate to `/legal/data-erasure`
2. Submit form with name, email, reason, data categories
3. Confirm acknowledgement message displayed
4. Confirm DPO email `dpo@globalwakili.co.ke` would receive notification

**Expected Result:** Erasure request logged; user receives confirmation  
**Pass Criteria:** Process aligns with KDPA s.26 — 3-day acknowledgement SLA  
**Risk Rating:** HIGH

---

### GW-PA-CMP-002
**Objective:** Cookie consent banner complies with GDPR Article 7 and KDPA  
**Preconditions:** New browser session (no stored consent)  
**Steps:**
1. Open application in incognito window
2. Confirm cookie consent banner appears
3. Click "Reject Non-Essential"
4. Refresh page — confirm banner does not reappear
5. Check localStorage for `gw_cookie_consent` key

**Expected Result:** Consent stored; non-essential cookies not set  
**Pass Criteria:** Consent mechanism lawful per GDPR Art.7; KDPA compliant  
**Risk Rating:** HIGH

---

## 1.8 Performance Tests

### GW-PA-PRF-001
**Objective:** Platform API responds under load  
**Preconditions:** Render deployment active  
**Steps:**
1. Send 50 concurrent GET `/api/v1/platform/tenants` requests
2. Record response times (p50, p95, p99)
3. Confirm no 5xx errors

**Expected Result:** p95 < 2 seconds; 0 errors  
**Pass Criteria:** Service maintains SLA under moderate load  
**Risk Rating:** HIGH

---

### GW-PA-PRF-002
**Objective:** Frontend dashboard loads within performance budget  
**Preconditions:** Vercel deployment active  
**Steps:**
1. Run Lighthouse audit on `/admin/dashboard`
2. Record Performance, LCP, CLS, FID scores

**Expected Result:** Performance score ≥ 70; LCP < 3s  
**Pass Criteria:** Meets Core Web Vitals thresholds  
**Risk Rating:** MEDIUM

---

## 1.9 Integration Tests

### GW-PA-INT-001
**Objective:** Render API ↔ Neon DB connection is stable  
**Preconditions:** Both services active  
**Steps:**
1. Trigger a write operation (create test tenant)
2. Immediately read back the created record
3. Delete test tenant
4. Verify deletion

**Expected Result:** Write, read, delete cycle completes successfully  
**Pass Criteria:** No connection errors; data persists correctly  
**Risk Rating:** CRITICAL

---

### GW-PA-INT-002
**Objective:** Vercel frontend ↔ Render API integration  
**Preconditions:** Both deployed  
**Steps:**
1. Login via Vercel frontend
2. Navigate to clients page
3. Confirm API call to `global-wakili-api.onrender.com` via Vercel rewrite proxy
4. Confirm no CORS errors

**Expected Result:** Frontend successfully proxies to API  
**Pass Criteria:** All API calls succeed through Vercel rewrite  
**Risk Rating:** HIGH

---

## 1.10 Disaster Recovery Tests

### GW-PA-DRV-001
**Objective:** System recovers from Render API restart  
**Preconditions:** Production API running  
**Steps:**
1. Note current API uptime
2. Trigger Render service restart
3. Monitor recovery time until first successful health check
4. Confirm all tenant sessions remain valid

**Expected Result:** API recovers within 60 seconds; JWT sessions valid  
**Pass Criteria:** Recovery time < 60s; no session invalidation  
**Risk Rating:** HIGH

---

### GW-PA-DRV-002
**Objective:** Neon DB connection pool recovers from interruption  
**Preconditions:** Active DB connections  
**Steps:**
1. Simulate DB connection drop (e.g., temporarily revoke credentials)
2. Restore credentials
3. Confirm API reconnects and health endpoint returns `db: UP`

**Expected Result:** API reconnects automatically using Prisma connection pool  
**Pass Criteria:** Recovery within 30 seconds; no data loss  
**Risk Rating:** CRITICAL

---

# MODULE 2: TENANT ADMINISTRATION

## 2.1 Smoke Tests

### GW-TA-SMK-001
**Objective:** Tenant can authenticate and receive tenant-scoped token  
**Preconditions:** Demo Law Firm tenant active; admin account exists  
**Steps:**
1. POST `/api/v1/auth/login` with `{ email, password, tenantSlug: "demo-law-firm" }`
2. Confirm HTTP 200
3. Confirm `data.user.tenantId === "cmpy9pg9u00002gom327d94va"`
4. Confirm `data.user.tenantRole === "FIRM_ADMIN"`

**Expected Result:** Tenant-scoped token returned with correct tenant context  
**Pass Criteria:** Token contains tenantId; role correctly set  
**Risk Rating:** CRITICAL

---

### GW-TA-SMK-002
**Objective:** Tenant admin dashboard loads with firm data  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Navigate to `/app/dashboard`
2. Confirm greeting with user's name
3. Confirm KPI cards load (Matters, Clients, Unpaid Invoices)

**Expected Result:** Dashboard renders with firm-specific data  
**Pass Criteria:** Page loads < 3s; KPIs show tenant data only  
**Risk Rating:** HIGH

---

## 2.2 Functional Tests

### GW-TA-FNC-001
**Objective:** Tenant admin can update firm profile  
**Preconditions:** Firm admin authenticated; firm settings page accessible  
**Steps:**
1. Navigate to `/app/settings/firm`
2. Update firm trading name, KRA PIN, VAT registration number
3. Click Save Changes
4. Refresh page
5. Confirm updated values persist

**Expected Result:** Firm profile saved and retrieved correctly  
**Pass Criteria:** All fields persist; KRA PIN format validated  
**Risk Rating:** HIGH

---

### GW-TA-FNC-002
**Objective:** Tenant admin can upload firm logo  
**Preconditions:** Firm settings page accessible  
**Steps:**
1. Navigate to `/app/settings/firm` → Firm Profile tab
2. Click Upload Logo
3. Select a PNG file (< 2MB)
4. Confirm preview updates
5. Save and confirm logo persists on refresh

**Expected Result:** Logo uploaded and displayed on invoices and portal  
**Pass Criteria:** Logo URL stored; appears on generated invoices  
**Risk Rating:** MEDIUM

---

### GW-TA-FNC-003
**Objective:** Tenant admin can configure invoice numbering  
**Preconditions:** Firm settings accessible  
**Steps:**
1. Navigate to Settings → Firm Settings → Invoice Settings tab
2. Set prefix to "INV", next number to 1001
3. Save settings
4. Create a new invoice
5. Confirm invoice number is "INV-1001"

**Expected Result:** Invoice generated with configured prefix and sequence  
**Pass Criteria:** Invoice numbering follows configured format exactly  
**Risk Rating:** HIGH

---

### GW-TA-FNC-004
**Objective:** Tenant admin can configure bank details for invoices  
**Preconditions:** Firm settings accessible  
**Steps:**
1. Navigate to Settings → Firm Settings → Bank Details tab
2. Enter: Bank Name, Branch, Account Name, Account Number, SWIFT, M-PESA Paybill
3. Save settings
4. Preview invoice — confirm bank details appear in footer

**Expected Result:** Bank details appear on generated invoices  
**Pass Criteria:** All 6 bank fields present on invoice PDF  
**Risk Rating:** HIGH

---

## 2.3 Negative Tests

### GW-TA-NEG-001
**Objective:** Invalid KRA PIN rejected during firm profile save  
**Preconditions:** Firm settings accessible  
**Steps:**
1. Navigate to Settings → Firm Profile
2. Enter KRA PIN as "P123" (invalid format)
3. Click Save
4. Confirm error message displayed

**Expected Result:** Save blocked with validation error: invalid KRA PIN format  
**Pass Criteria:** Regex `^[A-Z]\d{9}[A-Z]$` enforced; no save occurs  
**Risk Rating:** HIGH

---

### GW-TA-NEG-002
**Objective:** Tenant cannot modify another tenant's settings  
**Preconditions:** Two tenant admins authenticated separately  
**Steps:**
1. Tenant A admin authenticates
2. Attempt PATCH `/api/v1/tenant/settings` with Tenant B's tenantId in body
3. Record response

**Expected Result:** HTTP 403 — can only modify own tenant  
**Pass Criteria:** Tenant isolation prevents cross-tenant settings modification  
**Risk Rating:** CRITICAL

---

## 2.4 Permission Tests

### GW-TA-PRM-001
**Objective:** Only FIRM_ADMIN can access firm settings  
**Preconditions:** Users with roles: FIRM_ADMIN, PARTNER, ASSOCIATE, CLERK  
**Steps:**
1. Login as ASSOCIATE
2. Navigate to `/app/settings/firm`
3. Confirm page access is blocked or settings are read-only

**Expected Result:** Associates cannot modify firm-level settings  
**Pass Criteria:** Write operations blocked for non-admin roles  
**Risk Rating:** HIGH

---

## 2.5 Multi-Tenant Isolation Tests

### GW-TA-MTI-001
**Objective:** Tenant A settings do not bleed into Tenant B  
**Preconditions:** Both tenants have distinct settings  
**Steps:**
1. Set Tenant A invoice prefix to "ALPHA"
2. Login as Tenant B admin
3. Confirm Tenant B invoice prefix is independent of Tenant A's

**Expected Result:** Each tenant maintains isolated settings  
**Pass Criteria:** No setting values shared across tenants  
**Risk Rating:** CRITICAL

---

## 2.6 Audit Trail Tests

### GW-TA-AUD-001
**Objective:** Firm settings changes create audit entries  
**Preconditions:** Audit logging enabled  
**Steps:**
1. Update firm name
2. Query AuditLog: `WHERE action = 'TENANT_SETTINGS_UPDATED' ORDER BY createdAt DESC LIMIT 1`
3. Confirm entry includes: actorUserId, tenantId, beforeData, afterData

**Expected Result:** Audit entry captures before/after state of settings change  
**Pass Criteria:** Full change history available; actorUserId populated  
**Risk Rating:** HIGH

---

## 2.7 Compliance Tests

### GW-TA-CMP-001
**Objective:** Tenant subscription plan controls module access  
**Preconditions:** Tenant on STARTER plan (limited modules)  
**Steps:**
1. Login as STARTER plan tenant admin
2. Attempt to access AI Platform module (`/app/ai`)
3. Confirm access is restricted or feature is locked

**Expected Result:** AI Platform locked for STARTER plan  
**Pass Criteria:** Module entitlement enforcement working  
**Risk Rating:** MEDIUM

---

## 2.8 Performance Tests

### GW-TA-PRF-001
**Objective:** Tenant data loads within SLA during peak hours  
**Preconditions:** Tenant with 1000+ records (seeded or real)  
**Steps:**
1. Login and navigate to Clients list
2. Measure page load time with 500 clients
3. Record API response time for GET `/api/v1/clients?limit=50`

**Expected Result:** API response < 500ms; page loads < 2s  
**Pass Criteria:** Performance meets SLA with realistic data volume  
**Risk Rating:** HIGH

---

---

# MODULE 3: USER MANAGEMENT

## 3.1 Smoke Tests

### GW-UM-SMK-001
**Objective:** Firm admin can view firm user list  
**Preconditions:** Firm admin authenticated; 1+ users exist  
**Steps:**
1. Navigate to `/app/settings/users`
2. Confirm user list loads with name, email, role, status, last login

**Expected Result:** User list renders with all fields  
**Pass Criteria:** All firm users displayed; no users from other tenants  
**Risk Rating:** HIGH

---

### GW-UM-SMK-002
**Objective:** New user invitation endpoint is accessible  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Click "Invite User" button on `/app/settings/users`
2. Confirm invitation form renders
3. Enter email, role, name

**Expected Result:** Invitation form accessible and submittable  
**Pass Criteria:** Form renders; required fields validated  
**Risk Rating:** HIGH

---

## 3.2 Functional Tests

### GW-UM-FNC-001
**Objective:** New user can be created with correct role  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/users/invite` with `{ name, email, tenantRole: "ASSOCIATE" }`
2. Confirm HTTP 201
3. GET `/api/v1/users` — confirm new user in list
4. Confirm user status is PENDING_VERIFICATION or ACTIVE

**Expected Result:** User created with ASSOCIATE role  
**Pass Criteria:** User record created; role correctly assigned; email invite sent  
**Risk Rating:** HIGH

---

### GW-UM-FNC-002
**Objective:** User role can be updated  
**Preconditions:** Target user exists with ASSOCIATE role  
**Steps:**
1. PATCH `/api/v1/users/{userId}` with `{ tenantRole: "PARTNER" }`
2. Confirm HTTP 200
3. GET `/api/v1/users/{userId}` — confirm tenantRole = PARTNER
4. Login as user — confirm new role reflected in token

**Expected Result:** Role change persists and is reflected in subsequent login  
**Pass Criteria:** Role update immediate; no stale permission cache  
**Risk Rating:** HIGH

---

### GW-UM-FNC-003
**Objective:** User account can be deactivated  
**Preconditions:** Active user account exists  
**Steps:**
1. PATCH `/api/v1/users/{userId}` with `{ status: "INACTIVE" }`
2. Attempt login as deactivated user
3. Confirm login rejected

**Expected Result:** Deactivated user cannot login  
**Pass Criteria:** Status change blocks authentication; existing sessions invalidated  
**Risk Rating:** HIGH

---

### GW-UM-FNC-004
**Objective:** User password change works correctly  
**Preconditions:** User authenticated  
**Steps:**
1. POST `/api/v1/auth/change-password` with `{ currentPassword, newPassword }`
2. Confirm HTTP 200
3. Login with new password — confirm success
4. Login with old password — confirm failure

**Expected Result:** Password changed; old password rejected  
**Pass Criteria:** bcrypt hash updated; old password no longer valid  
**Risk Rating:** HIGH

---

## 3.3 Negative Tests

### GW-UM-NEG-001
**Objective:** Duplicate email addresses rejected  
**Preconditions:** User with `test@example.com` already exists  
**Steps:**
1. POST `/api/v1/users/invite` with `email: "test@example.com"`
2. Record response

**Expected Result:** HTTP 409 Conflict — email already in use  
**Pass Criteria:** Unique constraint enforced at API and DB level  
**Risk Rating:** HIGH

---

### GW-UM-NEG-002
**Objective:** Invalid email format rejected  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/users/invite` with `email: "notanemail"`
2. Record response

**Expected Result:** HTTP 400 — validation error on email field  
**Pass Criteria:** Zod validation rejects malformed email  
**Risk Rating:** MEDIUM

---

### GW-UM-NEG-003
**Objective:** Weak password rejected  
**Preconditions:** User changing password  
**Steps:**
1. POST `/api/v1/auth/change-password` with `newPassword: "123"`
2. Record response

**Expected Result:** HTTP 400 — password minimum length not met  
**Pass Criteria:** Password policy enforced (min 8 chars)  
**Risk Rating:** HIGH

---

## 3.4 Permission Tests

### GW-UM-PRM-001
**Objective:** Only FIRM_ADMIN can invite users  
**Preconditions:** Users with roles: FIRM_ADMIN, PARTNER, ASSOCIATE  
**Steps:**
1. Login as PARTNER
2. POST `/api/v1/users/invite` with new user data
3. Record response

**Expected Result:** HTTP 403 — insufficient permissions  
**Pass Criteria:** `admin.manage_users` permission required; PARTNER denied  
**Risk Rating:** HIGH

---

### GW-UM-PRM-002
**Objective:** Users can only view their own profile without elevated permission  
**Preconditions:** ASSOCIATE authenticated  
**Steps:**
1. GET `/api/v1/users/{another_user_id}` as ASSOCIATE
2. Record response

**Expected Result:** HTTP 403 or 404 — cannot access other users' profiles  
**Pass Criteria:** Profile access gated by permission  
**Risk Rating:** HIGH

---

## 3.5 Multi-Tenant Isolation Tests

### GW-UM-MTI-001
**Objective:** User list returns only users from authenticated tenant  
**Preconditions:** Two tenants with separate user accounts  
**Steps:**
1. Login as Demo Law Firm admin
2. GET `/api/v1/users`
3. Confirm zero users from Alpha Advocates in response

**Expected Result:** User list filtered to authenticated tenant only  
**Pass Criteria:** tenantId filter applied at DB query level  
**Risk Rating:** CRITICAL

---

### GW-UM-MTI-002
**Objective:** User in Tenant A cannot authenticate to Tenant B  
**Preconditions:** User belongs to Demo Law Firm only  
**Steps:**
1. POST `/api/v1/auth/login` with correct credentials but `tenantSlug: "alpha-advocates"`
2. Record response

**Expected Result:** HTTP 401 — user not found in that tenant  
**Pass Criteria:** buildLoginWhereFilter includes tenant context  
**Risk Rating:** CRITICAL

---

## 3.6 Audit Trail Tests

### GW-UM-AUD-001
**Objective:** User creation audited  
**Preconditions:** Audit logging enabled  
**Steps:**
1. Create new user
2. Query AuditLog: `WHERE action = 'USER_CREATED' ORDER BY createdAt DESC LIMIT 1`
3. Confirm: actorUserId (admin who created), entityId (new user ID), tenantId

**Expected Result:** Audit entry with creator and new user IDs  
**Pass Criteria:** Full audit trail for user lifecycle events  
**Risk Rating:** HIGH

---

### GW-UM-AUD-002
**Objective:** Failed login attempts audited  
**Preconditions:** Audit logging enabled  
**Steps:**
1. Attempt login with wrong password 3 times
2. Query AuditLog: `WHERE action = 'LOGIN_FAILED' AND entityId = {userId}`
3. Confirm: failureReason, ipAddress, userAgent captured

**Expected Result:** Each failed login creates audit entry  
**Pass Criteria:** Security events fully logged; IP captured  
**Risk Rating:** HIGH

---

## 3.7 Compliance Tests

### GW-UM-CMP-001
**Objective:** Password hashing meets security standard  
**Preconditions:** User created with known password  
**Steps:**
1. Create user with password "TestPassword123"
2. Query DB: `SELECT "passwordHash" FROM "User" WHERE email = {email}`
3. Confirm hash starts with `$2b$12$` (bcrypt, 12 rounds)

**Expected Result:** Password stored as bcrypt hash, never plaintext  
**Pass Criteria:** bcrypt with cost factor 12; plaintext never stored  
**Risk Rating:** CRITICAL

---

## 3.8 Performance Tests

### GW-UM-PRF-001
**Objective:** User list loads quickly for firms with 100+ staff  
**Preconditions:** Tenant with 100 users  
**Steps:**
1. GET `/api/v1/users?limit=100`
2. Record response time
3. Confirm < 500ms

**Expected Result:** User list retrieved in < 500ms  
**Pass Criteria:** Index on tenantId ensures fast retrieval  
**Risk Rating:** MEDIUM

---

---

# MODULE 4: ROLE MANAGEMENT

## 4.1 Smoke Tests

### GW-RM-SMK-001
**Objective:** Role list accessible to firm admin  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. GET `/api/v1/roles`
2. Confirm roles array contains at least ADMIN and USER roles
3. Confirm each role has: id, name, tenantId, isSystem

**Expected Result:** Role list returned with system and custom roles  
**Pass Criteria:** Response includes required fields  
**Risk Rating:** HIGH

---

## 4.2 Functional Tests

### GW-RM-FNC-001
**Objective:** Custom role can be created  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/roles` with `{ name: "Senior Associate", description: "..." }`
2. Confirm HTTP 201
3. GET `/api/v1/roles` — confirm new role in list

**Expected Result:** Custom role created and retrievable  
**Pass Criteria:** Role persists; can be assigned to users  
**Risk Rating:** HIGH

---

### GW-RM-FNC-002
**Objective:** Role can be assigned permissions  
**Preconditions:** Custom role exists; permissions seeded  
**Steps:**
1. PATCH `/api/v1/roles/{roleId}/permissions` with array of permission IDs
2. Confirm HTTP 200
3. GET `/api/v1/roles/{roleId}` — confirm permissions attached

**Expected Result:** Permissions linked to role  
**Pass Criteria:** Permission-role link created in implicit join table  
**Risk Rating:** HIGH

---

### GW-RM-FNC-003
**Objective:** User with role inherits role permissions  
**Preconditions:** Role with `matter.create_matter` permission; user assigned this role  
**Steps:**
1. Login as user with custom role
2. POST `/api/v1/matters` with valid matter data
3. Confirm HTTP 201 (permission granted)

**Expected Result:** User can create matter due to role permission  
**Pass Criteria:** Permission inheritance works correctly through role chain  
**Risk Rating:** HIGH

---

## 4.3 Negative Tests

### GW-RM-NEG-001
**Objective:** System roles cannot be deleted  
**Preconditions:** System role ADMIN exists  
**Steps:**
1. DELETE `/api/v1/roles/{system_role_id}`
2. Record response

**Expected Result:** HTTP 403 or 409 — cannot delete system role  
**Pass Criteria:** `isSystem: true` roles protected from deletion  
**Risk Rating:** HIGH

---

### GW-RM-NEG-002
**Objective:** Duplicate role names rejected within same tenant  
**Preconditions:** Role "Senior Associate" already exists  
**Steps:**
1. POST `/api/v1/roles` with `{ name: "Senior Associate" }`
2. Record response

**Expected Result:** HTTP 409 Conflict  
**Pass Criteria:** Unique constraint on (tenantId, name)  
**Risk Rating:** MEDIUM

---

## 4.4 Permission Tests

### GW-RM-PRM-001
**Objective:** Only FIRM_ADMIN can manage roles  
**Preconditions:** PARTNER authenticated  
**Steps:**
1. Login as PARTNER
2. POST `/api/v1/roles` with new role data
3. Record response

**Expected Result:** HTTP 403 — `admin.manage_roles` permission required  
**Pass Criteria:** Role management restricted to firm admin  
**Risk Rating:** HIGH

---

## 4.5 Multi-Tenant Isolation Tests

### GW-RM-MTI-001
**Objective:** Roles from one tenant not visible to another  
**Preconditions:** Tenant A has custom role "Litigation Lead"  
**Steps:**
1. Login as Tenant B admin
2. GET `/api/v1/roles`
3. Confirm "Litigation Lead" not in Tenant B's role list

**Expected Result:** Role list filtered by tenantId  
**Pass Criteria:** No cross-tenant role leakage  
**Risk Rating:** CRITICAL

---

## 4.6 Audit Trail Tests

### GW-RM-AUD-001
**Objective:** Role permission changes create audit entry  
**Preconditions:** Audit logging active  
**Steps:**
1. Add permission to role
2. Query AuditLog: `WHERE action = 'ROLE_PERMISSION_UPDATED'`
3. Confirm actorUserId, roleId, permissionIds captured

**Expected Result:** Role modification fully audited  
**Pass Criteria:** Before/after permission sets recorded  
**Risk Rating:** HIGH

---

---

# MODULE 5: PERMISSIONS

## 5.1 Smoke Tests

### GW-PM-SMK-001
**Objective:** All 264 permissions seeded for tenant  
**Preconditions:** `seed-permissions.ts` run for Demo Law Firm  
**Steps:**
1. GET `/api/v1/permissions` (or query DB directly)
2. Count permissions where `tenantId = "cmpy9pg9u00002gom327d94va"`
3. Confirm count ≥ 264

**Expected Result:** All permissions available for assignment  
**Pass Criteria:** 264+ permissions seeded with correct resource/action pairs  
**Risk Rating:** HIGH

---

## 5.2 Functional Tests

### GW-PM-FNC-001
**Objective:** RBAC blocks endpoints when permission missing  
**Preconditions:** User with role that lacks `client.create_client` permission  
**Steps:**
1. Login as user without `client.create_client`
2. POST `/api/v1/clients` with valid client data
3. Record response

**Expected Result:** HTTP 403 — RBAC_PERMISSION_DENIED with `missingPermissions: ["client.create_client"]`  
**Pass Criteria:** Missing permission correctly identified in error response  
**Risk Rating:** CRITICAL

---

### GW-PM-FNC-002
**Objective:** Permission granted at user level overrides role-level denial  
**Preconditions:** User with role lacking `trust.transfer_to_office`; user granted this permission directly  
**Steps:**
1. Grant `trust.transfer_to_office` directly to user
2. Attempt trust transfer operation
3. Confirm HTTP 200

**Expected Result:** User-level permission override works  
**Pass Criteria:** User.permissions checked alongside Role.permissions  
**Risk Rating:** HIGH

---

## 5.3 Negative Tests

### GW-PM-NEG-001
**Objective:** Undefined permission strings rejected  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Attempt PATCH role with `permissionKey: "nonexistent.fake_permission"`
2. Record response

**Expected Result:** HTTP 400 — permission not found  
**Pass Criteria:** Permission must exist in Permission table for tenant  
**Risk Rating:** MEDIUM

---

## 5.4 Permission Tests

### GW-PM-PRM-001
**Objective:** Only admin can view and manage permissions  
**Preconditions:** ASSOCIATE authenticated  
**Steps:**
1. GET `/api/v1/permissions` as ASSOCIATE
2. Record response

**Expected Result:** HTTP 403 — `admin.manage_permissions` required  
**Pass Criteria:** Permission management endpoints protected  
**Risk Rating:** HIGH

---

## 5.5 Multi-Tenant Isolation Tests

### GW-PM-MTI-001
**Objective:** Permissions are tenant-scoped  
**Preconditions:** Permissions seeded for Tenant A only  
**Steps:**
1. Login as Tenant B admin
2. GET `/api/v1/permissions`
3. Confirm only Tenant B's permissions returned

**Expected Result:** No cross-tenant permission leakage  
**Pass Criteria:** Each tenant has independent permission set  
**Risk Rating:** CRITICAL

---

---

# MODULE 6: BRANCHES

## 6.1 Smoke Tests

### GW-BR-SMK-001
**Objective:** Branch list accessible  
**Preconditions:** Firm admin authenticated; at least one branch (Main Office) exists  
**Steps:**
1. GET `/api/v1/branches`
2. Confirm HTTP 200
3. Confirm at least one branch with: id, name, code, isMainBranch, status

**Expected Result:** Branch list returned  
**Pass Criteria:** Main branch visible; response correct  
**Risk Rating:** MEDIUM

---

## 6.2 Functional Tests

### GW-BR-FNC-001
**Objective:** New branch can be created  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/branches` with `{ name: "Mombasa Office", code: "MBS", city: "Mombasa", country: "Kenya", isMainBranch: false }`
2. Confirm HTTP 201
3. GET `/api/v1/branches` — confirm new branch in list

**Expected Result:** Branch created and retrievable  
**Pass Criteria:** Branch persists; code unique within tenant  
**Risk Rating:** MEDIUM

---

### GW-BR-FNC-002
**Objective:** Matters can be linked to specific branch  
**Preconditions:** Two branches exist  
**Steps:**
1. Create matter with `branchId` = Mombasa Office ID
2. GET `/api/v1/matters/{matterId}`
3. Confirm `branchId` matches Mombasa Office

**Expected Result:** Matter correctly linked to branch  
**Pass Criteria:** Branch association persists and retrieves correctly  
**Risk Rating:** MEDIUM

---

## 6.3 Negative Tests

### GW-BR-NEG-001
**Objective:** Duplicate branch code rejected  
**Preconditions:** Branch with code "MAIN" already exists  
**Steps:**
1. POST `/api/v1/branches` with `code: "MAIN"`
2. Record response

**Expected Result:** HTTP 409 — duplicate branch code  
**Pass Criteria:** Unique constraint on (tenantId, code)  
**Risk Rating:** MEDIUM

---

---

# MODULE 7: CLIENTS

## 7.1 Smoke Tests

### GW-CL-SMK-001
**Objective:** Client list loads successfully  
**Preconditions:** Firm admin authenticated; clients seeded  
**Steps:**
1. GET `/api/v1/clients?limit=20`
2. Confirm HTTP 200
3. Confirm response has `data` array and `pagination` object

**Expected Result:** Client list with pagination metadata  
**Pass Criteria:** All seeded clients visible; pagination works  
**Risk Rating:** HIGH

---

### GW-CL-SMK-002
**Objective:** New client form submits successfully  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/clients` with minimum required fields: name, type, nationalId, kraPin
2. Confirm HTTP 201
3. Confirm client ID returned

**Expected Result:** Client created with 201 response  
**Pass Criteria:** Client persists with correct tenant isolation  
**Risk Rating:** HIGH

---

## 7.2 Functional Tests

### GW-CL-FNC-001
**Objective:** Client created with all required fields  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/clients` with: `{ name: "ABC Holdings Ltd", type: "CORPORATE", email: "legal@abc.co.ke", phoneNumber: "+254711000001", registrationNumber: "CPR/2019/001234", kraPin: "P052312345J", nationalId: null, city: "Nairobi", country: "Kenya" }`
2. Confirm HTTP 201
3. GET `/api/v1/clients/{clientId}` — confirm all fields returned

**Expected Result:** Client created with all fields persisted  
**Pass Criteria:** All submitted fields retrievable; tenantId auto-set  
**Risk Rating:** HIGH

---

### GW-CL-FNC-002
**Objective:** Client KRA PIN validation works  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. Submit client with `kraPin: "P052312345J"` (valid) → expect 201
2. Submit client with `kraPin: "P123"` (invalid) → expect 400
3. Confirm error: "Invalid KRA PIN format"

**Expected Result:** Valid PIN accepted; invalid PIN rejected with specific error  
**Pass Criteria:** Regex `^[A-Z]\d{9}[A-Z]$` enforced  
**Risk Rating:** HIGH

---

### GW-CL-FNC-003
**Objective:** Client portal activation works  
**Preconditions:** Client with valid email address exists  
**Steps:**
1. POST `/api/v1/clients/{clientId}/portal/activate`
2. Confirm HTTP 200
3. Confirm portal invitation email dispatched
4. Confirm client has `portalUserId` set in DB

**Expected Result:** Portal user created; invitation sent to client email  
**Pass Criteria:** Portal activation creates linked User record; email dispatched  
**Risk Rating:** HIGH

---

### GW-CL-FNC-004
**Objective:** Client matters displayed on client detail page  
**Preconditions:** Client has 3 associated matters  
**Steps:**
1. GET `/api/v1/matters?clientId={clientId}&limit=20`
2. Confirm HTTP 200
3. Confirm all 3 matters returned

**Expected Result:** All client matters retrievable via client ID filter  
**Pass Criteria:** Matters correctly linked and retrievable  
**Risk Rating:** HIGH

---

### GW-CL-FNC-005
**Objective:** Client KYC status can be updated  
**Preconditions:** Client with KYC status PENDING  
**Steps:**
1. PATCH `/api/v1/clients/{clientId}/kyc` with `{ status: "BASIC_VERIFIED" }`
2. Confirm HTTP 200
3. GET client — confirm kycStatus = BASIC_VERIFIED

**Expected Result:** KYC status updated  
**Pass Criteria:** KYC status change audited; valid transitions enforced  
**Risk Rating:** HIGH

---

### GW-CL-FNC-006
**Objective:** Client conflict check executes correctly  
**Preconditions:** Existing client "ABC Holdings Ltd" in system  
**Steps:**
1. POST `/api/v1/clients/conflict-check` with `{ name: "ABC Holdings Ltd" }`
2. Confirm HTTP 200
3. Confirm `hasConflict: true` in response

**Expected Result:** Conflict detected for matching name  
**Pass Criteria:** Conflict check returns matching clients/matters  
**Risk Rating:** HIGH

---

### GW-CL-FNC-007
**Objective:** Client invoices visible from client profile  
**Preconditions:** Client has 2 associated invoices  
**Steps:**
1. GET `/api/v1/billing/invoices?clientId={clientId}`
2. Confirm all client invoices returned
3. Confirm total outstanding calculated correctly

**Expected Result:** All client billing history accessible  
**Pass Criteria:** Invoice totals, status, and dates correct  
**Risk Rating:** HIGH

---

## 7.3 Negative Tests

### GW-CL-NEG-001
**Objective:** Client creation fails without mandatory fields  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/clients` with only `{ name: "Test" }` (missing type, kraPin, nationalId)
2. Record response

**Expected Result:** HTTP 400 — validation errors listing missing fields  
**Pass Criteria:** Zod validation enforces required fields  
**Risk Rating:** HIGH

---

### GW-CL-NEG-002
**Objective:** Duplicate KRA PIN per tenant rejected  
**Preconditions:** Client with kraPin "P052312345J" exists  
**Steps:**
1. POST `/api/v1/clients` with same kraPin for different client name
2. Record response

**Expected Result:** HTTP 409 or 400 — duplicate KRA PIN  
**Pass Criteria:** Unique constraint on (tenantId, kraPin)  
**Risk Rating:** HIGH

---

### GW-CL-NEG-003
**Objective:** Accessing non-existent client returns 404  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. GET `/api/v1/clients/nonexistentid123`
2. Record response

**Expected Result:** HTTP 404 — client not found  
**Pass Criteria:** Clear 404 with informative error message  
**Risk Rating:** MEDIUM

---

## 7.4 Permission Tests

### GW-CL-PRM-001
**Objective:** CLIENT role can only view own data in portal  
**Preconditions:** Client portal user authenticated  
**Steps:**
1. Login as portal client user
2. GET `/api/v1/clients/{another_client_id}` 
3. Record response

**Expected Result:** HTTP 403 — portal users can only see their own data  
**Pass Criteria:** Portal isolation enforced  
**Risk Rating:** CRITICAL

---

### GW-CL-PRM-002
**Objective:** CLERK cannot delete clients  
**Preconditions:** CLERK role authenticated  
**Steps:**
1. DELETE `/api/v1/clients/{clientId}` as CLERK
2. Record response

**Expected Result:** HTTP 403 — `client.delete` permission not held by CLERK  
**Pass Criteria:** Destructive operations gated by role  
**Risk Rating:** HIGH

---

## 7.5 Multi-Tenant Isolation Tests

### GW-CL-MTI-001
**Objective:** Client created in Tenant A not visible in Tenant B  
**Preconditions:** Client "ABC Holdings" in Demo Law Firm  
**Steps:**
1. Login as Alpha Advocates admin
2. GET `/api/v1/clients?search=ABC+Holdings`
3. Confirm zero results

**Expected Result:** Client not found across tenant boundary  
**Pass Criteria:** Search results scoped to authenticated tenant  
**Risk Rating:** CRITICAL

---

### GW-CL-MTI-002
**Objective:** Direct client ID lookup fails across tenants  
**Preconditions:** Known client ID from Demo Law Firm  
**Steps:**
1. Login as Alpha Advocates
2. GET `/api/v1/clients/{demo_law_firm_client_id}`
3. Record response

**Expected Result:** HTTP 404 — client not found (tenant mismatch)  
**Pass Criteria:** Prisma WHERE clause includes tenantId condition  
**Risk Rating:** CRITICAL

---

## 7.6 Audit Trail Tests

### GW-CL-AUD-001
**Objective:** Client creation audited with full context  
**Preconditions:** Audit logging active  
**Steps:**
1. Create client via API
2. Query AuditLog: `WHERE action = 'CLIENT_CREATED' ORDER BY createdAt DESC LIMIT 1`
3. Confirm: actorUserId, tenantId, entityId (client), afterData (client data)

**Expected Result:** Complete audit entry for client creation  
**Pass Criteria:** All required fields present; hash chain continuous  
**Risk Rating:** HIGH

---

### GW-CL-AUD-002
**Objective:** KYC status change audited  
**Preconditions:** Client with PENDING KYC  
**Steps:**
1. Update KYC status to BASIC_VERIFIED
2. Query AuditLog: `WHERE action = 'KYC_STATUS_UPDATED'`
3. Confirm: beforeData.kycStatus = PENDING, afterData.kycStatus = BASIC_VERIFIED

**Expected Result:** KYC change recorded with before/after states  
**Pass Criteria:** Compliance audit trail for KYC transitions  
**Risk Rating:** HIGH

---

## 7.7 Compliance Tests

### GW-CL-CMP-001
**Objective:** PEP screening result recorded  
**Preconditions:** Client flagged for PEP check  
**Steps:**
1. POST `/api/v1/clients/{clientId}/compliance/pep-check`
2. Confirm HTTP 200
3. Confirm `pepStatus` updated on client record
4. Confirm compliance check record created

**Expected Result:** PEP screening persisted with result and timestamp  
**Pass Criteria:** AML/PEP compliance workflow functional  
**Risk Rating:** HIGH

---

### GW-CL-CMP-002
**Objective:** Sanctions screening result recorded  
**Preconditions:** Client exists  
**Steps:**
1. POST `/api/v1/clients/{clientId}/compliance/sanctions-check`
2. Confirm HTTP 200
3. Confirm `sanctionsStatus` updated

**Expected Result:** Sanctions check result persisted  
**Pass Criteria:** FATF compliance requirements met  
**Risk Rating:** HIGH

---

## 7.8 Performance Tests

### GW-CL-PRF-001
**Objective:** Client search returns results quickly  
**Preconditions:** 500+ clients in tenant  
**Steps:**
1. GET `/api/v1/clients?search=Kariuki&limit=20`
2. Record response time

**Expected Result:** Search results in < 300ms  
**Pass Criteria:** Index on (tenantId, name) ensures fast text search  
**Risk Rating:** MEDIUM

---

## 7.9 Integration Tests

### GW-CL-INT-001
**Objective:** Client linked to matter correctly  
**Preconditions:** Client and Matter both exist  
**Steps:**
1. Create matter with `clientId` = existing client
2. GET `/api/v1/matters/{matterId}` — confirm client nested in response
3. GET `/api/v1/clients/{clientId}` — confirm `_count.matters > 0`

**Expected Result:** Bidirectional client-matter relationship works  
**Pass Criteria:** Prisma relations correctly traversed  
**Risk Rating:** HIGH

---

---

# MODULE 8: CONTACTS

## 8.1 Smoke Tests

### GW-CT-SMK-001
**Objective:** Client contacts accessible  
**Preconditions:** Client with 1+ contacts exists  
**Steps:**
1. GET `/api/v1/clients/{clientId}/contacts`
2. Confirm HTTP 200
3. Confirm contacts array returned

**Expected Result:** Contact list for client returned  
**Pass Criteria:** Contacts correctly linked to client  
**Risk Rating:** MEDIUM

---

## 8.2 Functional Tests

### GW-CT-FNC-001
**Objective:** Contact can be added to client  
**Preconditions:** Client exists; firm admin authenticated  
**Steps:**
1. POST `/api/v1/clients/{clientId}/contacts` with `{ name, email, phone, designation: "Company Secretary" }`
2. Confirm HTTP 201
3. GET contacts for client — confirm new contact visible

**Expected Result:** Contact created and linked to client  
**Pass Criteria:** Contact persists; designation field supported  
**Risk Rating:** MEDIUM

---

### GW-CT-FNC-002
**Objective:** Primary contact can be designated  
**Preconditions:** Client has multiple contacts  
**Steps:**
1. PATCH `/api/v1/clients/{clientId}/contacts/{contactId}` with `{ isPrimary: true }`
2. Confirm old primary contact no longer marked as primary

**Expected Result:** Only one primary contact per client  
**Pass Criteria:** Business rule enforced — one primary contact  
**Risk Rating:** MEDIUM

---

## 8.3 Multi-Tenant Isolation Tests

### GW-CT-MTI-001
**Objective:** Contacts not accessible across tenants  
**Preconditions:** Tenant A client has contacts  
**Steps:**
1. Login as Tenant B
2. GET `/api/v1/clients/{tenant_a_client_id}/contacts`
3. Record response

**Expected Result:** HTTP 404 or empty array — client not found in tenant context  
**Pass Criteria:** Contact access gated by client's tenantId  
**Risk Rating:** CRITICAL

---

---

# MODULE 9: MATTERS

## 9.1 Smoke Tests

### GW-MT-SMK-001
**Objective:** Matter list loads with all seeded matters  
**Preconditions:** Firm admin authenticated; 4+ matters seeded  
**Steps:**
1. GET `/api/v1/matters?limit=20`
2. Confirm HTTP 200
3. Confirm `data` array contains 4+ matters
4. Confirm each matter has: id, title, status, category, clientId, leadAdvocateId, branchId

**Expected Result:** All seeded matters returned  
**Pass Criteria:** Seeded matters visible; required fields present  
**Risk Rating:** HIGH

---

### GW-MT-SMK-002
**Objective:** Matter detail page accessible  
**Preconditions:** Matter ID known  
**Steps:**
1. GET `/api/v1/matters/{matterId}`
2. Confirm HTTP 200
3. Confirm response includes: title, status, client, leadAdvocate, category, matterCode/reference

**Expected Result:** Full matter detail returned  
**Pass Criteria:** All matter fields populated; no 500 errors  
**Risk Rating:** HIGH

---

## 9.2 Functional Tests

### GW-MT-FNC-001
**Objective:** New matter created with all mandatory fields  
**Preconditions:** Firm admin authenticated; client and branch exist  
**Steps:**
1. POST `/api/v1/matters` with: `{ title, category: "CIVIL", clientId, branchId, leadAdvocateId, riskLevel: "LOW" }`
2. Confirm HTTP 201
3. GET matter by ID — confirm matterCode auto-generated

**Expected Result:** Matter created with auto-generated reference code  
**Pass Criteria:** matterCode = configured prefix + sequential number  
**Risk Rating:** HIGH

---

### GW-MT-FNC-002
**Objective:** Matter originator correctly recorded  
**Preconditions:** Matter created with originatorId  
**Steps:**
1. Create matter with `leadAdvocateId` = Lawyer A and originator = Managing Partner
2. GET `/api/v1/matters/{matterId}`
3. Confirm `leadAdvocate.name` and `originator.advocate.name` both present

**Expected Result:** Both advocate roles recorded  
**Pass Criteria:** Matter shows both lead advocate AND originator  
**Risk Rating:** HIGH

---

### GW-MT-FNC-003
**Objective:** Matter commission rate recorded correctly  
**Preconditions:** Matter created with commissionRate  
**Steps:**
1. POST `/api/v1/matters` with `commissionRate: 10` (10%)
2. GET matter — confirm commissionRate = 10
3. Confirm commission payout calculation on collection

**Expected Result:** Commission rate persists; payout calculable  
**Pass Criteria:** commissionRate stored as decimal percentage  
**Risk Rating:** HIGH

---

### GW-MT-FNC-004
**Objective:** Matter conflict check executes correctly  
**Preconditions:** Matter for client "ABC Holdings" already exists  
**Steps:**
1. POST `/api/v1/matters/conflict-check` with `{ clientId, title: "Employment Dispute" }`
2. Confirm HTTP 200
3. Confirm `hasConflict: true` with conflict details

**Expected Result:** Conflict detected and returned with details  
**Pass Criteria:** Conflict check screens clients and matters  
**Risk Rating:** HIGH

---

### GW-MT-FNC-005
**Objective:** Matter status workflow transitions correctly  
**Preconditions:** Matter in ACTIVE status  
**Steps:**
1. PATCH `/api/v1/matters/{matterId}` with `{ status: "ON_HOLD" }` — confirm 200
2. PATCH with `{ status: "ACTIVE" }` — confirm 200
3. PATCH with `{ status: "CLOSED", closedDate: "2026-06-05" }` — confirm 200
4. PATCH with `{ status: "ACTIVE" }` on CLOSED matter — confirm 400 or business rule error

**Expected Result:** Valid transitions succeed; reopening closed matter requires auth  
**Pass Criteria:** Status machine enforced  
**Risk Rating:** HIGH

---

### GW-MT-FNC-006
**Objective:** Matter WIP value updated as time entries approved  
**Preconditions:** Matter with approved time entries  
**Steps:**
1. GET `/api/v1/matters/{matterId}` — record initial wipValue
2. Create and approve time entry for 2 hours at KES 15,000/hr
3. GET matter — confirm wipValue increased by KES 30,000

**Expected Result:** WIP updates automatically from approved time entries  
**Pass Criteria:** wipValue accurately reflects unbilled approved time  
**Risk Rating:** HIGH

---

### GW-MT-FNC-007
**Objective:** Matter tasks visible from matter detail  
**Preconditions:** Matter has 5 tasks (seeded)  
**Steps:**
1. GET `/api/v1/tasks/search?matterId={matterId}`
2. Confirm HTTP 200
3. Confirm all 5 tasks returned with status, priority, assignee

**Expected Result:** All matter tasks retrievable via matterId filter  
**Pass Criteria:** Tasks correctly linked to matter  
**Risk Rating:** HIGH

---

### GW-MT-FNC-008
**Objective:** Matter disbursement request created  
**Preconditions:** Matter exists; user has disbursement permission  
**Steps:**
1. POST `/api/v1/matters/{matterId}/disbursements` with: `{ disbursementType: "COURT_FEES", description, amount: 5000, currency: "KES", requestNote: "Mandatory filing fee", requestedBy }`
2. Confirm HTTP 201
3. GET disbursements for matter — confirm entry visible
4. Confirm status = PENDING

**Expected Result:** DRN created and pending approval  
**Pass Criteria:** Disbursement workflow initiated; audit trail created  
**Risk Rating:** HIGH

---

## 9.3 Negative Tests

### GW-MT-NEG-001
**Objective:** Matter creation without estimated value fails or warns  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/matters` without `estimatedValue` field
2. Record response

**Expected Result:** Validation warning or block if estimatedValue configured as mandatory  
**Pass Criteria:** Business rule enforced consistently  
**Risk Rating:** HIGH

---

### GW-MT-NEG-002
**Objective:** Matter creation without clientId fails  
**Preconditions:** Firm admin authenticated  
**Steps:**
1. POST `/api/v1/matters` without `clientId` field
2. Record response

**Expected Result:** HTTP 400 — clientId required  
**Pass Criteria:** Zod validation enforces required fields  
**Risk Rating:** HIGH

---

### GW-MT-NEG-003
**Objective:** Past date cannot be set as opened date if future dates prohibited  
**Preconditions:** Matter form with `openedDate` field  
**Steps:**
1. Submit matter form with `openedDate: "2030-01-01"` (future date)
2. Record validation response

**Expected Result:** Future opened dates rejected  
**Pass Criteria:** `max={today}` enforced on opened date field  
**Risk Rating:** MEDIUM

---

## 9.4 Permission Tests

### GW-MT-PRM-001
**Objective:** PUPIL can view but not close matters  
**Preconditions:** PUPIL role authenticated  
**Steps:**
1. GET `/api/v1/matters` as PUPIL — confirm 200
2. PATCH `/api/v1/matters/{matterId}` with `{ status: "CLOSED" }` — expect 403

**Expected Result:** Read permitted; closure requires senior permission  
**Pass Criteria:** Matter status change gated by `matter.update_matter`  
**Risk Rating:** HIGH

---

### GW-MT-PRM-002
**Objective:** Assignment restricted to managing partner or partner  
**Preconditions:** ASSOCIATE authenticated  
**Steps:**
1. PATCH `/api/v1/matters/{matterId}` with `{ leadAdvocateId: "some_other_user_id" }`
2. Record response

**Expected Result:** HTTP 403 — only originators/partners can reassign  
**Pass Criteria:** Assignment permission enforced  
**Risk Rating:** HIGH

---

## 9.5 Multi-Tenant Isolation Tests

### GW-MT-MTI-001
**Objective:** Matters not accessible across tenants  
**Preconditions:** Matter exists in Tenant A  
**Steps:**
1. Login as Tenant B
2. GET `/api/v1/matters/{tenant_a_matter_id}`
3. Record response

**Expected Result:** HTTP 404 — matter not found in Tenant B context  
**Pass Criteria:** Prisma WHERE includes tenantId  
**Risk Rating:** CRITICAL

---

## 9.6 Audit Trail Tests

### GW-MT-AUD-001
**Objective:** Matter creation fully audited  
**Preconditions:** Audit logging active  
**Steps:**
1. Create matter
2. Query AuditLog: `WHERE action = 'MATTER_CREATED'`
3. Confirm: actorUserId, tenantId, matterId, clientId, category

**Expected Result:** Full audit entry for matter creation  
**Pass Criteria:** All required fields in audit entry  
**Risk Rating:** HIGH

---

### GW-MT-AUD-002
**Objective:** Matter closure audited with closing date  
**Preconditions:** Active matter exists  
**Steps:**
1. Close matter with POST/PATCH
2. Query AuditLog: `WHERE action = 'MATTER_CLOSED'`
3. Confirm: closedDate, actorUserId recorded

**Expected Result:** Closure event audited  
**Pass Criteria:** Closure reason and date captured  
**Risk Rating:** HIGH

---

## 9.7 Compliance Tests

### GW-MT-CMP-001
**Objective:** Conflict check mandatory before new matter creation  
**Preconditions:** Conflict check UI present on New Matter form  
**Steps:**
1. Open New Matter form
2. Select client
3. Attempt to submit without running conflict check
4. Confirm UI warns or blocks

**Expected Result:** Conflict check required before matter opens  
**Pass Criteria:** Conflict check step enforced in 3-step matter intake  
**Risk Rating:** HIGH

---

## 9.8 Performance Tests

### GW-MT-PRF-001
**Objective:** Matter list loads quickly with 100+ matters  
**Preconditions:** 100 matters in tenant (production simulation)  
**Steps:**
1. GET `/api/v1/matters?limit=50`
2. Record response time

**Expected Result:** Response < 500ms  
**Pass Criteria:** Index on (tenantId, status, createdAt) ensures performance  
**Risk Rating:** MEDIUM

---

## 9.9 Integration Tests

### GW-MT-INT-001
**Objective:** Matter linked entities all accessible  
**Preconditions:** Matter with tasks, time entries, invoices, documents  
**Steps:**
1. GET matter with include=tasks,timeEntries,invoices
2. Confirm all related entities returned
3. Confirm client nested in response

**Expected Result:** Full matter context retrievable in single request  
**Pass Criteria:** Prisma include/select correctly traverses relations  
**Risk Rating:** HIGH

---

## 9.10 Disaster Recovery Tests

### GW-MT-DRV-001
**Objective:** Matter data survives API restart  
**Preconditions:** 5 matters created  
**Steps:**
1. Note matter IDs and titles
2. Trigger API restart (Render restart)
3. GET `/api/v1/matters` after restart
4. Confirm all matters still present

**Expected Result:** Zero data loss after restart  
**Pass Criteria:** PostgreSQL persistence ensures data survives API restart  
**Risk Rating:** CRITICAL

---

