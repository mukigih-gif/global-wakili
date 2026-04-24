import type { Prisma } from '@global-wakili/database';
import { LEGAL_CHART_OF_ACCOUNTS_SEED, type ChartOfAccountSeed } from './coa.seed';

type CoaDbClient = {
  chartOfAccount: {
    findMany: Function;
    findUnique: Function;
    upsert: Function;
  };
};

type SeedOptions = {
  currency?: string | null;
  overwriteNames?: boolean;
};

export class CoaService {
  static async seedDefaults(
    db: CoaDbClient,
    tenantId: string,
    options: SeedOptions = {},
  ): Promise<{
    total: number;
    createdOrUpdated: number;
    accounts: Array<{ id: string; code: string; name: string }>;
  }> {
    const seededAccounts: Array<{ id: string; code: string; name: string }> = [];

    for (const seed of LEGAL_CHART_OF_ACCOUNTS_SEED) {
      const account = await db.chartOfAccount.upsert({
        where: {
          tenantId_code: {
            tenantId,
            code: seed.code,
          },
        },
        update: {
          type: seed.type,
          subtype: seed.subtype,
          isSystem: seed.isSystem,
          isActive: seed.isActive,
          allowManualPosting: seed.allowManualPosting,
          currency: options.currency ?? seed.currency ?? 'KES',
          description: seed.description ?? null,
          ...(options.overwriteNames ? { name: seed.name } : {}),
        },
        create: {
          tenantId,
          code: seed.code,
          name: seed.name,
          type: seed.type,
          subtype: seed.subtype,
          isSystem: seed.isSystem,
          isActive: seed.isActive,
          allowManualPosting: seed.allowManualPosting,
          currency: options.currency ?? seed.currency ?? 'KES',
          description: seed.description ?? null,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

      seededAccounts.push(account);
    }

    return {
      total: LEGAL_CHART_OF_ACCOUNTS_SEED.length,
      createdOrUpdated: seededAccounts.length,
      accounts: seededAccounts,
    };
  }

  static async findByCode(
    db: CoaDbClient,
    tenantId: string,
    code: string,
  ) {
    return db.chartOfAccount.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code,
        },
      },
    });
  }

  static async findSystemAccounts(
    db: CoaDbClient,
    tenantId: string,
  ) {
    return db.chartOfAccount.findMany({
      where: {
        tenantId,
        isSystem: true,
      },
      orderBy: {
        code: 'asc',
      },
    });
  }

  static async resolveRequiredSystemAccounts(
    db: CoaDbClient,
    tenantId: string,
  ): Promise<Record<string, string>> {
    const accounts = await db.chartOfAccount.findMany({
      where: {
        tenantId,
        isSystem: true,
      },
      select: {
        id: true,
        subtype: true,
      },
    });

    const mapping = new Map(
      accounts
        .filter((account: { subtype: string | null }) => Boolean(account.subtype))
        .map((account: { id: string; subtype: string | null }) => [account.subtype as string, account.id]),
    );

    const requiredSubtypes = [
      'OFFICE_BANK',
      'TRUST_BANK',
      'TRUST_LIABILITY',
      'ACCOUNTS_RECEIVABLE',
      'ACCOUNTS_PAYABLE',
      'VAT_OUTPUT',
      'VAT_INPUT',
      'LEGAL_FEES_INCOME',
      'GENERAL_EXPENSE',
      'SUSPENSE',
    ];

    const missing = requiredSubtypes.filter((subtype) => !mapping.has(subtype));

    if (missing.length > 0) {
      throw Object.assign(new Error('Required system accounts are missing'), {
        statusCode: 500,
        code: 'MISSING_SYSTEM_ACCOUNTS',
        details: { missing },
      });
    }

    return Object.fromEntries(requiredSubtypes.map((subtype) => [subtype, mapping.get(subtype)!]));
  }
}