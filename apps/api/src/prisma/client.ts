// apps/api/src/prisma/client.ts

import {
  prisma,
  connectPrisma,
  disconnectPrisma,
  getTenantClient,
  type DbClient,
  type TenantScopedClient,
} from '@global-wakili/database/prisma';

export {
  prisma,
  connectPrisma,
  disconnectPrisma,
  getTenantClient,
  type DbClient,
  type TenantScopedClient,
};

export default prisma;