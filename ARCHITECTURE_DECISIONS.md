# ARCHITECTURE_DECISIONS.md

# Global Wakili Legal Enterprise

## Architecture Decision Register (ADR)

---

ADR-001

Decision:

Application-Level Tenant Isolation

Status:

Accepted

Reason:

Existing Prisma architecture is built around tenant-aware query enforcement.

Outcome:

All tenant-scoped operations must validate tenantId.

---

ADR-002

Decision:

Tamper-Evident Audit Chains

Status:

Accepted

Reason:

Legal and financial compliance requires immutable auditability.

Outcome:

Hash-chain architecture implemented.

Related Commit:

9732884

---

ADR-003

Decision:

Dedicated Trust Accounting Boundaries

Status:

Accepted

Reason:

Trust funds require stronger controls than general ledger activity.

Outcome:

TrustAccountId propagation enforced.

Related Commit:

76f8ecf

---

ADR-004

Decision:

Control Plane Isolation

Status:

Accepted

Reason:

Platform governance must remain separated from tenant workloads.

Outcome:

Separate provisioning architecture required.

---

ADR-005

Decision:

Notification Platform as First-Class Subsystem

Status:

Accepted

Reason:

Notifications affect every module.

Outcome:

Dedicated notification architecture required.

---

ADR-006

Decision:

Tenant-Isolated Document Storage

Status:

Accepted

Reason:

Legal documents contain highly sensitive information.

Outcome:

Private storage with signed URLs.

---

ADR-007

Decision:

Headless BI Architecture

Status:

Accepted

Reason:

Enterprise customers require external analytics consumption.

Outcome:

Read-only analytics APIs.

---

ADR-008

Decision:

Passive Time Capture Architecture

Status:

Accepted

Reason:

Future billing automation requires activity collection.

Outcome:

Event-driven architecture preferred.

---

ADR-009

Decision:

AI Governance Layer

Status:

Accepted

Reason:

AI outputs require review, auditing, and traceability.

Outcome:

Prompt auditing and artifact governance required.

---

ADR-010

Decision:

12-Gate Execution Model

Status:

Accepted

Reason:

Large-scale ERP delivery requires controlled execution.

Outcome:

All workstreams executed through gates.

---

ADR-011

Decision:

Truthfulness Gate for Public-Facing & Marketing Content

Status:

Accepted

Reason:

Public-facing content (landing page, marketing site, docs) had drifted from
reality — invented testimonials, unverifiable statistics ("500+ law firms",
"KES 2B+ trust funds protected", "99.9% uptime"), and advertised features not
yet built. Misrepresentation carries legal and reputational risk and lets
marketing diverge from the actual product unchecked.

Outcome:

Every public-facing claim must be truthful and verifiable. Specifically:

- Claims must be verifiable against repository evidence (CLAUDE.md status,
  FINDINGS.md, test results) or an owner-confirmed fact.
- Statistics must cite real numbers — no estimates or aspirational figures
  presented as current fact.
- Testimonials / social proof must be real and attributable — no invented quotes.
- Advertised-but-unbuilt features are treated as committed deliverables: the
  public page is the product spec/contract, so such features stay visible but
  MUST be logged in FINDINGS.md against a tracking TODO so the app catches up
  (see FINDING-LANDING-001).
- External-only facts (entity registration name, contact details, domains,
  social URLs, analytics/tracking IDs) must be owner-confirmed, never fabricated.

Scope: landing page, marketing site, documentation, and any externally
published material. Classified Class I (Documentation) per CHANGE_CONTROL.md
unless implementation code is involved.

Related:

TODO-012; FINDING-LANDING-001; FINDING-LANDING-002.

Logged: 2026-06-21.

---

ADR-012

Decision:

Billing Posting Accepted as a Parallel, Independently-Guarded Posting Mechanism

Status:

Accepted

Reason:

BillingPostingService.postInvoiceIssued posts invoice AR/income/VAT journals
directly, NOT through the shared TransactionEngine.postJournalAtomically used by
Trust and Payments posting. It therefore bypasses PostingPolicyService
(account-lock / allowManualPosting / multi-currency / systemPosting checks) and
FinanceIdempotencyService, compensating with its own balance, period, and
idempotency guards. Those guards are verified working (FINDING-007-010 closed:
balanced AR 11,600 / income 10,000 / VAT 1,600; idempotent re-run = 1 journal).
The standing concern (FINDING-007-013) is drift: two posting mechanisms
maintained independently can diverge over time.

Outcome:

The parallel billing-posting path is ACCEPTED as an intentional architecture, not
a defect, on these conditions:
- Billing posting MUST keep enforcing its own balance, period-lock, and
  idempotency guards (no un-guarded direct journal writes).
- Any change to shared posting rules (period-lock semantics, multi-currency
  policy, idempotency keys) MUST be mirrored in BillingPostingService in the same
  change, or explicitly noted N/A.
- Convergence onto the shared TransactionEngine remains a permitted future
  refactor but is NOT required; if undertaken it is its own scoped session with
  full re-certification of the billing->GL path.
This closes FINDING-007-013 by decision (accept), superseding its "needs ADR
either way" status.

Related:

FINDING-007-013; FINDING-007-010; ADR-004.

Logged: 2026-07-01.

---

End of File
