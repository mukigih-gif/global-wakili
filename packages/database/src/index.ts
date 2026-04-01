// packages/database/src/index.ts

/**
 * Global Wakili Database Entry Point
 * Exports the base Prisma client and the Tenant Isolation Engine.
 */

// 1. Export the base prisma instance and connection helpers
export { 
  default as prisma, 
  connectPrisma, 
  disconnectPrisma, 
  getTenantClient 
} from './prisma';

// 2. Export the Tenant Extension logic for advanced scoping
export * from './tenant-extension';

// 3. Re-export everything from the generated Prisma Client 
// (This gives your API access to the 72 models/types)
export * from '@prisma/client';