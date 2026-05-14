// apps/api/src/modules/finance/FinanceAnalyticsService.ts

import { Prisma } from '@global-wakili/database';
import { prisma } from '../../config/database';

type FinanceAnalyticsDbClient = {
  officeAccount: {
    findMany: (...args: any[]) => Promise<any[]>;
  };
  matter: {
    aggregate: (...args: any[]) => Promise<any>;
  };
  vendorBill: {
    aggregate: (...args: any[]) => Promise<any>;
    findMany: (...args: any[]) => Promise<any[]>;
  };
  journalLine: {
    findMany: (...args: any[]) => Promise<any[]>;
    aggregate?: (...args: any[]) => Promise<any>;
  };
};

function requiredString(value: unknown, label: string, code: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error(`${label} is required`), {
      statusCode: 422,
      code,
    });
  }

  return value.trim();
}

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);

  return new Prisma.Decimal(value);
}

function asNumber(value: Prisma.Decimal): number {
  return Number(value.toFixed(2));
}

export class FinanceAnalyticsService {
  constructor(private readonly db: FinanceAnalyticsDbClient = prisma as unknown as FinanceAnalyticsDbClient) {}

  /**
   * CFO liquidity and trust position.
   *
   * Schema-aligned:
   * - OfficeAccount.currentBalance is the office liquidity source.
   * - Matter.trustBalance aggregates client trust liability.
   * - VendorBill.total / paidAmount represent supplier payables.
   */
  async getCfoLiquidityDashboard(tenantId: string) {
    const normalizedTenantId = requiredString(
      tenantId,
      'Tenant ID',
      'FINANCE_ANALYTICS_TENANT_REQUIRED',
    );

    const [officeAccounts, trustAccounts, pendingPayables] = await Promise.all([
      this.db.officeAccount.findMany({
        where: {
          tenantId: normalizedTenantId,
          isActive: true,
        },
        select: {
          id: true,
          accountName: true,
          bankName: true,
          currentBalance: true,
          reconciliationBalance: true,
          lastReconciled: true,
        },
      }),

      this.db.matter.aggregate({
        where: {
          tenantId: normalizedTenantId,
          deletedAt: null,
          trustBalance: {
            gt: 0,
          },
        },
        _sum: {
          trustBalance: true,
        },
      }),

      this.db.vendorBill.aggregate({
        where: {
          tenantId: normalizedTenantId,
          status: {
            in: ['APPROVED', 'PARTIALLY_PAID'],
          },
        },
        _sum: {
          total: true,
          paidAmount: true,
        },
      }),
    ]);

    const officeBalance = officeAccounts.reduce(
      (sum: Prisma.Decimal, account: { currentBalance: Prisma.Decimal | number | string | null }) =>
        sum.plus(toDecimal(account.currentBalance)),
      new Prisma.Decimal(0),
    );

    const totalTrustLiability = toDecimal(trustAccounts._sum?.trustBalance);

    const pendingPayablesTotal = toDecimal(pendingPayables._sum?.total);
    const pendingPayablesPaid = toDecimal(pendingPayables._sum?.paidAmount);
    const pendingPayablesBalance = pendingPayablesTotal.minus(pendingPayablesPaid);

    const complianceStatus = officeBalance.gte(totalTrustLiability)
      ? 'HEALTHY'
      : 'CRITICAL_COMMINGLING_RISK';

    return {
      generatedAt: new Date(),
      firmLiquidity: officeBalance,
      clientTrustLiability: totalTrustLiability,
      pendingPayables: pendingPayablesBalance,
      netWorkingCapital: officeBalance.minus(pendingPayablesBalance),
      complianceStatus,
      isTrustBalanced: true,
      burnRate: await this.calculateMonthlyBurn(normalizedTenantId),
      officeAccounts: officeAccounts.map((account: any) => ({
        id: account.id,
        accountName: account.accountName,
        bankName: account.bankName,
        currentBalance: account.currentBalance,
        reconciliationBalance: account.reconciliationBalance,
        lastReconciled: account.lastReconciled,
      })),
    };
  }

  /**
   * Partner profitability and statutory exposure.
   *
   * Schema-aligned:
   * - Uses JournalLine, not stale ledgerLine.
   * - Uses JournalEntry.date, not JournalLine.createdAt.
   * - Uses ChartOfAccount code/subtype/type for revenue, expense, and statutory classification.
   */
  async getPartnerProfitability(tenantId: string, startDate: Date, endDate: Date) {
    const normalizedTenantId = requiredString(
      tenantId,
      'Tenant ID',
      'FINANCE_ANALYTICS_TENANT_REQUIRED',
    );

    if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
      throw Object.assign(new Error('Valid start date is required'), {
        statusCode: 422,
        code: 'FINANCE_ANALYTICS_START_DATE_INVALID',
      });
    }

