# DEFINITION_OF_DONE.md

**Global Wakili Engineering Operating System (GW-EOS)**

- **Document:** DEFINITION_OF_DONE.md
- **Version:** 4.0
- **Status:** Authoritative
- **Classification:** Engineering Quality Governance
- **Owner:** Chief Architect

**Applies To:**

- Human Engineers
- AI Engineering Agents
- Technical Leads
- QA Engineers
- Security Engineers
- DevOps Engineers
- Certification Authority

---

## 1. Purpose

The Definition of Done (DoD) establishes the mandatory completion criteria for every engineering activity performed within the Global Wakili repository.

Its purpose is to ensure that engineering completion is measured by objective evidence rather than subjective judgement.

A task is considered **Done** only when it satisfies every applicable requirement defined in this document.

Implementation completion alone does not constitute completion.

---

## 2. Principles

The Definition of Done is governed by the following principles:

- Completion is evidence-based.
- Quality is mandatory.
- Documentation is part of implementation.
- Verification is required.
- Certification readiness is expected.
- No known critical regression may remain.
- Every change shall leave the repository in a better state.

---

## 3. Applicability

This document applies to:

- Features
- Enhancements
- Bug Fixes
- Refactoring
- Security Changes
- Infrastructure Changes
- Database Changes
- Documentation Updates
- Configuration Changes
- Release Activities

Every pull request and engineering session shall be evaluated against this Definition of Done.

---

## 4. General Completion Criteria

Work shall not be considered complete until all applicable requirements have been satisfied.

The minimum completion criteria are:

- Scope fulfilled.
- Architecture preserved.
- Code reviewed.
- Verification completed.
- Documentation updated.
- Risks identified.
- Certification assessment performed.

---

## 5. Functional Completion

The implemented functionality shall:

- satisfy approved requirements,
- exhibit deterministic behaviour,
- correctly handle expected workflows,
- correctly handle invalid inputs,
- fail safely,
- preserve backward compatibility unless an approved breaking change exists.

There shall be no known functional defects within the approved scope.

---

## 6. Architectural Completion

Every completed change shall:

- preserve module boundaries,
- preserve dependency direction,
- avoid hidden coupling,
- avoid duplicated business logic,
- follow repository conventions,
- align with approved architectural decisions.

Any architectural deviation shall be documented in ARCHITECTURE_DECISIONS.md through the process defined in CHANGE_CONTROL.md.

---

## 7. Code Quality Completion

Code shall demonstrate:

- readability,
- consistency,
- maintainability,
- explicit intent,
- strong typing,
- predictable control flow,
- minimal complexity.

The following are prohibited:

- dead code,
- commented-out implementations,
- speculative abstractions,
- duplicated logic,
- unexplained constants,
- hidden side effects.

---

## 8. Security Completion

Where applicable, verification shall confirm:

- authentication remains correct,
- authorization is enforced,
- permission boundaries are preserved,
- input validation exists,
- output encoding is appropriate,
- secrets are protected,
- audit events remain complete.

Security regressions prevent completion.

---

## 9. Multi-Tenant Completion

For tenant-aware functionality, verification shall confirm:

- tenant-scoped queries,
- tenant-scoped caching,
- tenant-scoped events,
- tenant-scoped background jobs,
- tenant-scoped reporting,
- tenant-scoped notifications.

Cross-tenant leakage is classified as a Critical defect.

---

## 10. Financial Completion

Changes affecting financial domains shall additionally verify:

- ledger integrity,
- journal balancing,
- reconciliation correctness,
- immutable transaction history,
- trust account segregation,
- accounting determinism,
- financial auditability.

Financial correctness takes precedence over implementation completion.

---

## 11. Database Completion

Database-related work shall verify:

- migration safety,
- schema consistency,
- foreign key integrity,
- index suitability,
- transaction safety,
- rollback feasibility,
- data preservation.

Destructive migrations require explicit approval through CHANGE_CONTROL.md.

---

## 12. API Completion

API changes shall ensure:

- contract consistency,
- validation correctness,
- standardized error responses,
- authorization enforcement,
- documentation accuracy,
- backward compatibility where required.

Breaking API changes require governance approval.

---

## 13. Testing Completion

Verification shall include all applicable testing.

Minimum expectations include:

**Unit Testing** — Business logic verification.

**Integration Testing** — Cross-module correctness.

**Regression Testing** — Verification that existing behaviour remains intact.

**Permission Testing** — Authorization enforcement.

