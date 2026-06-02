# Orphaned Model Assessment

**Gate:** 2 — Schema Verification
**Date:** 2026-06-02
**Status:** Complete — Removal deferred to Gate 3

---

## Assessment Method

Searched all TypeScript source files under `apps/api/src/` and `packages/` for any reference (import, query, type usage) to `SensitiveField` and `PermissionCondition`.

```
grep -r "SensitiveField" apps/api/src/ packages/   → 0 matches
grep -r "PermissionCondition" apps/api/src/ packages/ → 0 matches
```

---

## Findings

### SensitiveField

| Property | Value |
|----------|-------|
| Schema location | `packages/database/prisma/schema.prisma` |
| Fields | `id`, `tenantId`, `entityType`, `fieldName`, `classification`, `requiresEncryption`, `requiresMasking`, `maskingPattern` |
| Relations | None (standalone model, no FK references from other models) |
| Service references | **Zero** |
| Route references | **Zero** |
| Import references | **Zero** |
| In TENANT_SCOPED_MODELS | No |
| Last known use | Unknown — no git blame evidence of intentional use |

**Verdict: ORPHANED** — The model was created as part of field-level encryption infrastructure (see `FieldEncryption` model which is actively used) but was never wired to any service or route. The intended feature (field-level sensitivity classification) is partially served by `FieldEncryption` which IS referenced in services.

---

### PermissionCondition

| Property | Value |
|----------|-------|
| Schema location | `packages/database/prisma/schema.prisma` |
| Fields | `id`, `permissionId`, `conditionType`, `conditionValue`, `operator`, `createdAt` |
| Relations | References `permissionId` (no Prisma `@relation` — orphaned FK string) |
| Service references | **Zero** |
| Route references | **Zero** |
| Import references | **Zero** |
| In TENANT_SCOPED_MODELS | No |
| Last known use | Unknown |

**Verdict: ORPHANED** — The model was created to support conditional permissions (ABAC-style rules: "allow action X when condition Y"), but no service, route, or middleware was ever built to evaluate these conditions. The RBAC system (`Permission`, `Role`, `User`) is actively used but never reads `PermissionCondition`.

---

## Decision: Defer Removal to Gate 3

Per Gate 2 governance rules (no destructive schema actions without service-layer confirmation):

- Models are **NOT deleted** in Gate 2
- Removal requires a `DROP TABLE` migration
- Before removal can be scheduled, Gate 3 must confirm:
  1. No in-flight feature branch references these models
  2. No external integrations, scripts, or seeds reference them
  3. The `PermissionCondition.permissionId` column can be safely abandoned (no FK constraint in the schema — the field is just a plain `String`)

---

## Removal Prerequisites (Gate 3 checklist)

- [ ] Confirm no feature branches reference `SensitiveField` or `PermissionCondition`
- [ ] Confirm no seed scripts or admin tooling reference either model
- [ ] Confirm `FieldEncryption` fully replaces `SensitiveField` for field-level classification
- [ ] Confirm RBAC is not being extended with condition-based access before removal
- [ ] Write migration: `DROP TABLE "SensitiveField"; DROP TABLE "PermissionCondition";`
- [ ] Update this document with removal commit SHA once done

---

## Related Models (Active — NOT orphaned)

These models serve similar purposes and ARE actively used:

| Model | Purpose | Active |
|-------|---------|--------|
| `FieldEncryption` | Field-level encryption classification per tenant | ✅ Yes |
| `Permission` | RBAC permissions (action + resource + scope) | ✅ Yes |
| `Role` | RBAC role hierarchy | ✅ Yes |
| `FieldAccessPolicy` | Field-level read/write access by role | ✅ Yes |
