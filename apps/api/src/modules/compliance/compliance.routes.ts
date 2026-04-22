// apps/api/src/modules/compliance/compliance.routes.ts

import { Router, type Request, type Response } from 'express';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../config/permissions';
import {
  createComplianceReport,
  getComplianceCalendar,
  getComplianceCapabilities,
  getComplianceDashboard,
  getComplianceReport,
  listClientComplianceChecks,
  runClientComplianceReview,
  searchComplianceReports,
  submitComplianceReportToGoAML,
  syncComplianceReportGoAMLStatus,
  updateComplianceReport,
} from './compliance.controller';
import {
  complianceCalendarQuerySchema,
  complianceCheckSearchQuerySchema,
  complianceDashboardQuerySchema,
  complianceReportCreateSchema,
  complianceReportSearchQuerySchema,
  complianceReportUpdateSchema,
  complianceReviewSchema,
} from './compliance.validators';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'compliance',
    status: 'mounted',
    service: 'global-wakili-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

router.post(
  '/client-review',
  requirePermissions(PERMISSIONS.compliance.runClientReview),
  validate({ body: complianceReviewSchema }),
  runClientComplianceReview,
);

router.get(
  '/checks',
  requirePermissions(PERMISSIONS.compliance.viewClientChecks),
  validate({ query: complianceCheckSearchQuerySchema }),
  listClientComplianceChecks,
);

router.post(
  '/reports',
  requirePermissions(PERMISSIONS.compliance.createReport),
  validate({ body: complianceReportCreateSchema }),
  createComplianceReport,
);

router.get(
  '/reports/search',
  requirePermissions(PERMISSIONS.compliance.searchReport),
  validate({ query: complianceReportSearchQuerySchema }),
  searchComplianceReports,
);

router.get(
  '/dashboard',
  requirePermissions(PERMISSIONS.compliance.viewDashboard),
  validate({ query: complianceDashboardQuerySchema }),
  getComplianceDashboard,
);

router.get(
  '/calendar',
  requirePermissions(PERMISSIONS.compliance.viewCalendar),
  validate({ query: complianceCalendarQuerySchema }),
  getComplianceCalendar,
);

router.get(
  '/capabilities',
  requirePermissions(PERMISSIONS.compliance.viewDashboard),
  getComplianceCapabilities,
);

router.get(
  '/reports/:reportId',
  requirePermissions(PERMISSIONS.compliance.viewReport),
  getComplianceReport,
);

router.patch(
  '/reports/:reportId',
  requirePermissions(PERMISSIONS.compliance.updateReport),
  validate({ body: complianceReportUpdateSchema }),
  updateComplianceReport,
);

router.post(
  '/reports/:reportId/goaml/submit',
  requirePermissions(PERMISSIONS.compliance.submitGoaml),
  submitComplianceReportToGoAML,
);

router.post(
  '/reports/:reportId/goaml/sync',
  requirePermissions(PERMISSIONS.compliance.syncGoaml),
  syncComplianceReportGoAMLStatus,
);

export default router;