import { PermissionScope } from '@prisma/client';
import prisma from '../config/database';
import {
  ALL_PERMISSION_DEFINITIONS,
  permissionKey,
} from '../config/permissions';

/**
 * Validates and cleans the tenantId from command line arguments.
 */
function requireTenantId(value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error('Usage: npx ts-node apps/api/src/scripts/seed-permissions.ts <tenantId>');
  }

  return value.trim();
}

/**
 * Ensures the target tenant exists before attempting to seed permissions.
 */
async function assertTenantExists(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!tenant) {
    throw new Error(`Tenant with ID ${tenantId} was not found. Permission seeding aborted.`);
  }

  console.info(
    `[PERMISSIONS] Target tenant confirmed: ${tenant.name} (${tenant.slug}) [${tenant.id}]`,
  );
}

/**
 * Iterates through defined permissions and upserts them for the tenant.
 */
async function seedPermissionsForTenant(tenantId: string): Promise<void> {
  console.info(
    `[PERMISSIONS] Seeding ${ALL_PERMISSION_DEFINITIONS.length} permissions for tenant ${tenantId}...`,
  );

  let seeded = 0;

  for (const permission of ALL_PERMISSION_DEFINITIONS) {
    const key = permissionKey(permission);

    try {
      await prisma.permission.upsert({
        where: {
          unique_tenant_action_resource: {
            tenantId,
            action: permission.action,
            resource: permission.resource,
          },
        },
        update: {
          description: permission.description,
          scope: PermissionScope.TENANT,
          isSystem: true,
        },
        create: {
          tenantId,
          resource: permission.resource,
          action: permission.action,
          description: permission.description,
          scope: PermissionScope.TENANT,
          isSystem: true,
        },
      });

      seeded += 1;
      console.info(`[PERMISSIONS] Upserted ${key}`);
    } catch (error: unknown) {
      console.error(`[PERMISSIONS] Failed while upserting ${key}.`);
      throw error; // Fail fast to avoid inconsistent state
    }
  }

  if (seeded !== ALL_PERMISSION_DEFINITIONS.length) {
    throw new Error(
      `[PERMISSIONS] Seed count mismatch. Expected ${ALL_PERMISSION_DEFINITIONS.length}, completed ${seeded}.`,
    );
  }

  console.info(
    `[PERMISSIONS] Seed complete for tenant ${tenantId}. Completed ${seeded}/${ALL_PERMISSION_DEFINITIONS.length}.`,
  );
}

async function main(): Promise<void> {
  const tenantId = requireTenantId(process.argv[2]);

  await assertTenantExists(tenantId);
  await seedPermissionsForTenant(tenantId);
}

main()
  .catch((error: unknown) => {
    console.error('[PERMISSIONS] Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });