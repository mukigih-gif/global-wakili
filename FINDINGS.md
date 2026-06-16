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
