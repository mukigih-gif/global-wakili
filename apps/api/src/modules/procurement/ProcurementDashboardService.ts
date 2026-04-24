import { Prisma } from '@global-wakili/database';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class ProcurementDashboardService {
  static async getDashboard(
    db: any,
    params: {
      tenantId: string;
    },
  ) {
    const [vendorCount, activeVendorCount, bills, aggregate] = await Promise.all([
      db.vendor.count({
        where: { tenantId: params.tenantId },
      }),
      db.vendor.count({
        where: {
          tenantId: params.tenantId,
          status: 'ACTIVE',
        },
      }),
      db.vendorBill.findMany({
        where: {
          tenantId: params.tenantId,
        },
        select: {
          id: true,
          status: true,
          total: true,
          paidAmount: true,
          dueDate: true,
        },
      }),
      db.vendorBill.aggregate({
        where: {
          tenantId: params.tenantId,
        },
        _sum: {
          total: true,
          paidAmount: true,
          vatAmount: true,
          whtAmount: true,
        },
      }),
    ]);

    const now = new Date();

    let overdueCount = 0;
    let openBills = 0;

    for (const bill of bills) {
      if (['DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_PAID'].includes(bill.status)) {
        openBills += 1;
      }

      if (
        bill.dueDate &&
        bill.dueDate < now &&
        ['APPROVED', 'PARTIALLY_PAID', 'SUBMITTED'].includes(bill.status)
      ) {
        overdueCount += 1;
      }
    }

    const totalBills = toDecimal(aggregate._sum.total);
    const totalPaid = toDecimal(aggregate._sum.paidAmount);
    const outstanding = totalBills.minus(totalPaid);

    return {
      generatedAt: new Date(),
      vendorCount,
      activeVendorCount,
      openBills,
      overdueBills: overdueCount,
      totalBills,
      totalPaid,
      outstanding: outstanding.gt(0) ? outstanding : new Prisma.Decimal(0),
      totalVAT: toDecimal(aggregate._sum.vatAmount),
      totalWHT: toDecimal(aggregate._sum.whtAmount),
    };
  }
}