import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

type BankingRequestContext = {
  tenantId: string;
  req?: {
    db?: DbClient;
    user?: { id?: string | null } | null;
  };
};

type BankAutoMatchResult = {
  matchedCount: number;
  pendingCount: number;
};

function requireTenantId(tenantId: string): string {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for bank reconciliation'), {
      statusCode: 400,
      code: 'BANKING_TENANT_REQUIRED',
    });
  }

  return tenantId;
}

function dbFromContext(context: BankingRequestContext): DbClient {
  return context.req?.db ?? prisma;
}

function decimal(value: unknown): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return new Prisma.Decimal(value);
  }

  return new Prisma.Decimal(0);
}

export class BankReconciliationService {
  static async autoMatch(context: BankingRequestContext): Promise<BankAutoMatchResult> {
    const tenantId = requireTenantId(context.tenantId);
    const db = dbFromContext(context);

    const bankTransactions = await db.bankTransaction.findMany({
      where: {
        tenantId,
        isMatched: false,
      },
      take: 500,
      orderBy: {
        transactionDate: 'asc',
      },
    });

    let matchedCount = 0;

    for (const bankTransaction of bankTransactions) {
      const amount = decimal(bankTransaction.amount).abs();

      const trustMatch = await db.trustTransaction.findFirst({
        where: {
          tenantId,
          isReconciled: false,
          OR: [
            bankTransaction.reference ? { reference: bankTransaction.reference } : undefined,
            {
              amount,
              transactionDate: bankTransaction.transactionDate,
            },
          ].filter(Boolean),
        },
        orderBy: {
          transactionDate: 'asc',
        },
      });

      if (!trustMatch) {
        continue;
      }

      await db.bankTransaction.update({
        where: { id: bankTransaction.id },
        data: { isMatched: true },
      });

      await db.trustTransaction.update({
        where: { id: trustMatch.id },
        data: { isReconciled: true },
      });

      matchedCount += 1;
    }

    const pendingCount = await db.bankTransaction.count({
      where: {
        tenantId,
        isMatched: false,
      },
    });

    return {
      matchedCount,
      pendingCount,
    };
  }
}

export default BankReconciliationService;

