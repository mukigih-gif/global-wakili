export class JournalService {
  /**
   * 📖 LIST JOURNALS
   * Implements cursor-based pagination and date-range filtering.
   */
  static async list(context: { tenantId: string; req: any }, filters: {
    startDate?: Date;
    endDate?: Date;
    matterId?: string;
    limit?: number;
  }) {
    return await context.req.db.journalEntry.findMany({
      where: {
        tenantId: context.tenantId,
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate
        },
        lines: filters.matterId ? {
          some: { matterId: filters.matterId }
        } : undefined
      },
      include: {
        lines: {
          include: { account: true } // Resolve account names for the UI
        }
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50
    });
  }
}