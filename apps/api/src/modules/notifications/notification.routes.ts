// apps/api/src/modules/notifications/notification.routes.ts

import { Router, type Request, type Response } from 'express';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../config/permissions';
import {
  getNotificationCapabilities,
  getNotificationDashboard,
  getNotificationReportSummary,
  markNotificationRead,
  queueNotification,
  searchNotifications,
  sendNotification,
  updateProviderWebhookStatus,
} from './notification.controller';
import {
  notificationDashboardQuerySchema,
  notificationIdParamSchema,
  notificationSearchQuerySchema,
  notificationSendSchema,
  providerWebhookStatusSchema,
} from './notification.validators';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'notifications',
    status: 'mounted',
    service: 'global-wakili-api',
    deliveryOrder: ['SYSTEM_ALERT', 'EMAIL', 'SMS'],
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.post(
  '/send',
  requirePermissions(PERMISSIONS.notifications.sendNotification),
  validate({ body: notificationSendSchema }),
  sendNotification,
);

router.post(
  '/queue',
  requirePermissions(PERMISSIONS.notifications.queueNotification),
  validate({ body: notificationSendSchema }),
  queueNotification,
);

router.get(
  '/search',
  requirePermissions(PERMISSIONS.notifications.searchNotification),
  validate({ query: notificationSearchQuerySchema }),
  searchNotifications,
);

router.get(
  '/dashboard',
  requirePermissions(PERMISSIONS.notifications.viewDashboard),
  validate({ query: notificationDashboardQuerySchema }),
  getNotificationDashboard,
);

router.get(
  '/reports/summary',
  requirePermissions(PERMISSIONS.notifications.viewReports),
  validate({ query: notificationDashboardQuerySchema }),
  getNotificationReportSummary,
);

router.get(
  '/capabilities',
  requirePermissions(PERMISSIONS.notifications.viewDashboard),
  getNotificationCapabilities,
);

router.patch(
  '/:notificationId/read',
  requirePermissions(PERMISSIONS.notifications.markRead),
  validate({ params: notificationIdParamSchema }),
  markNotificationRead,
);

router.post(
  '/webhooks/provider-status',
  requirePermissions(PERMISSIONS.notifications.manageWebhooks),
  validate({ body: providerWebhookStatusSchema }),
  updateProviderWebhookStatus,
);

export default router;