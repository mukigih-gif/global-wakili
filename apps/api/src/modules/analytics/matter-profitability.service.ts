import { Decimal } from '@prisma/client/runtime/library';

export class MatterProfitabilityService {

  /**
   * 📊 FULL MATTER PROFITABILITY
   */
  static async getMatterProfit(context: any, matterId: string) {

    const db = context.req.db;

    // 💰 REVENUE
    const invoices = await db.invoice.findMany({
      where: { matterId, tenantId: context.tenantId }
    });

    const revenue = invoices.reduce(
      (acc, i) => acc.add(i.total),
      new Decimal(0)
    );

    // 💸 EXPENSES
    const expenses = await db.vendorBill.findMany({
      where: { matterId, tenantId: context.tenantId }
    });

    const cost = expenses.reduce(
      (acc, e) => acc.add(e.amount),
      new Decimal(0)
    );

    // ⏱️ TIME COST (LAWYER COST)
    const timeEntries = await db.timeEntry.findMany({
      where: { matterId, tenantId: context.tenantId }
    });

    const timeCost = timeEntries.reduce(
      (acc, t) => acc.add(t.hours.mul(t.rate)),
      new Decimal(0)
    );

    const totalCost = cost.add(timeCost);

    return {
      matterId,
      revenue,
      cost: totalCost,
      profit: revenue.minus(totalCost),
      margin: revenue.equals(0)
        ? new Decimal(0)
        : revenue.minus(totalCost).div(revenue)
    };
  }
}