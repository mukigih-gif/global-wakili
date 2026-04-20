import { prisma } from '../../config/database';

export const submitForApproval = async (entityType: string, entityId: string, userId: string) => {
  return prisma.approval.create({
    data: {
      entityType,
      entityId,
      status: 'PENDING',
      currentLevel: 1,
      requestedBy: userId
    }
  });
};

export const approveStep = async (approvalId: string, userId: string) => {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId }
  });

  if (!approval) throw new Error('Approval not found');

  const nextLevel = approval.currentLevel + 1;

  const maxLevel = 3; // configurable

  if (nextLevel > maxLevel) {
    return prisma.approval.update({
      where: { id: approvalId },
      data: { status: 'APPROVED' }
    });
  }

  return prisma.approval.update({
    where: { id: approvalId },
    data: { currentLevel: nextLevel }
  });
};

export const rejectApproval = async (approvalId: string) => {
  return prisma.approval.update({
    where: { id: approvalId },
    data: { status: 'REJECTED' }
  });
};