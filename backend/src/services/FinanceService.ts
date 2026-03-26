// src/services/FinanceService.ts
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class FinanceService {
  /**
   * 1. FIRM FINANCIAL HEALTH SUMMARY (WIP, AR, Trust)
   * Essential for Partners to see liquidity and liabilities.
   */
  static async getFirmWideSummary() {
    const [unbilledTime, unpaidInvoices, trustBalances] = await Promise.all([
      prisma.timeEntry.findMany({ where: { status: "UNBILLED" } }),
      prisma.invoice.findMany({ where: { status: "ISSUED" } }),
      prisma.account.aggregate({
        where: { type: 'TRUST' },
        _sum: { balance: true }
      })
    ]);

    const totalWIP = unbilledTime.reduce((sum, t) => sum + (t.duration * Number(t.rate)), 0);
    const totalAR = unpaidInvoices.reduce((sum, i) => sum + Number(i.total), 0);

    return {
      workInProgress: this.formatKES(totalWIP),
      accountsReceivable: this.formatKES(totalAR),
      trustLiability: this.formatKES(trustBalances._sum.balance || 0)
    };
  }

  /**
   * 2. REVENUE BY FEE EARNER
   * Tracks which lawyers are bringing in the most "Fully Paid" revenue.
   */
  static async getRevenueByLawyer() {
    const revenueStats = await prisma.invoice.groupBy({
      by: ['feeEarnerId'],
      where: { status: 'FULLY_PAID' },
      _sum: { total: true },
    });

    const staff = await prisma.user.findMany({
      where: { id: { in: revenueStats.map(r => r.feeEarnerId) } },
      select: { id: true, name: true }
    });

    return revenueStats.map(rev => ({
      name: staff.find(s => s.id === rev.feeEarnerId)?.name || "Staff Member",
      total: Number(rev._sum.total || 0),
      formatted: this.formatKES(rev._sum.total || 0)
    }));
  }

  /**
   * 3. REVENUE TRENDS (Line Chart Data)
   * Groups revenue by month for the current calendar year.
   */
  static async getRevenueTrends() {
    const currentYear = new Date().getFullYear();
    const paidInvoices = await prisma.invoice.findMany({
      where: { 
        status: 'FULLY_PAID',
        createdAt: { gte: new Date(currentYear, 0, 1) } 
      },
      select: { total: true, createdAt: true }
    });

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trends = paidInvoices.reduce((acc: any, inv) => {
      const m = months[new Date(inv.createdAt).getMonth()];
      acc[m] = (acc[m] || 0) + Number(inv.total);
      return acc;
    }, {});

    return months.map(m => ({ month: m, total: trends[m] || 0 }));
  }

  /**
   * 4. STAFF PRODUCTIVITY
   * Measures administrative output (Invoices processed vs Value managed).
   */
  static async getStaffProductivity() {
    const stats = await prisma.invoice.groupBy({
      by: ['createdById'],
      _count: { id: true },
      _sum: { total: true }
    });

    const users = await prisma.user.findMany({ select: { id: true, name: true } });

    return stats.map(s => ({
      name: users.find(u => u.id === s.createdById)?.name || "System User",
      count: s._count.id,
      value: Number(s._sum.total || 0)
    }));
  }

  /**
   * 5. REVENUE BY CASE CATEGORY (Pie Chart Data)
   * Shows which areas of law (Conveyancing, Litigation, etc.) are most profitable.
   */
  static async getRevenueByCategory() {
    const data = await prisma.invoice.findMany({
      where: { status: 'FULLY_PAID' },
      include: { matter: { select: { category: true } } }
    });

    const totals = data.reduce((acc: any, inv) => {
      const cat = inv.matter?.category || "General Matters";
      acc[cat] = (acc[cat] || 0) + Number(inv.total);
      return acc;
    }, {});

    return Object.keys(totals).map(cat => ({
      category: cat,
      value: totals[cat],
      formatted: this.formatKES(totals[cat])
    }));
  }

  // Helper for consistent Kenyan Shilling formatting
  private static formatKES(amount: number | Decimal) {
    return Number(amount).toLocaleString('en-KE', { 
      style: 'currency', 
      currency: 'KES' 
    });
  }// backend/services/FinanceService.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class FinanceService {
  /**
   * Moves earned fees from the Client Trust to the Firm Office Account.
   * Statutory Requirement: Must have an invoice.
   */
  static async transferFeesToOffice(matterId: string, amount: number, invoiceId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Check current trust balance
      const matter = await tx.matter.findUnique({ where: { id: matterId } });
      if (!matter || matter.trustBalance.toNumber() < amount) {
        throw new Error("Insufficient Trust Funds for this transfer.");
      }

      // 2. Reduce Trust Balance
      await tx.matter.update({
        where: { id: matterId },
        data: { trustBalance: { decrement: amount } }
      });

      // 3. Log the Transaction
      await tx.transaction.create({
        data: {
          matterId,
          amount,
          type: 'FEE_TRANSFER',
          reference: `INV-${invoiceId}`,
          description: "Internal transfer: Earned Fees",
          userId: "system" // Or current user ID
        }
      });

      // 4. Update Invoice Status
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'FULLY_PAID' }
      });
    });
  }
}
}