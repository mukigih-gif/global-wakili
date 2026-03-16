import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getClientPortfolio = async (req, res) => {
  const { id } = req.params;

  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: {
        matters: {
          include: {
            timeEntries: { where: { isBilled: false } },
            transactions: { where: { accountType: 'TRUST' } }
          }
        }
      }
    });

    if (!client) return res.status(404).json({ error: "Client not found" });

    // Calculate aggregates
    const trustBalance = client.matters.reduce((total, m) => {
      const credits = m.transactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
      const debits = m.transactions.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
      return total + (credits - debits);
    }, 0);

    const mattersWithStats = client.matters.map(m => ({
      ...m,
      unbilledHours: m.timeEntries.reduce((s, e) => s + e.duration, 0),
      wipValue: m.timeEntries.reduce((s, e) => s + e.totalValue, 0),
    }));

    const totalUnbilled = mattersWithStats.reduce((s, m) => s + m.wipValue, 0);

    res.json({
      ...client,
      matters: mattersWithStats,
      trustBalance,
      totalUnbilled
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load portfolio" });
  }
};