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
