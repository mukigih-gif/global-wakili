import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getFirmDashboard = async (req: any, res: any) => {
  try {
    const [accounts, productivity, gaps] = await Promise.all([
      prisma.account.findMany(),
      prisma.user.findMany({ include: { timeEntries: { where: { isBilled: false } } } }),
      prisma.user.findMany({ where: { OR: [{ password: null }, { defaultRate: 0 }] } })
    ]);

    res.json({
      liquidity: accounts.map(a => ({ type: a.type, balance: a.balance })),
      staffWIP: productivity.map(p => ({
        name: p.name,
        unbilledValue: p.timeEntries.reduce((sum, e) => sum + e.totalValue, 0)
      })),
      onboardingGaps: gaps.length
    });
  } catch (error) {
    res.status(500).json({ error: "Dashboard sync failed" });
  }
};