**Financial Testing** — Where applicable:

- balancing,
- reconciliation,
- trust accounting.

**Runtime Testing** — Operational verification under realistic conditions.

Testing evidence shall be retained.

---

## 14. Compile Completion

The repository shall compile successfully.

Verification includes:

- TypeScript compilation,
- linting,
- static analysis,
- dependency integrity,
- generated artifacts where applicable.

Compilation warnings that indicate future instability shall be investigated before completion.

---

## 15. Operational Completion

Operational readiness shall include:

- configuration correctness,
- deployment compatibility,
- observability impact assessment,
- monitoring considerations,
- logging verification,
- health check integrity.

Operational regressions prevent completion.

---

## 16. Documentation Completion

Documentation shall be updated whenever required.

Applicable documents include:

- PROJECT_STATUS.md
- COMPLETED_GATES.md
- KNOWN_GAPS.md
- FINDINGS.md
- ARCHITECTURE_DECISIONS.md
- EXECUTION_ROADMAP.md

Documentation shall accurately reflect repository reality.

---

## 17. Governance Completion

The completed work shall comply with:

- START_HERE.md
- CLAUDE.md
- ENGINEERING_OPERATING_AGREEMENT.md
- SESSION_EXECUTION_PROTOCOL.md
- QUALITY_STANDARDS.md
- CHANGE_CONTROL.md
- CERTIFICATION_POLICY.md
- RELEASE_GOVERNANCE.md

Governance compliance is part of completion.

---

## 18. Risk Review

Before declaring work complete, engineers shall evaluate:

- remaining technical debt,
- unresolved assumptions,
- operational risks,
- performance concerns,
- security implications,
- financial implications,
- future maintenance impact.

Known risks shall be documented.

---

## 19. Certification Readiness

Completed work shall be capable of progressing through certification without requiring significant rework.

Certification readiness includes:

- architectural consistency,
- documentation completeness,
- quality evidence,
- verification evidence,
- governance compliance.

Certification is governed by CERTIFICATION_POLICY.md.

---

## 20. Completion Checklist

Every engineering activity shall satisfy the following checklist before being declared complete.

| Requirement | Status |
|---|---|
| Scope fulfilled | ☐ |
| Architecture preserved | ☐ |
| Repository conventions followed | ☐ |
| Code reviewed | ☐ |
| Strong typing maintained | ☐ |
| No duplicate logic introduced | ☐ |
| Security verified | ☐ |
| Tenant isolation verified | ☐ |
| Financial correctness verified (where applicable) | ☐ |
| Tests completed | ☐ |
| Compile successful | ☐ |
| Runtime verified | ☐ |
| Documentation updated | ☐ |
| Risks documented | ☐ |
| Certification assessment completed | ☐ |

Unchecked mandatory items prevent completion.

---

## 21. Conditions That Prevent Completion

Work shall **not** be considered complete if any of the following remain:

- Known critical defects.
- Broken compilation.
- Failed verification.
- Security regressions.
- Financial inconsistencies.
- Missing documentation.
- Governance violations.
- Unapproved architectural drift.
- Incomplete migrations.
- Missing rollback strategy where required.

Such work shall remain in progress until corrected.

---

## 22. Exceptional Circumstances

Incomplete work may proceed only through the formal governance process defined in CHANGE_CONTROL.md and only where:

- risks are explicitly documented,
- mitigation exists,
- accountable approval is recorded,
- certification implications are understood.

Exceptions are temporary and shall be tracked to closure.

---

## 23. Relationship to Other Governance Documents

This document defines **when work is complete**.

It complements:

- **QUALITY_STANDARDS.md**, which defines the quality expected of the completed work.
- **SESSION_EXECUTION_PROTOCOL.md**, which defines how work is executed.
- **CHANGE_CONTROL.md**, which governs modifications.
- **CERTIFICATION_POLICY.md**, which governs production certification.
- **RELEASE_GOVERNANCE.md**, which governs release approval.

Together, these documents provide the operational framework for engineering completion.

---

## 24. Final Statement

Completion is not measured by the absence of remaining tasks.

Completion is measured by demonstrable quality, verified correctness, preserved architecture, documented knowledge, and certification readiness.

The Definition of Done establishes the minimum acceptable standard for every engineering contribution to Global Wakili.

Any work that fails to satisfy this standard shall remain incomplete until all applicable requirements have been fulfilled.

Compliance with this Definition of Done is mandatory under the Global Wakili Engineering Operating System (GW-EOS) v4.0.
