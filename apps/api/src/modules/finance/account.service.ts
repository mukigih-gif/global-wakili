// apps/api/src/modules/finance/account.service.ts

import { prisma } from '@global-wakili/database';
import type {
  AccountSubtype,
  AccountType,
} from '@global-wakili/database';

import type {
  CreateFinanceAccountInput,
  FinanceAccountListFilters,
  UpdateFinanceAccountInput,
} from './finance.types';

type AccountDbClient = {
  chartOfAccount: {
    create: Function;
    update: Function;
    findUnique: Function;
    findFirst?: Function;
    findMany: Function;
    count?: Function;
  };
};

function getDelegate(db: AccountDbClient | any) {
  if (!db?.chartOfAccount) {
    throw Object.assign(
      new Error('chartOfAccount delegate is unavailable'),
      {
        statusCode: 500,
        code: 'CHART_OF_ACCOUNT_DELEGATE_MISSING',
      },
    );
  }

  return db.chartOfAccount;
}

function normalizeCode(code: string) {
  return String(code).trim().toUpperCase();
}

function normalizeText(value: unknown, fallback: string | null = null) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function accountSearchWhere(search?: string) {
  if (!search?.trim()) return {};

  const term = search.trim();

  return {
    OR: [
      { code: { contains: term, mode: 'insensitive' as const } },
      { name: { contains: term, mode: 'insensitive' as const } },
      { description: { contains: term, mode: 'insensitive' as const } },
    ],
  };
}

export class AccountService {
  static async create(
    db: AccountDbClient,
    tenantId: string,
    input: CreateFinanceAccountInput,
  ) {
    return new AccountService(db).createAccount({
      tenantId,
      ...input,
    });
  }

  static async update(
    db: AccountDbClient,
    tenantId: string,
    accountId: string,
    input: UpdateFinanceAccountInput,
  ) {
    return new AccountService(db).updateAccount({
      tenantId,
      accountId,
      ...input,
    });
  }

  static async getById(
    db: AccountDbClient,
    tenantId: string,
    accountId: string,
  ) {
    return new AccountService(db).getAccountById(tenantId, accountId);
  }

  static async list(
    db: AccountDbClient,
    tenantId: string,
    filters?: FinanceAccountListFilters,
  ) {
    return new AccountService(db).listAccounts({
      tenantId,
      ...(filters ?? {}),
    });
  }

  constructor(private readonly db: AccountDbClient | any = prisma) {}

  async createAccount(input: CreateFinanceAccountInput & {
    tenantId: string;
  }) {
    const chartOfAccount = getDelegate(this.db);

    const code = normalizeCode(input.code);
    const name = normalizeText(input.name);

    if (!name) {
      throw Object.assign(new Error('Account name is required'), {
        statusCode: 422,
        code: 'ACCOUNT_NAME_REQUIRED',
      });
    }

    const duplicate = await this.findDuplicate(input.tenantId, code);

    if (duplicate) {
      throw Object.assign(new Error('Account code already exists'), {
        statusCode: 409,
        code: 'ACCOUNT_CODE_DUPLICATE',
        accountCode: code,
      });
    }

    return chartOfAccount.create({
      data: {
        tenantId: input.tenantId,
        code,
        name,
        type: input.type,
        subtype: input.subtype ?? null,
        description: normalizeText(input.description),
        currency: normalizeText(input.currency, 'KES'),
        allowManualPosting: input.allowManualPosting ?? true,
        isSystem: input.isSystem ?? false,
        isActive: true,
      },
    });
  }

  async updateAccount(input: UpdateFinanceAccountInput & {
    tenantId: string;
    accountId: string;
  }) {
    const chartOfAccount = getDelegate(this.db);

    const existing = await chartOfAccount.findUnique({
      where: {
        id: input.accountId,
      },
      select: {
        id: true,
        tenantId: true,
        code: true,
        isSystem: true,
      },
    });

    if (!existing || existing.tenantId !== input.tenantId) {
      throw Object.assign(new Error('Account not found'), {
        statusCode: 404,
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    if (existing.isSystem && input.code && normalizeCode(input.code) !== existing.code) {
      throw Object.assign(new Error('System account codes cannot be changed'), {
        statusCode: 409,
        code: 'SYSTEM_ACCOUNT_CODE_LOCKED',
      });
    }

    if (input.code && normalizeCode(input.code) !== existing.code) {
      const duplicate = await this.findDuplicate(input.tenantId, normalizeCode(input.code), input.accountId);

      if (duplicate) {
        throw Object.assign(new Error('Account code already exists'), {
          statusCode: 409,
          code: 'ACCOUNT_CODE_DUPLICATE',
          accountCode: normalizeCode(input.code),
        });
      }
    }

    return chartOfAccount.update({
      where: {
        id: input.accountId,
      },
      data: {
        ...(input.code ? { code: normalizeCode(input.code) } : {}),
        ...(input.name ? { name: normalizeText(input.name) } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.subtype !== undefined ? { subtype: input.subtype } : {}),
        ...(input.description !== undefined
          ? { description: normalizeText(input.description) }
          : {}),
        ...(input.currency !== undefined
          ? { currency: normalizeText(input.currency, 'KES') }
          : {}),
        ...(input.allowManualPosting !== undefined
          ? { allowManualPosting: input.allowManualPosting }
          : {}),
        ...(input.isSystem !== undefined ? { isSystem: input.isSystem } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async getAccountById(tenantId: string, accountId: string) {
    const chartOfAccount = getDelegate(this.db);

    const account = await chartOfAccount.findUnique({
      where: {
        id: accountId,
      },
    });

    if (!account || account.tenantId !== tenantId) {
      throw Object.assign(new Error('Account not found'), {
        statusCode: 404,
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    return account;
  }

  async listAccounts(input: FinanceAccountListFilters & {
    tenantId: string;
  }) {
    const chartOfAccount = getDelegate(this.db);

    return chartOfAccount.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.type ? { type: input.type } : {}),
        ...(input.subtype ? { subtype: input.subtype } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...accountSearchWhere(input.search),
      },
      orderBy: [
        { code: 'asc' },
        { name: 'asc' },
      ],
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  async deactivateAccount(input: {
    tenantId: string;
    accountId: string;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Deactivation reason is required'), {
        statusCode: 400,
        code: 'ACCOUNT_DEACTIVATION_REASON_REQUIRED',
      });
    }

    return this.updateAccount({
      tenantId: input.tenantId,
      accountId: input.accountId,
      isActive: false,
    });
  }

  private async findDuplicate(
    tenantId: string,
    code: string,
    excludeAccountId?: string,
  ) {
    const chartOfAccount = getDelegate(this.db);

    if (typeof chartOfAccount.findFirst === 'function') {
      return chartOfAccount.findFirst({
        where: {
          tenantId,
          code,
          ...(excludeAccountId ? { id: { not: excludeAccountId } } : {}),
        },
        select: {
          id: true,
        },
      });
    }

    const accounts = await chartOfAccount.findMany({
      where: {
        tenantId,
        code,
      },
      select: {
        id: true,
      },
    });

    return accounts.find((account: any) => account.id !== excludeAccountId) ?? null;
  }
}

export const accountService = new AccountService();

export default AccountService;

export type {
  AccountSubtype,
  AccountType,
};