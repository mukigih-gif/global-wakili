import { Prisma, prisma } from '@global-wakili/database';

type FraudAlert = {
  tenantId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  code: string;
  message: string;
  metadata?: Record<string, unknown>;
};

function decimal(value: unknown): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return new Prisma.Decimal(value);
  }

  return new Prisma.Decimal(0);
}

export const detectFraud = async (tenantId: string): Promise<FraudAlert[]> => {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for fraud detection'), {
      statusCode: 400,
      code: 'BANKING_FRAUD_TENANT_REQUIRED',
    });
  }

  const alerts: FraudAlert[] = [];

  const largeTransactions = await prisma.bankTransaction.findMany({
    where: {
      tenantId,
      amount: {
        gte: new Prisma.Decimal(1000000),
      },
    },
    take: 100,
    orderBy: {
      transactionDate: 'desc',
    },
  });

  for (const transaction of largeTransactions) {
    alerts.push({
      tenantId,
      severity: decimal(transaction.amount).gte(5000000) ? 'HIGH' : 'MEDIUM',
      code: 'LARGE_BANK_TRANSACTION',
      message: 'Large bank transaction detected for review.',
      metadata: {
        bankTransactionId: transaction.id,
        amount: transaction.amount?.toString?.() ?? String(transaction.amount),
        transactionDate: transaction.transactionDate,
        reference: transaction.reference ?? null,
      },
    });
  }

  return alerts;
};

export default detectFraud;

