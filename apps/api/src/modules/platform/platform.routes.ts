// apps/api/src/modules/platform/platform.routes.ts

import { Router } from 'express';
import { PERMISSIONS } from '../../config/permissions';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  backupJobCreateSchema,
  backupJobSearchQuerySchema,
  configVersionPublishSchema,
  configVersionSearchQuerySchema,
  entitlementSearchQuerySchema,
  entitlementUpsertSchema,
  featureFlagSearchQuerySchema,
  featureFlagUpsertSchema,
  globalMessageSearchQuerySchema,
  globalMessageUpsertSchema,
  globalSettingSearchQuerySchema,
  globalSettingUpsertSchema,
  healthSnapshotSearchQuerySchema,
  healthSnapshotUpsertSchema,
  idParamSchema,
  impersonationApprovalSchema,
  impersonationRequestSchema,
  impersonationSearchQuerySchema,
  incidentSearchQuerySchema,
  incidentUpsertSchema,
  maintenanceSearchQuerySchema,
  maintenanceUpsertSchema,
  patchSearchQuerySchema,
  patchUpsertSchema,
  platformRoleAssignmentSchema,
  platformUserSearchQuerySchema,
  platformUserUpsertSchema,
  quotaPolicySearchQuerySchema,
  quotaPolicyUpsertSchema,
  queueJobSearchQuerySchema,
  subscriptionSearchQuerySchema,
  subscriptionUpsertSchema,
  supportCommentCreateSchema,
  supportTicketSearchQuerySchema,
  supportTicketUpsertSchema,
  tenantProfileSearchQuerySchema,
  tenantProfileUpsertSchema,
  usageMetricSearchQuerySchema,
  usageMetricUpsertSchema,
  webhookLogSearchQuerySchema,
  activeBroadcastQuerySchema,
  activeMaintenanceQuerySchema,
  billingWebhookProcessSchema,
  entitlementEvaluationQuerySchema,
  healthRecomputeSchema,
  impersonationActivateSchema,
  onboardingProvisionSchema,
} from './platform.validators';
import {
  approveOrRevokeImpersonation,
  assignPlatformRole,
  createBackupJob,
  createSupportComment,
  getPlatformCapabilities,
  getPlatformHealth,
  getPlatformOverview,
  listPlatformPermissions,
  listPlatformRoles,
  publishConfigVersion,
  requestImpersonation,
  retryQueueJob,
  searchBackupJobs,
  searchConfigVersions,
  searchEntitlements,
  searchFeatureFlags,
  searchGlobalMessages,
  searchGlobalSettings,
  searchImpersonations,
  searchIncidents,
  searchMaintenance,
  searchPatches,
  searchPlatformUsers,
  searchQueueJobs,
  searchQuotaPolicies,
  searchSubscriptions,
  searchSupportTickets,
  searchTenantHealth,
  searchTenantProfiles,
  searchUsageMetrics,
  searchWebhookLogs,
  upsertEntitlement,
  upsertFeatureFlag,
  upsertGlobalMessage,
  upsertGlobalSetting,
  upsertIncident,
  upsertMaintenance,
  upsertPatch,
  upsertPlatformUser,
  upsertQuotaPolicy,
  upsertSubscription,
  upsertSupportTicket,
  upsertTenantHealth,
  upsertTenantProfile,
  upsertUsageMetric,
  activateImpersonationSession,
  evaluateTenantEntitlement,
  expireStaleImpersonations,
  getActiveMaintenancePolicies,
  getActivePlatformBroadcasts,
  processBillingWebhook,
  provisionTenantOnboarding,
  recomputeTenantHealthScores,
  seedPlatformAccessControl,
} from './platform.controller';

const router = Router();

router.get('/health', getPlatformHealth);
router.get('/overview', requirePermissions(PERMISSIONS.platform.viewOverview), getPlatformOverview);
router.get('/capabilities', requirePermissions(PERMISSIONS.platform.viewOverview), getPlatformCapabilities);

