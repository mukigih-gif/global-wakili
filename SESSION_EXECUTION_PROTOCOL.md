# SESSION_EXECUTION_PROTOCOL.md

**Global Wakili Engineering Operating System (GW-EOS)**

- **Document:** SESSION_EXECUTION_PROTOCOL.md
- **Version:** 4.0
- **Status:** Authoritative
- **Classification:** Mandatory Engineering Execution Standard
- **Owner:** Chief Architect

**Applies To:**

- Human Engineers
- Claude Code
- ChatGPT
- AI Engineering Agents
- Architects
- Technical Leads
- QA Engineers
- Security Engineers
- DevOps Engineers

---

## 1. Purpose

This document establishes the mandatory lifecycle governing every engineering session performed within the Global Wakili repository.

Its purpose is to ensure that every session:

- begins with complete context,
- follows a disciplined execution process,
- preserves architectural integrity,
- produces certifiable outcomes,
- leaves the repository in a better state than it was found.

No engineering work shall be performed outside this protocol.

---

## 2. Guiding Principles

Every engineering session shall adhere to the following principles:

- Context before implementation.
- Architecture before code.
- Correctness before completion.
- Verification before certification.
- Documentation before closure.
- Traceability throughout the lifecycle.

Skipping any mandatory phase constitutes a governance violation.

---

## 3. Engineering Session Lifecycle

Every engineering session consists of ten mandatory phases.

```
Repository Orientation
        ↓
Context Acquisition
        ↓
Scope Definition
        ↓
Architecture Validation
        ↓
Implementation
        ↓
Verification
        ↓
Certification Assessment
        ↓
Documentation Update
        ↓
Session Handover
        ↓
Repository Closure
```

Each phase shall be completed before progressing to the next.

---

## 4. Phase 1 — Repository Orientation

The objective of Repository Orientation is to understand the current state of the platform before any engineering work begins.

Engineers shall review:

- START_HERE.md
- PROJECT_STATUS.md
- COMPLETED_GATES.md
- KNOWN_GAPS.md
- FINDINGS.md
- EXECUTION_ROADMAP.md

The purpose is to establish:

- current execution stage,
- active priorities,
- outstanding risks,
- recent architectural decisions,
- certification status.

No implementation shall begin without repository orientation.

---

## 5. Phase 2 — Context Acquisition

The engineer shall determine:

- the requested work,
- affected modules,
- related domains,
- architectural dependencies,
- operational implications,
- certification impact.

Questions to answer include:

- What problem is being solved?
- Why is it necessary?
- Which modules are affected?
- Which governance documents apply?
- Which architectural decisions are relevant?

Implementation without context is prohibited.

---

## 6. Phase 3 — Scope Definition

The engineering scope shall be explicitly defined.

Scope shall identify:

- objectives,
- deliverables,
- assumptions,
- exclusions,
- risks,
- dependencies,
- acceptance criteria.

Scope expansion during implementation shall follow CHANGE_CONTROL.md.

---

## 7. Phase 4 — Architecture Validation

Before modifying code, engineers shall evaluate the proposed work against existing architecture.

Validation shall include:

- domain ownership,
- module boundaries,
- dependency direction,
- service responsibilities,
- repository conventions,
- shared abstractions,
- data ownership.

If architectural inconsistencies are discovered, they shall be documented before implementation proceeds.

---

## 8. Phase 5 — Risk Assessment

A risk assessment shall be performed before implementation.

Minimum assessment categories include:

### Architectural Risk

Will the change introduce drift?

### Financial Risk

Does the change affect accounting or trust systems?

### Security Risk

Does the change modify authentication, authorization or data protection?

### Operational Risk

Can the change affect production stability?

### Data Risk

Does the change modify persistence or migrations?

### Compliance Risk

Does the change affect legal or regulatory obligations?

Where significant risks are identified, mitigation strategies shall be documented.

---

## 9. Phase 6 — Implementation

Implementation shall comply with:

- ENGINEERING_OPERATING_AGREEMENT.md
- QUALITY_STANDARDS.md
- DEFINITION_OF_DONE.md

Implementation expectations include:

- clean architecture,
- deterministic behaviour,
- explicit business rules,
- strong typing,
- reusable abstractions,
- comprehensive error handling,
- maintainable code.

Temporary fixes are prohibited unless formally documented.

---

## 10. Implementation Rules

During implementation engineers shall:

- preserve tenant isolation,
- preserve auditability,
- preserve financial correctness,
- avoid duplicated logic,
- avoid hidden coupling,
- avoid undocumented behaviour,
- follow repository naming standards,
- maintain consistent terminology.

Implementation shall strengthen—not weaken—the platform.

---

## 11. Phase 7 — Verification

Implementation is not complete until verification has been performed.

Verification includes, where applicable:

### Compile Verification

- TypeScript compilation
- Static analysis
- Linting
- Build verification

### Runtime Verification

- API execution
- Service behaviour
- Error handling
- Permission enforcement

### Functional Verification

- Expected behaviour
- Business rules
- Domain correctness

