import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class ReportingService {
  /**
   * 1. MONTHLY VAT-INPUT REPORT (KRA COMPLIANCE)
   * Extracts every shilling spent on compliant suppliers to offset VAT liability.
   */
  static async getMonthlyVatInputReport(month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const paidProcurements = await prisma.procurement.findMany({
      where: {
        status: 'PAID',
        createdAt: { gte: start, lte: end },
        supplierInvoice: { not: null } // Audit Shield: No eTIMS = No Claim
      },
      include: { supplier: true }
    });

    return paidProcurements.map(p => ({
      date: p.createdAt,
      supplier: p.supplier.name,
      pin: p.supplier.kraPin,
      invoiceNumber: p.supplierInvoice,
      totalAmount: p.amount,
      vatClaimable: new Decimal(p.amount).mul(0.16) // Kenyan Standard Rate
    }));
  }

  /**
   * 2. MASTER TRIAL BALANCE (FINANCIAL INTEGRITY)
   * The ultimate check: Sum of Debits must equal Sum of Credits.
   */
  static async getTrialBalance() {
    const balances = await prisma.ledgerLine.groupBy({
      by: ['accountId'],
      _sum: { debit: true, credit: true }
    });

    return balances.map(b => ({
      accountId: b.accountId,
      debits: b._sum.debit || 0,
      credits: b._sum.credit || 0,
      netBalance: new Decimal(b._sum.debit || 0).minus(new Decimal(b._sum.credit || 0))
    }));
  }

  /**
   * 3. PERIODIC PROFIT DISTRIBUTION (PARTNER PAYOUTS)
   * Merged Logic: Calculates true net profit by comparing Income accounts 
   * against Expense accounts from the General Ledger.
   */
  static async generateDistributionReport(type: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL', year: number, value: number) {
    const start = new Date(year, value - 1, 1);
    const end = new Date(year, value, 0);

    // Fetch account-level sums for Revenue (4000 series) and Expenses (5000 series)
    const ledgerSummary = await prisma.ledgerLine.groupBy({
      by: ['accountId'],
      where: {
        journal: { createdAt: { gte: start, lte: end } }
      },
      _sum: { debit: true, credit: true }
    });

    let totalRevenue = new Decimal(0);
    let totalExpenses = new Decimal(0);

    ledgerSummary.forEach(acc => {
      const net = new Decimal(acc._sum.debit || 0).minus(new Decimal(acc._sum.credit || 0));
      if (acc.accountId.startsWith('4')) {
        // Revenue accounts usually have credit balances; we treat credit as positive income
        totalRevenue = totalRevenue.plus(new Decimal(acc._sum.credit || 0).minus(acc._sum.debit || 0));
      } else if (acc.accountId.startsWith('5')) {
        // Expense accounts have debit balances
        totalExpenses = totalExpenses.plus(net);
      }
    });

    const netProfit = totalRevenue.minus(totalExpenses);

    // Split logic (60/40/10) - Adjusted to ensure Retained Earnings are deducted first
    const distributableAmount = netProfit.mul(0.90); // 10% kept as Firm Retained Earnings
    
    return {
      period: `${type} ${value}/${year}`,
      totalRevenue: totalRevenue,
      totalExpenses: totalExpenses,
      netProfit: netProfit,
      firmRetainedEarnings: netProfit.mul(0.10),
      managingPartnerShare: distributableAmount.mul(0.60), // 60% of the 90%
      seniorPartnerShare: distributableAmount.mul(0.40),   // 40% of the 90%
      isCalculatedFromLedger: true
    };
  }
}