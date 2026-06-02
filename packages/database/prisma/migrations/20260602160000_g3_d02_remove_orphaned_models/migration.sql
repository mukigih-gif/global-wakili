-- G3-D02 Gate 3: Remove orphaned models SensitiveField and PermissionCondition
--
-- Verified orphaned in Gate 2 D-06:
--   grep across all 528 apps/api/src TS files + packages/ → 0 references
--
-- SensitiveField: intended for field-level sensitivity classification;
--   never wired to any service or route; FieldEncryption is the active model.
--
-- PermissionCondition: intended for ABAC-style conditional permissions;
--   never implemented; the RBAC system (Permission/Role/User) is active
--   but never reads PermissionCondition.
--
-- Both tables created in 0_init migration. This migration supersedes that
-- creation for these two tables. No application data is lost.
--
-- Safety: IF EXISTS guards make this idempotent.

DROP TABLE IF EXISTS "SensitiveField";
DROP TABLE IF EXISTS "PermissionCondition";
