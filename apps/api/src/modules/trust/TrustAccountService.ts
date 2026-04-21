// apps/api/src/modules/trust/TrustAccountService.ts

import { Prisma } from '@global-wakili/database';

const ZERO = new Prisma.Decimal(0);

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  const parsed = new Prisma.Decimal(value as any);
  return parsed.isFinite() ? parsed.toDecimalPlaces(2) : ZERO;
}

export class TrustAccountService {
  static async getById(req: any, trustAccountId: string) {
    const account = await req.db.trustAccount.findFirst({
      where: {
        tenantId: req.tenantId,
        id: trustAccountId,
      },
      include: {
        client: true,
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

  static async list(req: any, filters: {
    clientId?: string;
    isActive?: boolean;
    take?: number;
    skip?: number;
  } = {}) {
    return req.db.trustAccount.findMany({
      where: {
        tenantId: req.tenantId,
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      include: {
        client: true,
      },
      orderBy: [
        { clientId: 'asc' },
        { createdAt: 'desc' },
      ],
      take: Math.min(filters.take ?? 100, 100),
      skip: filters.skip ?? 0,
    });
  }

  static async getBalance(req: any, trustAccountId: string) {
    const account = await this.getById(req, trustAccountId);

    const transactionAggregate = await req.db.trustTransaction.aggregate({
      where: {
        tenantId: req.tenantId,
        trustAccountId,
      },
      _sum: {
        amount: true,
      },
    });

    const ledgerAggregate = await req.db.clientTrustLedger.aggregate({
      where: {
        tenantId: req.tenantId,
        trustAccountId,
      },
      _sum: {
        balance: true,
      },
    });

    return {
      trustAccountId,
      accountBalance: money(account.balance),
      trustTransactionBalance: money(transactionAggregate._sum.amount),
      clientLedgerBalance: money(ledgerAggregate._sum.balance),
      variance: money(account.balance).minus(money(ledgerAggregate._sum.balance)).toDecimalPlaces(2),
      generatedAt: new Date(),
    };
  }

  static async assertSufficientBalance(req: any, input: {
    trustAccountId: string;
    amount: Prisma.Decimal | string | number;
  }) {
    const account = await this.getById(req, input.trustAccountId);
    const balance = money(account.balance);
    const amount = money(input.amount);

    if (balance.lt(amount)) {
      throw Object.assign(new Error('Trust account has insufficient balance'), {
        statusCode: 409,
        code: 'INSUFFICIENT_TRUST_ACCOUNT_BALANCE',
        details: {
          available: balance.toString(),
          requested: amount.toString(),
        },
      });
    }

    return account;
  }
}

export default TrustAccountService;