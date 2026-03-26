// backend/services/ActivityService.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class ActivityService {
  static async log(matterId: string, userId: string, action: string, details?: string) {
    try {
      return await prisma.activityLog.create({
        data: {
          matterId,
          userId,
          action,
          details: details || null,
        },
      });
    } catch (error) {
      console.error("[AUDIT LOG ERROR]:", error);
    }
  }
}