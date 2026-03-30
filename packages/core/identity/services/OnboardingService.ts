// packages/core/identity/services/OnboardingService.ts
import bcrypt from 'bcryptjs';
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
  paybillNumber?: string;
};

export class OnboardingService {
  /**
   * registerNewFirm
   * - Transactional onboarding for a new tenant (firm)
   * - Seeds tenant, branch, department, admin user, default roles & permissions
   */
  static async registerNewFirm(data: RegisterFirmInput) {
    // Basic validation (controller should already validate via Zod)
    if (!data.firmName || !data.adminEmail || !data.password || !data.mainBranchName) {
      throw new HttpError(422, 'Missing required onboarding fields');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const slug = data.firmName.toLowerCase().replace(/\s+/g, '-');

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Tenant
        const tenant = await tx.tenant.create({
          data: {
            name: data.firmName,
            slug,
            kraPin: data.kraPin?.toUpperCase() ?? null,
            logoUrl: data.logoUrl ?? null,
            brandColor: data.primaryColor ?? '#000000',
            subscriptionStatus: 'ACTIVE',
          },
        });

        // 2. Branch (HQ)
        const branch = await tx.branch.create({
          data: {
            name: data.mainBranchName,
            tenantId: tenant.id,
            kraPin: data.kraPin?.toUpperCase() ?? null,
            email: data.adminEmail.toLowerCase(),
          },
        });

        // 3. Office account (optional)
        if (data.bankName && data.accountNumber) {
          await tx.officeAccount.create({
            data: {
              accountName: `${data.firmName} - Main Office`,
              bankName: data.bankName,
              accountNumber: data.accountNumber,
              paybillNumber: data.paybillNumber ?? null,
              branchId: branch.id,
              tenantId: tenant.id,
              isDefault: true,
            },
          });
        }

        // 4. Admin department
        const adminDept = await tx.department.create({
          data: {
            name: 'Administration',
            tenantId: tenant.id,
            branchId: branch.id,
          },
        });

        // 5. Seed roles & permissions (idempotent using upsert)
        const adminRole = await tx.role.upsert({
          where: { name_tenantId: { name: 'ADMIN', tenantId: tenant.id } as any },
          create: { name: 'ADMIN', tenantId: tenant.id },
          update: {},
        });

        const userRole = await tx.role.upsert({
          where: { name_tenantId: { name: 'USER', tenantId: tenant.id } as any },
          create: { name: 'USER', tenantId: tenant.id },
          update: {},
        });

        // Example permissions seed (expand as needed)
        await tx.permission.createMany({
          data: [
            { action: 'MANAGE_USERS', roleId: adminRole.id },
            { action: 'VIEW_REPORTS', roleId: adminRole.id },
            { action: 'CREATE_MATTER', roleId: userRole.id },
          ],
          skipDuplicates: true,
        });

        // 6. Create admin user
        const adminUser = await tx.user.create({
          data: {
            name: data.adminName,
            email: data.adminEmail.toLowerCase(),
            passwordHash: hashedPassword,
            tenantId: tenant.id,
            branchId: branch.id,
            departmentId: adminDept.id,
            tenantRole: 'FIRM_ADMIN',
            systemRole: 'NONE',
            roleId: adminRole.id,
          },
        });

        // 7. Audit seed
        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            userId: adminUser.id,
            action: 'TENANT_CREATED',
            entityType: 'TENANT',
            entityId: tenant.id,
            details: `Tenant ${tenant.name} created with admin ${adminUser.email}`,
          },
        });

        return {
          tenantId: tenant.id,
          branchId: branch.id,
          adminUserId: adminUser.id,
        };
      });
    } catch (err: any) {
      // Map Prisma unique constraint to friendly error
      if (err?.code === 'P2002') {
        throw new HttpError(409, 'A resource with the same unique field already exists');
      }
      console.error('OnboardingService.registerNewFirm error', err);
      throw new HttpError(500, 'Failed to register new firm');
    }
  }
}