import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TimeEntryService {
  static async startTimer(tenantId: string, userId: string, matterId: string) {
    return await prisma.timeEntry.create({
      data: {
        tenantId,
        userId,
        matterId,
        startTime: new Date(),
        description: "Drafting...",
        hourlyRate: 0 // Fetch from User profile in production
      }
    });
  }

  static async stopAndSubmit(id: string, description: string) {
    const entry = await prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new Error("Timer not found");

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - entry.startTime.getTime()) / 1000);

    return await prisma.timeEntry.update({
      where: { id },
      data: {
        endTime,
        durationSeconds,
        description,
        status: 'PENDING' // Ready for Partner review
      }
    });
  }
}