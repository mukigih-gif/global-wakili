// lib/actions/tenant-actions.ts
import { prisma } from "@/lib/prisma";

export async function registerNewFirm(data: { 
  firmName: string, 
  adminEmail: string, 
  adminName: string 
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the Tenant (The Law Firm)
    const newTenant = await tx.tenant.create({
      data: {
        name: data.firmName,
        slug: data.firmName.toLowerCase().replace(/\s+/g, '-'),
        plan: 'TRIAL',
      },
    });

    // 2. Find the "Advocate" or "Admin" Role ID
    const adminRole = await tx.role.findUnique({
      where: { name: 'ADVOCATE' }, // Matches your Seeded Roles
    });

    // 3. Create the first User for this Tenant
    const user = await tx.user.create({
      data: {
        email: data.adminEmail,
        name: data.adminName,
        tenantId: newTenant.id,
        roleId: adminRole?.id,
      },
    });

    return { tenantId: newTenant.id, userId: user.id };
  });
}