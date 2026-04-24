import { prisma } from '../config/database';

export class ClientManagementService {
  static async createClient(tenantId: string, data: any) {
    return await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: { ...data, tenantId }
      });

      // Initialize Client-Specific Ledger record
      await tx.clientAccount.create({
        data: { clientId: client.id, tenantId, balance: 0 }
      });

      return client;
    });
  }
}