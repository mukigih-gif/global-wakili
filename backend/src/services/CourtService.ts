import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CourtService {
  /**
   * SCHEDULE HEARING
   * Logs a court date and ensures it appears on the Dashboard calendar.
   */
  static async scheduleHearing(matterId: number, hearingDate: Date, courtName: string, judge: string) {
    try {
      return await prisma.courtHearing.create({
        data: {
          matterId,
          hearingDate,
          courtName,
          judge,
          status: 'UPCOMING'
        }
      });
    } catch (error: any) {
      throw new Error(`Failed to schedule hearing: ${error.message}`);
    }
  }

  /**
   * GET UPCOMING HEARINGS
   * Feeds the "Alerts" and "Calendar" widgets on the Dashboard.
   */
  static async getUpcomingHearings() {
    return await prisma.courtHearing.findMany({
      where: { hearingDate: { gte: new Date() } },
      include: { matter: { select: { title: true, caseNumber: true } } },
      orderBy: { hearingDate: 'asc' },
      take: 5 // Just the top 5 for the dashboard
    });
  }
}