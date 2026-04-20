export class SupplierDashboard {
  static async getSupplierStats(context: { tenantId: string; req: any }, supplierId: string) {
    const db = context.req.db;

    const stats = await db.procurement.findMany({
      where: { tenantId: context.tenantId, supplierId },
      select: {
        amount: true,
        status: true,
        paidAt: true,
        description: true
      },
      orderBy: { paidAt: 'desc' },
      take: 10
    });

    const totalVolume = stats.reduce((acc: any, curr: any) => acc.add(curr.amount), new Decimal(0));

    return {
      recentTransactions: stats,
      totalLifetimeSpend: totalVolume,
      activeStatus: true
    };
  }
}