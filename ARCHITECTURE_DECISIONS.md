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

End of File
