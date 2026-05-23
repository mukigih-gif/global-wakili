import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

type BankStatementContext = {
  tenantId: string;
  actor?: { id?: string | null } | string | null;
  req?: {
    db?: DbClient;
    user?: { id?: string | null } | null;
  };
};

type BankStatementTransactionInput = {
  date?: Date | string | null;
  transactionDate?: Date | string | null;
  amount: Prisma.Decimal | number | string;
  reference?: string | null;
  description?: string | null;
  externalId?: string | null;
};

type BankStatementImportOptions = {
  accountId?: string | null;
  accountType?: string | null;
  statementDate?: Date | string | null;
  openingBalance?: Prisma.Decimal | number | string | null;
  closingBalance?: Prisma.Decimal | number | string | null;
  sourceFileUrl?: string | null;
};

type BankStatementImportResult = {
  statement: unknown;
  importedTransactionCount: number;
};

type BankMatchResult = {
  matchedCount: number;
  pendingCount: number;
};

function requireTenantId(tenantId: string): string {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for bank statement operations'), {
      statusCode: 400,
      code: 'BANKING_TENANT_REQUIRED',
    });
  }

  return tenantId;
}

function dbFromContext(context?: BankStatementContext): DbClient {
  return context?.req?.db ?? prisma;
}

function actorIdFromContext(context: BankStatementContext): string | null {
  if (typeof context.actor === 'string') {
    return context.actor;
  }

  return context.actor?.id ?? context.req?.user?.id ?? null;
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

function dateValue(value: Date | string | null | undefined, fallback = new Date()): Date {
  if (!value) {
    return fallback;
  }

  return value instanceof Date ? value : new Date(value);
}

function inferStatementDate(transactions: BankStatementTransactionInput[], options?: BankStatementImportOptions): Date {
  if (options?.statementDate) {
    return dateValue(options.statementDate);
  }

  const first = transactions[0];

  return dateValue(first?.transactionDate ?? first?.date ?? null);
}

function inferClosingBalance(transactions: BankStatementTransactionInput[], options?: BankStatementImportOptions): Prisma.Decimal {
  if (options?.closingBalance !== undefined && options.closingBalance !== null) {
    return decimal(options.closingBalance);
  }

  return transactions.reduce(
    (acc, transaction) => acc.plus(decimal(transaction.amount)),
    decimal(options?.openingBalance ?? 0),
  );
}

export class BankStatementService {
  static async importBankStatement(
    context: BankStatementContext,
    transactions: BankStatementTransactionInput[],
    options: BankStatementImportOptions = {},
  ): Promise<BankStatementImportResult> {
    const tenantId = requireTenantId(context.tenantId);
    const db = dbFromContext(context);

    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw Object.assign(new Error('No transactions provided for bank statement import'), {
        statusCode: 400,
        code: 'BANKING_EMPTY_IMPORT',
      });
    }

    const statementDate = inferStatementDate(transactions, options);
    const openingBalance = decimal(options.openingBalance ?? 0);
    const closingBalance = inferClosingBalance(transactions, options);

    const statement = await db.bankStatement.create({
      data: {
        tenantId,
        importedById: actorIdFromContext(context),
        accountType: options.accountType ?? 'BANK',
        accountId: options.accountId ?? `unmapped:${tenantId}`,
        statementDate,
        openingBalance,
        closingBalance,
        sourceFileUrl: options.sourceFileUrl ?? null,
        transactions: {
          createMany: {
            data: transactions.map((transaction) => ({
              tenantId,
              externalId: transaction.externalId ?? transaction.reference ?? null,
              amount: decimal(transaction.amount),
              description: transaction.description ?? null,
              transactionDate: dateValue(transaction.transactionDate ?? transaction.date ?? null, statementDate),
              reference: transaction.reference ?? transaction.externalId ?? null,
              isMatched: false,
            })),
          },
        },
      },
      include: {
        transactions: true,
      },
    });

    return {
      statement,
      importedTransactionCount: transactions.length,
    };
  }

  static async getTrustBankBalance(tenantId: string, asOfDate?: Date): Promise<Prisma.Decimal> {
    const db = prisma;
    const normalizedTenantId = requireTenantId(tenantId);

    const transactions = await db.trustTransaction.findMany({
      where: {
        tenantId: normalizedTenantId,
        ...(asOfDate ? { transactionDate: { lte: asOfDate } } : {}),
      },
      select: {
        debit: true,
        credit: true,
      },
    });

    return transactions.reduce(
      (balance, transaction) => balance.plus(decimal(transaction.credit)).minus(decimal(transaction.debit)),
      new Prisma.Decimal(0),
    );
  }

  static async matchTransactions(context: { tenantId: string; req?: { db?: DbClient } }): Promise<BankMatchResult> {
    const tenantId = requireTenantId(context.tenantId);
    const db = context.req?.db ?? prisma;

    const unmatched = await db.bankTransaction.findMany({
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

    for (const bankTransaction of unmatched) {
      const trustTransaction = await db.trustTransaction.findFirst({
        where: {
          tenantId,
          isReconciled: false,
          OR: [
            bankTransaction.reference ? { reference: bankTransaction.reference } : undefined,
            {
              amount: decimal(bankTransaction.amount).abs(),
              transactionDate: bankTransaction.transactionDate,
            },
          ].filter(Boolean),
        },
      });

      if (!trustTransaction) {
        continue;
      }

      await db.bankTransaction.update({
        where: { id: bankTransaction.id },
        data: { isMatched: true },
      });

      await db.trustTransaction.update({
        where: { id: trustTransaction.id },
        data: { isReconciled: true },
      });

      matchedCount += 1;
    }

    return {
      matchedCount,
      pendingCount: Math.max(unmatched.length - matchedCount, 0),
    };
  }
}

export default BankStatementService;

