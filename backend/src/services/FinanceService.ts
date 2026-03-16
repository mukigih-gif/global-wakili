import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const FinanceService = {
  /**
   * 1. FIRM FINANCIAL HEALTH SUMMARY
   */
  async getFirmWideSummary() {
    const [unbilledTime, unpaidInvoices, trustBalances] = await Promise.all([
      prisma.timeEntry.findMany({ where: { status: "UNBILLED" } }),
      prisma.invoice.findMany({ where: { status: "ISSUED" } }),
      prisma.account.aggregate({
        where: { type: 'TRUST' }, 
        _sum: { balance: true }
      })
    ]);

    const totalWIP = unbilledTime.reduce((sum, t) => sum + (t.duration * t.rate), 0);
    const totalAR = unpaidInvoices.reduce((sum, i) => sum + Number(i.total), 0);

    return {
      wip: totalWIP.toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
      receivables: totalAR.toLocaleString('en-KE', { style: 'currency', currency: 'KES' }),
      trustLiability: (trustBalances._sum.balance || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' })
    };
  },

  /**
   * 2. REVENUE BY FEE EARNER
   */
  async getRevenueByLawyer() {
    const lawyerRevenue = await prisma.invoice.groupBy({
      by: ['feeEarnerId'],
      where: { status: 'FULLY_PAID' },
      _sum: { total: true },
    });

    const lawyers = await prisma.user.findMany({
      where: { id: { in: lawyerRevenue.map(r => r.feeEarnerId) } },
      select: { id: true, name: true }
    });

    return lawyerRevenue.map(rev => ({
      name: lawyers.find(l => l.id === rev.feeEarnerId)?.name || "Unknown",
      total: Number(rev._sum.total || 0),
      formattedTotal: Number(rev._sum.total || 0).toLocaleString('en-KE', { 
        style: 'currency', 
        currency: 'KES' 
      })
    }));
  },

  /**
   * 3. REVENUE BY MONTH (For Line Chart)
   */
  async getRevenueTrends() {
    const rawData = await prisma.invoice.findMany({
      where: { status: 'FULLY_PAID' },
      select: { total: true, createdAt: true }
    });

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trends = rawData.reduce((acc: any, inv) => {
      const month = months[new Date(inv.createdAt).getMonth()];
      acc[month] = (acc[month] || 0) + Number(inv.total);
      return acc;
    }, {});

    return months.map(m => ({ month: m, total: trends[m] || 0 }));
  },

  /**
   * 4. STAFF PRODUCTIVITY (The "Koki Report")
   */
  async getStaffProductivity() {
    const stats = await prisma.invoice.groupBy({
      by: ['createdById'],
      _count: { id: true },
      _sum: { total: true }
    });

    const users = await prisma.user.findMany({
      select: { id: true, name: true }
    });

    return stats.map(s => ({
      staffName: users.find(u => u.id === s.createdById)?.name || "Unknown",
      invoicesProcessed: s._count.id,
      totalValueManaged: Number(s._sum.total || 0)
    }));
  },

  /**
   * 5. REVENUE BY CASE CATEGORY
   */
  async getRevenueByCategory() {
    const categoryRevenue = await prisma.invoice.findMany({
      where: { status: 'FULLY_PAID' },
      include: {
        matter: {
          select: { category: true }
        }
      }
    });

    const totals = categoryRevenue.reduce((acc: any, inv) => {
      const cat = inv.matter.category || "General";
      acc[cat] = (acc[cat] || 0) + Number(inv.total);
      return acc;
    }, {});

    return Object.keys(totals).map(category => ({
      category,
      value: totals[category],
      formattedValue: totals[category].toLocaleString('en-KE', { 
        style: 'currency', 
        currency: 'KES' 
      })
    }));
  }
};