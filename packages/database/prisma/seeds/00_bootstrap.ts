import {
  PermissionScope,
  PrismaClient,
  SystemRole,
  TenantRole,
  UserStatus,
} from '@prisma/client';

import { ALL_PERMISSION_DEFINITIONS } from '../../../../apps/api/src/config/permissions';
import {
  CANONICAL_ROLES,
  ZERO_PERM_OK_ROLES,
  resolveRolePermissions,
} from '../../../../apps/api/src/config/roles';

type SeedPrisma = PrismaClient;

type PermissionRecord = {
  id: string;
  resource: string;
  action: string;
};

type PermissionDefinitionRecord = {
  resource: string;
  action: string;
  description: string;
};

export type BootstrapSeedResult = {
  status: 'bootstrap_seed_complete';
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  permissions: number;
  roles: number;
  platformAdminEmail: string;
  firmAdminEmail: string;
};

const PERMISSION_SYNC_BATCH_SIZE = 25;

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required to run bootstrap seed.`);
  }

  return value.trim();
}

function requireEmailEnv(name: string): string {
  const value = requireEnv(name).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`${name} must be a valid email address.`);
  }

  return value;
}

function requireTenantSlug(): string {
  const slug = requireEnv('SEED_TENANT_SLUG').toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      'SEED_TENANT_SLUG must use lowercase letters, numbers, and hyphens only.',
    );
  }

  return slug;
}

function requireKraPin(): string {
  const kraPin = requireEnv('SEED_TENANT_KRA_PIN').toUpperCase();

  if (!/^[A-Z][0-9]{9}[A-Z]$/.test(kraPin)) {
    throw new Error(
      'SEED_TENANT_KRA_PIN must look like a valid Kenyan KRA PIN, for example A123456789B.',
    );
  }

  return kraPin;
}

function requireSeedPasswordHash(): string {
  const passwordHash = requireEnv('SEED_DEFAULT_PASSWORD_HASH');

  if (
    passwordHash.includes('changeThis') ||
    passwordHash.toLowerCase().includes('password') ||
    passwordHash.length < 50 ||
    !/^\$2[aby]\$\d{2}\$/.test(passwordHash)
  ) {
    throw new Error(
      'SEED_DEFAULT_PASSWORD_HASH appears unsafe. Provide a real bcrypt/bcryptjs password hash.',
    );
  }

  return passwordHash;
}

function addOneYear(date: Date): Date {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + 1);
  return copy;
}

function permissionKey(
  permission: Pick<PermissionRecord, 'resource' | 'action'>,
): string {
  return `${permission.resource}.${permission.action}`;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error('Chunk size must be a positive integer.');
  }

  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

// Role definitions live in the canonical single source of truth:
// apps/api/src/config/roles.ts (CANONICAL_ROLES) — shared with seed-default-roles.ts
// so seeded and onboarded tenants get identical UPPERCASE roles + grants (FINDING-007-011).

function normalizePermissionDefinitions(): PermissionDefinitionRecord[] {
  if (!Array.isArray(ALL_PERMISSION_DEFINITIONS)) {
    throw new Error('ALL_PERMISSION_DEFINITIONS must be an array.');
  }

  if (ALL_PERMISSION_DEFINITIONS.length === 0) {
    throw new Error('ALL_PERMISSION_DEFINITIONS is empty.');
  }

  const seenKeys = new Set<string>();
  const duplicateKeys = new Set<string>();

  const normalized = ALL_PERMISSION_DEFINITIONS.map((permission) => {
    const resource = String(permission.resource ?? '').trim();
    const action = String(permission.action ?? '').trim();
    const description = String(permission.description ?? '').trim();

    if (!resource || !action) {
      throw new Error(
        `Invalid permission definition detected. Resource and action are required.`,
      );
    }

    const key = `${resource}.${action}`;

    if (seenKeys.has(key)) {
      duplicateKeys.add(key);
    }

    seenKeys.add(key);

    return {
      resource,
      action,
      description,
    };
  });

  if (duplicateKeys.size > 0) {
    throw new Error(
      `Duplicate permission definitions detected: ${Array.from(duplicateKeys).join(', ')}`,
    );
  }

  return normalized;
}

function assertBootstrapEnvironment() {
  requireEnv('SEED_TENANT_NAME');
  requireTenantSlug();
  requireKraPin();

  requireEmailEnv('SEED_PLATFORM_ADMIN_EMAIL');
  requireEnv('SEED_PLATFORM_ADMIN_NAME');

  requireEmailEnv('SEED_FIRM_ADMIN_EMAIL');
  requireEnv('SEED_FIRM_ADMIN_NAME');

  requireSeedPasswordHash();

  normalizePermissionDefinitions();
}

async function seedTenant(prisma: SeedPrisma) {
  const now = new Date();

  return prisma.tenant.upsert({
    where: {
      slug: requireTenantSlug(),
    },
    update: {
      name: requireEnv('SEED_TENANT_NAME'),
      kraPin: requireKraPin(),
    },
    create: {
      name: requireEnv('SEED_TENANT_NAME'),
      slug: requireTenantSlug(),
      kraPin: requireKraPin(),
      billingCycleStart: now,
      billingCycleEnd: addOneYear(now),
    },
  });
}

async function seedPermissions(
  prisma: SeedPrisma,
  tenantId: string,
): Promise<PermissionRecord[]> {
  const permissionDefinitions = normalizePermissionDefinitions();

  await prisma.permission.createMany({
    data: permissionDefinitions.map((permission) => ({
      tenantId,
      action: permission.action,
      resource: permission.resource,
      description: permission.description,
      scope: PermissionScope.TENANT,
      isSystem: true,
    })),
    skipDuplicates: true,
  });

  /*
   * createMany(skipDuplicates) is fast but does not update existing rows.
   * We therefore synchronize metadata in controlled batches so central
   * permission definitions remain authoritative without one long transaction.
   */
  for (const batch of chunkArray(
    permissionDefinitions,
    PERMISSION_SYNC_BATCH_SIZE,
  )) {
    await Promise.all(
      batch.map((permission) =>
        prisma.permission.updateMany({
          where: {
            tenantId,
            action: permission.action,
            resource: permission.resource,
          },
          data: {
            description: permission.description,
            scope: PermissionScope.TENANT,
            isSystem: true,
          },
        }),
      ),
    );
  }

  const allowedKeys = new Set(
    permissionDefinitions.map((permission) =>
      permissionKey({
        resource: permission.resource,
        action: permission.action,
      }),
    ),
  );

  const tenantPermissions = await prisma.permission.findMany({
    where: {
      tenantId,
    },
    select: {
      id: true,
      resource: true,
      action: true,
    },
  });

  const seededPermissions = tenantPermissions.filter((permission) =>
    allowedKeys.has(permissionKey(permission)),
  );

  if (seededPermissions.length !== permissionDefinitions.length) {
    const seededKeys = new Set(seededPermissions.map(permissionKey));

    const missing = permissionDefinitions
      .map((permission) =>
        permissionKey({
          resource: permission.resource,
          action: permission.action,
        }),
      )
      .filter((key) => !seededKeys.has(key));

    throw new Error(
      `Permission seed incomplete. Missing permissions: ${missing.join(', ')}`,
    );
  }

  return seededPermissions;
}

async function seedRoles(
  prisma: SeedPrisma,
  tenantId: string,
  permissions: PermissionRecord[],
) {
  const roles: Array<{ id: string; name: string }> = [];

  for (const roleDefinition of CANONICAL_ROLES) {
    const selectedPermissions = resolveRolePermissions(permissions, roleDefinition);

    if (
      !ZERO_PERM_OK_ROLES.has(roleDefinition.name) &&
      selectedPermissions.length === 0
    ) {
      throw new Error(
        `Role ${roleDefinition.name} resolved to zero permissions. Check ALL_PERMISSION_DEFINITIONS and CANONICAL_ROLES.`,
      );
    }

    const role = await prisma.role.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: roleDefinition.name,
        },
      },
      update: {
        description: roleDefinition.description,
        isSystem: true,
        permissions: {
          set: selectedPermissions.map((permission) => ({ id: permission.id })),
        },
      },
      create: {
        tenantId,
        name: roleDefinition.name,
        description: roleDefinition.description,
        isSystem: true,
        permissions: {
          connect: selectedPermissions.map((permission) => ({ id: permission.id })),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    roles.push(role);
  }

  return roles;
}

export async function provisionTenantRbac(
  prisma: PrismaClient,
  tenantId: string,
): Promise<{
  permissions: PermissionRecord[];
  roles: Array<{ id: string; name: string }>;
}> {
  const permissions = await seedPermissions(prisma, tenantId);
  const roles = await seedRoles(prisma, tenantId, permissions);
  return { permissions, roles };
}

async function seedPlatformAdmin(
  prisma: SeedPrisma,
  passwordHash: string,
) {
  const email = requireEmailEnv('SEED_PLATFORM_ADMIN_EMAIL');

  const existing = await prisma.user.findFirst({
    where: {
      tenantId: null,
      email,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        name: requireEnv('SEED_PLATFORM_ADMIN_NAME'),
        systemRole: SystemRole.SUPER_ADMIN,
        tenantRole: TenantRole.NONE,
        status: UserStatus.ACTIVE,
      },
    });
  }

  return prisma.user.create({
    data: {
      tenantId: null,
      email,
      name: requireEnv('SEED_PLATFORM_ADMIN_NAME'),
      passwordHash,
      systemRole: SystemRole.SUPER_ADMIN,
      tenantRole: TenantRole.NONE,
      status: UserStatus.ACTIVE,
    },
  });
}

async function seedFirmAdmin(
  prisma: SeedPrisma,
  input: {
    tenantId: string;
    firmAdminRoleId: string;
    passwordHash: string;
  },
) {
  const email = requireEmailEnv('SEED_FIRM_ADMIN_EMAIL');

  const existing = await prisma.user.findFirst({
    where: {
      tenantId: input.tenantId,
      email,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        name: requireEnv('SEED_FIRM_ADMIN_NAME'),
        systemRole: SystemRole.NONE,
        tenantRole: TenantRole.FIRM_ADMIN,
        status: UserStatus.ACTIVE,
        roles: {
          set: [{ id: input.firmAdminRoleId }],
        },
      },
    });
  }

  return prisma.user.create({
    data: {
      tenantId: input.tenantId,
      email,
      name: requireEnv('SEED_FIRM_ADMIN_NAME'),
      passwordHash: input.passwordHash,
      systemRole: SystemRole.NONE,
      tenantRole: TenantRole.FIRM_ADMIN,
      status: UserStatus.ACTIVE,
      roles: {
        connect: [{ id: input.firmAdminRoleId }],
      },
    },
  });
}

async function seedOptionalTenantMembership(
  prisma: SeedPrisma,
  input: {
    tenantId: string;
    userId: string;
    roleId: string;
  },
) {
  const maybePrisma = prisma as unknown as {
    tenantMembership?: {
      findFirst(args: unknown): Promise<{ id: string } | null>;
      update(args: unknown): Promise<unknown>;
      create(args: unknown): Promise<unknown>;
    };
  };

  if (!maybePrisma.tenantMembership) {
    return;
  }

  const existing = await maybePrisma.tenantMembership.findFirst({
    where: {
      tenantId: input.tenantId,
      userId: input.userId,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    await maybePrisma.tenantMembership.update({
      where: {
        id: existing.id,
      },
      data: {
        roleId: input.roleId,
        isOwner: true,
        status: 'ACTIVE',
        acceptedAt: new Date(),
      },
    });

    return;
  }

  await maybePrisma.tenantMembership.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      roleId: input.roleId,
      isOwner: true,
      status: 'ACTIVE',
      acceptedAt: new Date(),
    },
  });
}

export async function seedBootstrap(
  prisma: PrismaClient,
): Promise<BootstrapSeedResult> {
  assertBootstrapEnvironment();

  const passwordHash = requireSeedPasswordHash();

  /*
   * Bootstrap seed policy:
   * - No giant interactive transaction.
   * - Every operation is idempotent and safe to rerun.
   * - Permissions are inserted in bulk and then metadata-synced.
   * - Existing admin users are not password-reset on seed reruns.
   * - Financial, billing, payment, and trust posting flows must still use
   *   strict transactions later; this bootstrap seed is a convergence seed.
   */

  const tenant = await seedTenant(prisma);
  const permissions = await seedPermissions(prisma, tenant.id);
  const roles = await seedRoles(prisma, tenant.id, permissions);

  const firmAdminRole = roles.find((role) => role.name === 'FIRM_ADMIN');

  if (!firmAdminRole) {
    throw new Error('firm_admin role was not created.');
  }

  await seedPlatformAdmin(prisma, passwordHash);

  const firmAdmin = await seedFirmAdmin(prisma, {
    tenantId: tenant.id,
    firmAdminRoleId: firmAdminRole.id,
    passwordHash,
  });

  await seedOptionalTenantMembership(prisma, {
    tenantId: tenant.id,
    userId: firmAdmin.id,
    roleId: firmAdminRole.id,
  });

  return {
    status: 'bootstrap_seed_complete',
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    },
    permissions: permissions.length,
    roles: roles.length,
    platformAdminEmail: requireEmailEnv('SEED_PLATFORM_ADMIN_EMAIL'),
    firmAdminEmail: requireEmailEnv('SEED_FIRM_ADMIN_EMAIL'),
  };
}