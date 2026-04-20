import type { AccountSubtype, AccountType } from '@global-wakili/database';

type AccountDbClient = {
  chartOfAccount: {
    create: Function;
    update: Function;
    findUnique: Function;
    findMany: Function;
  };
};

type CreateAccountInput = {
  code: string;
  name: string;
  type: AccountType;
  subtype?: AccountSubtype | null;
  description?: string | null;
  currency?: string | null;
  allowManualPosting?: boolean;
  isSystem?: boolean;
};

type UpdateAccountInput = Partial<CreateAccountInput> & {
  isActive?: boolean;
};

export class AccountService {
  static async create(
    db: AccountDbClient,
    tenantId: string,
    input: CreateAccountInput,
  ) {
    return db.chartOfAccount.create({
      data: {
        tenantId,
        code: input.code.trim(),
        name: input.name.trim(),
        type: input.type,
        subtype: input.subtype ?? null,
        description: input.description?.trim() ?? null,
        currency: input.currency?.trim() ?? 'KES',
        allowManualPosting: input.allowManualPosting ?? true,
        isSystem: input.isSystem ?? false,
        isActive: true,
      },
    });
  }

  static async update(
    db: AccountDbClient,
    tenantId: string,
    accountId: string,
    input: UpdateAccountInput,
  ) {
    const existing = await db.chartOfAccount.findUnique({
      where: {
        id: accountId,
      },
      select: {
        id: true,
        tenantId: true,
        isSystem: true,
      },
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw Object.assign(new Error('Account not found'), {
        statusCode: 404,
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    if (existing.isSystem && input.code) {
      throw Object.assign(new Error('System account codes cannot be changed'), {
        statusCode: 409,
        code: 'SYSTEM_ACCOUNT_CODE_LOCKED',
      });
    }

    return db.chartOfAccount.update({
      where: { id: accountId },
      data: {
        ...(input.code ? { code: input.code.trim() } : {}),
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.subtype !== undefined ? { subtype: input.subtype } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() ?? null } : {}),
        ...(input.currency !== undefined ? { currency: input.currency?.trim() ?? null } : {}),
        ...(input.allowManualPosting !== undefined ? { allowManualPosting: input.allowManualPosting } : {}),
        ...(input.isSystem !== undefined ? { isSystem: input.isSystem } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  static async getById(
    db: AccountDbClient,
    tenantId: string,
    accountId: string,
  ) {
    const account = await db.chartOfAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.tenantId !== tenantId) {
      throw Object.assign(new Error('Account not found'), {
        statusCode: 404,
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    return account;
  }

  static async list(
    db: AccountDbClient,
    tenantId: string,
    filters?: {
      type?: AccountType;
      subtype?: AccountSubtype;
      isActive?: boolean;
      search?: string;
    },
  ) {
    return db.chartOfAccount.findMany({
      where: {
        tenantId,
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.subtype ? { subtype: filters.subtype } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
        ...(filters?.search
          ? {
              OR: [
                { code: { contains: filters.search, mode: 'insensitive' } },
                { name: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ code: 'asc' }],
    });
  }
}