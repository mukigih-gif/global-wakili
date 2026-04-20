import { Prisma } from '@global-wakili/database';
import { MatterWorkflowService } from './MatterWorkflowService';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class MatterDashboardService {
  static async getDashboard(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
    },
  ) {
    const [
      matter,
      invoiceAgg,
      expenseAgg,
      trustCount,
      recentInvoices,
      recentTrustTransactions,
      recentExpenses,
    ] = await Promise.all([
      db.matter.findFirst({
        where: {
          tenantId: params.tenantId,
          id: params.matterId,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              clientCode: true,
            },
          },
        },
      }),
      db.invoice.aggregate({
        where: {
          tenantId: params.tenantId,
          matterId: params.matterId,
        },
        _sum: {
          total: true,
          paidAmount: true,
        },
        _count: {
          id: true,
        },
      }),
      db.expenseEntry.aggregate({
        where: {
          tenantId: params.tenantId,
          matterId: params.matterId,
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      }),
      db.trustTransaction.count({
        where: {
          tenantId: params.tenantId,
          matterId: params.matterId,
        },
      }),
      db.invoice.findMany({
        where: {
          tenantId: params.tenantId,
          matterId: params.matterId,
        },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          paidAmount: true,
          status: true,
          issuedDate: true,
        },
        orderBy: [{ issuedDate: 'desc' }, { id: 'desc' }],
        take: 5,
      }),
      db.trustTransaction.findMany({
        where: {
          tenantId: params.tenantId,
          matterId: params.matterId,
        },
        select: {
          id: true,
          amount: true,
          type: true,
          transactionDate: true,
          reference: true,
        },
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        take: 5,
      }),
      db.expenseEntry.findMany({
        where: {
          tenantId: params.tenantId,
          matterId: params.matterId,
        },
        select: {
          id: true,
          amount: true,
          description: true,
          expenseDate: true,
          status: true,
        },
        orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
        take: 5,
      }),
    ]);

    if (!matter) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    const metadata = MatterWorkflowService.normalizeMetadata(matter.metadata);
    const totalInvoiced = toDecimal(invoiceAgg._sum.total);
    const totalPaid = toDecimal(invoiceAgg._sum.paidAmount);
    const totalExpenses = toDecimal(expenseAgg._sum.amount);
    const trustMovement = recentTrustTransactions.reduce(
      (acc: Prisma.Decimal, tx: any) => acc.plus(toDecimal(tx.amount)),
      new Prisma.Decimal(0),
    );

    return {
      matter: {
        id: matter.id,
        matterCode: matter.matterCode ?? null,
        title: matter.title,
        status: matter.status,
        billingModel: matter.billingModel,
        matterType: metadata.matterType,
        workflowType: metadata.workflowType,
        progressStage: metadata.progressStage,
        progressPercent: metadata.progressPercent,
        portalVisible: metadata.portalVisible,
      },
      client: matter.client,
      financials: {
        totalInvoiced,
        totalPaid,
        outstanding: totalInvoiced.minus(totalPaid),
        trustMovement,
        totalExpenses,
      },
      counts: {
        invoiceCount: invoiceAgg._count.id,
        trustTransactionCount: trustCount,
        expenseCount: expenseAgg._count.id,
      },
      recentInvoices,
      recentTrustTransactions,
      recentExpenses,
      generatedAt: new Date(),
    };
  }

  static async getPortfolioSummary(
    db: any,
    params: {
      tenantId: string;
    },
  ) {
    const matters = await db.matter.findMany({
      where: {
        tenantId: params.tenantId,
      },
      select: {
        id: true,
        status: true,
        metadata: true,
      },
    });

    const statusBreakdown = matters.reduce((acc: Record<string, number>, matter: any) => {
      acc[matter.status] = (acc[matter.status] ?? 0) + 1;
      return acc;
    }, {});

    const matterTypeBreakdown = matters.reduce((acc: Record<string, number>, matter: any) => {
      const type = MatterWorkflowService.normalizeMetadata(matter.metadata).matterType;
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    }, {});

    const workflowBreakdown = matters.reduce((acc: Record<string, number>, matter: any) => {
      const workflow = MatterWorkflowService.normalizeMetadata(matter.metadata).workflowType;
      acc[workflow] = (acc[workflow] ?? 0) + 1;
      return acc;
    }, {});

    return {
      totalMatters: matters.length,
      statusBreakdown,
      matterTypeBreakdown,
      workflowBreakdown,
      generatedAt: new Date(),
    };
  }
}