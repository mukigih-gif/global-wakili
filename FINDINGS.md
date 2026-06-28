# Global Wakili — Canonical Findings Log

This is the single canonical findings log for the repository, formed by merging
two previously separate sources:
  1. root `FINDINGS.md` (the repo's `FINDING-00X-00Y` scheme) — Part I below
  2. `apps/api/tests/api/FINDINGS.md` (the API Certification "F-series" log) — Part II below

Merge performed 2026-06-19. No content was dropped. Known cross-source overlaps
(disambiguation):
  - The F-series appears in BOTH parts. Part I's "RECONCILIATION — API
    Certification Findings Log" section is a SUMMARY/port (history of closed
    items + open items ported for tracking). Part II is the FULL original log
    and additionally contains F-22…F-32 and BUG-F (Group 5 prep) that the Part I
    summary never covered. Same findings, different depth — not a conflict.
  - The "F-18 RECONCILIATION (19 Jun 2026)" note exists in BOTH parts (a detailed
    version in Part I, a condensed version in Part II). Same conclusion, two
    records — both preserved.
  - F-14 (Part II, OPEN) was CLOSED here as FINDING-008-001 (Part I); already
    cross-referenced in both. Preserved as-is.

================================================================================
# PART I — Repository Findings (FINDING-00X-00Y scheme)
================================================================================

## STATUS RECONCILIATION — 2026-06-20 (AUTHORITATIVE CURRENT STATUS)

**This section is the single source of truth for finding status.** Where any
individual entry below — or `CLAUDE.md`, or the June-19 Phase-1 closeout — shows a
different status, **this table prevails** until superseded by a later dated
reconciliation. It folds in the reconciled register from the June-19 Phase-1
closeout (`GLOBAL_WAKILI_PHASE1_CLOSEOUT_FOLLOWUP_20260619`) so that no
authoritative status lives only outside this repository.

### Status corrections applied 2026-06-20
Still marked OPEN in their in-body entries but in fact CLOSED (verified via
`CLAUDE.md` fix log + Phase-1 closeout). Headings corrected below; bodies
preserved for history.

| Finding | Corrected status | Commit | Note |
|---|---|---|---|
| FINDING-007-005 | CLOSED | 70c2db9 | `ensureOpenPeriod` unifies period enforcement |
| FINDING-007-008 | CLOSED | 3480c09 | removed dead `Branch.isMain`/`isDefault` lookups |
| FINDING-007-009 | CLOSED | e94c0ca | finance gates also check `tenantRole` enum + CFO |
| FINDING-008-002 | CLOSED | dcdf568 | Department schema/delegate catch-up |
| FINDING-006-002 | CLOSED | 20260611161954 | billing models present in schema + migration; Wave A 16/16 + Wave B 19/19 live (was stale-OPEN from June-19 closeout) |
| FINDING-007-010 | CLOSED | (this session) | postInvoiceIssued wired into invoice approval transition; local-verified balanced + idempotent |
| FINDING-007-014 | CLOSED | (this session) | journals list/getById ordered lines by non-existent JournalLine.createdAt → 500; fixed to id:'asc' |

(Already recorded CLOSED elsewhere in file: 007-002, 008-001, 008-003, 008-004,
008-006, 009-001.)

### Genuinely OPEN at 2026-06-20 (carry-forward register)
| ID | Severity | Summary | Owning phase |
|---|---|---|---|
| FINDING-AUTH-001 | HIGH | Production email delivery unconfigured — all email simulated | pre-go-live |
| FINDING-007-013 | MEDIUM | Billing posting bypasses shared TransactionEngine (parallel mechanism, drift risk) | Phase 3/4 |
| FINDING-COV-001 | MEDIUM | Codebase-wide: 43 service files across 10 modules export-only/dead (TODO-011 Part A; see MODULE_COVERAGE_AUDIT.md) | Phase 3 |
| FINDING-FIN-001 | MEDIUM | petty-cash.service built (correct TransactionEngine posting) but never wired — wire-in/delete/ADR decision | Phase 3 |
| FINDING-FIN-B-001 | — | Phase 3 Group B (CapEx/OpEx) unbuilt: no expenditure/asset/depreciation/budget — cert deferred, feature build | Phase 3 |
| FINDING-FIN-C-001 | — | Phase 3 Group C (Ledger Book) partial: /finance/ledger + export + client sub-ledger missing; period-lock + trial-balance certifiable | Phase 3 |
| FINDING-FIN-D-001 | — | Phase 3 Group D (P&L) UNBUILT at HTTP: P&L handler dead (shadowed, FIN-D-002); reachable /statements is a ledger statement; cert deferred | Phase 3 |
| FINDING-FIN-D-002 | MEDIUM | Duplicate GET /finance/statements — P&L/balanceSheet handler (lines 540-616) dead/shadowed; reachable handler is a ledger statement | Phase 3 |
| FINDING-FIN-E-001 | CLOSED | (this session) | VAT-return endpoints (/tax/vat/monthly + /tax/vat/summary) revived — fixed phantom Invoice/VendorBill columns AND invalid status enum literals; +exposure total. Live-DB verified | Phase 3 |
| FINDING-FIN-E-002 | CLOSED | (d961779) | VatAdjustment model added + migration reconciled (migrate resolve --applied); 7/7 verification passed; adjustments persist, void works, summary leg real. GL posting gap split out as FIN-E-005 | Phase 3 |
| FINDING-FIN-E-003 | — | Phase 3 Group E: eTIMS control-number externally blocked (KRA creds unset → FAILED, no control number); no persisted VatReturn/TaxPeriod model (returns compute-only) | Phase 3 / pre-go-live |
| FINDING-FIN-E-004 | CLOSED | Tenant (supplier) KRA PIN not enforced before eTIMS transmit — could submit to KRA with null supplierPin; now guarded (422 ETIMS_SUPPLIER_PIN_REQUIRED) | (this session) |
| FINDING-MAT-001 | MEDIUM | Matter module: 12 services export-only/dead, routes run inline; /reports/matter-profitability absent (TODO-011 Part A) | Phase 3 |
| FINDING-007-012 | LOW | Invoice approval not fully atomic with GL posting (retry-safe) | Phase 3 |
| F-17 | HIGH | No MFA enforced at login | pre-go-live |
| F-20 | HIGH | No domain/SSO (SAML/OIDC) for firm staff | pre-go-live |
| F-18 | IMPLEMENTED — verify | Reset flow real; E2E happy-path + prod email delivery unverified | Phase 2 |
| FINDING-008-005 | MEDIUM | Payroll dashboard queries phantom statutory fields (Option B deferred) | Phase 3 |
| FINDING-007-011 | MEDIUM | Unify parallel role/permission systems onto rbac.ts | Phase 3/4 |
| F-15 | MEDIUM | Password expiry not enforced at login | pre-go-live |
| F-16 | MEDIUM | No password complexity policy / shared validator | pre-go-live |
| F-19 | MEDIUM | Account lockout threshold/auto-unlock not verified E2E | pre-go-live |
| FINDING-007-006 | LOW | AccountBalance projection rebuild post-commit (stale projection) | Phase 3 |
| FINDING-007-007 | LOW | AccountingPeriod month-bucketing uses server-local time | Phase 3 |
| F-05 | LOW | Client portal routes not RBAC-gated (mitigated by self-scoping) | pre-go-live |
| FINDING-007-001 | INFO | Trust /view null sub-objects when statementDate omitted — product decision | Phase 3 |
| F-03 | INFO | POST /auth/refresh not implemented (GET /auth/session substitute) | backlog |
| F-21 | DEFERRED | Invite-user temp password; replace with email-token invite (needs F-18 + email) | backlog |

### Scope-gap TODO register (open)
TODO-002 Approvals · TODO-003 Court Filing · TODO-004 Tenders · TODO-005 Broader
BI · TODO-006 AI Platform cert · TODO-007 Workflow engine · TODO-008 Document
workspace/email/cloud integration (HIGH priority) · TODO-010 File/path audit.
(TODO-009 CLOSED 2026-06-20 — see Part III.)

### Standing reconciliation flags (resolve before go-live sign-off)
- **Deploy target — RESOLVED 2026-06-20:** the two are DIFFERENT deployments
  (vercel.app lacks /health+/ping that onrender serves). **`onrender.com` is the
  single canonical cert/deploy target** (render.yaml + apps/web/vercel.json proxy
  + UAT pack + live-verify all point there). vercel.app is deprecated/non-
  authoritative. Follow-up: 7 cert test files still DEFAULT BASE_URL to vercel.app
  — flip to onrender (separate commit).
- **June-3 registers:** `PROJECT_STATUS.md` / `COMPLETED_GATES.md` (dated
  2026-06-03) still describe "all gates closed / ~82%". Treat **`CLAUDE.md` §3A +
  this reconciliation** as current until those registers are updated.

Logged: 2026-06-20.

---

## FINDING-006-001

**Billing schema delegates unavailable on live target — root cause unclear**

- **Affected:** proformaInvoice, creditNote, retainer, paymentReminder, billingNotification
- **Impact:** 8 Wave A tests skipped; Wave B POST/lifecycle writes will also skip for same endpoints
- **Evidence:** BILLING_SCHEMA_DELEGATE_MISSING 500 on https://global-wakili-api.vercel.app
- **Local DB status:** 31 migrations applied, schema up to date (Neon: ep-withered-haze-an4bz1y8)
- **Root cause candidates:**
  1. Live target uses a different DATABASE_URL than the local Neon instance (divergent DB)
  2. Deployed Prisma client is stale — generated before billing models were added (regenerate needed)
  3. Platform mismatch in original finding — API is on Vercel, not Render
- **Fix:** Confirm DATABASE_URL on Vercel deployment matches this Neon instance, then redeploy
  with freshly generated Prisma client (`prisma generate` + redeploy)
- **Status:** OPEN — root cause unconfirmed, blocking full Wave B certification
- **Logged:** 2026-06-11
- **Updated:** 2026-06-11

---

## FINDING-006-001 — AMENDED

**Status: SUPERSEDED by FINDING-006-002**

Original diagnosis (stale Prisma client / missing migration) was incorrect.
Build fixes 801cf40 and abdf0b7 are valid improvements but did not resolve the SKIPs.
Root cause confirmed as missing schema models — see FINDING-006-002.
CreditNote exists in schema (line 4161) but still 500s on live targets — isolated
deployment issue, separate from the missing-models problem.

---

## FINDING-006-002 — CLOSED (2026-06-20)

**Billing models absent from schema.prisma — services reference non-existent delegates**

> RE-VERIFIED 2026-06-20: all billing models present in schema
> (migration 20260611161954_add_billing_models), cert tests Wave A 16/16 + Wave B
> 19/19 passing live. Original OPEN status was stale, inherited from June-19
> closeout without re-verification. Original entry preserved below for history.

- **Missing models:** ProformaInvoice, Retainer, RetainerApplication,
  PaymentReminder, BillingNotification, BillingExport
- **Present models:** Invoice, PaymentReceipt, CreditNote
- **Impact:** 5 billing service files call delegates that prisma generate
  cannot produce — db.proformaInvoice / db.retainer / db.paymentReminder /
  db.billingNotification are undefined on every target
- **Affected endpoints (Wave A):** dashboard, snapshot, proformas, credit-notes,
  retainers, reminders, notifications (7 of 8 SKIPs)
- **Fix:** Author missing Prisma models in packages/database/prisma/schema.prisma,
  run prisma migrate dev, regenerate client, redeploy
- **Scope:** Schema authoring task — Finance/Billing bounded context
- **Status:** CLOSED (2026-06-20) — models authored + migration 20260611161954
  applied; Wave A 16/16 + Wave B 19/19 passing live (see re-verification note above)
- **Logged:** 2026-06-11

---

## FINDING-007-001

**Trust account /view endpoint returns null sub-objects**

- When `statementDate` is not supplied, `snapshot`/`statement`/`account` may return
  null instead of a default/current-period value
  (GET /api/v1/trust/accounts/:id/view).
- Needs product decision: should /view default to the current period when no date
  is supplied, or is null-on-missing-param the correct contract?
- **Status:** OPEN — needs clarification, not a bug per se
- **Logged:** 2026-06-16

---

## FINDING-009-001 — CLOSED

**Reporting audit writes bypassed hash-chain utility, causing 500s on all logging handlers**

- **Affected:** apps/api/src/modules/reporting/ReportingAuditService.ts (logAction)
- **Symptom:** 17/21 Group 9 Reporting cert tests skipped — handlers 500'd on audit write
- **Root cause:** Direct db.auditLog.create() call omitted required hash-chain fields
  (AuditLog.hash, AuditLog.previousHash — @unique, no default, per ADR-003) and wrote
  to a non-existent AuditLog.metadata column (correct field is afterData)
- **Fix commit:** 2e7e70a — routed logAction through shared logSecurityEvent utility
  (same writer used by billing module)
- **Scope of fix:** Additive/corrective only — no schema change, no signature change,
  no enum removed, no existing behavior altered
- **Verified:** Live re-run against Render — 21/21 passing, 0 skipped
- **Follow-up flag:** Check Group 8 HR and Group 7 Trust writes for the same anti-pattern
  (raw auditLog.create bypassing logSecurityEvent) during reconnaissance
- **Logged:** 2026-06-11

---

## FINDING-008-001 — CLOSED

**HR_MANAGER (and all non-superuser roles) got 403 on every functional HR endpoint**

- **Affected:** apps/api/src/modules/hr/hr-permission.map.ts (hasHrPermission)
- **Symptom:** Live — HR_MANAGER token → `403 HR_PERMISSION_DENIED` on GET /api/v1/hr/employees
  (requiredPermission `hr:employee:view`); same for FIRM_ADMIN and PARTNER. Only
  MANAGING_PARTNER passed.
- **Root cause:** Two **disjoint** permission vocabularies that never intersect:
  - Main RBAC catalog (config/permissions.ts → permissionKey) emits **dot-format** keys
    `resource.action`, and has **no `hr` resource** at all. rbac.ts:195/202 only ever
    builds dot-format keys into req.user.permissions.
  - The HR module (hr-permission.map.ts) checks **colon-format** keys `hr:resource:action`,
    `hr:*`, `*`, or the isSuperUser() bypass (SUPER_ADMIN/SYSTEM_ADMIN/MANAGING_PARTNER).
  - No seeded role's granted permissions can ever satisfy an HR check → access was
    superuser-bypass-only (the documented F-14 limitation). A seed/catalog change cannot
    fix this because the seed emits dot keys while the HR guard reads colon keys.
- **Fix commit:** 8bb946d — added role-by-name grant `HR_FULL_ACCESS_ROLES = ['HR_MANAGER']`
  + hasHrRoleAccess() alongside the existing isSuperUser bypass in hr-permission.map.ts.
- **Scope of fix:** Additive only — one file, +14/−1. No schema/migration/seed/DB change.
  MANAGING_PARTNER unchanged (still via isSuperUser). FIRM_ADMIN intentionally NOT granted.
- **Verified:** Live re-run against Render after deploy — HR_MANAGER 403→200,
  MANAGING_PARTNER 200, CLERK/RECEPTIONIST/PARTNER still 403.
