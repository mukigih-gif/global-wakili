import { Prisma } from '@global-wakili/database';

type AccountBalanceDbClient = {
  journalLine: {
    aggregate: Function;
  };
  accountBalance: {
    upsert: Function;
    findMany: Function;
    findFirst: Function;
    updateMany: Function;
    create: Function;
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

    // Tenant-safe upsert: the tenant-isolation guard blocks upsert/findUnique/update on
    // scoped models whose where lacks a TOP-LEVEL tenantId (a composite tenantId_accountId
    // key is nested, so it trips the guard). Use findFirst (read) + updateMany/create — all
    // guard-safe — instead. The @@unique([tenantId, accountId]) constraint still backstops races.
    const existing = await db.accountBalance.findFirst({
      where: { tenantId, accountId },
      select: { id: true },
    });

    if (existing) {
      await db.accountBalance.updateMany({
        where: { tenantId, accountId },
        data: { debitBalance, creditBalance, netBalance },
      });

      return { id: existing.id, tenantId, accountId, debitBalance, creditBalance, netBalance };
    }

    return db.accountBalance.create({
      data: {
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