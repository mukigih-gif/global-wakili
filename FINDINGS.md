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

## FINDING-006-002

**Billing models absent from schema.prisma — services reference non-existent delegates**

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
- **Status:** OPEN — blocking full Wave A/B certification
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

## FINDING-007-005 — AMENDED — ESCALATED TO HIGH

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

## FINDING-007-008 — OPEN — HIGH

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

## FINDING-007-009 — OPEN — MEDIUM

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

## FINDING-007-010 — OPEN — HIGH

**Invoices created via the API are never journal-posted —
billing-posting (postInvoiceIssued) is not HTTP-reachable**

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
- **Status:** OPEN -- needs decision: wire the inline/convert routes
  to invoice.service.createInvoice (which posts), or post on a later
  lifecycle event (submit/approve). Verify before fixing.
- **Logged:** 2026-06-18

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

## FINDING-008-002 — OPEN — HIGH

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

## TODO-009 — DEFERRED — Governance docs not yet adopted
RELEASE_GOVERNANCE.md, ROLES_AND_RESPONSIBILITIES.md,
Handover Notes, Engineering Operating Agreement -- from GW-EOS
v4.0 suite. Deferred: matter more once a team exists beyond
single-session structure; adopting now with placeholder content
repeats the illustrative-data problem identified in the original
GW-EOS templates. Build when actually needed.
Status: DEFERRED, not blocking.
Logged: 2026-06-19

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
