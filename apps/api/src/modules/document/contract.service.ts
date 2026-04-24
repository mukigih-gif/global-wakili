import type {
  ContractInput,
  ContractUpdateInput,
  TenantContractDbClient,
} from './contract.types';
import { assertContractDates } from './contract.validators';
import { ContractVersionService } from './contract-version.service';

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid contract date'), {
      statusCode: 422,
      code: 'INVALID_CONTRACT_DATE',
    });
  }
  return parsed;
}

function normalizeEmail(value?: string | null): string | null {
  return value?.trim().toLowerCase() || null;
}

function normalizePhone(value?: string | null): string | null {
  return value?.trim() || null;
}

export class ContractService {
  static async createContract(
    db: TenantContractDbClient,
    input: ContractInput,
  ) {
    const executionDate = normalizeDate(input.executionDate);
    const effectiveDate = normalizeDate(input.effectiveDate);
    const expiryDate = normalizeDate(input.expiryDate);

    assertContractDates({
      executionDate,
      effectiveDate,
      expiryDate,
    });

    const [matter, existingContract, creator] = await Promise.all([
      db.matter.findFirst({
        where: {
          id: input.matterId,
          tenantId: input.tenantId,
        },
        select: {
          id: true,
          tenantId: true,
        },
      }),
      db.contract.findFirst({
        where: {
          tenantId: input.tenantId,
          contractNumber: input.contractNumber.trim(),
        },
        select: {
          id: true,
        },
      }),
      input.createdById
        ? db.user.findFirst({
            where: {
              id: input.createdById,
              tenantId: input.tenantId,
              status: 'ACTIVE',
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!matter) {
      throw Object.assign(new Error('Matter not found for tenant'), {
        statusCode: 404,
        code: 'CONTRACT_MATTER_NOT_FOUND',
      });
    }

    if (existingContract) {
      throw Object.assign(new Error('Contract number already exists for this tenant'), {
        statusCode: 409,
        code: 'DUPLICATE_CONTRACT_NUMBER',
      });
    }

    if (input.createdById && !creator) {
      throw Object.assign(new Error('Contract creator not found or inactive'), {
        statusCode: 404,
        code: 'CONTRACT_CREATOR_NOT_FOUND',
      });
    }

    return db.contract.create({
      data: {
        tenantId: input.tenantId,
        matterId: input.matterId,
        contractNumber: input.contractNumber.trim(),
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        status: input.status ?? 'DRAFTING',
        executionDate,
        effectiveDate,
        expiryDate,
        counterpartyName: input.counterpartyName?.trim() ?? null,
        counterpartyEmail: normalizeEmail(input.counterpartyEmail),
        counterpartyPhone: normalizePhone(input.counterpartyPhone),
        createdById: input.createdById ?? null,
      },
    });
  }

  static async updateContract(
    db: TenantContractDbClient,
    params: {
      tenantId: string;
      contractId: string;
      input: ContractUpdateInput;
    },
  ) {
    const existing = await db.contract.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.contractId,
      },
      select: {
        id: true,
        executionDate: true,
        effectiveDate: true,
        expiryDate: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Contract not found'), {
        statusCode: 404,
        code: 'CONTRACT_NOT_FOUND',
      });
    }

    if (params.input.contractNumber) {
      const duplicate = await db.contract.findFirst({
        where: {
          tenantId: params.tenantId,
          contractNumber: params.input.contractNumber.trim(),
          id: { not: params.contractId },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw Object.assign(new Error('Contract number already exists for this tenant'), {
          statusCode: 409,
          code: 'DUPLICATE_CONTRACT_NUMBER',
        });
      }
    }

    const executionDate =
      params.input.executionDate !== undefined
        ? normalizeDate(params.input.executionDate)
        : existing.executionDate;
    const effectiveDate =
      params.input.effectiveDate !== undefined
        ? normalizeDate(params.input.effectiveDate)
        : existing.effectiveDate;
    const expiryDate =
      params.input.expiryDate !== undefined
        ? normalizeDate(params.input.expiryDate)
        : existing.expiryDate;

    assertContractDates({
      executionDate,
      effectiveDate,
      expiryDate,
    });

    return db.contract.update({
      where: {
        id: params.contractId,
      },
      data: {
        ...(params.input.contractNumber !== undefined
          ? { contractNumber: params.input.contractNumber.trim() }
          : {}),
        ...(params.input.title !== undefined
          ? { title: params.input.title.trim() }
          : {}),
        ...(params.input.description !== undefined
          ? { description: params.input.description?.trim() ?? null }
          : {}),
        ...(params.input.status !== undefined
          ? { status: params.input.status }
          : {}),
        ...(params.input.executionDate !== undefined
          ? { executionDate }
          : {}),
        ...(params.input.effectiveDate !== undefined
          ? { effectiveDate }
          : {}),
        ...(params.input.expiryDate !== undefined
          ? { expiryDate }
          : {}),
        ...(params.input.counterpartyName !== undefined
          ? { counterpartyName: params.input.counterpartyName?.trim() ?? null }
          : {}),
        ...(params.input.counterpartyEmail !== undefined
          ? { counterpartyEmail: normalizeEmail(params.input.counterpartyEmail) }
          : {}),
        ...(params.input.counterpartyPhone !== undefined
          ? { counterpartyPhone: normalizePhone(params.input.counterpartyPhone) }
          : {}),
      },
    });
  }

  static async getContractById(
    db: TenantContractDbClient,
    params: {
      tenantId: string;
      contractId: string;
    },
  ) {
    return db.contract.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.contractId,
      },
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            matterCode: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        versions: {
          orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });
  }

  static async listMatterContracts(
    db: TenantContractDbClient,
    params: {
      tenantId: string;
      matterId: string;
      page?: number;
      limit?: number;
      status?: string | null;
    },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const where = {
      tenantId: params.tenantId,
      matterId: params.matterId,
      ...(params.status ? { status: params.status } : {}),
    };

    const [data, total] = await Promise.all([
      db.contract.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.contract.count ? db.contract.count({ where }) : Promise.resolve(0),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  static async addContractVersion(
    db: TenantContractDbClient,
    params: {
      tenantId: string;
      contractId: string;
      fileUrl: string;
      changesSummary?: string | null;
      createdById?: string | null;
    },
  ) {
    return ContractVersionService.createVersion(db, {
      tenantId: params.tenantId,
      contractId: params.contractId,
      fileUrl: params.fileUrl,
      changesSummary: params.changesSummary ?? null,
      createdById: params.createdById ?? null,
    });
  }
}