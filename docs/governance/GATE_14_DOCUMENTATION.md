# Gate 14 — Ecosystem Documentation

**Gate:** 14 | **Date:** 2026-06-02 | **Status:** ✅ CLOSED

## Governance Document Index

| Document | Gate | Purpose |
|----------|------|---------|
| GATE_1_GATE_2_TRANSITION.md | 1→2 | Gate transition report |
| GATE_2_SCHEMA_VERIFICATION.md | 2 | Schema hardening close report |
| GATE_2_INDEX_AUDIT.md | 2 | 80 missing FK indexes |
| TENANT_ISOLATION_DECISIONS.md | 2 | Model isolation rationale |
| ORPHANED_MODELS.md | 2/3 | SensitiveField + PermissionCondition |
| TENANT_BREACH_TEST_MATRIX.md | 3 | Breach test specifications |
| GATE_3_TENANT_VERIFICATION.md | 3 | Tenant verification close report |
| GATE_4_FINANCE_VERIFICATION.md | 4 | Finance hardening close report |
| GATE_5_TRUST_VERIFICATION.md | 5 | Trust accounting close report |
| GATE_6_SECURITY_VERIFICATION.md | 6 | Security audit close report |
| AUTHORIZATION_DECISIONS.md | 6 | Route authorization exceptions |
| SECRET_AUDIT.md | 6 | Secret scan results |
| GATE_7_CONTROL_PLANE.md | 7 | Control plane close report |
| GATE_8_NOTIFICATION_CLOSURE.md | 8 | Notification platform close report |
| GATE_9_DOCUMENT_PLATFORM.md | 9 | Document security close report |
| GATE_10_AI_PLATFORM.md | 10 | AI platform close report |
| GATE_11_INTEGRATIONS.md | 11 | Integrations close report |
| GATE_12_FRONTEND.md | 12 | Frontend security hardening |
| GATE_13_TESTING_MATRIX.md | 13 | 365-test matrix |
| GATE_14_DOCUMENTATION.md | 14 | This document |

## Utility Library (hardening helpers, all in apps/api/src/utils/)

| File | Purpose |
|------|---------|
| audit-chain.ts | Hash chain verification |
| audit-hash.ts | SHA-256 audit hash generation |
| billing-scope.ts | Billing isolation functions |
| double-entry.ts | Balance assertion |
| document-security.ts | Path traversal prevention |
| notification-security.ts | Template injection prevention |
| platform-provisioning.ts | Provisioning completeness |
| rate-limiter.ts | Token bucket algorithm |
| rbac-engine.ts | Permission matching |
| secret-scanner.ts | Credential detection |
| security-headers.ts | CORS/headers validation |
| trust-balance.ts | Trust overdraw prevention |
| trust-calculator.ts | Trust arithmetic |
| trust-commingling.ts | Office/trust segregation |
| trust-reconciliation.ts | Three-way reconciliation |
| vat-wht-calculator.ts | Kenya tax calculations |
