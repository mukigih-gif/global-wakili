import {
  prisma,
  connectPrisma,
  disconnectPrisma,
  getTenantClient,
} from '@global-wakili/database';

export const db = prisma;

export { prisma, connectPrisma, disconnectPrisma, getTenantClient };

export default prisma;