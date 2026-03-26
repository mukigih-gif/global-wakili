// lib/prisma-tenant.ts
import { PrismaClient } from './generated/client';

export const getTenantClient = (tenantId: string) => {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Automatically filter every "find" by the current Tenant
          if (['findMany', 'findFirst', 'count'].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }
          // Automatically assign tenantId to every "create"
          if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          }
          return query(args);
        },
      },
    },
  });
};