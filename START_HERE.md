# START_HERE.md

**Global Wakili Engineering Operating System (GW-EOS)**

- **Version:** 4.0
- **Status:** Authoritative
- **Classification:** Constitutional Entry Point

**Audience:**

- Chief Architect
- Human Engineers
- AI Engineering Agents (Claude Code, ChatGPT, Codex, Cursor, Gemini, etc.)
- Technical Leads
- QA Engineers
- DevOps Engineers
- Security Engineers
- Certification Authority

---

## Welcome

Welcome to the Global Wakili Engineering Operating System (GW-EOS).

This repository is not governed by convention or tribal knowledge. It is governed by documented engineering principles, architecture, quality standards, certification policies, and operational discipline.

Every engineer—human or AI—is expected to understand and comply with this operating system before making any change to the repository.

The repository is the single source of truth.

---

## Purpose of GW-EOS

GW-EOS establishes the constitutional framework governing the engineering lifecycle of Global Wakili.

It defines:

- how engineering is performed,
- how architecture evolves,
- how quality is measured,
- how certification is achieved,
- how releases are governed,
- how decisions are documented,
- how knowledge is preserved.

Its purpose is to ensure that the platform can evolve over many years while maintaining consistency, correctness, and production-grade quality.

---

## Guiding Principles

All engineering shall be guided by the following principles:

1. Architecture before implementation.
2. Governance before velocity.
3. Financial correctness before convenience.
4. Security by design.
5. Multi-tenancy by default.
6. Documentation as code.
7. Continuous certification.
8. Explicit decisions over implicit assumptions.
9. Evidence-based engineering.
10. Continuous improvement.

These principles apply equally to human engineers and AI engineering agents.

---

## Required Reading Order

Every new contributor shall read the governance documents in the following sequence.

### Phase 1 — Orientation

1. START_HERE.md
2. CLAUDE.md
3. ENGINEERING_OPERATING_AGREEMENT.md
4. MASTER_EXECUTION_CHARTER.md

### Phase 2 — Engineering Governance

1. SESSION_EXECUTION_PROTOCOL.md
2. ROLES_AND_RESPONSIBILITIES.md
3. DEFINITION_OF_DONE.md
4. QUALITY_STANDARDS.md
5. CHANGE_CONTROL.md

### Phase 3 — Certification & Operations

1. CERTIFICATION_POLICY.md
2. RISK_MANAGEMENT.md
3. RELEASE_GOVERNANCE.md

### Phase 4 — Current Repository State

1. PROJECT_STATUS.md
2. COMPLETED_GATES.md
3. KNOWN_GAPS.md
4. FINDINGS.md
5. HANDOVER_NOTES.md
6. ARCHITECTURE_DECISIONS.md
7. EXECUTION_ROADMAP.md

Reading the documents in this order provides the complete engineering context required to contribute safely.

---

## Current Stage — Where We Are Now

> **Living section.** This block is maintained in-repo and is **not** part of the
> verbatim GW-EOS v4.0 constitutional text above. It is sourced from
> `CLAUDE.md` §3A (Current Gate Status) and §13 (Confirmed Session Sequence),
> which are the authoritative current-state references. Update it whenever the
> stage advances.

**As of:** 2026-06-20

**Active session-sequence step:** **Step 0 — GW-EOS Governance Migration**
(`CLAUDE.md` §13). This `START_HERE.md` is being authored as part of Step 0.

**Certification progress (per `CLAUDE.md` §3A):**

- Phase 0 — Schema & Seed Validation: **COMPLETE**
- Phase 1 — API Certification: **COMPLETE — 139/139** across Groups 1–9
  (Auth / Clients / Users / Password Reset / Matters; Billing reads + writes;
  Trust reads + writes; HR; Reporting).
- Dashboard route sweep: **18/18 mounts clean.**
- Phase 2 — Playwright E2E: **PENDING**
- Phase 3 — Finance/Trust/Payroll Compliance: **PENDING**
- Phase 4 — Multi-Tenant Breach: **PENDING**
- Phase 5 — Production Readiness: **PENDING**

**Completion estimates (per `CLAUDE.md` §3A):** Backend ~82% · Frontend ~35% ·
Overall ~58%.

