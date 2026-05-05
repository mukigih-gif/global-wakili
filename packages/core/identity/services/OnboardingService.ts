// packages/core/identity/services/OnboardingService.ts

import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import {
  AuditAction,
  AuditSeverity,
  PermissionScope,
  Prisma,
} from '@prisma/client';

import { prisma } from '../../../database/src/prisma';
import { HttpError } from '../../exceptions/ErrorHandler';

type RegisterFirmInput = {
  firmName: string;
  kraPin?: string;
  logoUrl?: string;
  primaryColor?: string;
  adminName: string;
  adminEmail: string;
  password: string;
  mainBranchName: string;
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftCode?: string;
};

type SeedPermissionDefinition = {
  action: string;
  resource: string;
  description: string;
};

const DEFAULT_ROLE_DEFINITIONS = [
  {
    name: 'ADMIN',
    description: 'Tenant administrator with authority to manage firm setup, users, roles, and core operations.',
  },
  {
    name: 'USER',
    description: 'Standard tenant user with baseline access to assigned work.',
  },
] as const;

const DEFAULT_PERMISSION_DEFINITIONS: SeedPermissionDefinition[] = [
  {
    action: 'MANAGE',
    resource: 'users',
    description: 'Manage tenant users and account access.',
  },
  {
    action: 'READ',
    resource: 'reports',
    description: 'View tenant reports and operational dashboards.',
  },
  {
    action: 'CREATE',
    resource: 'matters',
    description: 'Create matters for the tenant.',
  },
];

function assertRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(422, `${fieldName} is required`);
  }

  return value.trim();
}

function normalizeEmail(value: string): string {
  return assertRequiredString(value, 'Admin email').toLowerCase();
}

function normalizeSlug(value: string): string {
  return assertRequiredString(value, 'Firm name')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeKraPin(value: string | undefined): string {
  const normalized = value?.trim().toUpperCase();

  if (!normalized) {
    throw new HttpError(422, 'KRA PIN is required for tenant onboarding');
  }

  return normalized;
}

function optionalTrim(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function onboardingAuditHash(params: {
  tenantId: string;
  userId: string;
  entityId: string;
  eventCode: string;
  createdAt: Date;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        tenantId: params.tenantId,
        userId: params.userId,
        entityId: params.entityId,
        eventCode: params.eventCode,
        createdAt: params.createdAt.toISOString(),
      }),
    )
    .digest('hex');
}

async function ensureTenantRole(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string;
    name: 'ADMIN' | 'USER';
    description: string;
  },
) {
  return tx.role.upsert({
    where: {
      tenantId_name: {
        tenantId: params.tenantId,
        name: params.name,
      },
    },
    create: {
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      isSystem: true,
    },
    update: {
      description: params.description,
      isSystem: true,
    },
  });
}

async function ensurePermission(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string;
    action: string;
    resource: string;
    description: string;
  },
) {
  const existing = await tx.permission.findFirst({
    where: {
      tenantId: params.tenantId,
      action: params.action,
      resource: params.resource,
    },
    select: {
      id: true,
    },
  });

  if (existing) return existing;

  return tx.permission.create({
    data: {
      tenantId: params.tenantId,
      action: params.action,
      resource: params.resource,
      scope: PermissionScope.TENANT,
      description: params.description,
      isSystem: true,
    },
    select: {
      id: true,
    },
  });
}

async function attachPermissionToRole(
  tx: Prisma.TransactionClient,
  params: {
    roleId: string;
    permissionId: string;
  },
) {
  await tx.role.update({
    where: {
      id: params.roleId,
    },
    data: {
      permissions: {
        connect: {
          id: params.permissionId,
        },
      },
    },
  });
}

