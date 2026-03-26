import { PrismaClient, SystemRole, TenantRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export class OnboardingService {
  /**
   * ONBOARD A NEW LAW FIRM
   * Creates Firm -> Creates Branch -> Creates FIRM_ADMIN User
   */
  static async createNewTenant(data: {
    firmName: string;
    adminName: string;
    adminEmail: string;
    password: string;
    mainBranchName: string;
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 12);

    return await prisma.$transaction(async (tx) => {
      // 1. Create the Law Firm (The Tenant)
      const firm = await tx.lawFirm.create({
        data: {
          name: data.firmName,
        },
      });

      // 2. Create the Primary Branch (The Office)
      const branch = await tx.branch.create({
        data: {
          name: data.mainBranchName,
          firmId: firm.id,
        },
      });

      // 3. Create the Firm Admin (The Managing Partner)
      const user = await tx.user.create({
        data: {
          name: data.adminName,
          email: data.adminEmail,
          passwordHash: hashedPassword,
          firmId: firm.id,
          branchId: branch.id,
          tenantRole: 'FIRM_ADMIN', // High-level access for the client
          systemRole: 'NONE',       // They are NOT SaaS employees
        },
      });

      return { firm, branch, user };
    });
  }
}