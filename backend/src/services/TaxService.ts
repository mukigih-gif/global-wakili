export class TaxService {
  /**
   * MONTHLY KRA COMPLIANCE SUMMARY
   * Logic: Aggregates VAT from paid invoices for the tax period.
   */
  static async getMonthlyTaxReport(month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const invoices = await prisma.invoice.findMany({
      where: { 
        status: 'FULLY_PAID', 
        paidAt: { gte: start, lte: end } 
      }
    });

    const vatCollected = invoices.reduce((acc, inv) => acc.add(inv.vatAmount || 0), new Decimal(0));
    const grossRevenue = invoices.reduce((acc, inv) => acc.add(inv.subTotal), new Decimal(0));

    return {
      period: `${month}/${year}`,
      vatPayable: vatCollected,
      whtCredit: grossRevenue.mul(0.05), // Estimated 5% WHT to be claimed back
      eTimsReadyCount: invoices.length
    };
  }
}