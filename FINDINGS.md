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

## FINDING-007-005 — OPEN — MEDIUM

**Accounting period create/close capability is non-functional — periods can
never be created, so a period can never actually be CLOSED/LOCKED**

- **Affected:** PeriodCloseService.closePeriod (findUnique -> 404 if the row does
  not exist, :43-53; then update). No code path anywhere creates an AccountingPeriod
  row (confirmed: no accountingPeriod.create/upsert/createMany in the codebase; not in
  provisioning, seeds, or migrations; 0 rows across all 3 tenants).
- **Impact:** Non-blocking for posting after FINDING-007-004 Gap B (missing period =
  open). BUT firms cannot lock a period: closePeriod 404s because the period row was
  never created, so PERIOD_LOCKED is currently unreachable. Period-close /
  month-end-lock is effectively unavailable.
- **Fix direction (not yet designed):** add a create/open-period path — e.g. auto-ensure
  the period row on first post or on tenant provisioning, and/or an "open period" admin
  endpoint; closePeriod should upsert-or-require accordingly.
- **Status:** OPEN -- follow-up to FINDING-007-004; surfaced during Gap B fix.
- **Logged:** 2026-06-17

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
