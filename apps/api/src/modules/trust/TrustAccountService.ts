// apps/api/src/modules/trust/TrustAccountService.ts

import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';

const ZERO = new Prisma.Decimal(0);

function money(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  return value instanceof Prisma.Decimal
    ? value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    : new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function requireTenantId(req: Request): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for trust account operations'), {
      statusCode: 400,
      code: 'TRUST_TENANT_REQUIRED',
    });
  }

  return req.tenantId;
}

export class TrustAccountService {
  static async getById(req: Request, trustAccountId: string) {
    const tenantId = requireTenantId(req);

    const account = await req.db.trustAccount.findFirst({
      where: {
        tenantId,
        id: trustAccountId,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!account) {
      throw Object.assign(new Error('Trust account not found'), {
        statusCode: 404,
        code: 'TRUST_ACCOUNT_NOT_FOUND',
      });
    }

    return account;
  }

  static async list(req: Request, filters: {
    branchId?: string;
    clientId?: string;
    isActive?: boolean;
    take?: number;
    skip?: number;
  } = {}) {
    const tenantId = requireTenantId(req);

    let trustAccountIds: string[] | undefined;

    if (filters.clientId) {
      const clientLedgerRows = await req.db.clientTrustLedger.findMany({
        where: {
          tenantId,
          clientId: filters.clientId,
          trustAccountId: {
            not: null,
          },
        },
        select: {
          trustAccountId: true,
        },
        distinct: ['trustAccountId'],
      });

      trustAccountIds = clientLedgerRows
        .map((row) => row.trustAccountId)
        .filter((trustAccountId): trustAccountId is string => Boolean(trustAccountId));

      if (trustAccountIds.length === 0) {
        return [];
      }
    }

    return req.db.trustAccount.findMany({
      where: {
        tenantId,
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
        ...(trustAccountIds ? { id: { in: trustAccountIds } } : {}),
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { branchId: 'asc' },
        { createdAt: 'desc' },
      ],
      take: Math.min(filters.take ?? 100, 100),
      skip: filters.skip ?? 0,
    });
  }

  static async getBalance(req: Request, trustAccountId: string) {
    const tenantId = requireTenantId(req);
    const account = await this.getById(req, trustAccountId);

    const [transactionAggregate, clientLedgerAggregate] = await Promise.all([
      req.db.trustTransaction.aggregate({
        where: {
          tenantId,
          trustAccountId,
        },
        _sum: {
          debit: true,
          credit: true,
          amount: true,
        },
      }),
      req.db.clientTrustLedger.aggregate({
        where: {
          tenantId,
          trustAccountId,
        },
        _sum: {
          debit: true,
          credit: true,
        },
      }),
    ]);

    const trustTransactionBalance = money(transactionAggregate._sum.credit).minus(
      money(transactionAggregate._sum.debit),
    );

    const clientLedgerBalance = money(clientLedgerAggregate._sum.credit).minus(
      money(clientLedgerAggregate._sum.debit),
    );

    return {
      trustAccountId,
      accountBalance: money(account.currentBalance),
      reconciliationBalance: money(account.reconciliationBalance),
      trustTransactionBalance,
      clientLedgerBalance,
      accountVsTrustBookVariance: money(account.currentBalance)
        .minus(trustTransactionBalance)
        .toDecimalPlaces(2),
      trustBookVsClientLedgerVariance: trustTransactionBalance
        .minus(clientLedgerBalance)
        .toDecimalPlaces(2),
      scope: 'TRUST_ACCOUNT_LEVEL',
      generatedAt: new Date(),
    };
  }

  static async assertSufficientBalance(req: Request, input: {
    trustAccountId: string;
    amount: Prisma.Decimal | string | number;
  }) {
    const account = await this.getById(req, input.trustAccountId);
    const balance = money(account.currentBalance);
    const amount = money(input.amount);

    if (balance.lt(amount)) {
      throw Object.assign(new Error('Trust account has insufficient balance'), {
        statusCode: 409,
        code: 'INSUFFICIENT_TRUST_ACCOUNT_BALANCE',
        details: {
          trustAccountId: input.trustAccountId,
          available: balance.toString(),
          requested: amount.toString(),
        },
      });
    }

    return account;
  }
}

export default TrustAccountService;