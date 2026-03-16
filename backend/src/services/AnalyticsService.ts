// src/services/AnalyticsService.ts
export class AnalyticsService {
  static async getAdvocatePerformance(advocateId: number) {
    const stats = await prisma.timeEntry.aggregate({
      where: { advocateId },
      _sum: {
        duration: true,
        totalValue: true
      },
      _count: { id: true }
    });

    const billedVsUnbilled = await prisma.timeEntry.groupBy({
      by: ['isBilled'],
      where: { advocateId },
      _sum: { totalValue: true }
    });

    return {
      totalHours: stats._sum.duration,
      billableRevenue: stats._sum.totalValue,
      utilizationRate: (stats._sum.duration / 40) * 100 // Against a 40hr week
    };
  }
}