- **Note:** stale "bypass-only (F-14)" comments in seed-default-roles.ts updated in same effort.
- **Supersedes:** original **F-14** in the API Certification Findings Log
  (Downloads/FINDINGS_backup_20260610.md, line 134). **Divergence:** that log
  recommended bridging the two permission systems ("connect HR RBAC to the catalog,
  or add `hr:*` permissions and emit them in the JWT"). We instead took the approved
  **role-bypass** approach — simpler, but coarser (grants HR_MANAGER all HR permissions
  rather than a granular catalog-backed set). The granular bridge remains available as a
  future refinement if per-permission HR roles are ever required.
- **Logged:** 2026-06-17

---

# RECONCILIATION — API Certification Findings Log (F-series)

**Reconciled:** 2026-06-17. **Source:** the API Certification Findings Log
`Downloads/FINDINGS_backup_20260610.md` (Groups 1–3 + RBAC/Auth, IDs F-01…F-21),
which was tracked outside this repo. The fixed/accepted items there are recorded as
history below; the **still-open** items are ported here so they are tracked where the
team reads. Original `F-` IDs are preserved for traceability. This repo's
`FINDING-00X-00Y` scheme and the `F-NN` scheme are now cross-referenced — do not
renumber.

## Closed / accepted in the source log (history — no action)
- **F-01** OAuth callback path mismatch — VERIFIED LIVE (fixed).
- **F-02** logout returns 204 not 200 — ACCEPTED (cert aligned, no fix).
- **F-04** no client DELETE endpoint — ACCEPTED for cert (consider soft-delete before GA).
- **F-06** PATCH /clients/:id 500 (missing tenantId in where) — VERIFIED LIVE.
- **F-07** GET /clients/:id/dashboard 500 (firstName/lastName not on User) — VERIFIED LIVE.
- **F-08** 5xx leaked raw Prisma error — VERIFIED LIVE (generic 500 body now).
- **F-09** PATCH /matters/:id 500 (same as F-06) — VERIFIED LIVE.
- **F-10** matter inline handlers leaked String(e) on 500 — FIXED IN CODE.
- **F-11** disbursement create gated by view-only permission — FIXED IN CODE.
- **F-13** RBAC permission system incomplete — FIXED (11 default roles seeded).
- **F-14** HR bypass-only permission system — **CLOSED here as FINDING-008-001** (commit 8bb946d).
- **BUG-B** New Matter form didn't preselect client from ?clientId= — FIXED IN CODE.

## Still OPEN — ported for tracking

### F-17 — HIGH — No MFA enforced at login
- LoginSchema has optional `mfaCode` and User has `mfaSecret`, but neither is validated.
- Required before go-live (legal data; Kenya Data Protection Act). Implement TOTP minimum.
- **Status:** OPEN — auth bounded context.

### F-18 — HIGH — No forgot-password / password-reset flow
- No POST /auth/forgot-password or /auth/reset-password; forgotten password = DB-edit only.
- Fix: email flow with time-limited reset token. **Status:** OPEN — required before go-live.

### F-20 — HIGH — No domain/SSO login for firm staff
- No SAML 2.0 / OIDC domain-enforced SSO (individual OAuth exists per F-01, not domain SSO).
- Fix: SAML/OIDC with firm-admin-configurable domain. **Status:** OPEN — enterprise go-live.

### F-15 — MEDIUM — Password expiry not enforced
- `passwordExpiresAt`/`passwordChangedAt` exist but never checked at login.
- **Status:** OPEN — enforce at login; set whenever a password is set.

### F-16 — MEDIUM — No password complexity policy
- Only adminPassword min(8) at registration; login password min(1). No shared validator.
- **Status:** OPEN — add shared password-policy validator at all set-password points.

### F-19 — MEDIUM — Account lockout after failed attempts unverified
- `failedLoginAttempts`/`isLocked`/`lockedUntil` exist and increment, but threshold firing +
  auto-unlock not verified end-to-end (brute-force risk if not enforced).
- **Status:** OPEN — verify lockout fires (~5 attempts) and auto-unlocks (~30 min).

### F-05 — LOW — Client portal routes not RBAC-gated (mitigated by self-scoping)
- client.routes.ts:74-84 GET /clients/:id/portal/{dashboard,matters} lack requirePermissions.
- Self-scoping (portalUserId = req.user.sub) prevents cross-client leakage; live probe = 404 not leak.
- **Status:** OPEN — add requirePermissions(client.viewPortal) for defense-in-depth.

### F-03 — INFO — POST /auth/refresh not implemented
- Substituted with GET /auth/session for token validation. **Status:** OPEN (deferred; needed for mobile).
- 2026-06-22: full refresh-flow design scoped (15m access + 7d rotating refresh token, hashed in Session.refreshToken; POST /auth/refresh with single-use rotation + reuse-detection→REVOKE; frontend 401 single-flight interceptor; likely zero migration). To be built as its own Auth-context session, ideally alongside F-17 (MFA). Scope doc: `.claude/plans/auth-refresh-flow-scope.md` (move to /docs at build kickoff). Also resolves the OAuth callback token-issue path. Related: 8h JWT_EXPIRES_IN "Quick pin" already shipped (PR feat/landing-revamp).

### F-21 — INFO/DEFERRED — Invite User uses interim temp-password (Option A)
- Should become an email-token invite flow (24h token, user sets own password).
- Depends on F-18 + email service. **Status:** DEFERRED — replace before firm go-live.

### BUG-A — LOW — Client list sort by status not implemented
- `status` not in allowed sort fields; sortBy stripped at client.routes.ts:22-26.
- **Status:** DEFERRED — feature gap, not a blocker.

**Reconciliation note:** the cert log's deployed target is `global-wakili-api.vercel.app`;
this repo's live verification has used `global-wakili-api.onrender.com` (render.yaml).
Confirm whether these are the same backend/DB before relying on either for sign-off.

---

## FINDING-007-002 — OPEN — HIGH SEVERITY

**Matter-level trust balance check has the same TOCTOU race as the
account-level check (now fixed) — risks inter-client commingling**

- **Affected:** TrustTransactionService.ts validate() (~:284,
  INSUFFICIENT_CLIENT_TRUST_BALANCE check) and
  ClientTrustLedgerService.applyDelta (~:436)
- **Root cause:** Matter/client sub-balance is a derived aggregate
  (SUM over clientTrustLedger rows), checked in validate() before
  the $transaction opens, then written via an unconditional ledger
  append inside the transaction with no re-check and no lock.
- **Why this is HIGH not MEDIUM:** unlike the account-level race
  (fixed via atomic conditional UPDATE — see commit 4180794),
  this gap means concurrent outflows on different matters within
  the SAME trust account can cause one client's matter sub-balance
  to go negative while drawing against ledger capacity that, on
  paper, belongs to a different client's matter — a direct ADR-004
  violation ("No commingling," "No cross-trust allocations"), even
  though the parent TrustAccount.currentBalance stays correct.
- **Fix complexity:** Higher than the account-level fix — derived-sum
  balances cannot use the simple atomic-WHERE-clause trick. Requires
  either (a) a maintained/cached balance column on the ledger updated
  atomically per matter, or (b) SELECT ... FOR UPDATE / SERIALIZABLE
  isolation around the read-check-write sequence for matter balances.
- **Status:** OPEN — must be resolved before Group 7 Trust writes is
  considered fully closed, not deferred to Phase 3
- **Logged:** 2026-06-17

---

## FINDING-007-003 — OPEN — CRITICAL

**Trust journal-posting writes 500 via nested interactive transaction
— blocks ALL trust deposit/withdrawal/transfer/interest writes**

- **Affected:** TrustTransactionService.ts create() opens
  db.$transaction(...) (~:403), then calls GeneralLedgerService.postJournal
  with transactionReq.db = tx (the open tx client), which calls
  TransactionEngine.postJournalAtomically(db = tx, ...)
  (transaction-engine.ts:91), which itself calls db.$transaction(...) again.
  Prisma.TransactionClient has no $transaction method -> TypeError,
  caught by the generic 5xx handler (F-08) -> opaque 500 to caller.
- **Impact:** Every trust write requiring journal posting fails:
  deposit, withdrawal, transfer-to-office, interest. Reads (no journal
  involved) are unaffected -> explains why Group 7 reads certified
  12/12 while writes never have.
- **Type signature tell:** TransactionEngine.postJournalAtomically expects
  TransactionCapableFinanceDbClient (a full client) but receives a tx
  client mid-transaction.
- **Secondary defect found during diagnosis:** Demo tenant had no
  TRUST_BANK (1010) / TRUST_LIABILITY (2010) chart-of-accounts entries —
  seeded via live API as part of triage. TRUST_LIABILITY.normalBalance
  was set to DEBIT by the API's createAccount (should be CREDIT for a
  liability) -- data-quality defect in createAccount's default,
  separate from the real seeder (which sets it correctly). Needs
  correction on the demo tenant + possible createAccount default fix.
- **Severity:** CRITICAL -- blocks 100% of trust journal-posting
  writes on every request, not just under concurrency
- **Status:** OPEN -- requires architectural fix in finance posting
  core (TransactionEngine / GeneralLedgerService) -- not a one-liner
- **Logged:** 2026-06-17

### CORRECTION (2026-06-17, after local repro) — root cause was MISDIAGNOSED
- Local repro (`apps/api/src/scripts/_repro-trust-deposit.ts`, deposit driven
  directly through TrustTransactionService.create with raw error capture) shows
  the nested-transaction theory is **WRONG**. `PostingPolicyService.assertAllowed`
  throws at transaction-engine.ts:**64** — BEFORE the inner `db.$transaction` at :91 —
  so the nested `tx.$transaction` is never reached.
- **Actual blocker: `POSTING_POLICY_VIOLATION` (422)** with FOUR issues on a plain
  KES trust deposit:
  1. `LOCKED_ACCOUNT` x2 — TRUST_BANK (code 1010) and TRUST_LIABILITY (2010) have
     `allowManualPosting: false` (correct per seed), but JournalValidationService
     blocks the SYSTEM trust posting as if it were manual. System/auto postings
     should not be gated by allowManualPosting.
  2. `MISSING_PERIOD` — tenant has ZERO AccountingPeriod rows (count=0); trust
     posting uses enforcePeriodLock=true, so no period for the journal month -> reject.
  3. `MULTI_CURRENCY_POLICY_VIOLATION` — **logic bug** at posting-policy.service.ts:164:
     `if (input.currency && context.allowMultiCurrency === false)` fires for ANY
     single-currency journal that merely SETS a currency, even when only one currency
     is involved. Trust posts with currency=KES + allowMultiCurrency:false -> always
     violates. Should check for ACTUAL multiple distinct currencies, not presence.
- **Secondary real bug (confirmed in repro):** after the policy throw,
  GeneralLedgerService.postJournal's catch calls logAdminAction -> auditLog.findFirst
  on the ALREADY-ROLLED-BACK outer trust transaction -> Prisma P2028
  "Transaction already closed" (audit-logger.ts:302). Swallowed by `.catch`, but a
  defect: audit-on-failure must not use the rolled-back tx client.
- **Unresolved discrepancy:** local repro yields 422; the LIVE Render deposit returned
  500 (opaque). Not yet explained — candidates: the P2028 audit interaction surfacing
  differently over HTTP, or live running different code/state. Needs live-log
  confirmation (requestId d9fc975a) — NOT yet confirmed.
- **Revised status:** the CRITICAL nested-transaction claim above is RETRACTED. The
  real issue is a cluster of posting-policy gaps (system-posting vs allowManualPosting,
  missing periods, multi-currency false-positive) + the P2028 audit defect. Re-triage
  needed before any fix.

---

## FINDING-007-003 — AMENDED

**Status: Nested-transaction theory RETRACTED — superseded by FINDING-007-004**

Local repro disproved the nested db.$transaction theory. Real cause
confirmed via local stack trace: POSTING_POLICY_VIOLATION from three
independent gaps. See FINDING-007-004 for the corrected diagnosis.

---

## FINDING-007-004 — OPEN — CRITICAL

**Trust journal-posting writes have never worked — three independent
posting-policy gaps each independently block every trust write**

- **Gap A — LOCKED_ACCOUNT false positive:** Trust accounts are
  correctly configured allowManualPosting:false, but the posting
  validator treats system-initiated trust postings as manual postings,
  triggering a false LOCKED_ACCOUNT rejection.
- **Gap B — MISSING_PERIOD:** Tenant has zero AccountingPeriod rows.
  Trust posting enforces period-lock validation against a period table
  that was never seeded/created for this tenant.
- **Gap C — MULTI_CURRENCY_POLICY_VIOLATION (genuine logic bug):**
  posting-policy.service.ts:164 fires this violation for ANY journal
  that sets a currency field when allowMultiCurrency:false -- including
  single-currency KES journals that should never trigger it.
- **Secondary bug:** GL failure path calls auditLog.findFirst against
  the already-rolled-back outer transaction client -> P2028 error,
  currently swallowed silently instead of surfaced.
- **Discrepancy unresolved:** Local repro returns 422 (validation
  error, policy gaps visible). Live target (Render) returns 500 for
  the same operation, requestId d9fc975a-5f86-4f88-ad78-36769c7de1a6.
  Cause of the local/live difference not yet established -- needs
  live log access or further investigation.
- **Severity:** CRITICAL -- any ONE of gaps A/B/C alone blocks every
  trust journal-posting write (deposit, withdrawal, transfer, interest)
- **Status:** OPEN -- three independent fixes needed, each requiring
  full code read before proposing a change (per Principle 3)
- **Logged:** 2026-06-17

### RESOLUTION (2026-06-17) — all three gaps fixed
- **Gap C** — commit 8b356ea: removed the spurious standalone
  MULTI_CURRENCY_POLICY_VIOLATION gate (posting-policy.service.ts); genuine
  multi-currency conflicts still caught by distinctCurrencies.size>1 + account/journal
  mismatch checks.
- **Gap A** — commit ef03a6f: added opt-in `systemPosting` flag to
  PostingPolicyContext, threaded into JournalValidationService.validate(); LOCKED_ACCOUNT
  gate skips when systemPosting=true. Set on trust postJournal contexts + FinancePostingService.
  Manual POST /finance/journals passes no context -> gate still enforced (safe by default).
- **Gap B** — commit ec3e950: posting-policy.service.ts now treats a MISSING period
  row as OPEN (postable), matching AccountingPeriod.status default OPEN; only CLOSED/LOCKED
  blocks. No period rows are required to post.
- **Status:** gaps A/B/C RESOLVED in code. Live end-to-end verification pending deploy.
  Secondary P2028 audit-on-rolled-back-tx bug (from the CORRECTION above) NOT yet fixed.

---

## FINDING-007-005 — CLOSED (70c2db9) — was AMENDED/ESCALATED-HIGH; see 2026-06-20 reconciliation (top of Part I)

**Structural firm-wide gap: no AccountingPeriod ever gets created
-- blocks billing/payments/payroll/refunds/WHT posting, not just
period close**

- **Two divergent enforcement paths found:**
  1. posting-policy.service.ts (trust/GL path) -- treats MISSING
     period as OPEN (Gap B workaround, ec3e950) -- this is why
     trust postings work.
  2. assertPeriodOpen (billing/payments/payroll/refunds/WHT path)
     -- 404s on missing period, NO mitigation exists -- these
     posting paths are likely broken in production right now.
- **Secondary consequence:** closePeriod also 404s (no row to
  close) -- PERIOD_LOCKED enforcement is completely inert; month-end
  lock does not function.
- **Severity:** ESCALATED to HIGH -- this affects multiple core
  finance posting paths (billing, payments, payroll, refunds, WHT),
  not just trust, and not just period-close cosmetics.
- **Fix shape (scoped, not implemented):** needs (1) a period
  create/open mechanism -- candidates: lazy auto-create on first
  post via a shared helper, tenant-provisioning-time creation +
  scheduled monthly job, or manual admin endpoint; (2) reconciling
  the two divergent enforcement paths to agree on behavior; (3)
  this then makes the existing close/lock logic in both paths
  finally meaningful.
- **Recommended approach (not yet approved):** single shared
  "ensure-open-period" helper invoked by both enforcement paths.
- **Status:** OPEN -- HIGH severity -- requires dedicated
  investigation/fix session, same rigor as the trust-write arc.
  NOT addressed in this session.
- **Logged:** 2026-06-17 (original) / **Escalated:** 2026-06-18

---

## FINDING-007-006 — OPEN — LOW

**Account-balance projection rebuild runs post-commit, fire-and-forget, on the
closing transaction client — silently fails (P2028), so AccountBalance never refreshes**

- **Affected:** GeneralLedgerService.postJournal (general-ledger.service.ts:83) fires
  `void AccountBalanceService.rebuildMany(db, ...)` where `db` is the interactive
  transaction client (tx). It is NOT awaited and runs after the journal commits, so by
  the time its queries execute the tx is closing/closed -> Prisma P2028
  "Transaction already closed / expired". The rejection is swallowed by the attached
  `.catch` ([ASYNC_BALANCE_FAIL] log).
- **Impact:** LOW / non-blocking. The deposit (and other journal postings) now succeed
  end-to-end; the GL journal + lines are the source of truth and are correct. But the
  denormalized AccountBalance projection (used by trial-balance / dashboards) is NOT
  refreshed on post — it goes stale until rebuilt by some other path. No data loss, no
  incorrect posting.
- **History:** Originally surfaced as a P2028 during the FINDING-007-004 repro. After the
  Option-A (f9c2697) and Option-B (e353612) guard fixes, the guard no longer aborts the
  outer transaction, so this reverted to its original benign-but-broken state (caught,
  logged, not surfaced) instead of 500ing the request.
- **Fix direction (not yet designed):** relocate the balance rebuild OFF the closing tx —
  either run it inside the transaction (awaited, before commit) or after commit on a
  fresh request-scoped (non-tx) client; or move it to an async queue/worker. Must use
  guard-safe queries (already true after e353612).
- **Status:** OPEN -- deferred; not a blocker for trust/finance write certification.
- **Logged:** 2026-06-18

---

## FINDING-007-002 — CLOSED

**Matter-level TOCTOU race — same defect class as account-level
(4180794), fixed via advisory lock + authoritative SUM-based guard**

- **Fix:** Transaction advisory lock (pg_advisory_xact_lock, keyed
  by namespaced hash of tenantId/trustAccountId/clientId/matterId)
  serializes concurrent applyDelta calls per matter. Overdraw check
  changed from reading the latest ledger row's cached `balance`
  snapshot to computing SUM(credit)-SUM(debit) authoritatively,
  both inside the lock.
- **Commit:** 4135720
- **Verified live in production under real concurrency:** clean
  matter, deposit 4000, 5 concurrent 1000-withdrawals -> exactly
  4x201 + 1x409 CLIENT_TRUST_LEDGER_OVERDRAW, true balance (SUM)
  = 0, never negative, no overspend.
- **Caveat (accepted, documented, not blocking):** the cached
  `ClientTrustLedger.balance` column on the "latest" row is
  unreliable under true concurrency (transactionDate ties make
  "latest" ambiguous; observed stored=1000 vs true SUM=0 in the
  verification run). The overdraw guard no longer reads this field
  (SUM is authoritative), so this does NOT affect safety. Any
  OTHER reader of this field (reports, dashboards) would see a
  stale/wrong value under concurrent load.
- **Decision:** ACCEPT as documented non-authoritative cache. SUM
  is the source of truth. Relates to FINDING-007-006 (balance
  projection drift) — fold any future "current balance" display
  need into a proper recomputed/maintained projection rather than
  trusting this column.
- **Status:** CLOSED (race) / caveat documented (display-only,
  non-blocking)
- **Logged:** 2026-06-18

---

## FINDING-007-007 — OPEN — LOW

**AccountingPeriod month-bucketing uses server-local time**

- AccountingPeriod month/year is derived from `Date.getMonth()`/
  `getFullYear()` in server-local time (posting-policy.service.ts,
  period-lock.ts, and the new `ensureOpenPeriod` helper). Tenants
  carry a `timezone` field (default `Africa/Nairobi`) that is not
  consulted, so a post near a month boundary can bucket into the
  wrong tenant-local month.
- Deliberately matched to existing server-local behavior when
  implementing FINDING-007-005 to avoid introducing a third
  divergence. Revisit for tenant-timezone correctness separately.
- **Status:** OPEN — deferred; not a blocker.
- **Logged:** 2026-06-18

---

## FINDING-007-008 — CLOSED (3480c09) — was OPEN/HIGH; see 2026-06-20 reconciliation (top of Part I)

**Payment posting 500s for everyone — Branch.isMain field does not
exist in schema**

- **Affected:** payment-posting.service.ts:727,
  resolveReceiptBranchId -- queries Branch.isMain