router.get('/admins/users/search', requirePermissions(PERMISSIONS.platform.viewUsers), validate({ query: platformUserSearchQuerySchema }), searchPlatformUsers);
router.post('/admins/users', requirePermissions(PERMISSIONS.platform.manageUsers), validate({ body: platformUserUpsertSchema }), upsertPlatformUser);
router.post('/admins/roles/assign', requirePermissions(PERMISSIONS.platform.manageUsers), validate({ body: platformRoleAssignmentSchema }), assignPlatformRole);
router.get('/admins/roles', requirePermissions(PERMISSIONS.platform.viewUsers), listPlatformRoles);
router.get('/admins/permissions', requirePermissions(PERMISSIONS.platform.viewUsers), listPlatformPermissions);

router.get('/tenants/search', requirePermissions(PERMISSIONS.platform.viewTenantLifecycle), validate({ query: tenantProfileSearchQuerySchema }), searchTenantProfiles);
router.post('/tenants/profile', requirePermissions(PERMISSIONS.platform.manageTenantLifecycle), validate({ body: tenantProfileUpsertSchema }), upsertTenantProfile);

router.get('/subscriptions/search', requirePermissions(PERMISSIONS.platform.viewBilling), validate({ query: subscriptionSearchQuerySchema }), searchSubscriptions);
router.post('/subscriptions', requirePermissions(PERMISSIONS.platform.manageBilling), validate({ body: subscriptionUpsertSchema }), upsertSubscription);

router.get('/entitlements/search', requirePermissions(PERMISSIONS.platform.viewBilling), validate({ query: entitlementSearchQuerySchema }), searchEntitlements);
router.post('/entitlements', requirePermissions(PERMISSIONS.platform.manageBilling), validate({ body: entitlementUpsertSchema }), upsertEntitlement);

router.get('/quotas/search', requirePermissions(PERMISSIONS.platform.viewQuotas), validate({ query: quotaPolicySearchQuerySchema }), searchQuotaPolicies);
router.post('/quotas', requirePermissions(PERMISSIONS.platform.manageQuotas), validate({ body: quotaPolicyUpsertSchema }), upsertQuotaPolicy);

router.get('/usage/search', requirePermissions(PERMISSIONS.platform.viewQuotas), validate({ query: usageMetricSearchQuerySchema }), searchUsageMetrics);
router.post('/usage', requirePermissions(PERMISSIONS.platform.manageQuotas), validate({ body: usageMetricUpsertSchema }), upsertUsageMetric);

router.get('/feature-flags/search', requirePermissions(PERMISSIONS.platform.viewFlags), validate({ query: featureFlagSearchQuerySchema }), searchFeatureFlags);
router.post('/feature-flags', requirePermissions(PERMISSIONS.platform.manageFlags), validate({ body: featureFlagUpsertSchema }), upsertFeatureFlag);

router.get('/settings/search', requirePermissions(PERMISSIONS.platform.viewSettings), validate({ query: globalSettingSearchQuerySchema }), searchGlobalSettings);
router.post('/settings', requirePermissions(PERMISSIONS.platform.manageSettings), validate({ body: globalSettingUpsertSchema }), upsertGlobalSetting);
router.post('/settings/publish-version', requirePermissions(PERMISSIONS.platform.manageSettings), validate({ body: configVersionPublishSchema }), publishConfigVersion);
router.get('/settings/versions/search', requirePermissions(PERMISSIONS.platform.viewSettings), validate({ query: configVersionSearchQuerySchema }), searchConfigVersions);

router.get('/impersonations/search', requirePermissions(PERMISSIONS.platform.viewImpersonation), validate({ query: impersonationSearchQuerySchema }), searchImpersonations);
router.post('/impersonations/request', requirePermissions(PERMISSIONS.platform.manageImpersonation), validate({ body: impersonationRequestSchema }), requestImpersonation);
router.post('/impersonations/:id/decision', requirePermissions(PERMISSIONS.platform.manageImpersonation), validate({ params: idParamSchema, body: impersonationApprovalSchema }), approveOrRevokeImpersonation);

router.get('/incidents/search', requirePermissions(PERMISSIONS.platform.viewIncidents), validate({ query: incidentSearchQuerySchema }), searchIncidents);
router.post('/incidents', requirePermissions(PERMISSIONS.platform.manageIncidents), validate({ body: incidentUpsertSchema }), upsertIncident);

