export {
  prisma,
  default,
  connectPrisma,
  disconnectPrisma,
  getTenantClient,
} from './prisma';

export type { DbClient, TenantScopedClient } from './prisma';

export {
  createTenantExtension,
  isTenantScopedModel,
  TENANT_SCOPED_MODELS,
} from './tenant-extension';

export * from '@prisma/client';