- **Impact:** POST /payments/* 500s unconditionally, before
  reaching assertPeriodOpen/ensureOpenPeriod -- unrelated to
  FINDING-007-005, blocks the payment path entirely regardless of
  period state
- **Status:** OPEN -- needs schema check (does Branch model have
  an equivalent field under a different name, or was this never
  added?) before proposing a fix
- **Logged:** 2026-06-18

---

## FINDING-007-009 — CLOSED (e94c0ca) — was OPEN/MEDIUM; see 2026-06-20 reconciliation (top of Part I)

**Payment-route RBAC reads custom role name, ignores tenantRole —
denies privileged users**

- **Affected:** getUserRole(req) gate on payments:create_receipt /
  finance.post_journal
- **Impact:** A user with tenantRole=FIRM_ADMIN but a custom role
  display-name of "ADMIN" (not matching the expected privileged
  role-name string) is incorrectly 403'd. Confirmed via demo tenant
  admin user; MANAGING_PARTNER role name works, FIRM_ADMIN-by-custom
  -name does not.
- **Status:** OPEN -- needs to check tenantRole (enum) rather than
  or in addition to custom role display name
- **Logged:** 2026-06-18

---

## FINDING-007-010 — CLOSED (2026-06-20)

**Invoices created via the API are never journal-posted —
billing-posting (postInvoiceIssued) is not HTTP-reachable**

> CLOSED 2026-06-20: `postInvoiceIssued` is now wired into the invoice
> approval transition (`approval.controller.ts` — DRAFT/PENDING_APPROVAL →
> INVOICED + GL post in ONE transaction; the prior silent `.catch(()=>{})` is
> removed so a failed post fails the approval). Local-verified against dev DB:
> KES 10,000 + 16% VAT → DR 1200 AR 11,600 / CR 4000 Income 10,000 / CR 2100
> VAT 1,600 (balanced); idempotency re-run → 1 journal (no double-post).
> Follow-ups logged: FINDING-007-012 (atomicity), FINDING-007-013 (posting
> path divergence). Original entry preserved below.

- Logged separately from FINDING-007-008 (distinct subsystem +
  distinct defect class), per the "also noted" item.
- **Affected:** billing.routes.ts POST /invoices (inline handler)
  and proforma.service.ts convertToInvoice -- both direct-create
  the Invoice via `db.invoice.create` and never invoke
  invoice.service.createInvoice / BillingPostingService.postInvoiceIssued.
- **Impact:** Invoices created/converted through the HTTP API never
  produce the AR/income GL journal -- billing-posting.service
  (and its assertPeriodOpen call site) is dead via HTTP; the GL is
  silently understated for all API-created invoices.
- **Side effect on FINDING-007-005 verification:** the only
  HTTP-reachable assertPeriodOpen/ensureOpenPeriod path is the
  finance manual journal endpoint (used to live-prove the period
  fix); billing/payment posting paths are each independently
  blocked (this finding + 007-008).
- **Status:** CLOSED (2026-06-20) — posted on the approve→INVOICED lifecycle
  event (not at DRAFT create). See closure note above.
- **Logged:** 2026-06-18 / **Closed:** 2026-06-20

---

## FINDING-007-012 — OPEN — LOW

**Invoice approval not fully atomic with GL posting**

Approval status commits before the posting transaction. If posting throws,
approval=APPROVED but invoice stays PENDING_APPROVAL with no journal --
surfaced as error, retry is safe (idempotent guard exists). Fully-atomic fix
would require moving posting into ApprovalService.decideApproval (larger
change). Logged for future convergence, not blocking.
Logged: 2026-06-20

---

## FINDING-007-013 — OPEN — MEDIUM

**Billing posting (postInvoiceIssued) is a parallel mechanism, does not route
through TransactionEngine.postJournalAtomically**

Skips PostingPolicyService (account-lock/allowManualPosting/multi-currency/
systemPosting checks) and FinanceIdempotencyService -- compensates with its own
balance/period/idempotency guards, which currently work correctly (verified) but
can drift from Trust/payments posting rules over time since they're maintained
independently. Recommend future convergence onto shared TransactionEngine, or
formal acceptance of the parallel path as an intentional architecture decision
(needs ADR either way).
Logged: 2026-06-20

---

## FINDING-007-014 — CLOSED (2026-06-20)

**GET /api/v1/finance/journals returns 500 (Internal Server Error)**

> CLOSED 2026-06-20: root cause was `JournalService.listJournals` (and
> `getJournalById`) ordering the nested `lines` by `createdAt` — a field that does
> NOT exist on `JournalLine` (model has no timestamp). Prisma rejected the orderBy
> → PrismaClientValidationError → 500. Fix: order lines by `id: 'asc'` (cuid,
> creation-ordered) in all three sites (journal.service.ts). The top-level
> JournalEntry orderBy (`createdAt: 'desc'`) is valid and unchanged.
> Local-verified: listJournals returns rows (incl. the BILLING-INVOICE journal).
> NOTE: getJournalById shared the same bug and is fixed by the same change.

Discovered during FINDING-007-010 live verification (2026-06-20): the journals
LIST endpoint 500'd. The journal DATA was always correct (verified directly in DB
— balanced BILLING-INVOICE journal); the defect was purely the read-handler
orderBy. Original entry preserved.
Status: CLOSED (2026-06-20).
Logged: 2026-06-20. Closed: 2026-06-20.

---

## FINDING-FIN-B-001 — OPEN — (Phase 3 Group B unbuilt)

**CapEx/OpEx (v3.1 Phase 3 Group B) is essentially unbuilt — cannot be certified**

Group B recon (2026-06-20). None of the Group B scope exists:
- No `POST /finance/expenditures`; no CAPEX/OPEX classification anywhere.
- No `FixedAsset`/`Depreciation`/`Budget` model (schema grep = 0); no depreciation
  or budget-vs-actual logic.
- No `GET /reports/expenditure-summary`.
What exists nearby (NOT Group B): `ExpenseEntry` is matter-scoped disbursement
(routed `/billing/expenses`, no capex/opex type); `FinancePostingService` posts
invoice/receipt/creditNote/retainer/payrollBatch/vendorBill/vendorPayment but
nothing for capital expenditure. `petty-cash.service` exists but is dead
(FINDING-FIN-001).
Verdict: Group B is a FEATURE BUILD, not a cert gap. Certification deferred until
CapEx/OpEx (expenditure classification + fixed-asset/depreciation + budget) is
built and scoped. Consistent with how unbuilt scope (procurement/tenders) was
handled.
Logged: 2026-06-20

---

## FINDING-FIN-C-001 — OPEN — (Phase 3 Group C partial)

**Ledger Book (v3.1 Group C) is partially built — the ledger-book presentation
endpoints are missing; GL substrate + period-lock exist**

Group C recon (2026-06-20). Missing vs spec:
- `GET /finance/ledger` (transaction-level entries with running balance/reference)
  — DOES NOT EXIST (per-account balances are computed inside `/statements` via
  journalLine groupBy; no transaction-level ledger view).
- `GET /finance/ledger?accountType=CLIENT` (client sub-ledger → control account)
  — missing; `client-ledger.service` exists but is DEAD/unwired (COV-001).
- `GET /finance/ledger/export` — missing (only generic `/reports/export`).
- period filtering with opening-balance carry-forward — missing.

Certifiable now (covered by the Group C cert test): **closed-period posting
blocked** (`assertPeriodOpen` rejects CLOSED/LOCKED; `/period-close` + `/periods`
exist) and **trial-balance integrity** (Σdebits = Σcredits via `/trial-balance`,
which returns per-account debit/credit/netBalance).
Verdict: certify the period-lock + balance-integrity invariants; defer the
ledger-book endpoints (feature build) + wire/retire `client-ledger.service`.
Logged: 2026-06-20

---

## FINDING-FIN-D-002 — OPEN — MEDIUM (route shadowing / dead handler)

**Duplicate `GET /finance/statements` route — the P&L/balanceSheet handler is
dead (shadowed); the reachable handler returns a journal-line ledger statement**

Found during Group D cert (2026-06-20). `finance.routes.ts` registers
`GET /statements` TWICE: line ~375 (`getStatement`, validated) and an inline
handler at ~540 that builds `{ pnl: {totalRevenue,totalExpenses,netProfit,
revenue/expenseLines}, balanceSheet: {...} }`. Express uses the FIRST match, so
the **inline P&L/balanceSheet handler (540-616) never executes — dead code**.
The reachable `getStatement` returns `{ lines, totals: {debit, credit} }` filtered
by account/client/matter — a ledger statement, NOT a P&L. Confirmed live
(`r.body.pnl` undefined). Consequence: **there is no reachable P&L endpoint at all**
(007-010 / route-shadow class). Fix: remove the duplicate route and either wire the
P&L handler at a distinct path (e.g. `/statements/pnl` or `/reports/profit-loss`)
or delete it.
Logged: 2026-06-20

---

## FINDING-FIN-D-001 — OPEN — (Phase 3 Group D — P&L unbuilt at HTTP)

**P&L Statement (v3.1 Group D) is partially built — a flat year-based P&L exists;
the structured/period/comparative P&L and `/reports/profit-loss` do not**

Group D recon (2026-06-20). Missing vs spec:
- `GET /reports/profit-loss?period=YYYY-MM` — DOES NOT EXIST (no `/reports/*`
  mount; the `/reporting` module is a generic BI framework — catalog/definitions/
  runs/exports — with no financial P&L).
- Structured tiers — `/finance/statements` returns only `totalRevenue`,
  `totalExpenses`, `netProfit` (+ revenue/expense line breakdowns). No cost of
  sales, gross profit, operating expenses, EBIT, interest, or tax tiers.
- Granularity is **year-only** (`?year=YYYY`), not month `period`.
- No comparative (`&compare=`) and no YTD (`?ytd=true`).

CORRECTION 2026-06-20: the flat P&L handler I planned to certify is in fact
UNREACHABLE — it is the dead, route-shadowed `/statements` handler (see
FINDING-FIN-D-002). The reachable `GET /finance/statements` (`getStatement`)
returns a journal-line ledger statement (`{lines, totals:{debit,credit}}`), not a
P&L. So there is NO working P&L endpoint.
Verdict: Group D (P&L) is effectively UNBUILT at the HTTP layer → certification
DEFERRED (like Group B). No Group D cert test shipped. Remediation: un-shadow/
wire the P&L handler (FIN-D-002) + build the structured/period/comparative P&L +
`/reports/profit-loss` (absent `/reports/*` namespace, also seen in Group A).
Logged: 2026-06-20

---

## FINDING-FIN-C-002 — OPEN — LOW

**Posting-policy / closed-period rejections are masked as opaque "Posting policy
validation failed" (REQUEST_FAILED) — the PERIOD_LOCKED / issue detail is not
surfaced to the caller**

Found during Group C cert (2026-06-20). Posting a journal into a CLOSED period is
correctly REJECTED (control-verified: same single-account journal posts 201 when
the period is OPEN, fails after close), but the response body is just
`{"error":"Posting policy validation failed","code":"REQUEST_FAILED","requestId":…}`
— the `PostingPolicyService` issues array (incl. the PERIOD_LOCKED reason) is not
returned. Callers/UI cannot tell WHY a post failed (period vs account-lock vs
multi-currency). The control works; this is an observability/UX gap in the error
envelope. Suggest surfacing the policy issue code(s) (or mapping PERIOD_LOCKED to
a specific 409).
Logged: 2026-06-20

---

## FINDING-FIN-C-003 — OPEN — INFO (seed/config)

**Demo tenant: only 1 of 20 COA accounts has allowManualPosting:true — manual
multi-account balanced journals are effectively impossible**

Found during Group C cert. 19/20 accounts are system (allowManualPosting:false);
only `5000 General Operating Expense` is manual-postable. A normal manual journal
(2 distinct accounts) trips LOCKED_ACCOUNT. System accounts being locked is
correct (posted by system flows), but a usable firm COA needs several
manual-postable adjustment/expense accounts. Likely a seed/COA-completeness gap
for the demo tenant — verify the COA seed for real tenants provides adequate
manual-postable accounts. (The Group C period-lock test works around this by
posting DR/CR to the single manual account.)
Logged: 2026-06-20

---

## FINDING-FIN-001 — OPEN — MEDIUM (coverage / TODO-011 Part A)

**`petty-cash.service` is a complete, correctly-built service that is never wired**

Closed-out 2026-06-20 (from the module coverage audit). `PettyCashService`
(430 lines, `recordVoucher` + `getFloatStatus`) is referenced NOWHERE — no route,
no controller, not in `finance/index.ts` barrel, zero call sites. Notably it posts
through the shared `TransactionEngine.postJournalAtomically` (the CORRECT pattern —
contrast billing FINDING-007-013), records petty cash as an `ExpenseEntry` + GL
journal, and uses only real delegates (`expenseEntry`, `journalLine`,
`chartOfAccount`, `matter`, `branch`). `pettyCashAssetAccountId`/`expenseAccountId`
are service INPUT params, not phantom schema fields — so the service would function
if wired. No `PettyCash` model exists, and none is needed (uses ExpenseEntry).
Classification: **built-but-never-wired** (007-010 class), self-contained, sound.
Decision needed (not taken here): **wire-in** (add `/finance/petty-cash` route +
controller) when petty cash is required, **delete** as dead code, or **accept/defer
via ADR**. Not blocking.
Logged: 2026-06-20

---

## FINDING-COV-001 — OPEN — MEDIUM (coverage / TODO-011 Part A)

**Codebase-wide dead/bypassed service layer — 43 service files across 10 modules
are export-only (dead to every code path)**

TODO-011 Part A scan (2026-06-20, `docs/governance/MODULE_COVERAGE_AUDIT.md`):
of 26 modules, 16 are clean; 10 carry 43 services referenced only in their
`index.ts` barrel (or nowhere) — no route/controller/worker/service invokes them.
Method validated by direct inspection (matter 12/12, billing invoice.service,
procurement ProcurementService, document DocumentESignatureService, finance
petty-cash.service). Highest: document (11), matter (12 — see FINDING-MAT-001),
procurement (6 — whole service layer). Same class as FINDING-007-010.

This is DETECTION only. Each dead service still needs inline-vs-absent
classification (capability may be served inline, like matter profitability/
dashboard, OR absent from HTTP). Remediation (wire-in / delete / accept-via-ADR)
is per-service scoped work, not done here. See the audit doc for the full table,
per-module interpretation, and next steps (incl. Part B interconnection).
Logged: 2026-06-20

---

## FINDING-MAT-001 — OPEN — MEDIUM (coverage / TODO-011 Part A)

**Matter module has a large dead/bypassed service layer — routes run inline
`req.db` logic while dedicated domain services sit unwired**

Found during TODO-011 Part A audit (2026-06-20), starting from the Group A
(Matter Profitability) recon. `matter.routes.ts` imports only 4 services
(`MatterService`, `MatterProgressNotificationService`, `CommissionService`,
`CalendarService`); the module's other ~30 endpoints implement logic inline.

**12 services are export-only (referenced ONLY in `modules/matter/index.ts`
barrel — dead to every code path: no route, controller, worker, or service):**
CourtService, MatterDashboardService, MatterKYCService, MatterOnboardingService,
MatterProfitabilityService, MatterQueryService, PassiveTimeCaptureQueueService,
TenderService, TimeApprovalService, TimerService, WriteOffService,
statute-limit.service. (`MatterAuditService`/`MatterConflictService` are
transitively dead — only called by the dead `MatterOnboardingService`;
`court-hearing.service` only by dead `CourtService`.)

**Proven instance (FINDING-007-010 class):** `GET /matters/:matterId/profitability`
uses an inline calc and does NOT call the full `MatterProfitabilityService`
(netRevenue/netProfit/realization/collection/margin/WIP/snapshots). Inline calc
also EXCLUDES time value from cost, has no margin%, no WIP field, and there is
NO `/reports/matter-profitability` endpoint (single or firm-wide) despite v3.1
Group A assuming one.

**Per-service classification still needed (deeper TODO-011 step):** for each dead
service, determine whether its capability is (a) served inline anyway, or
(b) absent from HTTP entirely. Then decide per service: wire-in, delete, or
accept-as-intentional (ADR). Not undertaken here — this entry records the
module-level finding; remediation is its own scoped work.
Logged: 2026-06-20

---

## FINDING-007-011 — OPEN — MEDIUM (architectural)

**Two+ parallel role/permission systems have now caused silent
authorization bugs twice — unify on rbac.ts DB-permission model**

- Two parallel role/permission systems (custom Role.name vs
  tenantRole enum vs DB-granted rbac.ts permissions) have now caused
  silent authorization bugs twice (HR: dot/colon permission-string
  split, FINDING-008-001; Finance: enum/custom-name split,
  FINDING-007-009). Recommend a dedicated future effort to unify all
  authorization checks onto rbac.ts's DB-permission model (the
  pattern billing already uses correctly). Not undertaken now --
  scope/risk too large for an opportunistic fix; needs its own
  planned session.
- **Status:** OPEN -- architectural; deferred to a dedicated session.
- **Logged:** 2026-06-18

---

## FINDING-008-002 — CLOSED (dcdf568) — was OPEN/HIGH; see 2026-06-20 reconciliation (top of Part I)

**Department endpoints 500 in production — delegate undeployed on Render**

- **Affected:** GET /api/v1/hr/departments, POST /api/v1/hr/departments
- **Symptom:** Both return 500 in production; other HR delegates
  (employees, leave, performance, disciplinary, documents) work.
  Department model exists in schema (confirmed during 4a0475f
  migration) but the deployed Prisma client on Render does not
  appear to include the department delegate.
- **Status:** OPEN — verify whether a Render redeploy resolves it
  (same stale-client pattern as FINDING-006-002) before assuming
  a code fix is needed.
- **Logged:** 2026-06-18
- **UPDATE 2026-06-18 — redeploy RULED OUT; root cause is a code/schema
  field mismatch (NOT a stale client):** manual redeploy of df38c57
  (build runs `npm run db:gen`) + 5-min buffer → GET /hr/departments
  still 500. Reproduced in-process against prod DB; verbatim error:
  `PrismaClientValidationError ... Invalid department.findMany()
  invocation ... Unknown argument 'status'` at department.service.ts:191.
  The `Department` model (schema.prisma:3323) has **no `status` field** —
  it uses `isActive Boolean`. But the HR code references a nonexistent
  `Department.status`: `listDepartments` orderBy `[{status},{name}]` and
  the `status` where-filter (department.service.ts:188-204), plus
  `updateDepartmentSchema`'s `departmentStatusSchema` (hr.validators.ts).
  POST /hr/departments 500s from the same model/status assumption.
  **Fix direction (not yet proposed): either replace `status` references
  with `isActive`, or add a `status` enum + column to Department.**
  Severity stays HIGH; cheapest-fix (redeploy) exhausted — code change required.
- **CLOSED 2026-06-18 (schema catch-up, Option B):** the `DepartmentService`
  was written for a rich model the deployed table never had (10 phantom fields).
  Resolved by bringing the schema up to the service (no service code change):
  added `enum DepartmentStatus {ACTIVE,INACTIVE,ARCHIVED}` + 10 columns
  (status, parentDepartmentId, managerEmployeeId, costCenterCode, createdById,
  updatedById, archivedAt, archivedById, archiveReason, metadata) + 2 FKs
  (self-ref parent/children, manager→Employee), and dropped the unused `isActive`
  column/index (no readers). Commit dcdf568 (schema) + `prisma db push`
  (--accept-data-loss for the isActive drop, 1 row). Render redeploy (db:gen)
  regenerated the client. **Live-verified:** GET /hr/departments → 200,
  POST /hr/departments → 201; HR cert re-run flipped to passed=12 skipped=1
  (only FINDING-008-003 disciplinary remains).
- **Status:** CLOSED.

---

## FINDING-008-003 — CLOSED — MEDIUM

**Disciplinary create unreachable via API — employee model vs user
model duality**

- **Affected:** POST /api/v1/hr/disciplinary (createCase validates
  employeeId against the Employee Prisma model)
- **Symptom:** No HR read endpoint exposes Employee model ids --
  GET /hr/employees returns User ids, not Employee ids. A caller
  has no way to obtain a valid employeeId to pass to createCase.
- **Root cause:** The HR module has a User/Employee duality --
  the read surface uses User, the write surface uses Employee
  (added in 4a0475f). These were never connected by an API that
  exposes Employee ids to callers.
- **Status:** OPEN — either expose Employee ids via GET /hr/employees
  or map User id -> Employee id inside createCase.
- **Logged:** 2026-06-18
- **CLOSED 2026-06-18:** Fixed: createCase now resolves
  userId→Employee.id internally (d8c7e12). Demo tenant seeded with
  Employee records matching existing Users. Disciplinary create
  exercisable — cert 13/13.
- **Status:** CLOSED.

---

## FINDING-008-004 — CLOSED — MEDIUM

**Seeded Employee records not visible in HR module on frontend**

- **Symptom:** Employee records seeded to Employee model (linked
  via userId) do not appear in the HR employee list on the live
  frontend application.
- **Root cause candidate:** GET /hr/employees reads the User table
  (confirmed 9 users, correct). Frontend may be querying a
  different endpoint or the Employee model data is not surfaced
  via any current UI component.
- **Impact:** HR module appears empty to users despite data existing.
  User/Employee duality (FINDING-008-003) has a frontend
  manifestation the API-level fix did not resolve.
- **Fix direction:** Confirm which endpoint/query the frontend HR
  list uses. Phase 2 Playwright will surface this definitively.
- **Status:** ~~OPEN — frontend investigation needed~~
- **Logged:** 2026-06-18
- **CLOSED 2026-06-18:** RESOLVED by 4fd5a72 (HR permission gate fix — added
  FIRM_ADMIN + tenantRole check to HR_FULL_ACCESS_ROLES). Root cause: admin
  user (role ADMIN, tenantRole FIRM_ADMIN) was deterministically 403'd by the
  pre-fix gate (HR_FULL_ACCESS_ROLES=['HR_MANAGER'] + isSuperUser only) — not a
  frontend/cache issue. The underlying GET /hr/employees data (User-based, 9
  records) was correct throughout; admin simply could not reach it. Post-fix:
  empirically verified live (200, count=9). Pre-fix 403 confirmed via
  deterministic code analysis, not directly captured live (probe declined) —
  disclosed for accuracy.
- **Status:** CLOSED.

---

## FINDING-008-005 — OPEN — MEDIUM

**Payroll dashboard queries fields absent from deployed schema —
same class as FINDING-008-002 (Department)**

- **Affected:** GET /payroll/dashboard handler
- **Root cause:** Dashboard queries per-employee statutory
  breakdown fields (NITA, per-record status lifecycle) that were
  never added to the deployed PayrollRun/Payslip schema.
- **Fix applied (Option A):** Surface what exists (Payslip totals
  + batch status); zero/drop the phantom fields. No schema change.
- **Deferred (Option B):** Full schema catch-up for statutory
  breakdown granularity — requires its own migration, same
  discipline as Department fix.
- **Risk:** Response shape change for any frontend reading
  payroll dashboard totals/breakdowns.
- **Status:** OPEN (Option B deferred) / Option A applied
- **Logged:** 2026-06-18

---

## FINDING-008-006 — CLOSED — MEDIUM

**Tasks & Documents dashboards — dead field references
(payroll-class), separate from the audit-layer bug**

- **Affected:** TaskDashboardService (db.matterTask.findMany),
  DocumentDashboardService (db.document.count)
- **Symptom:** PrismaClientValidationError — queries reference
  fields not in the deployed MatterTask/Document schema.
- **Distinct from:** the 7-dashboard audit-layer bug (fixed in
  99c1ab3) — this is a separate query-field bug, same class as
  FINDING-008-005 (payroll dashboard).
- **Root cause:** Both dashboards' access scopes filtered on
  `matter.partnerId` and `matter.assignedLawyerId`. Neither
  exists on the deployed `Matter` model — the only responsible-
  advocate field is `leadAdvocateId`. The phantom relation
  filters threw PrismaClientValidationError before any row read.
- **Fix applied (Option A, 9ef458b):** Collapsed the two phantom
  matter branches onto the deployed `leadAdvocateId` access path
  in `TaskDashboardService.buildAccessScope` and
  `DocumentAccessPolicyService.buildAccessScope`. No schema
  change. Document `metadata` JSON-path filters left intact
  (valid Prisma JSON filtering, not dead columns).
- **Verification:** Typecheck clean. Local 200/200; live 200/200
  on both vercel.app and onrender.com (tasks + documents
  dashboards).
- **Status:** CLOSED — 2026-06-19 (9ef458b)
- **Logged:** 2026-06-18

---

## TODO-002 — SCOPE GAP — Approvals (cross-cutting, not yet a
named bounded context)
Approval workflows appear across HR (disciplinary), Billing
(invoice approval), possibly CapEx/OpEx (Group B) -- but no
dedicated Approvals cert group exists. Needs scoping as its own
bounded context or explicitly folded into each domain's cert work.
Status: OPEN, not started.

## TODO-003 — SCOPE GAP — Court Filing
Not present in v3/v3.1. May map to "Litigation support" in
MASTER_EXECUTION_CHARTER.md's Legal Practice Management domain.
Needs scoping from scratch. Status: OPEN, not started.

## TODO-004 — SCOPE GAP — Tenders
Not mentioned in any governing document. Entirely new scope.
Needs requirements clarification before scoping. Status: OPEN,
not started.

## TODO-005 — SCOPE GAP — Broader Analytics/BI Reporting
Group 9 (API) and v3.1 Group I (financial reports) cover reporting
endpoints/financial reports. Broader BI/dashboards/KPIs/scheduled
reports (per charter's Analytics & Reporting domain) not separately
scoped. Status: PARTIAL -- needs explicit scoping for the
non-financial-report portion.

## TODO-006 — SCOPE GAP — AI Platform certification
WIP-005 (CLAUDE.md) lists AI Legal Operations as Partial: document
assembly, variable extraction, prompt registry/audit, artifact
management, review workflows, contract risk radar, semantic search,
prompt injection protection. None of this is in v3/v3.1 as a cert
group. Needs scoping -- likely its own Phase 3 or Phase 4 group
given AI-specific test requirements (prompt injection, context
isolation -- already named in CLAUDE.md Section 7 Testing Matrix).
Status: OPEN, not started.

## TODO-007 — SCOPE GAP — Workflow engine
No dedicated workflow/automation engine certification exists.
Workflows are referenced across HR, Billing, Trust (approval
chains) but no unified workflow-engine bounded context is defined.
May overlap with TODO-002 (Approvals) -- needs scoping to
determine if these are one context or two.
Status: OPEN, not started.

## TODO-008 — SCOPE GAP — Document platform has no active
workspace/email/cloud-storage integration
Current Document Platform (WIP-003) supports upload only. No
integration exists for: Microsoft 365 (Outlook/Teams/OneDrive),
Google Workspace (Gmail/Drive/Docs), or general email-to-matter
linking. Per MASTER_EXECUTION_CHARTER.md, Microsoft Graph and
Google Workspace integrations are already named requirements
(Mail, Calendar, Teams, Files / Gmail, Calendar, Drive, Docs) but
are Partial/unscoped. For a legal practice platform, this is a
core capability gap, not a minor feature -- client emails and
documents should link to matters, and connectors for OneDrive/
Google Drive should allow document sync. Needs dedicated scoping:
(1) email-to-matter linking (Outlook/Gmail), (2) cloud storage
connectors (OneDrive/Google Drive) for document sync, (3) active
workspace concept (not just upload) so documents/emails live
alongside the matter they belong to.
Status: OPEN, not started -- flagged as HIGH PRIORITY for
post-Phase-3 planning given its centrality to legal practice
workflows.

---

## F-18 — RECONCILIATION (2026-06-19) — re-status OPEN -> IMPLEMENTED (verification pending)

**Why:** Phase 1 close-out flagged a contradiction — the committed
API_CERTIFICATION_REPORT shows a PASSING "Group 4 — Password Reset (F-18)",
while F-18 above (and in apps/api/tests/api/FINDINGS.md) still reads OPEN.
Read-only code investigation resolves it. Original OPEN entry preserved above
for history; this note supersedes its status.

**Finding — the reset flow is genuinely implemented, NOT a stub:**
- `POST /auth/forgot-password` (auth.controller.ts:1044-1073): finds ACTIVE user ->
  `SecureTokenService.generateToken(...,'PASSWORD_RESET',60)` -> builds reset link ->
  `EmailService.send`; always returns a neutral 200 (no account-existence disclosure);
  rate-limited 3/email/hour.
- `POST /auth/reset-password` (auth.controller.ts:1076-1100): verifyToken (400 if
  invalid/expired) -> password policy (400 if weak) -> bcrypt(12) -> updates
  passwordHash/passwordChangedAt/passwordExpiresAt(+90d)/resets failedLoginAttempts ->
  consumeToken (single-use).
- `SecureTokenService.ts`: real — stores SHA-256 hash only, time-limited, single-use;
  backed by `model SecureToken` + `enum SecureTokenType` (schema.prisma:607-628).

**Why the cert "PASS" and the "OPEN" status were BOTH defensible (they measured
different things):** the Group 4 cert test (api-certification.test.ts:465-548) is
BLACK-BOX and deploy-tolerant. It asserts only the endpoint CONTRACT (forgot -> 200
neutral envelope w/ "reset link"; reset -> 400 on bad/fabricated/weak-token-gated). It
NEVER exercises a successful end-to-end reset with a real emailed token (explicitly
noted un-testable black-box, test lines 522-523). A 200 here means "endpoint exists and
returns the neutral success shape", NOT "a reset email was sent" or "a password was
actually changed".

**Two open verification gaps (these are what keeps F-18 short of CLOSED):**
- **V1 — no E2E happy-path proof.** Needs a server-side/integration test: issue a token
  via SecureTokenService, call reset-password, assert login succeeds with the NEW
  password and fails with the OLD. (Lands in Phase 2 01-auth.spec.ts or a dedicated
  integration test — defer to keep one-phase-at-a-time discipline.)
- **V2 — email delivery is, by committed config, SIMULATED in prod.** EmailService.send
  (EmailService.ts:134-154) runs SIMULATION mode (logs only, sends no real email) when
  neither SMTP_HOST nor SENDGRID_API_KEY is set. render.yaml has SMTP_HOST/SMTP_USER/
  SMTP_PASS as `sync: false` (no committed value) and NO SENDGRID_API_KEY key at all;
  its own comment says "simulation active without". So unless SMTP creds were entered
  manually in the Render dashboard (not verifiable from repo), reset emails never leave
  the server. forgot-password also swallows send failures (auth.controller.ts:1066).

**Revised status:** F-18 = **IMPLEMENTED — verification pending** (real token-based
reset flow; cert proves endpoint contract only; E2E + prod email delivery unverified).
Keep the cert PASS but read it as *endpoint-contract only*. Logged: 2026-06-19.

---

## FINDING-AUTH-001 — OPEN — HIGH

**Production email delivery not configured — all emails
(password reset, notifications) silently simulate, never send**

- **Affected:** EmailService.send() -- falls back to simulated
  mode when both SMTP_HOST and SENDGRID_API_KEY are unset
- **Confirmed:** render.yaml has SMTP_HOST/USER/PASS as sync:false
  (no committed value), SENDGRID_API_KEY entirely absent. No
  evidence of dashboard-entered credentials.
- **Impact:** No user has ever received a real password-reset
  email, notification email, or any other system email in
  production. This affects F-18 (password reset) directly --
  the flow is implemented correctly but functionally unreachable
  for real users.
- **Blocker:** Requires a real mailbox account (e.g.
  mail.globalsitesltd.com) to be created and credentials obtained
  -- external dependency, not resolvable in-session.
- **Status:** OPEN -- blocked on account provisioning
- **Logged:** 2026-06-19

================================================================================
# PART II — API Certification Findings Log (F-series, full original detail)
================================================================================

(Migrated verbatim from apps/api/tests/api/FINDINGS.md. This is the FULL F-series
log. Part I's "RECONCILIATION — API Certification Findings Log" section above is a
SUMMARY/port of the still-open items from this log; this part is the authoritative
detail and additionally contains F-22…F-32 + BUG-F not summarized in Part I.
NOTE: the "F-18 RECONCILIATION (19 Jun 2026)" note at the end of this part is the
condensed twin of the more detailed "F-18 — RECONCILIATION (2026-06-19)" in Part I —
both retained; same conclusion.)

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
  [CROSS-REF: CLOSED in Part I as FINDING-008-001 (commit 8bb946d) via the
  approved role-bypass approach rather than the catalog bridge suggested here.]

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
  [CROSS-REF: re-statused IMPLEMENTED — verification pending; see the two F-18
  RECONCILIATION notes (Part I detailed, end-of-Part-II condensed).]

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

---

## GROUP 5 prep — Matter/Billing endpoint gaps (11 Jun 2026)

### F-22 MEDIUM — No expense creation on matters (FIXED)
- matter.routes.ts had GET /:matterId/expenses (list) but no POST to create one.
- Fix: added POST /:matterId/expenses (gated matter.updateMatter), mirroring the
  disbursement create — creates ExpenseEntry { tenantId, matterId, userId, amount,
  currency(KES), description, reference, expenseDate(now), status DRAFT }.
- Status: FIXED — typecheck 0; pending Render deploy verification.

### F-23 MEDIUM — No per-matter profitability endpoint (FIXED)
- No matter-level financial summary (fees vs costs).
- Fix: added GET /:matterId/profitability (gated matter.viewMatter, read-only) —
  aggregates TimeEntry.billableAmount (billable WIP), Invoice total/paidAmount
  (excl. CANCELLED), DRN amount (excl. REJECTED), ExpenseEntry amount; returns
  totalTimeValue, feesBilled, feesPaid, totalDisbursements, totalExpenses,
  grossProfit = feesBilled − (disbursements + expenses).
- Status: FIXED — typecheck 0; pending Render deploy verification.

### F-24 MEDIUM — No invoice receipt endpoint (FIXED)
- billing.routes.ts had no single-invoice GET and no receipt endpoint.
- Fix: added GET /billing/invoices/:invoiceId/receipt (gated billing.viewInvoice,
  read-only) — invoice summary (total/paidAmount/balanceDue/isPaid/status/dates) +
  client + matter + payments[] (PaymentReceipt rows).
- Caveat: POST /invoices/:id/payment only updates invoice.paidAmount and does NOT
  write PaymentReceipt rows, so payments[] can be empty while paidAmount > 0.
  A true payment audit trail (have /payment create a PaymentReceipt) is a follow-up.
- Status: FIXED — typecheck 0; pending Render deploy verification.

### F-25 INFO — "Debit Account" is not a missing endpoint (VERIFIED non-gap)
- The web UI "Debit" action (clients/[id]/page.tsx:116) already calls the existing
  POST /billing/invoices/:id/payment with method 'ACCOUNT_DEBIT'. Debit = a payment
  via the existing endpoint; no separate route required.
- Status: VERIFIED — non-gap; no code change. (Optional: persist `method` on payment.)

### F-26 INFO — Reporting routes already exist (VERIFIED non-gap)
- reporting.routes.ts is a full module (~18 endpoints): /overview, /capabilities,
  /catalog, /definitions(+/search), /runs(+/search), /exports(+/search),
  /dashboard-definitions, /dashboard-widgets, /schedules, /bi-connectors.
- A "matter report" runs through the generic /definitions → /runs engine; no
  dedicated matter-report route is needed.
- Status: VERIFIED — non-gap; no code change (certification only, if desired).

### BUG-F LOW — Chat/support widget blocks content in bottom-right viewport
- "Chat with us" button overlaps Recent Invoices section
- Invoice amount and action buttons obscured on smaller screens
- Affects: client profile page, matter page, any page with bottom-right content
- Fix: add bottom padding to main content area when chat widget is present, or
  move widget to collapsed/minimised state by default
- File: ChatBolt mounted in app/layout.tsx; fix applied in app/(app)/layout.tsx <main>
- Status: FIXED — added pb-24 (96px) bottom clearance to the app <main> so bottom-right
  content (Recent Invoices, action buttons) scrolls clear of the fixed widget

### F-30 MEDIUM — billing.routes.ts submit missing tenantId (FIXED)
- POST /billing/invoices/:id/submit — tx.invoice.update
  where clause missing tenantId → tenant guard 500
- Fix: where: { id: inv.id, tenantId: req.tenantId }
- File: billing.routes.ts:559
- Status: FIXED — pending Render deploy verification

### F-31 MEDIUM — billing.routes.ts payment missing tenantId (FIXED)
- POST /billing/invoices/:id/payment — req.db.invoice.update
  where clause missing tenantId → tenant guard 500
- This means pay-invoice (debit account flow) was universally 500ing
- Fix: where: { id: invoiceId, tenantId: req.tenantId }
- File: billing.routes.ts:589
- Status: FIXED — pending Render deploy verification

### F-32 MEDIUM — Conflict-of-interest check field mismatch (schema/handler/UI)
- runMatterConflictCheck (matter.dashboard.controller.ts) builds search terms from
  body fields: clientName, counterpartyName, opposingPartyName, matterTitle,
  matterCode, caseNumber, kraPin, email, phoneNumber (via buildConflictSearchTerms).
- BUT conflictBodySchema (matter.routes.ts:41) documents different fields: clientId,
  matterId, adversePartyNames, relatedEntityNames — none of which the handler reads.
- AND the New Matter UI posts { clientId, title } → handler reads clientName/
  matterTitle, finds nothing → returns 400 "no search term" / no matches.
- Impact: the conflict-of-interest check (a compliance control) is effectively
  non-functional from the UI — it never surfaces real conflicts.
- Root cause confirmed: validate.ts:23 (`req.body = parseAsync(req.body)`) strips
  unknown keys, so the handler's fields (clientName/counterpartyName/…) never arrive —
  the check was 400-ing for ALL inputs (total non-functionality).
- Fix APPLIED (handler): buildConflictSearchTerms now also reads adversePartyNames +
  relatedEntityNames (the schema array fields that survive validation).
- UI fix APPLIED: matters/new runConflictCheck now posts /matters/conflicts/check with
  clientName (resolved from clientId) + matterTitle + caseNumber, and maps the
  {matches,matchCount} response into the conflict list. (Was POSTing to the wrong path
  /matters/conflict-check → 404, silently swallowed — the check never ran.)
- Status: FIXED — API + New Matter UI aligned. (Separate: clients/new posts to
  /clients/conflict-check — different endpoint, verify later.)

---

## F-18 — RECONCILIATION (19 Jun 2026) — re-status OPEN -> IMPLEMENTED (verification pending)

Resolves the Phase-1 close-out contradiction: API_CERTIFICATION_REPORT shows Group 4
"Password Reset (F-18)" PASSING, while F-18 (line 167) reads OPEN. Read-only code review.
Original entry above preserved for history; this supersedes its status.

- **Implemented, not a stub:** forgot-password (auth.controller.ts:1044-1073) issues a
  single-use, SHA-256-hashed, 60-min `PASSWORD_RESET` token via SecureTokenService and
  emails a reset link; reset-password (1076-1100) verifies token -> enforces password
  policy -> bcrypt(12) -> updates passwordHash/changedAt/expiresAt(+90d) -> consumes
  token. SecureToken model + enum exist (schema.prisma:607-628).
- **Why cert PASS ≠ CLOSED:** the Group 4 test (api-certification.test.ts:465-548) is
  black-box + deploy-tolerant and asserts only the endpoint CONTRACT (200 neutral shape /
  400 on bad token). It never runs a real token end-to-end (noted un-testable black-box,
  lines 522-523). 200 = "endpoint responds", not "reset works".
- **Open gaps keeping it short of CLOSED:**
  - V1: no E2E happy-path test (issue token -> reset -> login new OK / old fails). Defer
    to Phase 2 01-auth.spec.ts or a dedicated integration test.
  - V2: email is SIMULATED in prod by committed config — EmailService.send falls back to
    simulation (logs only) when neither SMTP_HOST nor SENDGRID_API_KEY is set; render.yaml
    has those `sync:false`/absent ("simulation active without"). Reset emails likely never
    dispatch unless SMTP creds were set manually in the Render dashboard.
- **Revised status:** IMPLEMENTED — verification pending (V1 + V2). Cert PASS = contract
  only. Logged: 19 Jun 2026.

================================================================================
# PART III — Governance / Audit TODOs (added during the merge, 2026-06-19)
================================================================================

## TODO-009 — CLOSED (2026-06-20) — Governance docs now adopted
RELEASE_GOVERNANCE.md, ROLES_AND_RESPONSIBILITIES.md,
Handover Notes, Engineering Operating Agreement -- from GW-EOS
v4.0 suite. [Original 2026-06-19 rationale, preserved] Deferred: matter
more once a team exists beyond single-session structure; adopting now
with placeholder content repeats the illustrative-data problem
identified in the original GW-EOS templates. Build when actually needed.

UPDATE 2026-06-20 — CLOSED: the full GW-EOS v4.0 governance suite was
transcribed from the provided source PDFs (real content, not placeholders)
and committed this session — SESSION_EXECUTION_PROTOCOL, CERTIFICATION_POLICY,
CHANGE_CONTROL, DEFINITION_OF_DONE, QUALITY_STANDARDS, RISK_MANAGEMENT
(f92c1b9); ENGINEERING_OPERATING_AGREEMENT, RELEASE_GOVERNANCE,
ROLES_AND_RESPONSIBILITIES (176a6fe); START_HERE.md (01cbe41). The deferral
rationale (avoid placeholder content) no longer applies.
Status: CLOSED.
Logged: 2026-06-19. Closed: 2026-06-20.

## TODO-010 — File/path audit
Full repo sweep for scattered duplicate files, misplaced
documents, inconsistent naming (this FINDINGS.md duplication is
the first known instance). Scope as its own dedicated task.
Fixed position (set 2026-06-20): runs immediately after the GW-EOS
governance migration completes and BEFORE F-17 (MFA) — file/path
discipline must be settled before MFA adds a large new feature that
creates new files of its own. See CLAUDE.md Section 13: Step 0
(governance migration) → Step 1 (this audit) → Step 2 (MFA).
Status: OPEN — fixed position: post-governance-migration, pre-MFA.
Logged: 2026-06-19. Position fixed: 2026-06-20.

## TODO-011 — AMENDED — Full file-coverage + interconnection validation: Finance, Trust, Billing, Procurement, Payments, Payroll, Vendors, Documents

### Part A — Per-module file coverage (original scope)
For each module (Finance, Trust, Billing, Procurement, Payments, Payroll,
Vendors, Documents), validate that every file is actually exercised and covers
what it claims:
- Every service file's stated purpose is actually implemented
- Every function is reachable from a real code path (not dead code like
  FINDING-007-010's postInvoiceIssued was)
- No silent gaps between claimed and actual behavior

Scope: apps/api/src/modules/{finance,trust,billing,procurement,payments,
payroll,vendors,documents}/ -- full directory listing + purpose-vs-implementation
check per file.

### Part B — NEW: Cross-module interconnection validation
A distinct, harder check beyond Part A. For each pair of modules that SHOULD
interact, confirm the connection actually exists and works end-to-end, not just
that each module works in isolation:

- Billing -> Finance: invoice approval posts to GL (FINDING-007-010, now CLOSED
  -- the template/proof this check matters)
- Trust -> Finance: trust transactions post to GL (verified earlier this
  session -- confirm still holds)
- Payments -> Finance: payment receipt posts to GL (verify -- same class of risk
  as 007-010)
- Payroll -> Finance: payroll run posts to GL (PAYE/SHIF/NSSF/Housing Levy
  liabilities) -- verify, likely unverified
- Procurement -> Finance: purchase order / vendor bill posts to AP (Accounts
  Payable) -- verify, likely unbuilt given TODO-001/002 status
- Vendors -> Procurement -> Payments: vendor payment flow -- verify end-to-end
  if procurement exists
- Documents -> Matters/Billing/Trust: are documents correctly linked to the
  matter/invoice/trust transaction they belong to, or living in isolation
  (relates to TODO-008 email/doc integration gap)
- HR -> Payroll: employee data flows correctly into payroll calculations

Method: for each connection, trace the ACTUAL code path (same discipline as the
007-010 investigation: does the calling module genuinely invoke the receiving
module's function, or does it silently bypass it the way invoice approval
bypassed GL posting until it was fixed this session).

Position in sequence: AFTER Finance Core Closeout, BEFORE Phase 2 Playwright.
Natural fit alongside/extending Phase 3 (v3.1 Groups A-I), since Phase 3 already
does deep financial-correctness work and several of these connections
(Billing->Finance, Trust->Finance, Payroll->Finance) are direct Phase 3
prerequisites.

Note: Procurement/Vendors modules may not exist yet (TODO-001/002 status) -- if
so, Part B's procurement-related checks become "confirm not yet buildable" rather
than "found broken," consistent with how TODO-004/024-027 placeholders were
handled earlier.

Status: OPEN, scheduled, scope expanded 2026-06-20.
Logged: 2026-06-20 (original) / Amended: 2026-06-20

---

## FINDING-FIN-E-004 — CLOSED — Tenant (supplier) KRA PIN now enforced before eTIMS fiscalization

**Tenant KRA PIN must be present in the invoice payload before any KRA transmit.**

Group E recon (2026-06-21). `ETimsService.fiscalizeInvoice` built the KRA payload and
immediately called `submitPayload` with no guard that `payload.supplierPin` (the
tenant/law-firm KRA PIN, resolved by `supplierPinFrom` from `tenant.kraPin`) was present.
`Tenant.kraPin` is `String @unique` (non-null) at the schema layer (schema.prisma:20), so
in practice it is always populated — but the eTIMS contract typed `supplierPin: string | null`
and would have silently transmitted a null supplier PIN (an invalid KRA submission) if the
value were ever absent.

Fix (this session): added a hard precondition in `fiscalizeInvoice`, immediately after
`buildKraPayload`, before `submitPayload`:

```ts
if (!payload.supplierPin) {
  throw Object.assign(
    new Error('Tenant KRA PIN is required before eTIMS fiscalization'),
    { statusCode: 422, code: 'ETIMS_SUPPLIER_PIN_REQUIRED' },
  );
}
```

Covers all callers — the legacy `taxservice.ts` (`processLegalInvoice`) and `kraetims.ts`
(`postInvoiceToKRA`) wrappers both route through `fiscalizeInvoice`. An invoice can no longer
be transmitted to KRA without the firm's PIN.

Verification: `npx tsc --noEmit` (apps/api) → exit 0. No schema change, no migration.
Impacted file: `apps/api/src/modules/finance/ETimsService.ts`.
Logged: 2026-06-21.

---

## FINDING-FIN-E-001 — OPEN — (Phase 3 Group E — VAT-return endpoints dead, phantom-field 500)

**The two primary VAT-return endpoints 500 on a Prisma phantom-field error.**

Group E recon (2026-06-21). `VATService.getVatSummary` — which backs BOTH
`GET /finance/tax/vat/monthly` and `GET /finance/tax/vat/summary` (the actual KRA VAT3
"returns" computation: outputVat − inputVat + adjustments) — queries columns that do not
exist on the deployed schema:

- Invoice `where` filters on `invoiceDate` → schema has **`issuedDate`** (no `invoiceDate`
  anywhere in schema.prisma).
- Invoice `select` reads `totalAmount` → schema Invoice has **`total`** (no `totalAmount`).
- VendorBill `select` reads `taxAmount` + `totalAmount` → schema VendorBill has **`vatAmount`**
  + **`total`** (no `taxAmount`, no `totalAmount`).

All three queries run inside one `Promise.all` → `PrismaClientValidationError` → HTTP 500.
The headline VAT-return endpoints are non-functional in production. Same dead-field class as the
Department/Payroll/Tasks/Documents bugs the validation seed (CLAUDE.md §12) was meant to catch.

VAT *math* itself is sound: `utils/vat-wht-calculator.ts` + the net-VAT reduction are correct
(16%, Decimal, ROUND_HALF_UP, KRA sign rules). The defect is purely the Prisma field names.

Remediation (bounded, in-context, no schema change): `invoiceDate`→`issuedDate`,
`totalAmount`→`total` (Invoice), `taxAmount`→`vatAmount` + `totalAmount`→`total` (VendorBill)
in `VATService.getVatSummary`. `getInvoiceVatExposure` also reads phantom `totalAmount`/
`grandTotal` but softly (`?? 0`) so it returns 200 with `totalAmount` always 0 — fix alongside.
Impacted file: `apps/api/src/modules/finance/VATService.ts`. Logged: 2026-06-21.

> **CLOSED 2026-06-21.** Mandatory Analysis surfaced that this was NOT rename-only:
> the `status.notIn` filters also carried **invalid enum literals** that 500 independently
> of the column names — `'VOID'` ∉ `InvoiceStatus`; `'CANCELLED'`/`'VOID'` ∉ `VendorBillStatus`
> (real value is `VOIDED`). Fix applied to `VATService.getVatSummary`:
> - Invoice: `invoiceDate`→`issuedDate`; `notIn ['DRAFT','CANCELLED','VOID']`→`['DRAFT','CANCELLED']`;
>   select `totalAmount`→`total`.
> - VendorBill: `notIn ['DRAFT','CANCELLED','VOID','REJECTED']`→`['DRAFT','REJECTED','VOIDED']`;
>   removed phantom select `taxAmount` (no such field — the `?? row.vatAmount` reduce sources it);
>   select `totalAmount`→`total`.
> - Part B `getInvoiceVatExposure`: `existing.totalAmount ?? existing.grandTotal`→`existing.total`
>   (+ row type narrowed to `total?`), so exposure `totalAmount` is now populated (was always 0).
> Verification: `tsc --noEmit` (apps/api) exit 0; local verify against the **production Neon DB**
> via the exact service path (`new VATService().getVatSummary/getMonthlyVatSummary/getInvoiceVatExposure`)
> — all three paths returned without `PrismaClientValidationError` (12 invoices → outputVat 5600,
> netVatPayable 5600; exposure totalAmount 461359). No schema change, no migration. HTTP live-verify
> on onrender pending a finance-permitted token (DB-path through identical production code already proven).

---

## FINDING-FIN-E-002 — CLOSED (2026-06-23) — (Phase 3 Group E — VatAdjustment model absent)

**`VatAdjustment` model does not exist in schema → silent-201 writes and a 500 void path.**

Group E recon (2026-06-21). No `model VatAdjustment` in schema.prisma. `VATService` resolves
it via `optionalDelegate('vatAdjustment')` → null, so:

- `POST /finance/tax/vat/adjustments` (`recordVatAdjustment`) → returns **HTTP 201 with
  `persisted:false`** and a warning in metadata — a silent no-op write (looks successful, saves
  nothing). Worst failure mode for an accounting control.
- `GET /finance/tax/vat/adjustments` (`listVatAdjustments`) → always `[]`.
- `POST /finance/tax/vat/adjustments/:id/void` (`voidVatAdjustment`) → uses the **non-optional**
  `delegate()` → throws **500** `FINANCE_SCHEMA_DELEGATE_MISSING`.
- The adjustments leg of every VAT summary is silently 0.

Remediation: add a `VatAdjustment` model (tenantId, type enum, amount, adjustmentDate, reason,
reference, status, createdById, voided* fields, metadata) + migration, matching the fields
`VATService.recordVatAdjustment`/`voidVatAdjustment` already write. This is a real (bounded)
schema change requiring approval per ADR/CLAUDE.md §2/§4. Logged: 2026-06-21.

### CLOSURE (2026-06-23) — commit d961779
**Status: CLOSED** — `VatAdjustment` model added (model + `VatAdjustmentType`/
`VatAdjustmentStatus` enums; tenantId, amount, adjustmentDate, reason, reference,
status, createdById, voided* fields, metadata), registered as tenant-scoped in the
isolation extension. The 0-byte `20260621000000_reconcile_dept_vatadjustment_schema`
migration was reconciled to real SQL and recorded on live via
`prisma migrate resolve --applied` (objects already present from a prior `db push`;
no SQL re-run, no data change); builds cleanly on a fresh DB.

Verified: 7/7 verification checks passed against the live DB (persisted CREATE,
filterable LIST, service-level + tenant-extension isolation, wrong-tenant void 404,
correct-tenant void sets VOID fields, summary excludes VOID). `prisma migrate status`
up-to-date (38 migrations); live-vs-schema drift empty; `tsc --noEmit` clean.
Committed and pushed (d961779).

VAT adjustments now persist; void works; the summary adjustments leg reflects real
data. The remaining **GL posting gap is logged separately as FINDING-FIN-E-005**
(VAT_ADJUSTMENT has no balanced GL posting handler — separate Class IV scope, owner
decision 2026-06-23: this finding was model-only).

---

## FINDING-FIN-E-003 — OPEN (external + scope) — (Phase 3 Group E — eTIMS control number & persisted returns)

**eTIMS control-number issuance is externally blocked; no persisted return/filing model exists.**

Group E recon (2026-06-21).

1. eTIMS control number (external, ≈ FINDING-AUTH-001): `POST /finance/etims/invoices/:id/fiscalize`
   is structurally sound and reachable — eligibility gates (INVOICED/PARTIALLY_PAID/PAID; rejects
   CANCELLED), idempotent skip-if-already-fiscalized, 404 on missing invoice, full eTIMS field set
   on Invoice. But `submitPayload` returns hard `FAILED` + `simulated:true` when `KRA_ETIMS_URL`/
   `KRA_ETIMS_TOKEN` are unset → **no control number is ever issued** in production. Not a code bug;
   needs real KRA credentials. The structural path is certifiable; control-number issuance is not.

2. No persisted returns model: there is no `VatReturn`/`TaxPeriod`/`ETimsSubmission` model. VAT
   "returns" are computed on the fly (FINDING-FIN-E-001's endpoints) and never persisted, versioned,
   or filed. Acceptable for read-certification; a gap for true KRA iTax filing. Needs scoping.

Verdict: Group E is BUILT and wired (unlike Groups B/D), but NOT certifiable as-is — blocked by
FIN-E-001 (phantom-field 500, cheap fix) and FIN-E-002 (missing model, bounded schema change);
FIN-E-003 is external/scope carry-forward. Logged: 2026-06-21.

---

## TODO-012 — IN PROGRESS — Landing page closeout (truthfulness + trust infra + SEO + CRO)

Class I (Documentation/Marketing) per CHANGE_CONTROL.md §6. Marketing site
(`apps/web/src/app/page.tsx`, `layout.tsx`, marketing components). Batched
execution; each batch committed separately.

Governing principle agreed with owner (2026-06-21): **the landing page is the
product spec/contract.** Every feature advertised on the page MUST be delivered
in the app. We do NOT remove advertised features to match current reality — we
KEEP them on the page and log them here as committed deliverables so the app
catches up to the page. Only fabricated *claims* that cannot be made true by
building (invented testimonials, market-traction/SLA stats) are removed/corrected.

NOTE on governance citation: the source task cited "ADR-011 (Truthfulness Gate)"
as governing authority. It did NOT exist at task start (the register stopped at
ADR-010). It has now been authored into ARCHITECTURE_DECISIONS.md (2026-06-21,
on owner approval) — the truthfulness principle applied throughout this work is
now formally backed by ADR-011.

### Batch 1 — Truthfulness (DONE, see commit at close)
- Removed invented testimonials (Wanjiku Kariuki / David Omondi / Amina Hassan)
  entirely — they were fabricated people. Replaced with a "Built Live" section
  ("Engineered with the same rigor we apply to your trust accounts") citing real
  CLAUDE.md §3A metrics: 139/139 API cert tests, 365/365 tenant-isolation
  regression, 116 model-level isolation controls, 3-way trust recon under
  concurrency.
- Corrected the 4 hero stats from fabricated/aspirational (`500+ Law Firms`,
  `KES 2B+ Trust Funds`, `99.9% Uptime SLA`) to real, citable numbers
  (`139/139`, `116`, `365/365`, `400+`). These are claims, not features, so they
  were corrected, not "built."
- All buildable feature copy LEFT INTACT per the spec-contract principle below.

### FINDING-LANDING-001 — OPEN (committed deliverables) — features advertised on the landing page that are NOT yet built/certified in the app

The following are advertised on the public landing page and therefore MUST be
delivered in the app. Each maps to an existing scope-gap TODO. Status: COMMITTED
— advertised ∴ must ship. Tracked here so the obligation is not lost.

1. **AI Legal Operations** (full module + "deadline intelligence (AI)" claim in
   Legal Practice Management + pain-point #3 "AI scans all active matters and
   flags risks 30/7/1 day") → **TODO-006** (AI Platform certification, OPEN, not
   started; WIP-005 Partial). Owner directive 2026-06-21: keep on page, must be
   done. Highest-visibility commitment of this set.
2. **Tender management** (Legal Practice Management feature list + VERSUS
   comparison row + JSON-LD featureList) → **TODO-004** (Tenders, OPEN, entirely
   new scope, not started). Must be built.
3. **Court filing / court hearing registry** (Legal Practice Management feature
   list + VERSUS row "Court filing & tender management" + JSON-LD featureList) →
   **TODO-003** (Court Filing, OPEN, needs scoping from scratch). Court hearing
   tracking partially exists; the *filing registry* does not. Must be built.
4. **Document vault** (Client Collaboration "Document vault access") →
   **TODO-008** (Document platform is upload-only; no versioning/retention/active
   workspace). The full "vault" advertised must be completed. Must be built.

These remain visible on the page by owner decision; this finding is the
counter-balancing obligation. Logged: 2026-06-21.

### FINDING-LANDING-002 — OPEN (committed deliverable / external-cred dependent) — marketing chat assistant is rule-based, not live AI

`ChatBolt` (`apps/web/src/components/chat/ChatBolt.tsx`) was a non-functional
lead-capture stub (any message → static "our team will reply" card; no answers).
Rebuilt 2026-06-21 into a working conversational assistant with a curated
knowledge base grounded in the landing-page FAQ/module copy (trust accounting,
M-PESA, eTIMS, pricing, security, implementation) + graceful demo-form fallback,
and made responsive (full-width on mobile, scrollable thread, typing indicator).

This is honest and works with zero external credentials, but it is keyword-matched,
not generative. Upgrade path: replace `getAnswer()` with a live Claude-backed
endpoint once AI credentials are configured — ties to **TODO-006** (AI Platform)
and the **FINDING-AUTH-001** external-credential pattern (no AI/SMTP creds in
render.yaml yet). Until then the rule-based KB is the certified behaviour.
Logged: 2026-06-21.

### TODO-012 execution log — 2026-06-21 (feat/landing-revamp)

Branch feat/landing-revamp; main untouched at bdd833a; restore tag
gw-pre-landing-revamp. Landed this session:
- Batch 1 (truthfulness): testimonials → Built Live; stats corrected;
  FINDING-LANDING-001 features logged as committed deliverables.
- Batch 2 (trust infra): contact → click-to-call +(254) 724 178 878 +
  mailto:wakili@globalsitesltd.com; footer dead links removed/restructured to
  real destinations; entity → "a product of Global Sites Limited". Item 9
  domain/SSL resolved interim = global-wakili-api.vercel.app (owner decision),
  revisit at final publish.
- Batch 3 (SEO): title, meta description, H1, keyword H2, metadataBase,
  canonical, OG+Twitter, LocalBusiness + FAQPage JSON-LD, sitemap.ts +
  robots.txt aligned to Vercel domain, sameAs (YouTube), generated branded
  1200x630 og-image.png from the logo.
- Batch 4 (CRO): KDPA cookie banner wired into root layout (de-duped from app
  layout); floating chat/back-to-top/cookie coordination (no content blocking).
- Batch 5 (social): footer LinkedIn (GlobalWakili search) + YouTube.
- Batch 6 (nav UX, Class II): scroll-spy sticky header + mobile menu;
  back-to-top (scroll-up reveal, hides at footer); scroll-progress bar;
  smooth-scroll offsets. New components MarketingHeader, BackToTop.
- ChatBolt: dead stub → responsive conversational assistant (FINDING-LANDING-002).
- Mobile: zero horizontal overflow; comparison table → stacked cards on mobile.

STILL OPEN (blocked on owner-supplied external info, not code):
- item 16/17 form routing + thank-you email (destination decision + SMTP creds;
  thank-you email is Class II backend, FINDING-AUTH-001 pattern).
- item 19 tracking IDs (GA4 / GTM / LinkedIn Insight).
- ADR-011 (Truthfulness Gate) authoring decision.

TODO-012 remains IN PROGRESS until the above land.

### FINDING-LANDING-003 — partial — "See It In Action" product screenshots

(2026-06-21) Captured real screens from the production app we're building
(global-wakili-api.vercel.app, demo-law-firm tenant) for a new landing
"See It In Action" section (BrowserFrame component + alternating layout).

SHIPPED (real, data-rich, presentable — assets in apps/web/public/shots/):
- /app/trust (Trust Accounting) — KES 4.1M balances, 5 accounts, 3-way recon. No PII.
- /app/finance (Finance) — billed/outstanding figures + invoice-status chart + tabs.

NOT SHIPPED (per ADR-011 + owner guardrail — an empty/raw screen is a worse ad
than none):
- /app/analytics/matter-profitability — empty chart, raw TENANTID/BRANCHID/ID
  cuids exposed, blank matter codes, __CERT_TEST_MATTER__ row. Report UI dumps
  raw data (relates to TODO-011). Needs UI formatting + seed.
- /app/analytics/trust (Trust Ledger Report) — empty chart, raw cuids, unformatted
  balances, raw booleans. Same report-UI issue.
- /app/dashboard — sparse/near-empty. Needs §12 seed.
- /app/matters — realistic matters BUT __CERT_TEST_MATTER__/__CERT_TEST_CLIENT__
  rows + all-0% progress + every lead advocate "Admin User". Usable only after
  demo-tenant test-data cleanup.

To add more shots later: (1) purge __CERT_TEST_*__ rows from the demo tenant,
(2) build §12 seed for realistic dashboard/matter/analytics data, (3) give the
analytics "report" pages a formatted UI (TODO-011) instead of raw cuid tables.

### TODO-012 — REMAINING OWNER ACTIONS (handoff, 2026-06-21)

All landing-page CODE is complete and pushed to branch feat/landing-revamp
(commits 7e0d0c0, 20b1497, b3a8c8d, 3ab50ac, 3b8ff94, 6715374). This supersedes
the earlier "STILL OPEN" list: ADR-011 is now AUTHORED (b3a8c8d); form routing is
DECIDED + WIRED (Web3Forms, 20b1497); GA4/GTM analytics is WIRED + consent-gated
(20b1497). What remains is OWNER ACTION ONLY — no code:

1. Vercel env vars (then REDEPLOY — NEXT_PUBLIC_* bake in at build time):
   - NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY  (web3forms.com → wakili@globalsitesltd.com)
   - NEXT_PUBLIC_GA_ID                 (G-XXXXXXXXXX)
   - NEXT_PUBLIC_GTM_ID                (GTM-XXXXXXX)
2. Web3Forms dashboard → enable Auto-response (the submitter "thank-you" email, item 17).
3. Google Search Console → submit /sitemap.xml for indexing (off-page; required to rank).
4. Merge feat/landing-revamp → main when approved (main still at bdd833a; restore
   tag gw-pre-landing-revamp local+remote).
5. AT FINAL PUBLISH (item 9 carry-forward): swap canonical/OG/JSON-LD/sitemap domain
   refs from global-wakili-api.vercel.app → the real production domain
   (e.g. lms.globalsitesltd.com) + confirm SSL.

Deferred enhancements (tracked, not blocking go-live):
- FINDING-LANDING-002: upgrade ChatBolt rule-based KB → live Claude (needs AI creds).
- FINDING-LANDING-003: purge __CERT_TEST_*__ demo rows + §12 seed + format analytics
  report UIs (TODO-011) to unlock more "See It In Action" screenshots.

TODO-012 status: CODE COMPLETE; awaiting owner go-live actions above.

---

## FINDING-FIN-E-005 — OPEN (deferred, Class IV) — (Phase 3 Group E — VAT_ADJUSTMENT has no GL posting handler → 422)

**The finance posting engine declares `VAT_ADJUSTMENT` as a valid source but has no handler → 422 on any GL post.**

Found during FIN-E-002 work (2026-06-23). Distinct from FIN-E-002 (which is the
absent persistence model). `finance.routes.ts` lets a caller POST a journal with
`source: 'VAT_ADJUSTMENT'` (enum at ~line 263), but
`FinancePostingService.post` (`FinancePostingService.ts:217-241`) has no `case`
for it — the `default` throws **422 `UNSUPPORTED_FINANCE_POSTING_SOURCE`**.
`VAT_ADJUSTMENT` is also listed as a `FinancePostingSource` at line 21 but never
implemented.

Impact: even after FIN-E-002 persists the adjustment record, no balanced GL
journal is produced for it — the VAT adjustment never reaches the ledger.

Remediation (deferred to its own session — Class IV, touches GL): implement a
balanced `postVatAdjustment` handler (DR/CR per adjustment type, idempotency,
period-lock) following the FINDING-007-010 invoice-posting pattern. Explicitly
OUT OF SCOPE for FIN-E-002 (owner decision 2026-06-23: model only). Logged 2026-06-23.

---

## FINDING-CAL-001 — OPEN — (Calendar/Notifications — events don't display + reminders never fire)

**Calendar entries never render in the UI, and calendar reminders/notifications are never created or dispatched.**

Owner-reported 2026-06-23; recon this session. Two independent root-cause clusters.
Different bounded context from Finance — tracked for its own session (Principle 2).

Symptom 1 — events don't display:
- FE calls `GET /calendar/events?from=…&to=…&limit=500`
  (`apps/web/src/app/(app)/app/calendar/page.tsx:67,71`) but the backend only
  mounts `GET /calendar/` (`calendar.routes.ts:125`) → **404**.
- Even with the path corrected, FE sends `from/to/limit` while the backend
  requires `startDate/endDate` (`calendar.routes.ts:56-65`) → **422** (missing
  required query params).

Symptom 2 — reminders never fire:
- `CalendarService.createEvent` (`CalendarService.ts:127-171`) ignores
  `payload.reminders` → **no `CalendarReminder` row is ever created** (the model
  exists, schema ~3096-3137).
- `NotificationReminderService` has no `remindCalendarEvents()` — only hearings/
  invoices/tasks → nothing ever polls `CalendarReminder`.
- `ReminderService.attachRemindersToEvent` is effectively dead for calendar (only
  called from deadline/task/court modules).
- FE `reminderMinutes` is used only for an immediate dispatch, not scheduling.

Remediation (deferred, own session): fix FE endpoint+params (Low), persist
`CalendarReminder` on create, and add a calendar leg to the reminder worker
(Medium). Logged 2026-06-23.

---

## FINDING-HR-ONB-001 — CLOSED (2026-06-23, d961779) — (HR/Identity — OnboardingService writes phantom `Department.isActive` → tsc break)

**`OnboardingService` writes `isActive` on `Department.create`, but `Department` has no `isActive` field (it uses `status DepartmentStatus`).**

Surfaced 2026-06-23 when the Prisma client was regenerated during FIN-E-002:
`packages/core/identity/services/OnboardingService.ts:280` →
`error TS2353: 'isActive' does not exist in DepartmentCreateInput`. Same
phantom-field class as the prior Department/Tasks/Documents dead-field bugs. The
committed code carries a latent typecheck failure that manifests whenever the
generated client is brought in sync with the schema.

NOT caused by and OUT OF SCOPE for FIN-E-002 (different bounded context —
HR/identity). Remediation (own task): map `isActive` → `status: ACTIVE`/
`INACTIVE` (DepartmentStatus) in OnboardingService, or add the field if onboarding
genuinely needs it. Logged 2026-06-23.

### CLOSURE (2026-06-23) — commit d961779
**Status: CLOSED.** Resolved by commit d961779 (the FIN-E-002 commit), which
changed `OnboardingService.ts` from `isActive: true` to `status: 'ACTIVE'` on the
default-department `create`, matching `Department.status DepartmentStatus`. The
phantom-field write is gone; `tsc --noEmit` verified exit 0 (2026-06-23). The
original entry was logged OPEN before/independently of that fix; corrected here per
the retroactive-audit discipline. No further action.

---

## FINDING-FIN-F-001 — CLOSED (2026-06-23) — (Phase 3 Group F — WHT report/record/void 500 via schema/service mismatch)

**`/tax/wht/{report,certificates,void}` all 500 — `finance/WHTService` reads/writes phantom fields absent from the deployed schema; only `/calculate` works.**

Group F recon (2026-06-23). The four `/finance/tax/wht/*` routes
(`finance.routes.ts:461–488`) all delegate to `finance/WHTService.ts`, which was
written against a field design that does not match the deployed schema:

- **POST `/tax/wht/certificates`** (`recordCertificate`) → writes
  `baseAmount, withholdingRate, withholdingAmount, vendorBillId, supplierId,
  paymentReceiptId, reference, createdById, metadata` — NONE exist on
  `WithholdingTaxCertificate` (schema:1983, which has `amount, payerName, payerPin,
  status(RECEIVED), receivedById, cancelled*`) — and passes `invoiceId: null` though
  the model REQUIRES `invoiceId`. → PrismaClientValidationError → 500.
- **POST `/tax/wht/certificates/:id/void`** (`voidCertificate`) → writes
  `status:'VOID', voidedAt, voidedById, voidReason, metadata`; schema uses
  `cancelledAt/cancelledById/cancellationReason` and has no `metadata`/`voided*`. → 500.
- **GET `/tax/wht/report`** (`getWhtReport`) → queries
  `paymentReceipt.where.receiptDate` and `select whtAmount/withholdingTaxAmount/
  whtExposure`; `PaymentReceipt` (schema:4623) has `receivedAt` and none of those WHT
  fields. → 500.
- **POST `/tax/wht/calculate`** (`calculate`) → pure computation (no persistence);
  WORKS.

**Live (MANAGING_PARTNER, onrender.com, 2026-06-23):** GET `/finance/tax/wht/report`
→ **500** `INTERNAL_SERVER_ERROR` (requestId `ad812aac-92cb-4ca6-b0ba-03643dd0cca2`);
POST `/finance/tax/wht/calculate` (baseAmount 100000, rate 5) → **200**,
`withholdingAmount: "5000"`. Write endpoints NOT fired against production (read-only
recon); their break is established statically.

**Note — a schema-aligned service already exists but is unwired:**
`billing/withholding-tax-certificate.service.ts` (`WithholdingTaxCertificateService`)
uses the real fields (`amount, payerName, payerPin, receivedById`), aggregates by
`amount`, respects `status` CANCELLED, and posts a balanced GL leg — but it is wired
into the billing flow, NOT into `/tax/wht/*`.

**Same defect class as FIN-E-001 (phantom columns) / FIN-E-002 (missing model).**
**Verdict: WHT DEFERRED for full certification** — only `/calculate` is certifiable;
a thin `/calculate`-only cert was explicitly rejected (no thin code). Fix (a FIX, not
done mid-recon): either rewrite `finance/WHTService` to the real schema, or re-point
`/tax/wht/*` at the aligned `WithholdingTaxCertificateService`. Frontend impact: the
Tax → WHT tab (`apps/web/.../tax/page.tsx`, `/finance/tax/wht/report` + `/certificates`)
is silently dead — log a FINDING-FRONT against this once the backend is fixed.
Logged: 2026-06-23.

### CLOSURE (2026-06-23)
**Status: CLOSED.** Re-pointed `/tax/wht/certificates` (record) + `/certificates/:id/void` to the schema-aligned `WithholdingTaxCertificateService` (record posts a WHT clearing journal; void → `status=CANCELLED` + `cancelled*`); `whtCertificateBodySchema` rewritten to the real payload (invoiceId/certificateNumber/amount/payerName/payerPin/notes); `WHTService.getWhtReport` drops the phantom `PaymentReceipt` WHT leg and sums certificate `amount`. `/calculate` unchanged. tsc exit 0; local-verified getWhtReport returns (no 500). Live-verified post-deploy.

---

## FINDING-FIN-PAYROLL-001 — CLOSED (2026-06-23) — (Phase 3 Payroll Compliance — statutory engine 500 via PayrollRecord schema mismatch)

**`/payroll/statutory/summary` and `/payroll/reports/p10` (and P9) 500 — the statutory/KRA-filing services query `PayrollRecord` with fields/relations it does not have.**

Payroll Statutory Compliance recon (2026-06-23). NOTE: payroll is an original
Phase 3 (Finance/Trust/Payroll) compliance domain, NOT a v3.1 lettered group — the
actual Group G = Chart of Accounts (FIN-G-001), Group H = Journal Entry Integrity
(FIN-H-001), logged separately. Payroll lifecycle reads work, but the
statutory-compliance OUTPUTS (the point of the domain) are broken.

`PayrollRecord` (schema:2187) = `id, tenantId, batchId, userId, employeeProfileId,
grossPay, netPay, totalDeductions, employerCost, postedAt` with relations
`tenant/batch/user/employeeProfile`. Per-deduction statutory amounts live in
`StatutoryDeductionRecord` (schema:2212, keyed to `Payslip`, typed enum).

`P10ReportService.generateP10` (and the statutory summary `filingService`) instead
query `payrollRecord.findMany` with **`status:{in:[...]}`, `payrollBatchId`,
`periodWhere` (periodStart/periodEnd), `include:{employee:true}`,
`orderBy [{employeeId},{periodStart}]`**, and map `record.paye` — none of
`status/payrollBatchId/periodStart/employee/employeeId/paye` exist on the model →
PrismaClientValidationError → 500.

**Live (MANAGING_PARTNER, onrender.com, 2026-06-23):**
`GET /payroll/statutory/summary?year=2026&month=6` → **500** (req
`07570abd-7159-431c-b321-2fd61fc2db38`);
`GET /payroll/reports/p10?year=2026&month=6` → **500** (req
`ec0c83d2-916a-4f20-b13a-037dfb98f25e`).
Working: `GET /payroll/dashboard` → 200; `GET /payroll/batches` → 200 [].

**Same defect class as FIN-F-001/E-001/E-002.** Verdict: Payroll statutory engine
DEFERRED — payroll lifecycle (dashboard/batches) certifiable; statutory
summary/P9/P10 are broken and must be re-pointed at the real
`PayrollRecord`+`StatutoryDeductionRecord`+`Payslip` shape (a FIX, not done
mid-recon). Frontend impact: Tax → Payroll Deductions tab + P9/P10 surfaces will be
dead — FINDING-FRONT on fix. Logged: 2026-06-23.

### CLOSURE (2026-06-23)
**Status: CLOSED.** Re-pointed `P10ReportService.generateP10` and
`StatutoryFilingService.generateSummary` from the phantom `payrollRecord` query to
`payslip` — which carries the statutory totals (`paye/shif/nssf/housingLevy/grossPay/
taxablePay/netPay`) + `batch{year,month,status}` + `user{name,kraPin,nssfNumber,
shifNumber}` + `employeeProfile{employeeNumber}`. Period/status now filter via `batch`;
identity via `user`/`employeeProfile`; dead `periodWhere`/`makePeriodWhere` helpers
removed. tsc exit 0; local-verified both methods return (no 500). Live-verified
post-deploy. **Known limitation (logged, not blocking):** employer-split fields
(`nssfEmployer/housingLevyEmployer/nitaEmployer`) and PAYE relief breakdown
(`personalRelief/insuranceRelief`) are not stored on the deployed `Payslip` → reported
as 0; employee-side PAYE/NSSF/SHIF/Housing + gross/taxable/net are correct.

---

## FINDING-FIN-I-001 — CLOSED (2026-06-24) — (Phase 3 Group I — Balance Sheet does not balance; equity not derived)

**`GET /finance/balance-sheet` returns 200 but `isBalanced:false` — assets ≠ liabilities + equity, with equity computed as 0.**

Group I recon (2026-06-23; I = Financial Reports, repo-confirmed FINDINGS:1100).
Most financial-report endpoints work; the balance sheet has an integrity defect.

**Live (MANAGING_PARTNER, onrender.com, 2026-06-23):**
- `GET /finance/trial-balance?year=2026` → **200** (per-account debit/credit) ✓
- `GET /finance/cashflow?startDate=&endDate=` → **200** (inflow/outflow) ✓ — note: requires
  `startDate/endDate`, returns 400 on `?year=` (param/doc nit, not a defect)
- `GET /finance/balance-sheet?year=2026` → **200** but
  `{assets:"58225", liabilities:"38325", equity:"0", isBalanced:false}` — equity is
  not derived (no retained-earnings / current-year-earnings roll-up), so the sheet
  cannot balance. An accounting-integrity defect in the report (not just data).
- `GET /finance/statements?year=2026` (P&L) → **500** (req
  `d1d7908b-ac50-4898-8616-935aebbc6473`) — this is the already-logged
  **FINDING-FIN-D-001 / FIN-D-002** (shadowed/dead P&L handler); not re-logged here.

Verdict: Group I PARTIALLY CERTIFIABLE — trial-balance + cashflow certifiable;
balance-sheet returns but is unbalanced (fix equity derivation before cert);
P&L/statements deferred to FIN-D-001/002. Logged: 2026-06-23.

### ROOT-CAUSE CORRECTION (2026-06-23) — de-coupled from FIN-G-001 (still OPEN)
Earlier I claimed the FIN-G-001 `normalBalance` fix would also close this. **That was
wrong** — corrected after reading the code: `balance-sheet.service.ts` and
`trial-balance.service`/`general-ledger.service` **never read `normalBalance`** (they
group by `type` and use `netBalance = debit−credit` with `abs()` for liabilities/
equity). FIN-G-001 (now CLOSED) had **no effect** on `isBalanced`. The real cause of
`isBalanced:false` (assets 58225 ≠ liabilities 38325 + equity 0): `BalanceSheetService.
getAsOf` **excludes REVENUE & EXPENSE entirely**, so current-year net income
(Σrevenue − Σexpense) is never rolled into equity, and there is no retained-earnings
account being posted → equity computes to 0. Fix (separate, own Mandatory Analysis):
add current-year earnings to equity in the balance-sheet handler (equity = Σequity
accounts + (Σrevenue − Σexpense)). **Status: OPEN — root cause corrected; independent
of FIN-G-001.**

### CLOSURE (2026-06-24)
**Status: CLOSED.** `BalanceSheetService.getAsOf` now rolls **current-year net income**
(`−Σrevenue netBalance − Σexpense netBalance`) into equity as retained/current earnings, and
returns a new `netIncome` field. `balance-sheet.service.ts` only; no schema change. tsc exit 0.
Local-verified on the MP tenant: `assets=58,225  liabilities=38,325  equity=19,900
netIncome=19,900  isBalanced=true` (was `equity=0, isBalanced=false`). Live-verified
post-deploy. Both consumers (`getBalanceSheetReport`, `getDashboardSnapshot`) pass through the
corrected shape. Pre-existing caveat (separate, not addressed): equity-account summing uses
`abs()`, which assumes credit-normal equity balances (a debit/drawings equity account would be
mis-added) — noted for a future refinement.

---

## FINDING-FIN-G-001 — CLOSED (2026-06-23) — (Phase 3 Group G — Chart of Accounts: createAccount never derives normalBalance)

**Group G = Chart of Accounts. Reads/structure certifiable; `createAccount` omits `normalBalance`, so API-created LIABILITY/EQUITY/INCOME accounts take the DEBIT-normal default → wrong balance sign in statements.**

Group G recon (2026-06-23). `GET /finance/accounts` → live **200** (code/name/type/
subtype/normalBalance per account); list/create/get/update routes all mounted. Reads
+ structure are CERTIFIABLE.

Defect (create path): `account.service.ts:135 createAccount` writes
`type, subtype, description, currency, allowManualPosting, isSystem, isActive` but
**not `normalBalance`** — it is never derived from `type`. Every account created via
`POST /finance/accounts` takes the single `ChartOfAccount.normalBalance` schema
default regardless of type, so a CREDIT-normal LIABILITY/EQUITY/INCOME account is
mis-flagged DEBIT-normal. `statement.service.ts:14` negates by `normalBalance` →
flips the displayed sign for those accounts and feeds the balance-sheet imbalance
(FIN-I-001). This is the createAccount default defect first noted in FINDING-007-003
(secondary) — still present. Fix: derive `normalBalance` from `type`
(ASSET/EXPENSE→DEBIT; LIABILITY/EQUITY/INCOME→CREDIT), or accept explicit input +
validate against type. Verdict: COA CERTIFIABLE for reads; create needs the
normalBalance fix before write-cert. Logged: 2026-06-23.

### CLOSURE (2026-06-23)
**Status: CLOSED.** `normalSideFor(type)` derivation added to BOTH `createAccount`
(sets `normalBalance` on create) and `updateAccount` (recomputes when `type` changes)
in `account.service.ts`; `tsc --noEmit` exit 0. One-time backfill applied across all
tenants (`updateMany` by type): BEFORE `LIABILITY/DEBIT=8, EQUITY/DEBIT=1` → AFTER
`LIABILITY/CREDIT=10, EQUITY/CREDIT=1`, mis-flagged remaining **0**. Local-verified
against the patched code: ASSET/EXPENSE→DEBIT, LIABILITY/EQUITY/REVENUE→CREDIT (5/5,
test rows deleted). **NOTE (root-cause correction):** this does NOT close FIN-I-001 —
the balance sheet/trial balance never read `normalBalance` (they use `netBalance =
debit−credit` + `abs()`); the two findings are independent. See FIN-I-001.

---

## FINDING-FIN-H-001 — CERTIFIABLE (recon — no defect) — (Phase 3 Group H — Journal Entry Integrity)

**Group H = Journal Entry Integrity. The double-entry invariant is enforced and live-verified — CERTIFIABLE.**

Group H recon (2026-06-23). `GET /finance/journals` → live **200** (reference/
description/lines; the prior list-500 was FINDING-007-014, CLOSED). Integrity
controls present and sound:
- Balanced-journal enforcement: `utils/double-entry.ts assertLinesBalanced` — pure
  Σdebit==Σcredit, throws `UNBALANCED_JOURNAL` (422) before any `journalEntry.create`.
- Period-lock: `assertPeriodOpen`/`ensureOpenPeriod` (FIN-007-005) — closed/locked
  posting blocked (proven in Group C cert).
- Posting policy: `PostingPolicyService` (account-lock / system-posting /
  multi-currency) from the trust-write arc.
- Trial-balance integrity (Σdebits=Σcredits) live 200 (Group C / FIN-I-001).
Verdict: Journal Entry Integrity CERTIFIABLE now — propose a cert test
(balanced-post 201, unbalanced→422, closed-period→reject, journals read). No defect
logged. Logged: 2026-06-23.

---

## FINDING-FIN-TRUST-001 — VERIFIED FUNCTIONAL / invariant FAILED (2026-06-23) — (Phase 3 Trust Compliance — three-way reconciliation)

**Trust three-way reconciliation is built and reads work, but the core three-way compute (a write) was not exercised in read-only recon — uncertified.**

Trust Compliance recon (2026-06-23; original Phase 3 Finance/Trust/Payroll domain,
not a v3.1 lettered group). `GET /trust/reconciliations` → live **200** `[]`; routes
for list / `:runId/matches` / `record` / `three-way` (`runThreeWayReconciliation`)
all mounted with `trust.view/record_reconciliation` RBAC. Trust WRITES
(deposit/withdrawal/transfer/interest) already certified Phase 1 Group 7 (8/8).
Gap: `POST /trust/reconciliations/three-way` is a compute/write and was NOT fired
(read-only recon), so the bank↔ledger↔control three-way invariant (ADR-004) is
UNVERIFIED. No defect found. Needs a controlled write-verification session (seed a
reconciliation, assert matched/unmatched + variance) before cert. Logged: 2026-06-23.

### VERIFICATION (2026-06-23) — endpoint works; invariant FAILED
Fired `POST /trust/reconciliations/three-way` (MANAGING_PARTNER, onrender) on account
`cmpynp1p10000a4xiwdzxommt` ("Client Trust Account — Main"): **201**, `ReconciliationRun`
+ 3 `ReconciliationMatch` persisted, status FLAGGED. The compute is **VERIFIED
FUNCTIONAL** — it sums bank/trust/client, computes the 3 variances, persists, and
correctly flags. BUT the integrity invariant **FAILED**: `trustTotal=4,129,000` vs
`clientTotal=29,000` → `trustVsClient` variance **4,100,000** (`bankTotal=0`, no bank
statement). The trust ledger does not reconcile to the client sub-ledger — logged as
**FIN-TRUST-002**. Net: the three-way endpoint is certifiable; the underlying data
integrity is OPEN (FIN-TRUST-002). Verified: 2026-06-23.

---

## FINDING-FIN-TRUST-002 — OPEN — HIGH — (Phase 3 Trust Compliance — trust ledger ≠ client sub-ledger; ~4.1M unallocated)

**Three-way reconciliation on the Main trust account shows the trust ledger total ≠ the client sub-ledger total — ~4,100,000 not allocated to any client/matter (potential ADR-004 commingling concern).**

Surfaced 2026-06-23 by the FIN-TRUST-001 three-way write-verify. Account
`cmpynp1p10000a4xiwdzxommt` ("Client Trust Account — Main", currentBalance 4,129,000).
Live `POST /trust/reconciliations/three-way` (statementDate 2026-06-23, tolerance 0) →
201, status FLAGGED:
- `bankTotal = 0` (no bank statement imported — expected)
- `trustTotal = 4,129,000` (Σ `trustTransaction` credit−debit; equals account balance)
- `clientTotal = 29,000` (Σ `clientTrustLedger` credit−debit)
- `trustVsClient` variance = **4,100,000**

So ~4.1M sits at the trust-account level with NO corresponding client/matter sub-ledger
allocation. Under ADR-004 every trust dollar must be allocated to a client (trust ledger
== client sub-ledger). Candidates: (a) seed/demo bulk deposit recorded at account level
without client allocation (data artifact), or (b) a deposit path that writes
`trustTransaction` but not `clientTrustLedger` (code defect). **NOT investigated or fixed
this session** (verify-only scope). Next step: trace deposits on this account — confirm
whether they create `clientTrustLedger` rows — to determine data-vs-code root cause
before any remediation. Logged: 2026-06-23.

### INVESTIGATION + SCOPE DECISION (2026-06-24) — "verify + defer to seed"
Read-only investigation: every `trustTransaction` on the Main account carries a `clientId`
(funds ARE allocated). `TrustTransactionService.create` calls
`ClientTrustLedgerService.applyDelta` **unconditionally** (`:460`), which writes the full
delta to `clientTrustLedger` (`:189-192`); `TrustInterestService` (`:233`) does likewise.
So the **current code keeps both ledgers in sync**; the 4.1M gap is **historical data** from
deposits created BEFORE that wiring (FINDING-007-002, commit 4135720, ~2026-06-18).

**Verified live (2026-06-24, controlled, ADR-003-preserving):** on the clean "Litigation"
account, a deposit of 5,000 via `POST /trust/transactions` → `trustTotal=5,000`,
`clientTotal=5,000`, `trustVsClient=0`; a compensating WITHDRAWAL of 5,000 → both back to 0,
balance 0, `trustVsClient=0`. Both inflow and outflow paths sync the sub-ledger. No audit
records deleted (net-zero reversing entries only).

**Scope (owner-approved):** current code is correct → do NOT hand-backfill/rebuild the live
demo `clientTrustLedger` (risky data surgery; `clientTrustLedger` has no `trustTransactionId`
FK). The stale historical data is resolved by the planned seed rebuild (CLAUDE.md §12).
**Regression guard:** `21_validation.seed.ts` (built with the seed architecture) must assert
`trustVsClient == 0` per seeded trust account, catching this drift class at seed time.
**Status: remains OPEN — verified code-correct; auto-resolved when the seed rebuild lands.**
(Deviation noted: a standalone live cert test was intentionally NOT added — it would
accumulate immutable-audit rows on every run; the seed-validation assertion is the durable,
non-polluting guard.)

---

================================================================================
# PART IV — FRONTEND PARITY REGISTER (Principle 5)
================================================================================

Per CLAUDE.md §2 Principle 5 (added 2026-06-23): every CLOSED backend finding is
audited for "can a user actually see and use this in the browser?" — VISIBLE /
PARTIAL / MISSING. Every PARTIAL or MISSING gap is logged below as a
FINDING-FRONT-XXX. **Frontend work is NOT STARTED on any of these — they are
tracked for visibility and scheduled only on explicit instruction.** This register
is updated every session as gaps close.

Retroactive audit performed 2026-06-23 against `apps/web/src` (Next.js app router).

---

## FINDING-FRONT-001 — CLOSED (2026-06-24) — MEDIUM

**A user cannot record or void a VAT adjustment from the browser, and existing rows render with a blank description.**
- Parent finding: FINDING-FIN-E-002 (VatAdjustment model + persistence) — CLOSED (d961779)
- Current UI state: Tax → VAT tab has a "VAT Adjustments" card that LISTS rows from
  `GET /finance/tax/vat/adjustments` (now returns real data). The "+ Record
  Adjustment" button is a plain `<Button>` with no `onClick`/form. No void action.
- Gap: (1) no create form — cannot POST an adjustment from the UI; (2) field
  mismatch — the page type expects `description`/`currency`, but the API returns
  `reason` and has no `currency`, so the Description column is blank and
  `formatCurrency(amount, undefined)` is used; (3) no void button (the API
  `voidVatAdjustment` is unreachable from the UI).
- File(s): `apps/web/src/app/(app)/app/tax/page.tsx` (≈ lines 23–26, 104–106, 272–293)
- Frontend work: NOT STARTED — awaiting explicit instruction
- Severity: MEDIUM (secondary accounting workflow)
- Logged: 2026-06-23
- **CLOSED (2026-06-24):** `tax/page.tsx` — "+ Record Adjustment" wired to a form →
  `POST /finance/tax/vat/adjustments` (type/amount/reason/reference/adjustmentDate);
  table field mismatch fixed (`description`→`reason`, dropped phantom `currency`,
  `createdAt`→`adjustmentDate`); per-row **Void** action → `…/:id/void`. Web tsc exit 0.

---

## FINDING-FRONT-002 — CLOSED (2026-06-24) — HIGH

**Trust withdrawal, transfer-to-office, and interest posting have no UI — only deposit is reachable in the browser.**
- Parent finding: Trust write fixes (deposit/withdrawal/transfer/interest UNBLOCKED
  & VERIFIED LIVE, 18 Jun 2026) + FINDING-007-002 (matter overdraw race, CLOSED
  4135720 — the overdraw guard fires on withdrawal, which has no UI to trigger it)
- Current UI state: `/app/trust` lists accounts + has a "New Trust Account" form and
  a link to `/app/trust/deposit` (deposit form only). Page text mentions "Transfers
  to office account require written client authority" but there is no transfer form.
- Gap: withdrawal, transfer-to-office, and interest-posting journals — all
  working/verified at the API — cannot be initiated from the browser. The overdraw
  protection (007-002) is therefore not user-exercisable via UI.
- File(s): `apps/web/src/app/(app)/app/trust/` (only `page.tsx` + `deposit/page.tsx`
  exist; no `withdraw`/`transfer`/`interest` routes)
- Frontend work: NOT STARTED — awaiting explicit instruction
- Severity: HIGH (core trust-accounting workflow; partial money-movement surface)
- Logged: 2026-06-23
- **CLOSED (2026-06-24):** added three pages modeled on the deposit page —
  `/app/trust/withdraw` (`POST /trust/transactions` type WITHDRAWAL),
  `/app/trust/transfer` (`POST /trust/transfers/to-office`), `/app/trust/interest`
  (`POST /trust/interest`) — plus Withdraw/Transfer/Interest header links on
  `/app/trust`. Backends already certified (Group 7, 8/8 trust writes). Web tsc exit 0.

---

## FINDING-FRONT-003 — CLOSED (2026-06-24) — MEDIUM

**Proformas, retainers, payment reminders, and billing notifications have no UI despite full backend models.**
- Parent finding: FINDING-006-002 (billing models authored: ProformaInvoice,
  Retainer, RetainerApplication, PaymentReminder, BillingNotification, BillingExport)
  — CLOSED (migration 20260611161954)
- Current UI state: `/app/billing` handles Invoices and Quotations
  (quotation→convertToInvoice) only. No proforma list/create, no retainer
  management/application, no payment-reminder scheduling/list, no billing-notification
  view.
- Gap: four billing sub-domains exist end-to-end at the API/schema layer but are
  entirely absent from the web app.
- File(s): `apps/web/src/app/(app)/app/billing/` (no proforma/retainer/reminder routes)
- Frontend work: NOT STARTED — awaiting explicit instruction
- Severity: MEDIUM (secondary billing workflows; invoices are the primary path)
- Logged: 2026-06-23
- **CLOSED (2026-06-24):** four new sub-pages under `/app/billing/` — `proformas`
  (list + create with line items → `POST /billing/proformas`), `retainers`
  (`POST /billing/retainers`), `reminders` (`POST /billing/reminders`, invoice +
  channel/tone), `notifications` (`POST /billing/notifications`) — each list + create,
  linked from a new sub-features nav row on `/app/billing`. Web tsc exit 0.

---

### FRONTEND SPRINT COMPLETE (2026-06-24)
All seven FINDING-FRONT items (FRONT-001…007) are CLOSED — VAT adjustments, trust
withdraw/transfer/interest, billing proformas/retainers/reminders/notifications,
accounting periods, HR disciplinary, department management, and eTIMS error surfacing.
Each built lean against an already-certified backend, web `tsc --noEmit` exit 0, committed
per item. Per SOP, next steps are seed architecture (§12) then Phase 2 Playwright.

---

## FINDING-FRONT-004 — CLOSED (2026-06-24) — MEDIUM

**No accounting-period management UI — periods auto-create on post, but view/close/lock (now meaningful) is not exposed.**
- Parent finding: FINDING-007-005 (ensureOpenPeriod unifies period enforcement;
  close/lock now meaningful) — CLOSED (70c2db9)
- Current UI state: `/app/finance` tabs = overview/invoices/journals/accounts/
  receipts/statements. Posting works (period lazily auto-created, invisible to the
  user). There is no tab/page to list AccountingPeriods or to close/lock a period.
- Gap: the close/lock capability the fix made meaningful has no UI; month-end period
  control cannot be performed in the browser.
- File(s): `apps/web/src/app/(app)/app/finance/page.tsx` (no periods tab)
- Frontend work: NOT STARTED — awaiting explicit instruction
- Severity: MEDIUM (month-end controllership function)
- Logged: 2026-06-23
- **CLOSED (2026-06-24):** new `/app/finance/periods` page (mirrors the reconciliation
  page) — lists `GET /finance/periods` (month/year/status), per-OPEN-period **Close**
  action → `POST /finance/period-close {month,year}`; linked from the finance overview
  quick-links. Web tsc exit 0.

---

## FINDING-FRONT-005 — CLOSED (2026-06-24) — MEDIUM

**No disciplinary UI — the disciplinary endpoint works but cannot be reached from the browser.**
- Parent finding: FINDING-008-003 (disciplinary employee-id fix + Employee seed) —
  CLOSED (d8c7e12)
- Current UI state: HR module (`/app/hr`, employees, performance, onboarding,
  payroll) has no disciplinary list, form, or employee-detail disciplinary section
  (grep for "disciplinary" in `apps/web/src` = 0 hits).
- Gap: disciplinary actions cannot be created or viewed in the UI.
- File(s): `apps/web/src/app/(app)/app/hr/` (no disciplinary route/section)
- Frontend work: NOT STARTED — awaiting explicit instruction
- Severity: MEDIUM (HR workflow)
- Logged: 2026-06-23
- **CLOSED (2026-06-24):** new `/app/hr/disciplinary` page — lists `GET /hr/disciplinary`,
  create-case form → `POST /hr/disciplinary` (employeeId/reportedById from `/hr/employees`
  User ids per FINDING-008-003, title/description/incidentDate/severity/category); linked
  from the HR quick-actions. Web tsc exit 0.

---

## FINDING-FRONT-006 — CLOSED (2026-06-24) — LOW

**No department-management UI — the new Department schema (status/hierarchy/manager/archive) surfaces only as a read-only name string.**
- Parent finding: FINDING-008-002 (Department fields: status/hierarchy/manager/
  audit/metadata) — CLOSED (dcdf568) + reconciled migration (d961779)
- Current UI state: Department appears only as a name string (employee detail,
  onboarding dropdown, payroll grouping). No page to create/edit departments, set
  `status` (ACTIVE/INACTIVE/ARCHIVED), assign a manager, or set parent (hierarchy).
- Gap: the new department schema capabilities have no management surface.
- File(s): `apps/web/src/app/(app)/app/hr/` (no departments route)
- Frontend work: NOT STARTED — awaiting explicit instruction
- Severity: LOW (configuration/reference data; name display already works)
- Logged: 2026-06-23
- **CLOSED (2026-06-24):** new `/app/hr/departments` page — lists `GET /hr/departments`,
  create form → `POST /hr/departments` (name/code/description/costCenterCode), per-row
  **Archive** → `POST /hr/departments/:id/archive {reason}`; shows `status`
  (ACTIVE/INACTIVE/ARCHIVED). Linked from HR quick-actions. Web tsc exit 0.

---

## FINDING-FRONT-007 — CLOSED (2026-06-24) — LOW

**eTIMS fiscalize failures (including the new 422 PIN-required guard) are swallowed silently — the user gets no feedback.**
- Parent finding: FINDING-FIN-E-004 (tenant KRA PIN guarded before eTIMS transmit →
  422 ETIMS_SUPPLIER_PIN_REQUIRED) — CLOSED
- Current UI state: Tax → eTIMS tab has a "Fiscalize →" action
  (`POST /finance/etims/invoices/:id/fiscalize`). Its `catch {}` is `// silent`, so a
  422 PIN-required (or any failure) produces no message — the row simply stays
  pending with no explanation.
- Gap: the PIN-required guard fires correctly server-side but the reason is not
  surfaced to the user; they cannot tell why fiscalization did nothing.
- File(s): `apps/web/src/app/(app)/app/tax/page.tsx` (`fiscalize`, ≈ lines 140–152)
- Frontend work: NOT STARTED — awaiting explicit instruction
- Severity: LOW (error-surfacing/UX; guard itself works)
- Logged: 2026-06-23
- **CLOSED (2026-06-24):** `tax/page.tsx` `fiscalize` no longer swallows errors —
  catch surfaces `(err as ApiError).message` into an `etimsError` banner on the eTIMS
  tab, so the 422 `ETIMS_SUPPLIER_PIN_REQUIRED` (and any failure) is shown. Web tsc exit 0.

---

## MASTER FRONTEND-PARITY REGISTER (updated 2026-06-23)

| Finding | Backend Status | Frontend Status | FINDING-FRONT ref |
|---|---|---|---|
| FINDING-007-010 — invoice GL posting | CLOSED (verified) | VISIBLE — posted journal appears in Finance → Journal Entries | — |
| FINDING-007-002 — trust overdraw race | CLOSED (verified) | N/A integrity guard — exercised via withdrawal, which is MISSING | FRONT-002 |
| FINDING-007-005 — period enforcement | CLOSED (verified) | PARTIAL — auto-create works; no view/close/lock UI | FRONT-004 |
| FINDING-008-001 — HR permission gate | CLOSED (verified) | VISIBLE — HR pages load/function for HR_MANAGER | — |
| FINDING-008-002 — Department schema | CLOSED (verified) | PARTIAL — name shown read-only; no mgmt UI for status/hierarchy/manager | FRONT-006 |
| FINDING-008-003 — disciplinary fix | CLOSED (verified) | MISSING — no disciplinary UI | FRONT-005 |
| FINDING-FIN-E-001 — VAT return endpoints | CLOSED (verified) | VISIBLE — Tax → VAT monthly summary + KPIs | — |
| FINDING-FIN-E-002 — VatAdjustment | CLOSED (verified) | PARTIAL — lists rows; no create/void, field mismatch | FRONT-001 |
| FINDING-FIN-E-004 — eTIMS PIN guard | CLOSED (verified) | PARTIAL — guard fires; failure reason swallowed in UI | FRONT-007 |
| FINDING-009-001 — reporting audit fix | CLOSED (verified) | VISIBLE — reporting handlers return 200; reports render | — |
| Billing schema (proforma/retainer/reminder/notification) | CLOSED (verified) | MISSING — no UI for these four sub-domains | FRONT-003 |
| Trust writes (deposit/withdrawal/transfer/interest) | CLOSED (verified) | PARTIAL — deposit only; withdrawal/transfer/interest MISSING | FRONT-002 |

Audit summary: 12 closed findings reviewed → 4 VISIBLE, 5 PARTIAL, 2 MISSING, 1 N/A
(integrity). 7 FINDING-FRONT entries logged (FRONT-001…007). No frontend code
changed.
Logged: 2026-06-23.

---

## FINDING-INFRA-002 — OPEN — LOW
packages/database/tsconfig.json:8 has invalid
ignoreDeprecations:"6.0" for tsc 5.9.3 (TS5103).
Seed files in that package cannot use it as a typecheck
gate until fixed. Pre-existing. Fix separately.
Logged: 2026-06-23

## FINDING-INFRA-003 — OPEN — LOW
Root npx tsc --noEmit is not a valid monorepo typecheck
gate (~9,793 pre-existing errors from missing DOM/JSX
libs + broken test files). Valid gates are per-package
only. CLAUDE.md memory updated to reflect this.
Logged: 2026-06-23

## FINDING-MATTER-001 — OPEN — LOW
Matter.estimatedValue is not a physical column. By design,
MatterService.buildMatterMetadataForCreate preserves it in
metadata.estimatedValue (string) + metadata.currency (see
MatterService.ts:170-204). 06_matters.seed.ts follows the
same shape so the value round-trips in the UI.
Limitation: storing it in JSON makes it non-queryable /
non-indexable / non-aggregatable (e.g. "total pipeline
value" reporting) and untyped (string, not Decimal).
Decision (2026-06-28): KEPT in metadata for the seed —
adding a column now would be a dead column unless the whole
MatterService read/write path is refactored (the dead-field
trap), and is out of scope for a seed task.
Follow-up (separate, scoped session if reporting needs it):
add Matter.estimatedValue Decimal(18,2)? column + currency,
refactor MatterService create/update/read off metadata,
update validators/serializers + frontend (Principle 5),
and backfill existing metadata.estimatedValue into the
column. Migration must go through migrate dev → review →
migrate deploy (db push prohibited).
Logged: 2026-06-28

## FINDING-FIN-COA-001 — OPEN — MEDIUM
Chart-of-accounts code drift + an unordered subtype resolver
in the posting layer. Surfaced (not introduced) while writing
10_finance.seed.ts.

Two issues:
1. Dual AR code families. The provisioning seed
   (apps/api/src/modules/finance/coa.seed.ts /
   CoaService.seedDefaults) issues Accounts Receivable at code
   1100, but the posting engines (BillingPostingService /
   PaymentPostingService / FinancePostingService) get-or-create
   AR at code 1200 via ensureSystemAccount. WHT Receivable is
   also created at 1205 under the SAME subtype ACCOUNTS_RECEIVABLE.
   A fully-exercised tenant therefore has ≥2 (often 3) accounts
   carrying subtype ACCOUNTS_RECEIVABLE.
2. Unordered subtype resolution. TrustTransactionService.
   resolveAccountId (TrustTransactionService.ts:671-693) resolves
   accounts by `findFirst({ tenantId, subtype, isActive })` with
   NO ordering. With multiple ACCOUNTS_RECEIVABLE accounts, the
   trust office-settlement path (line 626) picks one
   non-deterministically — a latent correctness risk.

Related code-vs-code drift also observed: VAT input is at 2110
(provisioning) vs 1300 (FinancePostingService lookup); WHT is at
1205 (BillingPostingService) vs 1350 (FinancePostingService
fallback). These are pre-existing and out of scope for the seed.

Seed decision (2026-06-28): 10_finance.seed.ts follows the
posting-engine codes (1200 AR, 1205 WHT, 4000 income, 2100 VAT
output, 1500 trust bank, 2010 trust liability, 2300 client
deposits) — the paths actually exercised at runtime — so seeded
firms are posting-ready with no auto-create drift. The seed does
NOT seed provisioning's 1100 AR, so it introduces only the
engine-mandated 1200/1205 ACCOUNTS_RECEIVABLE pair (the dup that
already exists in production after any invoice + WHT cert).

ADR-004 guard applied: Client Trust Liability was deliberately
NOT seeded at 2300 (the spec's original code). PaymentPostingService
hard-owns 2300 = Client Deposits (CLIENT_DEPOSITS) and overwrites
the subtype of any isSystem row at that code on first post
(payment-posting.service.ts:384; billing-posting.service.ts:288).
Seeding trust liability at 2300 would have flipped its subtype to
CLIENT_DEPOSITS on the first receipt, leaving no TRUST_LIABILITY
account → trust posting 500 (TRUST_LIABILITY_ACCOUNT_NOT_CONFIGURED)
and client deposits mislabelled as trust funds. Trust liability is
seeded at 2010 (canonical TRUST_LIABILITY); trust resolves by
subtype so the code is transparent.

Follow-up (separate, scoped finance session — NOT a seed task):
(a) converge the two AR code families onto a single AR account, or
formalise 1200 as canonical and retire 1100; (b) make the trust
subtype resolver deterministic (order by code, or resolve system
accounts by an explicit code map rather than subtype findFirst);
(c) reconcile the 2110/1300 and 1205/1350 code drift. Any schema/
data change goes through migrate dev → review → migrate deploy
(db push prohibited).
Logged: 2026-06-28

---

## SEED-PROGRESS-NOTE — Seed layers 01-12 complete (2026-06-28)

Seed architecture (CLAUDE.md §12) layers 01 (tenants) through 12
(payroll) are built and validated against Neon branch
ep-withered-haze (master.seed.ts, exit 0, idempotent, demo-gated).
Committed locally on `main`, 2 commits ahead of origin (push held —
see COMPLETED_GATES.md). Layer 13 (HR) is in review at time of writing.

Findings surfaced during the seed build are already logged above and
confirmed present:
- FINDING-MATTER-001 (OPEN, LOW) — logged.
- FINDING-FIN-COA-001 (OPEN, MEDIUM) — logged.
No new findings introduced by layers 11 (trust) or 12 (payroll); both
verified balanced live (trust three-way balanced; payroll GL
DR 270,000.00 = CR 270,000.00).
Logged: 2026-06-28
