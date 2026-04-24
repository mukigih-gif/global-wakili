// apps/api/src/modules/queues/queue.routes.ts

import { Router, type Request, type Response } from 'express';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../config/permissions';
import {
  createAndEnqueueQueueJob,
  createQueueJob,
  enqueueQueueJob,
  getQueueCapabilities,
  getQueueDashboard,
  getQueueJob,
  getQueueReportSummary,
  getRegisteredQueueJobs,
  markQueueJobCompleted,
  markQueueJobFailed,
  markQueueJobProcessing,
  retryQueueJob,
  searchQueueJobs,
} from './queue.controller';
import {
  queueCompleteJobSchema,
  queueCreateJobSchema,
  queueDashboardQuerySchema,
  queueFailJobSchema,
  queueJobIdParamSchema,
  queueSearchQuerySchema,
} from './queue.validators';

import { bindPlatformModuleEnforcement } from '../../middleware/platform/module-enforcement';
import { platformFeatureFlag } from '../../middleware/platform-feature-flag.middleware';
import { PLATFORM_FEATURE_KEYS } from '../platform/PlatformFeatureKeys';
const router = Router();

bindPlatformModuleEnforcement(router, {
  moduleKey: 'queues',
  metricType: 'QUEUE_JOBS',
});

const queuesOperatorActionsFeature = platformFeatureFlag(
  PLATFORM_FEATURE_KEYS.QUEUES_OPERATOR_ACTIONS,
  'queues',
);

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'queues',
    status: 'mounted',
    service: 'global-wakili-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.get(
  '/registry',
  requirePermissions(PERMISSIONS.queues.viewDashboard),
  getRegisteredQueueJobs,
);

router.post(
  '/jobs',
  requirePermissions(PERMISSIONS.queues.createJob),
  validate({ body: queueCreateJobSchema }),
  createQueueJob,
);

router.post(
  '/jobs/enqueue',
  requirePermissions(PERMISSIONS.queues.enqueueJob),
  validate({ body: queueCreateJobSchema }),
  createAndEnqueueQueueJob,
);

router.get(
  '/jobs/search',
  requirePermissions(PERMISSIONS.queues.searchJobs),
  validate({ query: queueSearchQuerySchema }),
  searchQueueJobs,
);

router.get(
  '/dashboard',
  requirePermissions(PERMISSIONS.queues.viewDashboard),
  validate({ query: queueDashboardQuerySchema }),
  getQueueDashboard,
);

router.get(
  '/reports/summary',
  requirePermissions(PERMISSIONS.queues.viewReports),
  validate({ query: queueDashboardQuerySchema }),
  getQueueReportSummary,
);

router.get(
  '/capabilities',
  requirePermissions(PERMISSIONS.queues.viewDashboard),
  getQueueCapabilities,
);

router.get(
  '/jobs/:jobId',
  requirePermissions(PERMISSIONS.queues.viewJob),
  validate({ params: queueJobIdParamSchema }),
  getQueueJob,
);

router.post(
  '/jobs/:jobId/enqueue',
  requirePermissions(PERMISSIONS.queues.enqueueJob),
  validate({ params: queueJobIdParamSchema }),
  enqueueQueueJob,
);

router.post(
  '/jobs/:jobId/processing',
  requirePermissions(PERMISSIONS.queues.manageJobs),
  validate({ params: queueJobIdParamSchema }),
  markQueueJobProcessing,
);

router.post(
  '/jobs/:jobId/completed',
  requirePermissions(PERMISSIONS.queues.manageJobs),
  validate({ params: queueJobIdParamSchema, body: queueCompleteJobSchema }),
  markQueueJobCompleted,
);

router.post(
  '/jobs/:jobId/failed',
  requirePermissions(PERMISSIONS.queues.manageJobs),
  validate({ params: queueJobIdParamSchema, body: queueFailJobSchema }),
  markQueueJobFailed,
);

router.post(
  '/jobs/:jobId/retry',
  queuesOperatorActionsFeature,
  requirePermissions(PERMISSIONS.queues.retryJob),
  validate({ params: queueJobIdParamSchema }),
  retryQueueJob,
);

export default router;