### Integration Verification

- Cross-module interactions
- Event propagation
- Notification behaviour
- Workflow integrity

### Financial Verification

Where applicable:

- ledger balancing,
- reconciliation,
- transaction consistency,
- trust accounting integrity.

---

## 12. Mandatory Verification Checklist

The following questions shall be answered before certification:

- Does the solution compile?
- Does it execute correctly?
- Are business rules preserved?
- Are financial invariants preserved?
- Is tenant isolation maintained?
- Is audit logging preserved?
- Are security boundaries maintained?
- Are tests passing?
- Has documentation been updated?

Failure of any mandatory verification blocks certification.

---

## 13. Phase 8 — Certification Assessment

The completed work shall be evaluated against CERTIFICATION_POLICY.md.

Certification assesses:

- architecture,
- correctness,
- maintainability,
- documentation,
- operational readiness,
- security,
- performance,
- governance compliance.

Engineering completion does not imply certification readiness.

---

## 14. Phase 9 — Documentation Update

Every completed session shall evaluate whether updates are required for:

- PROJECT_STATUS.md
- COMPLETED_GATES.md
- KNOWN_GAPS.md
- FINDINGS.md
- ARCHITECTURE_DECISIONS.md
- EXECUTION_ROADMAP.md

Documentation updates are mandatory whenever repository knowledge changes.

---

## 15. Phase 10 — Session Handover

Every engineering session shall conclude with a structured handover.

The handover shall include:

### Completed Work

A concise summary of completed deliverables.

### Outstanding Work

Remaining implementation tasks.

### Risks

Known unresolved issues.

### Decisions

Important engineering decisions taken.

### Recommendations

Suggested next actions.

### Certification Status

Current readiness assessment.

This information shall be sufficient for another engineer to continue work without loss of context.

---

## 16. Session Deliverables

Every engineering session should produce, where applicable:

- source code,
- tests,
- documentation,
- architectural updates,
- migration scripts,
- configuration changes,
- risk documentation,
- certification evidence.

Incomplete deliverables shall be explicitly identified.

---

## 17. Emergency Sessions

Emergency engineering work is permitted only for:

- production incidents,
- security vulnerabilities,
- data integrity issues,
- legal compliance failures,
- operational outages.

Emergency sessions remain subject to governance.

Post-incident review and documentation are mandatory.

---

## 18. Interrupted Sessions

If a session ends before completion, engineers shall record:

- current progress,
- completed work,
- unfinished work,
- identified risks,
- recommended continuation point.

The objective is to eliminate knowledge loss between sessions.

---

## 19. AI Engineering Sessions

AI engineering agents shall follow this protocol without exception.

AI systems shall:

- establish repository context,
- reason about architectural impact,
- identify risks,
- explain assumptions,
- distinguish facts from inference,
- avoid speculative implementation.

AI-generated code is subject to the same certification requirements as human-authored code.

---

## 20. Session Metrics

Engineering sessions may be evaluated using qualitative indicators including:

- architectural improvement,
- reduction in technical debt,
- documentation completeness,
- governance compliance,
- verification quality,
- certification readiness.

Raw code volume, commit count, or response length are not indicators of engineering quality.

---

## 21. Session Closure Criteria

A session shall only be considered complete when:

- defined scope has been addressed,
- verification is complete,
- certification assessment has been performed,
- documentation impacts have been identified,
- outstanding risks are documented,
- a handover has been prepared.

Premature session closure is prohibited.

---

## 22. Governance Compliance

Failure to follow this protocol constitutes non-compliance with GW-EOS.

Examples include:

- implementing without repository context,
- bypassing architecture review,
- omitting verification,
- failing to document architectural changes,
- neglecting certification assessment,
- closing work without a handover.

Such deviations shall be corrected before work is considered complete.

---

## 23. Relationship to Other Governance Documents

This protocol defines *how* engineering work is executed.

It operates in conjunction with:

- **START_HERE.md** — Repository orientation.
- **CLAUDE.md** — AI engineering operating contract.
- **ENGINEERING_OPERATING_AGREEMENT.md** — Engineering constitution.
- **ROLES_AND_RESPONSIBILITIES.md** — Governance accountability.
- **QUALITY_STANDARDS.md** — Engineering quality expectations.
- **DEFINITION_OF_DONE.md** — Completion criteria.
- **CHANGE_CONTROL.md** — Change governance.
- **CERTIFICATION_POLICY.md** — Production certification.
- **RELEASE_GOVERNANCE.md** — Release approval process.

This document shall be interpreted consistently with all other GW-EOS governance documents.

---

## 24. Final Statement

Every engineering session contributes to the long-term evolution of the Global Wakili platform.

The purpose of this protocol is not administrative control, but disciplined engineering excellence.

By following this execution protocol, every contributor—human or AI—helps ensure that Global Wakili remains architecturally coherent, financially correct, legally compliant, operationally resilient, and continuously certifiable.

Compliance with this Session Execution Protocol is mandatory under GW-EOS v4.0.
