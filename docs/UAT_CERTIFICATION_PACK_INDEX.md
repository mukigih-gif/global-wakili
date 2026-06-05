# GLOBAL WAKILI LEGAL ENTERPRISE
## UAT Certification Pack — Master Index

**Version:** 1.0 | **Date:** June 2026 | **Status:** DRAFT — Pending Execution

---

## Document Structure

| Part | File | Modules Covered | Test Cases |
|---|---|---|---|
| Part 1 | `UAT_CERTIFICATION_PACK_PART1.md` | Platform Admin · Tenant Admin · User Mgmt · Roles · Permissions · Branches · Clients · Contacts · Matters | ~280 |
| Part 2 | `UAT_CERTIFICATION_PACK_PART2.md` | Matter Tasks · Workflows · Court Hearings · Contracts · Documents · Document Versions · Time Tracking · Billing · Invoicing · Payments · AR · AP · Procurement · Vendors · GL · Journals · Trial Balance | ~350 |
| Part 3 | `UAT_CERTIFICATION_PACK_PART3.md` | Trust Accounting · Trust Ledgers · Reconciliation · HR · Employees · Leave · Payroll · Reporting · Analytics · Dashboards · Notifications · Email/SMS/Push · Workflow Notifications · AI Providers · AI Artifacts · Prompt Auditing · AI Recommendations · Client Portal · Authentication · Authorization · Audit Framework | ~280 |
| Part 4 | `UAT_CERTIFICATION_PACK_PART4.md` | Walk-In Clients · Reception · Tax Compliance · Settings · Platform Health · End-to-End Scenarios · Sign-Off Matrix | ~120 |
| **TOTAL** | | **55 Modules** | **1,030+** |

---

## Test Category Summary

| Category | Code | Description |
|---|---|---|
| Smoke | SMK | Basic availability and access verification |
| Functional | FNC | Core business logic and workflow |
| Negative | NEG | Error handling, validation rejection |
| Permission | PRM | Role-based access control |
| Multi-Tenant Isolation | MTI | Cross-tenant data breach prevention |
| Audit Trail | AUD | Tamper-evident logging |
| Compliance | CMP | Kenya law, GDPR, LSK, KRA, IFRS |
| Performance | PRF | Response times, load handling |
| Integration | INT | System-to-system connectivity |
| Disaster Recovery | DRV | Resilience and data persistence |

---

## Critical Modules (Mandatory Zero-Fail)

1. **Trust Accounting** — 25 tests — overdraft prevention, three-way reconciliation, LSK compliance
2. **Audit Framework** — 12 tests — hash chain integrity, tamper detection
3. **Multi-Tenant Isolation** — across all modules — absolute data isolation
4. **Authentication** — 8 tests — JWT, rate limiting, injection prevention
5. **Payroll** — 8 tests — Kenya statutory deduction accuracy

---

## How to Export to DOCX

```
Option 1: VS Code — install Markdown PDF extension → Export to DOCX
Option 2: Pandoc CLI: pandoc UAT_CERTIFICATION_PACK_PART1.md -o Part1.docx --reference-doc=template.docx
Option 3: Copy markdown into Word → use "Paste Special" → format as needed
Option 4: Online converter: markdowntodocx.com or cloudconvert.com
```

---

## Execution Commands (Validation Suites)

```bash
# Run tenant isolation validation
npx dotenv-cli -e .env -- node --require tsx/cjs apps/api/src/scripts/validate-tenancy.ts cmpy9pg9u00002gom327d94va

# Run trust accounting validation  
npx dotenv-cli -e .env -- node --require tsx/cjs apps/api/src/scripts/validate-trust.ts cmpy9pg9u00002gom327d94va

# Run audit chain validation
npx dotenv-cli -e .env -- node --require tsx/cjs apps/api/src/scripts/validate-audit.ts cmpy9pg9u00002gom327d94va

# Run finance validation
npx dotenv-cli -e .env -- node --require tsx/cjs apps/api/src/scripts/validate-finance.ts cmpy9pg9u00002gom327d94va

# Run all seeds
npx dotenv-cli -e .env -- node --require tsx/cjs apps/api/src/scripts/seed-all.ts cmpy9pg9u00002gom327d94va
```

---

## Current Validation Results (June 2026)

| Suite | Result | Pass | Fail | Warn |
|---|---|---|---|---|
| validate-tenancy | ✅ PASS | 24 | 0 | 1 |
| validate-audit | ✅ PASS | 8 | 0 | 1 |
| validate-trust | ✅ PASS | 8 | 0 | 1 |
| validate-finance | ⚠️ WARN | 4 | 0 | 4 |
| validate-tax | PENDING | — | — | — |
| validate-payroll | PENDING | — | — | — |
| validate-notifications | PENDING | — | — | — |
| validate-reporting | PENDING | — | — | — |

**Notes on Warnings:**
- Tenancy: 1 WARN = no test matters in Alpha Advocates/Beta Legal (expected — not yet seeded)
- Audit: 1 WARN = GlobalAuditLog empty (platform-level log; no platform actions taken)
- Trust: 1 WARN = no reconciliation records yet (three-way recon not run)
- Finance: 4 WARN = data absence only (no journals/invoices posted yet); no structural failures
