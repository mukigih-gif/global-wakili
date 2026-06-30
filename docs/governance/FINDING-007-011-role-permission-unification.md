# FINDING-007-011 — Role / Permission System Unification

**Gate:** 6 — Security Verification
**Logged:** 2026-07-01
**Status:** SCOPED — decisions recorded, implementation NOT started
**Related:** FINDING-008-001 (F-14), FINDING-007-009, `docs/governance/AUTHORIZATION_DECISIONS.md`

> This is a read-only scoping/architecture document. No code was changed in
> producing it. It maps the problem fully and records the decisions to be
> executed in a dedicated future implementation session.

---

## Executive summary

There are **three independent "role" naming axes** and **three independent
"permission resolution" mechanisms** in play. They overlap inconsistently. The
two silent auth bugs already closed this project (FINDING-008-001,
FINDING-007-009) are not isolated — they are symptoms of one structural fact:

> **The granular permission strings declared in the Finance/HR/Payroll/Payment
> permission maps are never actually evaluated, because the array they read
> (`req.user.permissions`) is never populated. Those four modules silently
> degrade to a hard-coded role-name allowlist — and the role names they allow
> are produced by only *one* of the two role seeders.**

---

## 1. The role systems — complete map

### Axis A — `SystemRole` enum (platform-level)
`schema.prisma:5522` → `SUPER_ADMIN, SYSTEM_ADMIN, SYSTEM_SUPPORT, NONE`.
Set on `User.systemRole`. Used for the super-admin bypass everywhere. Not
contested — this one is clean.

### Axis B — `TenantRole` enum (tenant-level, UPPERCASE, fixed 9)
`schema.prisma:5529` → `FIRM_ADMIN, BRANCH_MANAGER, ADVOCATE, ASSOCIATE,
ACCOUNTANT, CLERK, CLIENT, GUEST, NONE`. Set on `User.tenantRole`. Carried in
the JWT and on `req.user.tenantRole`. Clean as an enum, but is checked
inconsistently alongside Axis C.

### Axis C — `Role.name` free-string (the DB `Role` table) — seeded TWO different ways

This is the core problem. Two seeders write *different role names with different
casing and different sets* into the same `Role.name` column:

| | `00_bootstrap.ts` → `ROLE_DEFINITIONS` | `seed-default-roles.ts` → `ROLE_SPECS` |
|---|---|---|
| Casing | **lowercase** | **UPPERCASE** |
| File | `packages/database/prisma/seeds/00_bootstrap.ts:145` | `apps/api/src/scripts/seed-default-roles.ts:33` |
| Names | `firm_admin, branch_manager, accountant, CFO, advocate, associate, clerk, client` | `FIRM_ADMIN, MANAGING_PARTNER, SENIOR_PARTNER, PARTNER, ASSOCIATE, ADVOCATE, ACCOUNTANT, HR_MANAGER, RECEPTIONIST, PARALEGAL, CLERK` |
| Permission wiring | DB `connect` (dot keys) | DB `connect` (dot keys) |
| Who calls it | `master.seed.ts:155` + `01_tenants.seed.ts:106` (`provisionTenantRbac`) — **the seed/Playwright path** | `PlatformOnboardingService.ts:183` + `seed-tenants.ts:84` — **the real runtime tenant-onboarding path** |

**Consequence:** a tenant created by the **seed suite** has roles named
`firm_admin`/`accountant` (lowercase, 8 roles). A tenant **onboarded in
production** has roles named `FIRM_ADMIN`/`ACCOUNTANT`/`HR_MANAGER` (uppercase,
11 roles). `CFO`, `MANAGING_PARTNER`, `HR_MANAGER` exist in only one of the two.
Note bootstrap's lone `CFO` (uppercase exception) — added precisely to satisfy
a downstream allowlist, evidence of the systems leaking into each other.

This alone means **Playwright (seeded tenants) and production (onboarded
tenants) authorize differently** — a test-vs-prod parity hole that will bite
Phase 2.

---

## 2. The permission-resolution mechanisms — complete map

### Mechanism ① — `requirePermissions` (rbac.ts) — DB-backed, the correct one
`apps/api/src/middleware/rbac.ts`. On each request it queries the DB
(`getGrantedPermissions`, rbac.ts:154) for the user's `roles.permissions` +
direct `permissions`, builds a `Set` of `resource.action` **dot** keys, supports
wildcards (`resource.*`, `*.action`, `*.*`), caches on
`req.grantedPermissionsCache`. Source of truth = `Role`/`Permission` tables.
Permission catalog = `config/permissions.ts` (dot keys).

