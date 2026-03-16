import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class MatterService {
  /**
   * CLIO-STYLE CONFLICT CHECK
   * Validates if a name exists as a client or opponent in any past/present file.
   */
  static async checkConflict(name: string) {
    const conflicts = await prisma.matter.findMany({
      where: {
        OR: [
          { clientName: { contains: name } },
          { opposingParty: { contains: name } }
        ]
      }
    });
    return { hasConflict: conflicts.length > 0, conflicts };
  }

  /**
   * ENHANCED MATTER CREATION
   * Ensures every matter is opened with the correct billing and party metadata.
   */
  static async createMatter(data: {
    title: string;
    clientName: string;
    opposingParty?: string;
    billingType: string;
    category: string;
  }) {
    return await prisma.matter.create({
      data: {
        ...data,
        status: "ACTIVE",
        stage: "INTAKE"
      }
    });
  }

  /**
   * GET DASHBOARD ANALYTICS
   * Feeds the Pie Chart and Recent Matters list.
   */
  static async getMatterAnalytics() {
    const categories = await prisma.matter.groupBy({
      by: ['category'],
      _count: { _all: true }
    });

    const recent = await prisma.matter.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    return { 
      categoryData: categories.map(c => ({ name: c.category, value: c._count._all })),
      recentMatters: recent 
    };
  }
}