    if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
      throw Object.assign(new Error('Valid end date is required'), {
        statusCode: 422,
        code: 'FINANCE_ANALYTICS_END_DATE_INVALID',
      });
    }

    const journalLines = await this.db.journalLine.findMany({
      where: {
        tenantId: normalizedTenantId,
        journal: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            subtype: true,
          },
        },
        journal: {
          select: {
            id: true,
            date: true,
            reference: true,
            description: true,
          },
        },
      },
      orderBy: [{ journal: { date: 'asc' } }, { id: 'asc' }],
    });

    let grossRevenue = new Prisma.Decimal(0);
    let operatingExpenses = new Prisma.Decimal(0);
    let statutoryLiabilities = new Prisma.Decimal(0);

    for (const line of journalLines as Array<any>) {
      const accountCode = String(line.account?.code ?? '').toUpperCase();
      const accountSubtype = String(line.account?.subtype ?? '').toUpperCase();
      const accountType = String(line.account?.type ?? '').toUpperCase();

      const credit = toDecimal(line.credit);
      const debit = toDecimal(line.debit);

      if (accountType === 'REVENUE' || accountCode.startsWith('4')) {
        grossRevenue = grossRevenue.plus(credit).minus(debit);
      }

      if (accountType === 'EXPENSE' || accountCode.startsWith('5')) {
        operatingExpenses = operatingExpenses.plus(debit).minus(credit);
      }

      const statutoryTokens = ['PAYE', 'SHIF', 'NSSF', 'HOUSING', 'LEVY', 'VAT', 'WHT'];

      if (
        statutoryTokens.some(
          (token) => accountCode.includes(token) || accountSubtype.includes(token),
        )
      ) {
        statutoryLiabilities = statutoryLiabilities.plus(credit).minus(debit);
      }
    }

    const netProfit = grossRevenue.minus(operatingExpenses);

    return {
      generatedAt: new Date(),
      period: {
        startDate,
        endDate,
      },
      pnl: {
        grossRevenue,
        operatingExpenses,
        netProfit,
      },
      netProfit,
      taxExposure: {
        unpaidStatutoryDebt: statutoryLiabilities,
        unpaidStatutoryLiabilities: statutoryLiabilities,
        estimatedCorpTax: netProfit.gt(0) ? netProfit.mul(0.3) : new Prisma.Decimal(0),
      },
      taxCompliance: {
        unpaidStatutoryLiabilities: statutoryLiabilities,
        estimatedCorpTax: netProfit.gt(0) ? netProfit.mul(0.3) : new Prisma.Decimal(0),
      },
      partnerSplits: {
        equityDistributable: netProfit.mul(0.8),
        reserveFund: netProfit.mul(0.2),
      },
      metrics: {
        grossRevenue: asNumber(grossRevenue),
        operatingExpenses: asNumber(operatingExpenses),
        netProfit: asNumber(netProfit),
        statutoryLiabilities: asNumber(statutoryLiabilities),
      },
    };
  }

  /**
   * Recoverable disbursement leakage.
   *
   * Current schema uses VendorBill for supplier bills and has `isRecoverable`.
   * It does not have the old procurement model used by the legacy service.
   */
  async getDisbursementLeakage(tenantId: string) {
    const normalizedTenantId = requiredString(
      tenantId,
      'Tenant ID',
      'FINANCE_ANALYTICS_TENANT_REQUIRED',
    );

    const leakage = await this.db.vendorBill.findMany({
      where: {
        tenantId: normalizedTenantId,
        matterId: {
          not: null,
        },
        isRecoverable: true,
        status: {
          in: ['APPROVED', 'PARTIALLY_PAID'],
        },
      },
      include: {
        matter: {
          select: {
            id: true,
            title: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ billDate: 'asc' }, { id: 'asc' }],
      take: 200,
    });

    const totalLeakage = leakage.reduce(
      (sum: Prisma.Decimal, bill: any) => sum.plus(toDecimal(bill.total).minus(toDecimal(bill.paidAmount))),
      new Prisma.Decimal(0),
    );

    return {
      generatedAt: new Date(),
      totalLeakage,
      unbilledItems: leakage.map((bill: any) => ({
        vendorBillId: bill.id,
        matterId: bill.matterId,
        matter: bill.matter?.title ?? 'Unknown Matter',
        supplierId: bill.supplierId,
        supplier: bill.supplier?.name ?? null,
        amount: toDecimal(bill.total).minus(toDecimal(bill.paidAmount)),
        billDate: bill.billDate,
        dueDate: bill.dueDate,
        status: bill.status,
      })),
    };
  }

  private async calculateMonthlyBurn(tenantId: string) {
    const normalizedTenantId = requiredString(
      tenantId,
      'Tenant ID',
      'FINANCE_ANALYTICS_TENANT_REQUIRED',
    );

    if (!this.db.journalLine.aggregate) {
      return new Prisma.Decimal(0);
    }

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const aggregate = await this.db.journalLine.aggregate({
      where: {
        tenantId: normalizedTenantId,
        account: {
          type: 'EXPENSE',
        },
        journal: {
          date: {
            gte: threeMonthsAgo,
            lte: now,
          },
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const threeMonthExpense = toDecimal(aggregate._sum?.debit).minus(
      toDecimal(aggregate._sum?.credit),
    );

    return threeMonthExpense.div(3);
  }
}

export default FinanceAnalyticsService;
