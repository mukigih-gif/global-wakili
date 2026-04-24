import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { ReportingService } from './ReportingService';

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

    const [snapshot, openInvoices, overdueInvoices, openVendorBills] = await Promise.all([
      ReportingService.getDashboardSnapshot(req),
      db.invoice.aggregate({
        where: {
          tenantId,
          status: {
            in: ['DRAFT', 'SUBMITTED', 'VALIDATED', 'PAYMENT_PENDING'],
          },
        },
        _sum: {
          total: true,
          paidAmount: true,
        },
      }),
      db.invoice.aggregate({
        where: {
          tenantId,
          dueDate: { lt: now },
          status: {
            in: ['DRAFT', 'SUBMITTED', 'VALIDATED', 'PAYMENT_PENDING'],
          },
        },
        _sum: {
          total: true,
        },
      }),
      db.vendorBill.aggregate({
        where: {
          tenantId,
          status: {
            in: ['UNPAID', 'PARTIALLY_PAID'],
          },
        },
        _sum: {
          amount: true,
          vatAmount: true,
        },
      }),
    ]);

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
        grossOpenInvoices: toDecimal(openInvoices._sum.total),
        totalPaidAgainstOpenInvoices: toDecimal(openInvoices._sum.paidAmount),
        overdueInvoices: toDecimal(overdueInvoices._sum.total),
      },
      payables: {
        openVendorBills: toDecimal(openVendorBills._sum.amount),
        openVendorBillVat: toDecimal(openVendorBills._sum.vatAmount),
      },
    };
  }
}