import { Prisma } from '@global-wakili/database';

type AccountBalanceDbClient = {
  journalLine: {
    aggregate: Function;
  };
  accountBalance: {
    upsert: Function;
    findMany: Function;
  };
};

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(value);
}

export class AccountBalanceService {
  /**
   * Rebuild a single account balance from JournalLine aggregates.
   * This is database-driven to avoid pulling large ledgers into application memory.
   */
  static async rebuildAccountBalance(
    db: AccountBalanceDbClient,
    tenantId: string,
    accountId: string,
  ) {
    const aggregate = await db.journalLine.aggregate({
      where: {
        tenantId,
        accountId,
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const debitBalance = toDecimal(aggregate._sum.debit);
    const creditBalance = toDecimal(aggregate._sum.credit);
    const netBalance = debitBalance.minus(creditBalance);

    return db.accountBalance.upsert({
      where: {
        tenantId_accountId: {
          tenantId,
          accountId,
        },
      },
      update: {
        debitBalance,
        creditBalance,
        netBalance,
      },
      create: {
        tenantId,
        accountId,
        debitBalance,
        creditBalance,
        netBalance,
      },
    });
  }

  /**
   * Rebuild balances for multiple accounts.
   * Uses sequential writes for deterministic behavior and simpler transaction control.
   */
  static async rebuildMany(
    db: AccountBalanceDbClient,
    tenantId: string,
    accountIds: string[],
  ) {
    const uniqueAccountIds = [...new Set(accountIds)];
    const results = [];

    for (const accountId of uniqueAccountIds) {
      const balance = await this.rebuildAccountBalance(db, tenantId, accountId);
      results.push(balance);
    }

    return results;
  }

  /**
   * Return persisted account balances for the tenant.
   */
  static async list(
    db: AccountBalanceDbClient,
    tenantId: string,
  ) {
    return db.accountBalance.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        accountId: 'asc',
      },
    });
  }
}