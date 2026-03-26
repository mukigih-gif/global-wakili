import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class HealthCheckService {
  static async performAudit() {
    const alerts: string[] = [];

    // 1. Check Trial Balance (The Golden Rule)
    const totals = await prisma.ledgerLine.aggregate({
      _sum: { debit: true, credit: true }
    });
    
    if (totals._sum.debit?.toNumber() !== totals._sum.credit?.toNumber()) {
      alerts.push("CRITICAL: Trial Balance Mismatch. Ledger is mathematically broken.");
    }

    // 2. Trust Integrity Check (LSK Compliance)
    const totalMatterTrust = await prisma.matter.aggregate({
      _sum: { trustBalance: true }
    });

    // Assume Account '1001' is your Trust Bank Account
    const trustBankAccount = await prisma.ledgerLine.groupBy({
      by: ['accountId'],
      where: { accountId: '1001' },
      _sum: { debit: true, credit: true }
    });

    const bankBalance = (trustBankAccount[0]?._sum.debit?.toNumber() || 0) - (trustBankAccount[0]?._sum.credit?.toNumber() || 0);

    if (bankBalance < (totalMatterTrust._sum.trustBalance?.toNumber() || 0)) {
      alerts.push("REGULATORY RISK: Trust Bank account is underfunded relative to client liabilities.");
    }

    // 3. Stagnant Funds Check
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const stagnantMatters = await prisma.matter.findMany({
      where: {
        trustBalance: { gt: 0 },
        transactions: {
          none: { createdAt: { gte: ninetyDaysAgo } }
        }
      }
    });

    if (stagnantMatters.length > 0) {
      alerts.push(`OPERATIONAL: ${stagnantMatters.length} matters have stagnant trust funds (>90 days).`);
    }

    return {
      status: alerts.length === 0 ? "HEALTHY" : "WARNING",
      timestamp: new Date(),
      alerts
    };
  }
}