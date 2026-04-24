import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PermissionScope,
  PrismaClient,
  SystemRole,
  TenantRole,
  UserStatus,
} from '@prisma/client';

import { ALL_PERMISSION_DEFINITIONS } from '../../../apps/api/src/config/permissions';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run database seed.');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type PermissionRecord = {
  id: string;
  resource: string;
  action: string;
};

type RoleSeedDefinition = {
  name: string;
  description: string;
  tenantRole: TenantRole;
  selector: 'ALL' | ((permission: PermissionRecord) => boolean);
};

const DEFAULT_PASSWORD_HASH =
  process.env.SEED_DEFAULT_PASSWORD_HASH ??
  '$2a$10$changeThisSeedPasswordHashBeforeProduction000000000000000000';

function assertProductionSeedSafety() {
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_DEFAULT_PASSWORD_HASH) {
    throw new Error(
      'Refusing to seed production users without SEED_DEFAULT_PASSWORD_HASH.',
    );
  }
}

function addOneYear(date: Date): Date {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + 1);
  return copy;
}

function permissionKey(permission: Pick<PermissionRecord, 'resource' | 'action'>): string {
  return `${permission.resource}.${permission.action}`;
}

function hasResource(resources: string[]) {
  const allowed = new Set(resources);
  return (permission: PermissionRecord) => allowed.has(permission.resource);
}

function hasAny(keys: string[]) {
  const allowed = new Set(keys);
  return (permission: PermissionRecord) => allowed.has(permissionKey(permission));
}

const ROLE_DEFINITIONS: RoleSeedDefinition[] = [
  {
    name: 'firm_admin',
    description: 'Firm administrator with full tenant permissions',
    tenantRole: TenantRole.FIRM_ADMIN,
    selector: 'ALL',
  },
  {
    name: 'branch_manager',
    description: 'Branch manager with operational oversight permissions',
    tenantRole: TenantRole.BRANCH_MANAGER,
    selector: (permission) =>
      hasResource([
        'finance',
        'trust',
        'procurement',
        'client',
        'matter',
        'document',
        'calendar',
        'integrations',
      ])(permission) ||
      hasAny([
        'admin.view_audit',
        'admin.manage_settings',
      ])(permission),
  },
  {
    name: 'accountant',
    description: 'Accounting, finance, trust, procurement, and payroll operator',
    tenantRole: TenantRole.ACCOUNTANT,
    selector: hasResource([
      'finance',
      'trust',
      'procurement',
      'payroll',
      'integrations',
    ]),
  },
  {
    name: 'advocate',
    description: 'Advocate with client, matter, document, contract, and calendar permissions',
    tenantRole: TenantRole.ADVOCATE,
    selector: hasResource([
      'client',
      'matter',
      'document',
      'calendar',
    ]),
  },
  {
    name: 'associate',
    description: 'Associate advocate with matter execution permissions',
    tenantRole: TenantRole.ASSOCIATE,
    selector: (permission) =>
      hasAny([
        'client.view_client',
        'client.view_ledger',
        'matter.view_matter',
        'matter.create_time_entry',
        'matter.view_profitability',
        'document.upload_document',
        'document.view_document',
        'document.download_document',
        'document.search_document',
        'document.view_contract',
        'calendar.create_event',
        'calendar.update_event',
        'calendar.view_event',
        'calendar.manage_attendees',
        'calendar.check_availability',
        'calendar.view_dashboard',
      ])(permission),
  },
  {
    name: 'clerk',
    description: 'Legal clerk with limited operational permissions',
    tenantRole: TenantRole.CLERK,
    selector: (permission) =>
      hasAny([
        'client.view_client',
        'matter.view_matter',
        'matter.create_time_entry',
        'document.upload_document',
        'document.view_document',
        'document.search_document',
        'calendar.create_event',
        'calendar.update_event',
        'calendar.view_event',
        'calendar.check_availability',
      ])(permission),
  },
  {
    name: 'client',
    description: 'Client portal user with restricted portal-facing permissions',
    tenantRole: TenantRole.CLIENT,
    selector: (permission) =>
      hasAny([
        'client.view_portal',
        'document.view_document',
        'document.download_document',
        'calendar.view_event',
      ])(permission),
  },
];

