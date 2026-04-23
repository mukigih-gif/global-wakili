// apps/api/src/modules/analytics/analytics.routes.ts

import { Router, type Request, type Response } from 'express';
import { PERMISSIONS } from '../../config/permissions';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  analyticsInsightCreateSchema,
  analyticsInsightSearchQuerySchema,
  analyticsMetricCreateSchema,
  analyticsMetricSearchQuerySchema,
  analyticsPeriodQuerySchema,
  analyticsSnapshotCreateSchema,
  analyticsSnapshotSearchQuerySchema,
} from './analytics.validators';
import {
  createAnalyticsInsight,
  createAnalyticsMetric,
  createAnalyticsSnapshot,
  getAnalyticsCapabilities,
  getAnalyticsKpis,
  getAnalyticsOverview,
  getBillingAnalytics,
  getClientAnalytics,
  getComplianceAnalytics,
  getMatterAnalytics,
  getOperationsAnalytics,
  getProductivityAnalytics,
  getTrustAnalytics,
  searchAnalyticsInsights,
  searchAnalyticsMetrics,
  searchAnalyticsSnapshots,
} from './analytics.controller';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'analytics',
    status: 'mounted',
    service: 'global-wakili-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get(
  '/overview',
  requirePermissions(PERMISSIONS.analytics.viewOverview),
  validate({ query: analyticsPeriodQuerySchema }),
  getAnalyticsOverview,
);

router.get(
  '/kpis',
  requirePermissions(PERMISSIONS.analytics.viewKpis),
  validate({ query: analyticsPeriodQuerySchema }),
  getAnalyticsKpis,
);

router.get(
  '/clients',
  requirePermissions(PERMISSIONS.analytics.viewClientAnalytics),
  validate({ query: analyticsPeriodQuerySchema }),
  getClientAnalytics,
);

router.get(
  '/matters',
  requirePermissions(PERMISSIONS.analytics.viewMatterAnalytics),
  validate({ query: analyticsPeriodQuerySchema }),
  getMatterAnalytics,
);

router.get(
  '/billing',
  requirePermissions(PERMISSIONS.analytics.viewBillingAnalytics),
  validate({ query: analyticsPeriodQuerySchema }),
  getBillingAnalytics,
);

router.get(
  '/trust',
  requirePermissions(PERMISSIONS.analytics.viewTrustAnalytics),
  validate({ query: analyticsPeriodQuerySchema }),
  getTrustAnalytics,
);

router.get(
  '/productivity',
  requirePermissions(PERMISSIONS.analytics.viewProductivityAnalytics),
  validate({ query: analyticsPeriodQuerySchema }),
  getProductivityAnalytics,
);

router.get(
  '/compliance',
  requirePermissions(PERMISSIONS.analytics.viewComplianceAnalytics),
  validate({ query: analyticsPeriodQuerySchema }),
  getComplianceAnalytics,
);

router.get(
  '/operations',
  requirePermissions(PERMISSIONS.analytics.viewOperationsAnalytics),
  validate({ query: analyticsPeriodQuerySchema }),
  getOperationsAnalytics,
);

router.get(
  '/metrics/search',
  requirePermissions(PERMISSIONS.analytics.viewKpis),
  validate({ query: analyticsMetricSearchQuerySchema }),
  searchAnalyticsMetrics,
);

router.post(
  '/metrics',
  requirePermissions(PERMISSIONS.analytics.manageMetrics),
  validate({ body: analyticsMetricCreateSchema }),
  createAnalyticsMetric,
);

router.get(
  '/snapshots/search',
  requirePermissions(PERMISSIONS.analytics.viewKpis),
  validate({ query: analyticsSnapshotSearchQuerySchema }),
  searchAnalyticsSnapshots,
);

router.post(
  '/snapshots',
  requirePermissions(PERMISSIONS.analytics.manageSnapshots),
  validate({ body: analyticsSnapshotCreateSchema }),
  createAnalyticsSnapshot,
);

router.get(
  '/insights/search',
  requirePermissions(PERMISSIONS.analytics.viewKpis),
  validate({ query: analyticsInsightSearchQuerySchema }),
  searchAnalyticsInsights,
);

router.post(
  '/insights',
  requirePermissions(PERMISSIONS.analytics.manageInsights),
  validate({ body: analyticsInsightCreateSchema }),
  createAnalyticsInsight,
);

router.get(
  '/capabilities',
  requirePermissions(PERMISSIONS.analytics.viewOverview),
  getAnalyticsCapabilities,
);

export default router;