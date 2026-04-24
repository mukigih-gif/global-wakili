import type { ContractVersionInput, TenantContractDbClient } from './contract.types';

export class ContractVersionService {
  static async createVersion(
    db: TenantContractDbClient,
    input: ContractVersionInput,
  ) {
    const contract = await db.contract.findFirst({
      where: {
        id: input.contractId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!contract) {
      throw Object.assign(new Error('Contract not found'), {
        statusCode: 404,
        code: 'CONTRACT_NOT_FOUND',
      });
    }

    if (input.createdById) {
      const creator = await db.user.findFirst({
        where: {
          id: input.createdById,
          tenantId: input.tenantId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      if (!creator) {
        throw Object.assign(new Error('Contract version creator not found or inactive'), {
          statusCode: 404,
          code: 'CONTRACT_VERSION_CREATOR_NOT_FOUND',
        });
      }
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts += 1;

      const latest = await db.contractVersion.findFirst({
        where: {
          tenantId: input.tenantId,
          contractId: input.contractId,
        },
        orderBy: {
          versionNumber: 'desc',
        },
        select: {
          versionNumber: true,
        },
      });

      const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;

      try {
        return await db.contractVersion.create({
          data: {
            tenantId: input.tenantId,
            contractId: input.contractId,
            versionNumber: nextVersionNumber,
            fileUrl: input.fileUrl.trim(),
            changesSummary: input.changesSummary?.trim() ?? null,
            createdById: input.createdById ?? null,
          },
        });
      } catch (error: any) {
        const code = String(error?.code ?? '');
        const message = String(error?.message ?? '').toLowerCase();

        const uniqueConflict =
          code === 'P2002' ||
          message.includes('unique') ||
          message.includes('constraint');

        if (!uniqueConflict || attempts >= maxAttempts) {
          throw error;
        }
      }
    }

    throw Object.assign(new Error('Unable to create contract version after retries'), {
      statusCode: 409,
      code: 'CONTRACT_VERSION_CONFLICT',
    });
  }

  static async getLatestVersion(
    db: TenantContractDbClient,
    params: {
      tenantId: string;
      contractId: string;
    },
  ) {
    return db.contractVersion.findFirst({
      where: {
        tenantId: params.tenantId,
        contractId: params.contractId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });
  }

  static async getVersionHistory(
    db: TenantContractDbClient,
    params: {
      tenantId: string;
      contractId: string;
    },
  ) {
    return db.contractVersion.findMany({
      where: {
        tenantId: params.tenantId,
        contractId: params.contractId,
      },
      orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
    });
  }
}