router.get('/maintenance/search', requirePermissions(PERMISSIONS.platform.viewIncidents), validate({ query: maintenanceSearchQuerySchema }), searchMaintenance);
router.post('/maintenance', requirePermissions(PERMISSIONS.platform.manageIncidents), validate({ body: maintenanceUpsertSchema }), upsertMaintenance);

router.get('/backups/search', requirePermissions(PERMISSIONS.platform.viewBackups), validate({ query: backupJobSearchQuerySchema }), searchBackupJobs);
router.post('/backups', requirePermissions(PERMISSIONS.platform.manageBackups), validate({ body: backupJobCreateSchema }), createBackupJob);

router.get('/webhooks/search', requirePermissions(PERMISSIONS.platform.viewWebhooks), validate({ query: webhookLogSearchQuerySchema }), searchWebhookLogs);

router.get('/health/tenants/search', requirePermissions(PERMISSIONS.platform.viewHealth), validate({ query: healthSnapshotSearchQuerySchema }), searchTenantHealth);
router.post('/health/tenants', requirePermissions(PERMISSIONS.platform.manageHealth), validate({ body: healthSnapshotUpsertSchema }), upsertTenantHealth);

router.get('/tickets/search', requirePermissions(PERMISSIONS.platform.viewTickets), validate({ query: supportTicketSearchQuerySchema }), searchSupportTickets);
router.post('/tickets', requirePermissions(PERMISSIONS.platform.manageTickets), validate({ body: supportTicketUpsertSchema }), upsertSupportTicket);
router.post('/tickets/comments', requirePermissions(PERMISSIONS.platform.manageTickets), validate({ body: supportCommentCreateSchema }), createSupportComment);

router.get('/messages/search', requirePermissions(PERMISSIONS.platform.viewMessaging), validate({ query: globalMessageSearchQuerySchema }), searchGlobalMessages);
router.post('/messages', requirePermissions(PERMISSIONS.platform.manageMessaging), validate({ body: globalMessageUpsertSchema }), upsertGlobalMessage);

router.get('/patches/search', requirePermissions(PERMISSIONS.platform.viewPatches), validate({ query: patchSearchQuerySchema }), searchPatches);
router.post('/patches', requirePermissions(PERMISSIONS.platform.managePatches), validate({ body: patchUpsertSchema }), upsertPatch);

router.get('/queues/jobs/search', requirePermissions(PERMISSIONS.platform.viewQueueOps), validate({ query: queueJobSearchQuerySchema }), searchQueueJobs);
router.post('/queues/jobs/:id/retry', requirePermissions(PERMISSIONS.platform.manageQueueOps), validate({ params: idParamSchema }), retryQueueJob);

router.post('/bootstrap/seed-access', requirePermissions(PERMISSIONS.platform.manageUsers), seedPlatformAccessControl);

router.post('/onboarding/provision', requirePermissions(PERMISSIONS.platform.manageTenantLifecycle), validate({ body: onboardingProvisionSchema }), provisionTenantOnboarding);

router.post('/billing/webhooks/process', requirePermissions(PERMISSIONS.platform.manageBilling), validate({ body: billingWebhookProcessSchema }), processBillingWebhook);

router.get('/entitlements/evaluate', requirePermissions(PERMISSIONS.platform.viewBilling), validate({ query: entitlementEvaluationQuerySchema }), evaluateTenantEntitlement);

router.post('/impersonations/:id/activate', requirePermissions(PERMISSIONS.platform.manageImpersonation), validate({ params: idParamSchema, body: impersonationActivateSchema }), activateImpersonationSession);
router.post('/impersonations/expire-stale', requirePermissions(PERMISSIONS.platform.manageImpersonation), expireStaleImpersonations);

router.get('/maintenance/active', requirePermissions(PERMISSIONS.platform.viewIncidents), validate({ query: activeMaintenanceQuerySchema }), getActiveMaintenancePolicies);

router.get('/messages/active', requirePermissions(PERMISSIONS.platform.viewMessaging), validate({ query: activeBroadcastQuerySchema }), getActivePlatformBroadcasts);

router.post('/health/recompute', requirePermissions(PERMISSIONS.platform.manageHealth), validate({ body: healthRecomputeSchema }), recomputeTenantHealthScores);

export default router;