**Used by 21 of 25 route modules:** client, vendor, analytics, calendar,
document, contract, trust, billing, ai, court, task, compliance, reporting,
approval, queue, reception, platform, procurement, matter, integrations,
notifications.

> Note: `trust.routes.ts` uses Mechanism ① (`requirePermissions`).
> `TrustPermissionMap.requireTrustPermission` is **defined but never wired to a
> route** (only referenced in itself + governance doc) — dead-ish, though
> `TrustPermissionMap` is the *only* map that also reads
> `req.grantedPermissionsCache`, so it would partially work if used.

### Mechanism ② — module maps reading `req.user.permissions` — structurally broken
`hasFinancePermission` / `hasHrPermission` / `hasPayrollPermission` /
`hasPaymentPermission` all call a local `getUserPermissions(req)` that reads
`req.user.permissions` (and `req.permissions`).

**Neither field is ever set.** Proof chain:
- `auth.ts` → `loadAuthenticatedUser` (auth.ts:151-170) builds `req.user` with
  `roleIds/roleNames/roles/tenantRole/systemRole/isSuperAdmin` — **no
  `permissions` key**.
- `jwt.ts` → `AuthTokenPayload` (jwt.ts:3-16) has **no `permissions` field**;
  `verifyToken` never adds one.
- Repo-wide search for any population of `user.permissions` → none.

So in Mechanism ②, `getUserPermissions()` **always returns `[]`**. The granular
`requireFinancePermission('finance.post_journal')` etc. checks can *only* pass
through the function's hard-coded **role-name allowlist + super-admin bypass**.
The declared permission keys are decorative.

**Used by 4 route modules** (`finance`, `hr`, `payroll`, `payments`), each with
its own divergent allowlist and its own key format:

