export class ProcurementDashboard {
  static async getOverview(context: { tenantId: string; req: any }) {
    const db = context.req.db;

    const [pendingCount, monthlySpend] = await Promise.all([
      db.procurement.count({ where: { tenantId: context.tenantId, status: 'PENDING' } }),
      db.procurement.aggregate({
        where: { 
          tenantId: context.tenantId, 
          status: 'PAID',
          paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        },
        _sum: { amount: true }
      })
    ]);

    return {
      pendingApprovals: pendingCount,
      currentMonthSpend: monthlySpend._sum.amount || 0,
      budgetUtilization: 0 // Logic to compare against firm budget
    };
  }
}