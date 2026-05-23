import { prisma, Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { TrustStatementService } from './trust.statement.service';
import { TrustReconciliationService } from './TrustReconciliationService';

function decimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }

  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function requireTenantId(req: Request): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for trust overview'), {
      statusCode: 400,
      code: 'TRUST_TENANT_REQUIRED',
    });
  }

  return req.tenantId;
}

export class TrustService {
  async getTrustAccounts(tenantId: string) {
    return prisma.trustAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTrustAccountById(tenantId: string, trustAccountId: string) {
    return prisma.trustAccount.findFirst({
      where: {
        id: trustAccountId,
        tenantId,
      },
    });
  }

  async getTrustTransactions(tenantId: string, trustAccountId?: string) {
    return prisma.trustTransaction.findMany({
      where: {
        tenantId,
        ...(trustAccountId ? { trustAccountId } : {}),
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });
  }

  async getClientTrustLedger(tenantId: string, clientId?: string, matterId?: string) {
    return prisma.clientTrustLedger.findMany({
      where: {
        tenantId,
        ...(clientId ? { clientId } : {}),
        ...(matterId ? { matterId } : {}),
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });
  }

  async getTrustDashboard(tenantId: string) {
    const [accounts, transactions, ledger] = await Promise.all([
      prisma.trustAccount.findMany({
        where: { tenantId },
        select: {
          id: true,
          accountName: true,
          accountNumber: true,
          currentBalance: true,
          reconciliationBalance: true,
          isActive: true,
          lastReconciled: true,
        },
      }),
      prisma.trustTransaction.count({
        where: { tenantId },
      }),
      prisma.clientTrustLedger.aggregate({
        where: { tenantId },
        _sum: {
          debit: true,
          credit: true,
        },
      }),
    ]);

    const totalTrustBalance = accounts.reduce(
      (sum, account) => sum.plus(decimal(account.currentBalance)),
      new Prisma.Decimal(0),
    );

    const totalClientLedgerBalance = decimal(ledger._sum.credit).minus(decimal(ledger._sum.debit));

    return {
      accounts,
      accountCount: accounts.length,
      transactionCount: transactions,
      totalTrustBalance,
      totalClientLedgerBalance,
      variance: totalTrustBalance.minus(totalClientLedgerBalance),
    };
  }

  async getOverview(req: Request) {
    const tenantId = requireTenantId(req);
    const [dashboard, recentTransactions, recentReconciliations] = await Promise.all([
      this.getTrustDashboard(tenantId),
      req.db.trustTransaction.findMany({
        where: { tenantId },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),
      req.db.trustReconciliation.findMany({
        where: { tenantId },
        include: {
          account: {
            select: {
              id: true,
              accountName: true,
              accountNumber: true,
            },
          },
        },
        orderBy: [{ statementDate: 'desc' }],
        take: 10,
      }),
    ]);

    return {
      generatedAt: new Date(),
      dashboard,
      recentTransactions,
      recentReconciliations,
    };
  }

  async getTrustAccountView(
    req: Request,
    params: {
      trustAccountId: string;
      statementDate?: Date;
      start?: Date;
      end?: Date;
    },
  ) {
    const tenantId = requireTenantId(req);

    const account = await req.db.trustAccount.findFirst({
      where: {
        tenantId,
        id: params.trustAccountId,
      },
      select: {
        id: true,
        accountName: true,
        accountNumber: true,
        bankName: true,
        routingNumber: true,
        swiftCode: true,
        currentBalance: true,
        reconciliationBalance: true,
        lastReconciled: true,
        isActive: true,
        custodian: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!account) {
      throw Object.assign(new Error('Trust account not found'), {
        statusCode: 404,
        code: 'TRUST_ACCOUNT_NOT_FOUND',
        details: { trustAccountId: params.trustAccountId },
      });
    }

    const [statement, snapshot] = await Promise.all([
      TrustStatementService.getTrustAccountStatement(req, {
        trustAccountId: params.trustAccountId,
        start: params.start,
        end: params.end,
      }),
      params.statementDate
        ? TrustReconciliationService.getTrustAccountSnapshot(req, {
            trustAccountId: params.trustAccountId,
            statementDate: params.statementDate,
          })
        : Promise.resolve(null),
    ]);

    return {
      generatedAt: new Date(),
      account,
      statement,
      snapshot,
    };
  }
}

export default TrustService;
