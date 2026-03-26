import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Safely deactivates a user by reassigning their matters 
 * to a successor before blocking them.
 */
async function offboardAdvocate(oldUserId: string, newSuccessorId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Reassign all Matters
    await tx.matter.updateMany({
      where: { leadAdvocateId: oldUserId },
      data: { leadAdvocateId: newSuccessorId }
    });

    // 2. Reassign unpaid Invoices
    await tx.invoice.updateMany({
      where: { feeEarnerId: oldUserId, status: 'DRAFT' },
      data: { feeEarnerId: newSuccessorId }
    });

    // 3. Block the User
    await tx.user.update({
      where: { id: oldUserId },
      data: { status: 'BLOCKED' }
    });

    console.log(`Success: All work transferred to ${newSuccessorId}`);
  });
}