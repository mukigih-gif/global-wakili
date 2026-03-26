// src/services/PortfolioService.ts
export class PortfolioService {
  static async getClientStatementData(clientId: string) {
    const clientData = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        matters: {
          include: {
            invoices: { where: { status: 'PENDING' } },
            transactions: { where: { type: 'TRUST_DEPOSIT' } }
          }
        }
      }
    });

    if (!clientData) return null;

    let aggregateTrust = new Decimal(0);
    let aggregateDebt = new Decimal(0);

    const matterSummaries = clientData.matters.map(matter => {
      const trust = matter.trustBalance;
      const debt = matter.invoices.reduce((acc, inv) => acc.add(inv.total), new Decimal(0));
      
      aggregateTrust = aggregateTrust.add(trust);
      aggregateDebt = aggregateDebt.add(debt);

      return {
        title: matter.title,
        fileNumber: matter.fileNumber,
        trust,
        debt,
        net: trust.minus(debt)
      };
    });

    return {
      clientName: clientData.name,
      totalPortfolioTrust: aggregateTrust,
      totalPortfolioDebt: aggregateDebt,
      grandNetPosition: aggregateTrust.minus(aggregateDebt),
      breakdown: matterSummaries
    };
  }
}