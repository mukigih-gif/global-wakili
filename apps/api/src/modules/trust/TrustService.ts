import { prisma } from '@global-wakili/database';

export class TrustService {
  async getTrustAccounts(tenantId: string) {
    return prisma.trustAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTrustAccountById(tenantId: string, trustAccountId: string) {
    return prisma.trustAccount.findFirst({
      where: {
        id: trustAccountId,
        tenantId,
      },
    });
  }

  async getTrustTransactions(tenantId: string, trustAccountId?: string) {
    return prisma.trustTransaction.findMany({
      where: {
        tenantId,
        ...(trustAccountId ? { trustAccountId } : {}),
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });
  }

  async getClientTrustLedger(tenantId: string, clientId?: string, matterId?: string) {
    return prisma.clientTrustLedger.findMany({
      where: {
        tenantId,
        ...(clientId ? { clientId } : {}),
        ...(matterId ? { matterId } : {}),
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });
  }

  async getTrustDashboard(tenantId: string) {
    const [accounts, transactions, ledger] = await Promise.all([
      prisma.trustAccount.findMany({
        where: { tenantId },
        select: {
          id: true,
          accountName: true,
          accountNumber: true,
          currentBalance: true,
          reconciliationBalance: true,
          isActive: true,
          lastReconciled: true,
        },
      }),
      prisma.trustTransaction.count({
        where: { tenantId },
      }),
      prisma.clientTrustLedger.aggregate({
        where: { tenantId },
        _sum: {
          debit: true,
          credit: true,
        },
      }),
    ]);

    const totalTrustBalance = accounts.reduce(
      (sum, account) => sum + Number(account.currentBalance ?? 0),
      0,
    );

    const totalLedgerCredit = Number(ledger._sum.credit ?? 0);
    const totalLedgerDebit = Number(ledger._sum.debit ?? 0);

    return {
      accounts,
      accountCount: accounts.length,
      transactionCount: transactions,
      totalTrustBalance,
      totalClientLedgerBalance: totalLedgerCredit - totalLedgerDebit,
    };
  }
}

export default TrustService;