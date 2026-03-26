// src/services/UserService.ts
import { PrismaClient, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class UserService {
  /**
   * Block a user immediately (e.g., in case of a security breach or termination)
   */
  static async blockUser(userId: string, reason: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { 
        status: UserStatus.BLOCKED,
        blockedReason: reason 
      }
    });
  }

  /**
   * Activate a new hire or pending user
   */
  static async activateUser(userId: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE }
    });
  }
}