export class OnboardingService {
  /**
   * registerNewFirm
   * - Transactional onboarding for a new tenant/firm.
   * - Creates tenant, HQ branch, optional office account, admin department,
   *   tenant roles, baseline permissions, firm admin user, and audit entry.
   * - Schema-aligned with current Prisma models:
   *   User.department is a string; HR Department relation belongs to EmployeeProfile.
   *   Role uses tenantId_name compound unique.
   *   Permission is related to Role through Role.permissions, not roleId.
   *   OfficeAccount has no paybillNumber/isDefault fields.
   */
  static async registerNewFirm(data: RegisterFirmInput) {
    const firmName = assertRequiredString(data.firmName, 'Firm name');
    const adminName = assertRequiredString(data.adminName, 'Admin name');
    const adminEmail = normalizeEmail(data.adminEmail);
    const password = assertRequiredString(data.password, 'Password');
    const mainBranchName = assertRequiredString(data.mainBranchName, 'Main branch name');
    const kraPin = normalizeKraPin(data.kraPin);
    const slug = normalizeSlug(firmName);
    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      return await prisma.$transaction(async (tx) => {
        const billingCycleStart = new Date();
        const billingCycleEnd = new Date(billingCycleStart);
        billingCycleEnd.setFullYear(billingCycleEnd.getFullYear() + 1);

        const tenant = await tx.tenant.create({
          data: {
            name: firmName,
            slug,
            kraPin,
            logoUrl: optionalTrim(data.logoUrl) ?? null,
            primaryColor: optionalTrim(data.primaryColor) ?? '#1A1A1A',
            subscriptionStatus: 'ACTIVE',
            billingCycleStart,
            billingCycleEnd,
          },
        });

        const branch = await tx.branch.create({
          data: {
            name: mainBranchName,
            tenantId: tenant.id,
            kraPin,
            email: adminEmail,
          },
        });

        if (data.bankName?.trim() && data.accountNumber?.trim()) {
          await tx.officeAccount.create({
            data: {
              tenantId: tenant.id,
              branchId: branch.id,
              accountName: `${firmName} - Main Office`,
              accountNumber: data.accountNumber.trim(),
              bankName: data.bankName.trim(),
              routingNumber: optionalTrim(data.routingNumber) ?? null,
              swiftCode: optionalTrim(data.swiftCode) ?? null,
              currentBalance: new Prisma.Decimal(0),
              reconciliationBalance: new Prisma.Decimal(0),
              isActive: true,
            },
          });
        }

        const adminDepartment = await tx.department.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            name: 'Administration',
            code: 'ADMIN',
            description: 'Default administration department created during tenant onboarding.',
            isActive: true,
          },
        });

        const adminRole = await ensureTenantRole(tx, {
          tenantId: tenant.id,
          name: DEFAULT_ROLE_DEFINITIONS[0].name,
          description: DEFAULT_ROLE_DEFINITIONS[0].description,
        });

        const userRole = await ensureTenantRole(tx, {
          tenantId: tenant.id,
          name: DEFAULT_ROLE_DEFINITIONS[1].name,
          description: DEFAULT_ROLE_DEFINITIONS[1].description,
        });

        const manageUsersPermission = await ensurePermission(tx, {
          tenantId: tenant.id,
          ...DEFAULT_PERMISSION_DEFINITIONS[0],
        });

        const viewReportsPermission = await ensurePermission(tx, {
          tenantId: tenant.id,
          ...DEFAULT_PERMISSION_DEFINITIONS[1],
        });

        const createMatterPermission = await ensurePermission(tx, {
          tenantId: tenant.id,
          ...DEFAULT_PERMISSION_DEFINITIONS[2],
        });

        await attachPermissionToRole(tx, {
          roleId: adminRole.id,
          permissionId: manageUsersPermission.id,
        });

        await attachPermissionToRole(tx, {
          roleId: adminRole.id,
          permissionId: viewReportsPermission.id,
        });

        await attachPermissionToRole(tx, {
          roleId: userRole.id,
          permissionId: createMatterPermission.id,
        });

        const adminUser = await tx.user.create({
          data: {
            name: adminName,
            email: adminEmail,
            passwordHash: hashedPassword,
            tenantId: tenant.id,
            branchId: branch.id,
            department: adminDepartment.name,
            tenantRole: 'FIRM_ADMIN',
            systemRole: 'NONE',
            roles: {
              connect: {
                id: adminRole.id,
              },
            },
          },
        });

        const auditCreatedAt = new Date();

        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            userId: adminUser.id,
            action: AuditAction.CREATE,
            severity: AuditSeverity.INFO,
            entityType: 'TENANT',
            entityId: tenant.id,
            afterData: {
              eventCode: 'TENANT_CREATED',
              tenantId: tenant.id,
              tenantName: tenant.name,
              branchId: branch.id,
              adminUserId: adminUser.id,
              adminEmail: adminUser.email,
              departmentId: adminDepartment.id,
              departmentName: adminDepartment.name,
            },
            changedFields: [
              'tenant',
              'branch',
              'department',
              'roles',
              'permissions',
              'adminUser',
            ],
            hash: onboardingAuditHash({
              tenantId: tenant.id,
              userId: adminUser.id,
              entityId: tenant.id,
              eventCode: 'TENANT_CREATED',
              createdAt: auditCreatedAt,
            }),
            success: true,
            createdAt: auditCreatedAt,
          },
        });

        return {
          tenantId: tenant.id,
          branchId: branch.id,
          departmentId: adminDepartment.id,
          adminUserId: adminUser.id,
          adminRoleId: adminRole.id,
          userRoleId: userRole.id,
        };
      });
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };

      if (err?.code === 'P2002') {
        throw new HttpError(409, 'A resource with the same unique field already exists');
      }

      console.error('OnboardingService.registerNewFirm error', error);
      throw new HttpError(500, 'Failed to register new firm');
    }
  }
}