| Map | Key format | Example | In catalog? | Role allowlist actually enforced |
|---|---|---|---|---|
| Finance | dot (from catalog) + `finance:*` | `finance.post_journal` | yes | super/system, `MANAGING_PARTNER`, `CFO`, `tenantRole===FIRM_ADMIN` |
| HR | **colon, 3-seg** | `hr:employee:view` | **no** | super/system, `MANAGING_PARTNER`, `HR_MANAGER`, `FIRM_ADMIN` (roles/roleNames/role/tenantRole) |
| Payroll | **colon, 3-seg** | `payroll:batch:approve` | **no** (catalog has dot `payroll.view_payroll`) | super/system, `MANAGING_PARTNER` only — **no FIRM_ADMIN, no CFO** |
| Payments | **colon, 2-seg** | `payments:create_receipt` | **no** (`payments` resource doesn't exist in catalog) | super/system, `FIRM_ADMIN, MANAGING_PARTNER, FINANCE_MANAGER, CFO, PLATFORM_ADMIN` (role + tenantRole) |

Three different key grammars, none of the HR/payroll/payment keys exist in the
catalog, and four different, hand-maintained, drifting role allowlists.

### Mechanism ③ — `req.grantedPermissionsCache` bridge
Only `TrustPermissionMap` reads it. A partial, one-off attempt to reconcile ②
back onto ①. Not used elsewhere.

---

## 3. Every known inconsistency traces to this root cause

| Symptom (already found) | Surface mechanism | Same root cause? |
|---|---|---|
| **FINDING-008-001 / F-14** — HR access broke on dot-vs-colon permission string mismatch; "fixed" by a role-name allowlist in the HR map | Mechanism ② + colon keys not in catalog | ✅ Yes — ② can't see DB perms, so HR was forced onto a role-name allowlist |
| **FINDING-007-009** — Finance/payment denied a `FIRM_ADMIN` whose custom `Role.name` was `"ADMIN"`; fixed by *also* checking the `tenantRole` enum | Mechanism ② allowlist keyed on the wrong axis (C vs B) | ✅ Yes — allowlist straddling Axis B and Axis C |
| **"Always consider the CFO"** — finance gates must special-case `Role.name === 'CFO'` | Mechanism ② allowlist + the lone bootstrap `CFO` exception | ✅ Yes |
| **Payroll** allows neither `FIRM_ADMIN` nor `CFO` | Mechanism ② allowlist drift | ✅ Yes — latent bug, not yet reported |
| **Seed vs onboarding** role-name casing split | Axis C dual seeders | ✅ Yes — latent test/prod parity bug |
| `19_security.seed.ts` blocked | can't seed fixtures for an unstable permission model | ✅ Downstream of this |

The HR and Finance fixes were **local patches to Mechanism ②'s allowlist**. They
stopped the bleeding without addressing that ② never reads permissions at all.

---

## 4. Migration strategy options

**Recommended end-state for all options:** one mechanism (① rbac.ts, DB-backed
dot keys), one role-naming convention, the catalog as the single permission
registry.

### Option 1 — Converge everything onto Mechanism ① (rbac.ts), delete Mechanisms ②/③  — CHOSEN
- **What:** Add the missing `hr.*`, `payroll.*`, `payments.*` permission
  definitions to `config/permissions.ts` (dot keys); update the 3 colon-grammar
  key sets to dot; in the 4 route files, replace
  `require{Finance,Hr,Payroll,Payment}Permission(x)` with
  `requirePermissions('module.action')`; delete the four map guard functions
  (keep constants only if referenced); ensure roles grant the new perms.
- **Pros:** One mechanism, one grammar, DB-driven so admins can actually
  re-grant; kills the dead-allowlist class of bug permanently; matches the 21
  modules already correct; aligns with `AUTHORIZATION_DECISIONS.md` which already
  declares ① the standard.
- **Cons:** Largest diff (4 modules' routes); must back-fill role→permission
  grants for HR/payroll/payment in **both** seeders or roles lose access; needs
  a real cert pass per module.
- **Risk:** Medium. Mitigated because ① is proven on 21 modules.

### Option 2 — Keep the maps, but feed them real data (populate `req.user.permissions`)
- **What:** In `auth.ts`, load the user's granted permissions and attach
  `req.user.permissions`; normalize all maps to one key grammar so the strings
  match.
- **Pros:** Smaller change to route files; maps keep their per-module ergonomics.
- **Cons:** Leaves 4 parallel mechanisms alive (still drift-prone); per-request
  perm load duplicates what rbac.ts already does (double DB work or shared cache
  plumbing); still must fix the colon/dot grammar + catalog gaps anyway; doesn't
  fix the dual-seeder casing split. Half-measure.
- **Risk:** Medium, lower reward.

### Option 3 — Status quo + formalize role-name allowlists  — REJECTED
- Codify the allowlists as the intended design. Reject: enshrines drift, can't
  be re-granted without code deploys, doesn't fix seed/prod casing, leaves
  declared permissions as dead code. Violates the project's own ADR/governance.

### Cross-cutting (needed by Options 1 & 2 regardless)
- **Unify Axis C:** pick ONE seeder/role-name convention (UPPERCASE
  `seed-default-roles.ts` set, since that's what production onboarding already
  emits) and make `00_bootstrap.ts`/`provisionTenantRbac` use the same set, so
  seeded and onboarded tenants are identical. Prerequisite to
  `19_security.seed.ts`.
- **Decide Axis B vs C relationship:** recommend `TenantRole`/`SystemRole` enums
  for coarse identity + super-bypass; `Role`→`Permission` (Axis C grants) as the
  *only* fine-grained authority; stop matching on `Role.name` strings entirely.

### Recommendation (ADOPTED)
**Option 1 + the two cross-cutting items**, sequenced as its own session. This is
the path `AUTHORIZATION_DECISIONS.md` already names as the standard, and it's the
only option that makes declared permissions real and re-grantable.

---

## Scope / blast radius for the eventual fix
- **Definitely changes:** `config/permissions.ts`, `FinancePermissionMap.ts`,
  `hr-permission.map.ts`, `payroll-permission.map.ts`,
  `payment-permission.map.ts`, `finance/hr/payroll/payment .routes.ts`,
  `00_bootstrap.ts`, `seed-default-roles.ts`.
- **Likely touched:** `auth.ts`/`jwt.ts` (only if Option 2 — N/A under chosen
  Option 1), `02_users.seed.ts`, role→permission grants, `19_security.seed.ts`.
- **Untouched:** the 21 modules already on Mechanism ①.

---

## Decisions recorded (2026-07-01)

1. **Resolution mechanism:** Option 1 — converge all 4 modules
   (finance/hr/payroll/payments) onto Mechanism ① (rbac.ts), delete the broken
   module maps entirely.
2. **Role-name convention:** UPPERCASE (`seed-default-roles.ts` set) wins —
   matches production onboarding. `00_bootstrap.ts` must be updated to match,
   closing the seed/prod parity hole.

## Sequenced implementation (own dedicated session, NOT started)
- (a) unify Axis C seeders to UPPERCASE
- (b) catalog back-fill: add `hr.*` / `payroll.*` / `payments.*` dot-key
  permissions to `config/permissions.ts`
- (c) migrate 4 route modules to `requirePermissions()`
- (d) per-module cert (admin allowed / unprivileged denied, no over-grant —
  same rigor as FINDING-007-009's verification)
- (e) `19_security.seed.ts` unblocked
- (f) Phase 2 Playwright

**Status:** SCOPED, decisions made, implementation NOT started.
