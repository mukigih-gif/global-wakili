import { Prisma } from '@prisma/client';

export const tenantExtension = (tenantId: string) => {
  return Prisma.defineExtension({
    name: 'tenant-filter',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // 1. Skip if the model doesn't have a tenantId field (like 'Tenant' itself)
          const dmmf = Prisma.dmmf.datamodel.models.find(m => m.name === model);
          const hasTenantId = dmmf?.fields.some(f => f.name === 'tenantId');

          if (!hasTenantId) return query(args);

          // 2. Inject tenantId into filters for Read/Update/Delete operations
          if (['findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }

          // 3. Inject tenantId into Data for Create operations
          if (['create', 'createMany'].includes(operation)) {
            if (operation === 'create') {
              args.data = { ...args.data, tenantId };
            } else {
              if (Array.isArray(args.data)) {
                args.data = args.data.map((item: any) => ({ ...item, tenantId }));
              }
            }
          }

          return query(args);
        },
      },
    },
  });
};