**Confirmed sequence ahead (`CLAUDE.md` §13):**

1. **Step 0 — GW-EOS Governance Migration** ← *we are here*
2. Step 1 — TODO-010: repo-wide file/path audit
3. Step 2 — F-17 (MFA), own dedicated session
4. Step 3 — Seed architecture (CLAUDE.md §12)
5. Step 4 — Phase 2 Playwright E2E

**Status-source note:** `PROJECT_STATUS.md` and `COMPLETED_GATES.md` are dated
**2026-06-03** and describe a more advanced narrative (all WIPs/gates closed,
~80–85%). Where they diverge from `CLAUDE.md` §3A, treat **`CLAUDE.md` §3A as
current** until the status registers are reconciled.

---

## Governance Hierarchy

The documents shall be interpreted according to the following hierarchy:

| Priority | Document |
|---|---|
| 1 | START_HERE.md |
| 2 | MASTER_EXECUTION_CHARTER.md |
| 3 | ENGINEERING_OPERATING_AGREEMENT.md |
| 4 | Architecture Decision Records |
| 5 | Governance Policies |
| 6 | Quality Standards |
| 7 | Operational Documents |
| 8 | Project Status Documents |

Where conflicts arise, the higher-ranked document prevails unless formally superseded through **CHANGE_CONTROL.md**.

---

## Engineering Lifecycle

Every engineering activity follows the same lifecycle:

```
Understand
     ↓
Plan
     ↓
Architect
     ↓
Implement
     ↓
Verify
     ↓
Document
     ↓
Certify
     ↓
Release
     ↓
Improve
```

Skipping lifecycle stages is prohibited unless explicitly authorised.

---

## Repository Truth

The repository is the authoritative record of the project.

Engineering decisions shall never rely solely on:

- memory,
- chat history,
- verbal discussions,
- undocumented assumptions.

Every significant decision must be reflected in the repository.

---

## Documentation Philosophy

Documentation is treated as a production asset.

Documentation shall:

- evolve with implementation,
- remain internally consistent,
- be version controlled,
- support certification,
- support onboarding,
- preserve institutional knowledge.

Outdated documentation shall be treated as a defect.

---

## AI Engineering

AI engineering agents are expected to operate under the same governance standards as human engineers.

Before generating code, an AI agent shall:

- understand repository context,
- review relevant governance,
- respect approved architecture,
- preserve engineering consistency,
- document significant decisions.

AI acceleration shall never compromise engineering quality.

---

## Continuous Certification

Certification is continuous rather than retrospective.

Every completed engineering activity should improve:

- architectural integrity,
- documentation quality,
- governance compliance,
- operational readiness,
- production readiness.

Certification is integrated into the engineering lifecycle.

---

## Relationship to Future Documentation

GW-EOS governs **how** Global Wakili is engineered.

It is complemented by additional documentation libraries:

- **GWEA** — Global Wakili Enterprise Architecture (technical architecture)
- **GW-OPS** — Operations & Production Manuals
- **GW-CERT** — Certification & Audit Evidence Library
- **GW-KB** — Enterprise Knowledge Base

These libraries build upon GW-EOS but do not supersede it.

---

## Responsibilities of Every Contributor

Every contributor is responsible for:

- preserving architectural integrity,
- maintaining documentation,
- following governance,
- reducing technical debt,
- protecting financial correctness,
- maintaining security,
- supporting certification,
- leaving the repository in a better state than it was found.

---

## Definition of Success

Success is not measured by:

- lines of code,
- number of commits,
- number of completed tasks.

Success is measured by:

- production readiness,
- maintainability,
- correctness,
- auditability,
- engineering consistency,
- operational resilience,
- long-term sustainability.

---

## Closing Statement

The Global Wakili Engineering Operating System represents the constitutional foundation of the Global Wakili platform.

Every architectural decision, implementation, review, certification activity, and production release shall align with the principles established within this operating system.

The objective is not merely to build software, but to build an enduring legal enterprise platform whose engineering standards remain sustainable for decades.

**Read these documents. Follow them consistently. Improve them deliberately. Protect them rigorously.**
