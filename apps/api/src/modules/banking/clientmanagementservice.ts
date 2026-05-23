import { Prisma, prisma } from '@global-wakili/database';

type ClientCreateInput = Record<string, unknown>;

function requireTenantId(tenantId: string): string {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for client banking operations'), {
      statusCode: 400,
      code: 'BANKING_CLIENT_TENANT_REQUIRED',
    });
  }

  return tenantId;
}

export class ClientManagementService {
  static async createClient(tenantId: string, data: ClientCreateInput) {
    const normalizedTenantId = requireTenantId(tenantId);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return (tx as any).client.create({
        data: {
          ...data,
          tenantId: normalizedTenantId,
        },
      });
    });
  }
}

export default ClientManagementService;
