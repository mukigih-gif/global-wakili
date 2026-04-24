// apps/api/src/modules/integrations/integrations.routes.ts

import { Router, type Request, type Response } from 'express';
import { BankService } from './banking/bank.service';
import { NotificationTemplateRegistry } from '../notifications/providers/NotificationTemplateRegistry';
import { INTEGRATIONS_MODULE_STATUS } from './index';

import { bindPlatformModuleEnforcement } from '../../middleware/platform';
import { platformFeatureFlag } from '../../middleware/platform-feature-flag.middleware';
import { PLATFORM_FEATURE_KEYS } from '../platform/PlatformFeatureKeys';
const router = Router();

bindPlatformModuleEnforcement(router, {
  moduleKey: 'integrations',
  metricType: 'API_REQUESTS',
});

const integrationsActiveSyncFeature = platformFeatureFlag(
  PLATFORM_FEATURE_KEYS.INTEGRATIONS_ACTIVE_SYNC,
  'integrations',
);

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'integrations',
    status: 'mounted',
    service: 'global-wakili-api',
    lifecycle: 'foundation-ready',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    ...INTEGRATIONS_MODULE_STATUS,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get('/capabilities', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'integrations',
    capabilities: {
      banking: {
        status: 'foundation-ready',
        supportedProviders: BankService.listSupportedProviders(),
      },
      etims: {
        status: 'foundation-ready',
        mode: 'service-and-queue-ready',
      },
      kra: {
        status: 'foundation-ready',
        services: ['VAT', 'WHT', 'PAYE', 'Corporate Tax', 'Tax Dashboard'],
      },
      goaml: {
        status: 'foundation-ready',
        services: ['STR/SAR submission', 'status sync'],
      },
      notifications: {
        status: 'foundation-ready',
        channels: ['email', 'sms', 'portal'],
        templates: NotificationTemplateRegistry.list().map((template) => ({
          key: template.key,
          category: template.category,
          defaultPriority: template.defaultPriority,
          channels: template.channels,
        })),
      },
      queues: {
        status: 'minimal-adapter-ready',
        queues: ['reminders', 'integrations'],
      },
    },
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    module: 'integrations',
    error: 'Integrations route not found',
    code: 'INTEGRATIONS_ROUTE_NOT_FOUND',
    path: req.originalUrl,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export default router;