async function seedTenant() {
  const now = new Date();

  return prisma.tenant.upsert({
    where: {
      slug: process.env.SEED_TENANT_SLUG ?? 'default',
    },
    update: {
      name: process.env.SEED_TENANT_NAME ?? 'Default Tenant',
      kraPin: process.env.SEED_TENANT_KRA_PIN ?? 'P000000000A',
    },
    create: {
      name: process.env.SEED_TENANT_NAME ?? 'Default Tenant',
      slug: process.env.SEED_TENANT_SLUG ?? 'default',
      kraPin: process.env.SEED_TENANT_KRA_PIN ?? 'P000000000A',
      billingCycleStart: now,
      billingCycleEnd: addOneYear(now),
    },
  });
}

async function seedPermissions(tenantId: string): Promise<PermissionRecord[]> {
  const uniquePermissions = new Map(
    ALL_PERMISSION_DEFINITIONS.map((permission) => [
      `${permission.resource}.${permission.action}`,
      permission,
    ]),
  );

  const permissions = await Promise.all(
    Array.from(uniquePermissions.values()).map((permission) =>
      prisma.permission.upsert({
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
          action: permission.action,
          resource: permission.resource,
          description: permission.description,
          scope: PermissionScope.TENANT,
          isSystem: true,
        },
        select: {
          id: true,
          resource: true,
          action: true,
        },
      }),
    ),
  );

  return permissions;
}

async function seedRoles(tenantId: string, permissions: PermissionRecord[]) {
  const roles = [];

  for (const roleDefinition of ROLE_DEFINITIONS) {
    const selectedPermissions =
      roleDefinition.selector === 'ALL'
        ? permissions
        : permissions.filter(roleDefinition.selector);

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

async function seedPlatformAdmin() {
  const email =
    process.env.SEED_PLATFORM_ADMIN_EMAIL ?? 'platform.admin@globalwakili.local';

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
        name: process.env.SEED_PLATFORM_ADMIN_NAME ?? 'Platform Super Admin',
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
      name: process.env.SEED_PLATFORM_ADMIN_NAME ?? 'Platform Super Admin',
      passwordHash: DEFAULT_PASSWORD_HASH,
      systemRole: SystemRole.SUPER_ADMIN,
      tenantRole: TenantRole.NONE,
      status: UserStatus.ACTIVE,
    },
  });
}

async function seedFirmAdmin(tenantId: string, firmAdminRoleId: string) {
  const email =
    process.env.SEED_FIRM_ADMIN_EMAIL ?? 'firm.admin@globalwakili.local';

  const existing = await prisma.user.findFirst({
    where: {
      tenantId,
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
        name: process.env.SEED_FIRM_ADMIN_NAME ?? 'Firm Administrator',
        systemRole: SystemRole.NONE,
        tenantRole: TenantRole.FIRM_ADMIN,
        status: UserStatus.ACTIVE,
        roles: {
          set: [{ id: firmAdminRoleId }],
        },
      },
    });
  }

  return prisma.user.create({
    data: {
      tenantId,
      email,
      name: process.env.SEED_FIRM_ADMIN_NAME ?? 'Firm Administrator',
      passwordHash: DEFAULT_PASSWORD_HASH,
      systemRole: SystemRole.NONE,
      tenantRole: TenantRole.FIRM_ADMIN,
      status: UserStatus.ACTIVE,
      roles: {
        connect: [{ id: firmAdminRoleId }],
      },
    },
  });
}

async function seedOptionalTenantMembership(input: {
  tenantId: string;
  userId: string;
  roleId: string;
}) {
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

async function main() {
  assertProductionSeedSafety();

  const tenant = await seedTenant();
  const permissions = await seedPermissions(tenant.id);
  const roles = await seedRoles(tenant.id, permissions);

  const firmAdminRole = roles.find((role) => role.name === 'firm_admin');

  if (!firmAdminRole) {
    throw new Error('firm_admin role was not created.');
  }

  await seedPlatformAdmin();

  const firmAdmin = await seedFirmAdmin(tenant.id, firmAdminRole.id);

  await seedOptionalTenantMembership({
    tenantId: tenant.id,
    userId: firmAdmin.id,
    roleId: firmAdminRole.id,
  });

  console.log(
    JSON.stringify(
      {
        status: 'seed_complete',
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
        },
        permissions: permissions.length,
        roles: roles.length,
        platformAdminEmail:
          process.env.SEED_PLATFORM_ADMIN_EMAIL ?? 'platform.admin@globalwakili.local',
        firmAdminEmail:
          process.env.SEED_FIRM_ADMIN_EMAIL ?? 'firm.admin@globalwakili.local',
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });