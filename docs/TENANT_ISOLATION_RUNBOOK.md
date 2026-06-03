# Tenant Isolation Runbook

## Overview

Global Wakili enforces tenant isolation at the application layer via a
Prisma client extension. This runbook describes how isolation works,
what to check if a breach is suspected, and how to verify isolation.

---

## How Isolation Works

### 1. Prisma Extension (`packages/database/src/tenant-extension.ts`)

The extension intercepts every Prisma model operation:

**Read operations (`findMany`, `findFirst`):**
```
WHERE clause + { tenantId: <caller-tenant> }
```
Tenant ID is AND-ed with any existing WHERE — cannot be removed by caller.

**Write operations (`create`, `createMany`):**
```
data + { tenantId: <caller-tenant> }
```
Caller-supplied `tenantId` is overwritten by the real tenant ID.

**Unsafe operations (`findUnique`, `findUniqueOrThrow`, `update`, `delete`, `upsert`):**
```
Blocked if WHERE clause does not include tenantId
```
Throws `TENANT_ID_REQUIRED` if tenantId is missing.

### 2. 108 Tenant-Scoped Models

All models in `TENANT_SCOPED_MODELS` have the above guards applied.
See `packages/database/src/tenant-extension.ts` for the full list.

### 3. Raw SQL (ADR-001)

`$queryRaw`, `$queryRawUnsafe`, `$executeRaw`, `$executeRawUnsafe` must
always include a `WHERE "tenantId" = $1` clause. No exceptions.
Search for raw SQL usage: `grep -r '\$queryRaw\|\$executeRaw' apps/api/src`

---

## If a Breach Is Suspected

### Step 1 — Identify the affected tenant IDs
```sql
-- Check recent cross-tenant queries in AuditLog
SELECT tenantId, entityType, entityId, action, createdAt
FROM "AuditLog"
WHERE userId NOT IN (
  SELECT id FROM "User" WHERE tenantId = "AuditLog".tenantId
)
ORDER BY createdAt DESC
LIMIT 100;
```

### Step 2 — Check the hash chain
Verify no audit log records have been tampered with:
```bash
# Run audit chain verification
node --require tsx/cjs -e "
const { verifyHashChain } = require('./apps/api/src/utils/audit-chain');
// Pass recent AuditLog records in sequence-number order
"
```

### Step 3 — Check for missing tenantId in model queries
```bash
grep -r "findUnique\|findFirst\|update\|delete" apps/api/src/modules \
  | grep -v "tenantId" \
  | grep -v "// " \
  | grep -v ".test.ts"
```

### Step 4 — Re-run breach test matrix
```bash
npm run test:tenant
# Should output: 365 pass / 0 fail
```

---

## Verification Procedure (Periodic)

Run monthly:

1. `npm run test:tenant` — 365 unit tests must pass
2. `DATABASE_URL=<prod-url> npm run test:integration` — DB breach tests
3. Spot-check 5 random tenant records in DB — confirm no cross-tenant data
4. Review AuditLog for any `TENANT_ID_REQUIRED` errors in the past 30 days

---

## Adding a New Model

When adding a new tenant-scoped model:

1. Add `tenantId String` field to the Prisma model
2. Add the model name to `TENANT_SCOPED_MODELS` in `tenant-extension.ts`
3. Update the count assertion in `tenant-isolation.test.ts`
4. Run `npm run test:tenant` — must still pass

Failure to do step 2 means the model will NOT be tenant-scoped even if
the field exists — the extension only protects registered models.
