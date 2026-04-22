// apps/api/src/modules/integrations/index.ts

export { default as integrationRoutes } from './integrations.routes';

export * from './banking/bank.interface';
export * from './banking/bank.service';
export * from './banking/banking-sync.service';

export * from './etims/eTimsClient';
export * from './etims/eTimsService';
export * from './etims/eTimsQueueService';

export * from './goaml/goAMLClient';
export * from './goaml/STRService';

export * from './kra/CorporateTaxService';
export * from './kra/PAYEService';
export * from './kra/TaxEngineService';
export * from './kra/VATService';
export * from './kra/WHTService';


export const INTEGRATIONS_MODULE_STATUS = {
  module: 'integrations',
  status: 'foundation-ready',
  capabilities: [
    'banking-providers',
    'bank-statement-sync-foundation',
    'etims-client-service',
    'etims-queue-foundation',
    'kra-tax-dashboard',
    'goaml-str-service',
    'email-sms-portal-notifications',
    'notification-audit',
    'notification-preferences',
    'notification-recipient-resolution',
  ],
  pendingHardening: [
    'authenticated integration routes',
    'webhook signature verification',
    'provider credential encryption review',
    'integration job workers',
    'dead-letter queue handling',
    'platform integration monitoring',
  ],
} as const;
