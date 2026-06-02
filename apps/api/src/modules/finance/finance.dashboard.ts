// apps/api/src/modules/finance/finance.dashboard.ts

import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { ReportingService } from './reporting.service';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(value);
}

export class FinanceDashboardService {
  static async getDashboard(req: Request) {
    const db = req.db;
    const tenantId = req.tenantId!;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [snapshot, openInvoicesRaw, overdueInvoicesRaw, openVendorBillsRaw] =
      await Promise.all([
        ReportingService.getDashboardSnapshot(req),

        db.invoice.aggregate({
          where: {
            tenantId,
            status: {
              in: ['INVOICED', 'PARTIALLY_PAID'],
            },
          },
          _sum: {
            total: true,
            paidAmount: true,
            balanceDue: true,
          },
        }),

        db.invoice.aggregate({
          where: {
            tenantId,
            dueDate: {
              lt: now,
            },
            status: {
              in: ['INVOICED', 'PARTIALLY_PAID'],
            },
          },
          _sum: {
            total: true,
            paidAmount: true,
            balanceDue: true,
          },
        }),

        db.vendorBill.aggregate({
          where: {
            tenantId,
            status: {
              in: ['APPROVED', 'PARTIALLY_PAID'],
            },
          },
          _sum: {
            total: true,
            paidAmount: true,
            vatAmount: true,
          },
        }),
      ]);

    const openInvoices = openInvoicesRaw as any;
    const overdueInvoices = overdueInvoicesRaw as any;
    const openVendorBills = openVendorBillsRaw as any;

    const balanceCheck = snapshot.trialBalance.reduce(
      (
        acc: { debit: Prisma.Decimal; credit: Prisma.Decimal },
        row: any,
      ) => {
        acc.debit = acc.debit.plus(toDecimal(row.debit));
        acc.credit = acc.credit.plus(toDecimal(row.credit));
        return acc;
      },
      {
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0),
      },
    );

    const vendorBillTotal = toDecimal(openVendorBills._sum?.total);
    const vendorBillPaid = toDecimal(openVendorBills._sum?.paidAmount);

    return {
      generatedAt: now,
      periodStart: monthStart,

      trialBalanceBalanced: balanceCheck.debit.equals(balanceCheck.credit),
      trialBalanceTotals: {
        totalDebit: balanceCheck.debit,
        totalCredit: balanceCheck.credit,
      },

      balanceSheet: snapshot.balanceSheet,
      cashflow: snapshot.cashflow,

      receivables: {
        grossOpenInvoices: toDecimal(openInvoices._sum?.total),
        totalPaidAgainstOpenInvoices: toDecimal(openInvoices._sum?.paidAmount),
        openInvoiceBalance: toDecimal(openInvoices._sum?.balanceDue),
        overdueInvoices: toDecimal(overdueInvoices._sum?.total),
        overdueInvoiceBalance: toDecimal(overdueInvoices._sum?.balanceDue),
      },

      payables: {
        grossOpenVendorBills: vendorBillTotal,
        totalPaidAgainstOpenVendorBills: vendorBillPaid,
        openVendorBillBalance: vendorBillTotal.minus(vendorBillPaid),
        openVendorBillVat: toDecimal(openVendorBills._sum?.vatAmount),
      },
    };
  }
}

export default FinanceDashboardService;
