// apps/api/src/modules/integrations/index.ts

export { default as integrationRoutes } from './integrations.routes';

export const INTEGRATIONS_MODULE_STATUS = {
  module: 'integrations',
  status: 'pending-final-module-generation',
} as const;