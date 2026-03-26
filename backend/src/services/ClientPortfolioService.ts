// src/services/ClientPortfolioService.ts
export class ClientPortfolioService {
  static async getCumulativePosition(clientId: string) {
    const matters = await prisma.matter.findMany({
      where: { clientId },
      include: { 
        invoices: { where: { status: 'PENDING' } },
        transactions: { where: { type: 'TRUST_DEPOSIT' } }
      }
    });

    const totalTrust = matters.reduce((sum, m) => sum.add(m.trustBalance), new Decimal(0));
    const totalOutstanding = matters.reduce((sum, m) => {
      const matterFees = m.invoices.reduce((s, inv) => s.add(inv.total), new Decimal(0));
      return sum.add(matterFees);
    }, new Decimal(0));

    return {
      mattersCount: matters.length,
      totalTrustBalance: totalTrust,
      totalOutstandingFees: totalOutstanding,
      netPosition: totalTrust.minus(totalOutstanding),
      mattersDetail: matters
    };
  }// src/services/ClientPortfolioService.ts
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class ClientPortfolioService {
  /**
   * Calculates "Total Portfolio Position"
   * Sums Trust Balances vs. Outstanding Invoices across ALL matters for one client.
   */
  static async getClientFinancialSummary(clientId: string) {
    const matters = await prisma.matter.findMany({
      where: { clientId },
      include: {
        invoices: { where: { status: 'PENDING' } },
        worklogs: { where: { status: 'PENDING_INVOICE' } }
      }
    });

    let totalTrust = new Decimal(0);
    let totalUnpaidInvoices = new Decimal(0);
    let totalUnbilledWIP = new Decimal(0);

    matters.forEach(matter => {
      totalTrust = totalTrust.add(matter.trustBalance);
      
      const unpaid = matter.invoices.reduce((acc, inv) => acc.add(inv.total), new Decimal(0));
      totalUnpaidInvoices = totalUnpaidInvoices.add(unpaid);

      const wips = matter.worklogs.reduce((acc, log) => acc.add(log.billableAmount), new Decimal(0));
      totalUnbilledWIP = totalUnbilledWIP.add(wips);
    });

    return {
      clientId,
      totalTrustBalance: totalTrust,
      totalDebt: totalUnpaidInvoices,
      unbilledWorkInProgress: totalUnbilledWIP,
      netPosition: totalTrust.minus(totalUnpaidInvoices).minus(totalUnbilledWIP)
    };
  }
}
}