// apps/api/src/modules/reporting/reporting.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../config/permissions';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { bindPlatformModuleEnforcement } from '../../middleware/platform/module-enforcement';
import { platformFeatureFlag } from '../../middleware/platform-feature-flag.middleware';
import { PLATFORM_FEATURE_KEYS } from '../platform/PlatformFeatureKeys';
import {
  biConnectorSearchQuerySchema,
  biConnectorUpsertSchema,
  dashboardDefinitionSearchQuerySchema,
  dashboardDefinitionUpsertSchema,
  dashboardWidgetSearchQuerySchema,
  dashboardWidgetUpsertSchema,
  reportDefinitionSearchQuerySchema,
  reportDefinitionUpsertSchema,
  reportExportCreateSchema,
  reportExportSearchQuerySchema,
  reportRunCreateSchema,
  reportRunSearchQuerySchema,
  scheduledReportSearchQuerySchema,
  scheduledReportUpsertSchema,
} from './reporting.validators';
import {
  createReportExport,
  createReportRun,
  getReportingCapabilities,
  getReportingCatalog,
  getReportingHealth,
  getReportingOverview,
  searchBIConnectors,
  searchDashboardDefinitions,
  searchDashboardWidgets,
  searchReportDefinitions,
  searchReportExports,
  searchReportRuns,
  searchScheduledReports,
  upsertBIConnector,
  upsertDashboardDefinition,
  upsertDashboardWidget,
  upsertReportDefinition,
  upsertScheduledReport,
} from './reporting.controller';

const router = Router();

bindPlatformModuleEnforcement(router, {
  moduleKey: 'reporting',
  metricType: 'API_REQUESTS',
});

const reportingBIConnectorsFeature = platformFeatureFlag(
  PLATFORM_FEATURE_KEYS.REPORTING_BI_CONNECTORS,
  'reporting',
);

const reportingAdvancedSchedulingFeature = platformFeatureFlag(
  PLATFORM_FEATURE_KEYS.REPORTING_ADVANCED_SCHEDULING,
  'reporting',
);

router.get('/health', getReportingHealth);

router.get(
  '/overview',
  requirePermissions(PERMISSIONS.reporting.viewOverview),
  getReportingOverview,
);

router.get(
  '/capabilities',
  requirePermissions(PERMISSIONS.reporting.viewOverview),
  getReportingCapabilities,
);

router.get(
  '/catalog',
  requirePermissions(PERMISSIONS.reporting.viewOverview),
  getReportingCatalog,
);

router.get(
  '/definitions/search',
  requirePermissions(PERMISSIONS.reporting.viewDefinitions),
  validate({ query: reportDefinitionSearchQuerySchema }),
  searchReportDefinitions,
);

router.post(
  '/definitions',
  requirePermissions(PERMISSIONS.reporting.manageDefinitions),
  validate({ body: reportDefinitionUpsertSchema }),
  upsertReportDefinition,
);

router.get(
  '/runs/search',
  requirePermissions(PERMISSIONS.reporting.viewRuns),
  validate({ query: reportRunSearchQuerySchema }),
  searchReportRuns,
);

router.post(
  '/runs',
  requirePermissions(PERMISSIONS.reporting.runReports),
  validate({ body: reportRunCreateSchema }),
  createReportRun,
);

router.get(
  '/exports/search',
  requirePermissions(PERMISSIONS.reporting.viewExports),
  validate({ query: reportExportSearchQuerySchema }),
  searchReportExports,
);

router.post(
  '/exports',
  requirePermissions(PERMISSIONS.reporting.exportReports),
  validate({ body: reportExportCreateSchema }),
  createReportExport,
);

router.get(
  '/dashboard-definitions/search',
  requirePermissions(PERMISSIONS.reporting.viewDashboards),
  validate({ query: dashboardDefinitionSearchQuerySchema }),
  searchDashboardDefinitions,
);

router.post(
  '/dashboard-definitions',
  requirePermissions(PERMISSIONS.reporting.manageDashboards),
  validate({ body: dashboardDefinitionUpsertSchema }),
  upsertDashboardDefinition,
);

router.get(
  '/dashboard-widgets/search',
  requirePermissions(PERMISSIONS.reporting.viewDashboards),
  validate({ query: dashboardWidgetSearchQuerySchema }),
  searchDashboardWidgets,
);

router.post(
  '/dashboard-widgets',
  requirePermissions(PERMISSIONS.reporting.manageDashboards),
  validate({ body: dashboardWidgetUpsertSchema }),
  upsertDashboardWidget,
);

router.get(
  '/schedules/search',
  reportingAdvancedSchedulingFeature,
  requirePermissions(PERMISSIONS.reporting.viewSchedules),
  validate({ query: scheduledReportSearchQuerySchema }),
  searchScheduledReports,
);

router.post(
  '/schedules',
  reportingAdvancedSchedulingFeature,
  requirePermissions(PERMISSIONS.reporting.manageSchedules),
  validate({ body: scheduledReportUpsertSchema }),
  upsertScheduledReport,
);

router.get(
  '/bi-connectors/search',
  reportingBIConnectorsFeature,
  requirePermissions(PERMISSIONS.reporting.viewBIConnectors),
  validate({ query: biConnectorSearchQuerySchema }),
  searchBIConnectors,
);

router.post(
  '/bi-connectors',
  reportingBIConnectorsFeature,
  requirePermissions(PERMISSIONS.reporting.manageBIConnectors),
  validate({ body: biConnectorUpsertSchema }),
  upsertBIConnector,
);

export default router;