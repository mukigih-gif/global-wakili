import prisma from '../config/database';
import {
  ALL_PERMISSION_DEFINITIONS,
  permissionKey,
} from '../config/permissions';

async function seedPermissionsForTenant(tenantId: string): Promise<void> {
  console.info(
    `[PERMISSIONS] Seeding ${ALL_PERMISSION_DEFINITIONS.length} permissions for tenant ${tenantId}...`,
  );

  for (const permission of ALL_PERMISSION_DEFINITIONS) {
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
      },
      create: {
        tenantId,
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      },
    });

    console.info(
      `[PERMISSIONS] Upserted ${permissionKey(permission)} for tenant ${tenantId}`,
    );
  }

  console.info(`[PERMISSIONS] Seed complete for tenant ${tenantId}.`);
}

async function main(): Promise<void> {
  const tenantId = process.argv[2];

  if (!tenantId) {
    throw new Error('Usage: ts-node seed-permissions.ts <tenantId>');
  }

  await seedPermissionsForTenant(tenantId);
}

main()
  .catch((error) => {
    console.error('[PERMISSIONS] Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });