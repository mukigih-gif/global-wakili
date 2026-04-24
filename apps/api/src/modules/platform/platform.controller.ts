// apps/api/src/modules/platform/platform.controller.ts

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { PlatformAuditService } from './PlatformAuditService';
import { PlatformBackupService } from './PlatformBackupService';
import { PlatformCapabilityService } from './PlatformCapabilityService';
import { PlatformFeatureFlagService } from './PlatformFeatureFlagService';
import { PlatformGlobalSettingsService } from './PlatformGlobalSettingsService';
import { PlatformHealthService } from './PlatformHealthService';
import { PlatformImpersonationService } from './PlatformImpersonationService';
import { PlatformIncidentService } from './PlatformIncidentService';
import { PlatformMessagingService } from './PlatformMessagingService';
import { PlatformMonitoringService } from './PlatformMonitoringService';
import { PlatformPatchService } from './PlatformPatchService';
import { PlatformQueueOpsService } from './PlatformQueueOpsService';
import { PlatformRBACService } from './PlatformRBACService';
import { PlatformSubscriptionService } from './PlatformSubscriptionService';
import { PlatformTenantLifecycleService } from './PlatformTenantLifecycleService';
import { PlatformTicketingService } from './PlatformTicketingService';
import { PlatformQuotaService } from './PlatformQuotaService';
import { PlatformSeedService } from './PlatformSeedService';
import { PlatformEntitlementGuardService } from './PlatformEntitlementGuardService';
import { PlatformOnboardingService } from './PlatformOnboardingService';
import { PlatformBillingWebhookService } from './PlatformBillingWebhookService';
import { PlatformImpersonationGuardService } from './PlatformImpersonationGuardService';
import { PlatformMaintenancePolicyService } from './PlatformMaintenancePolicyService';
import { PlatformBannerService } from './PlatformBannerService';
import { PlatformHealthScoringService } from './PlatformHealthScoringService';

function actorUserId(req: Request): string {
  const id = req.user?.sub;
  if (!id?.trim()) {
    throw Object.assign(new Error('Authenticated platform actor is required'), {
      statusCode: 401,
      code: 'PLATFORM_ACTOR_REQUIRED',
    });
  }
  return id;
}

async function audit(
  req: Request,
  action: Parameters<typeof PlatformAuditService.logAction>[1]['action'],
  params?: { entityType?: string; entityId?: string | null; metadata?: Record<string, unknown> },
) {
  await PlatformAuditService.logAction(req.db, {
    actorUserId: req.user?.sub ?? null,
    action,
    entityType: params?.entityType ?? 'PLATFORM',
    entityId: params?.entityId ?? null,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
    metadata: params?.metadata ?? {},
  });
}

export const getPlatformHealth = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    module: 'platform',
    status: 'mounted',
    service: 'global-wakili-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

export const seedPlatformAccessControl = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformSeedService.seedAccessControl(req.db);
  await audit(req, 'PLATFORM_PERMISSIONS_VIEWED', { metadata: result });
  res.status(200).json(result);
});

export const provisionTenantOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformOnboardingService.provisionTenant(req.db, req.body);
  await audit(req, 'TENANT_PROFILE_UPSERTED', {
    entityType: 'PLATFORM_TENANT_PROFILE',
    entityId: result.profile.id,
    metadata: { tenantId: result.tenantId, onboarding: true },
  });
  res.status(200).json(result);
});

export const processBillingWebhook = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformBillingWebhookService.processWebhook(req.db, req.body);
  await audit(req, 'SUBSCRIPTION_UPSERTED', {
    entityType: 'TENANT_SUBSCRIPTION',
    entityId: result.subscription.id,
    metadata: { tenantId: result.subscription.tenantId, webhookLogId: result.webhookLogId },
  });
  res.status(200).json(result);
});

export const evaluateTenantEntitlement = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformEntitlementGuardService.evaluateModuleAccess(req.db, {
    tenantId: String(req.query.tenantId),
    moduleKey: String(req.query.moduleKey),
  });
  await audit(req, 'ENTITLEMENTS_SEARCHED', {
    metadata: { tenantId: result.tenantId, moduleKey: result.moduleKey, allowed: result.allowed, readOnly: result.readOnly },
  });
  res.status(200).json(result);
});

export const activateImpersonationSession = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformImpersonationGuardService.activateApprovedSession(req.db, {
    id: req.params.id,
    actorUserId: actorUserId(req),
    metadata: req.body.metadata,
  });
  await audit(req, 'IMPERSONATION_APPROVED', {
    entityType: 'PLATFORM_IMPERSONATION_SESSION',
    entityId: result.id,
    metadata: { activated: true },
  });
  res.status(200).json(result);
});

export const expireStaleImpersonations = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformImpersonationGuardService.expireStaleSessions(req.db);
  await audit(req, 'IMPERSONATIONS_SEARCHED', { metadata: result });
  res.status(200).json(result);
});

export const getActiveMaintenancePolicies = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformMaintenancePolicyService.getActivePolicies(req.db, {
    tenantId: req.query.tenantId ? String(req.query.tenantId) : null,
    moduleKey: req.query.moduleKey ? String(req.query.moduleKey) : null,
  });
  await audit(req, 'MAINTENANCE_SEARCHED', { metadata: { total: result.active.length, readOnlyRequired: result.readOnlyRequired } });
  res.status(200).json(result);
});

export const getActivePlatformBroadcasts = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformBannerService.getActiveBroadcasts(req.db, {
    tenantId: req.query.tenantId ? String(req.query.tenantId) : null,
    plan: req.query.plan ? String(req.query.plan) : null,
    roleKey: req.query.roleKey ? String(req.query.roleKey) : null,
    moduleKey: req.query.moduleKey ? String(req.query.moduleKey) : null,
  });
  await audit(req, 'GLOBAL_MESSAGES_SEARCHED', {
    metadata: {
      activeMessages: result.activeMessages.length,
      activeMaintenance: result.activeMaintenance.length,
      readOnlyRequired: result.readOnlyRequired,
    },
  });
  res.status(200).json(result);
});

export const recomputeTenantHealthScores = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.body.tenantId ? String(req.body.tenantId) : null;

  const result = tenantId
    ? await PlatformHealthScoringService.recomputeTenantHealth(req.db, { tenantId })
    : await PlatformHealthScoringService.recomputeAllTenantHealth(req.db);

  await audit(req, 'TENANT_HEALTH_UPSERTED', {
    metadata: {
      recomputed: tenantId ? 1 : (result as any).evaluated ?? 1,
      tenantId,
    },
  });

  res.status(200).json(result);
});

export const getPlatformOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformMonitoringService.getOverview(req.db);
  await audit(req, 'OVERVIEW_VIEWED', { metadata: result.summary });
  res.status(200).json(result);
});

export const getPlatformCapabilities = asyncHandler(async (req: Request, res: Response) => {
  const result = PlatformCapabilityService.getSummary();
  await audit(req, 'CAPABILITY_VIEWED', { metadata: { active: result.active, pending: result.pending } });
  res.status(200).json(result);
});

export const upsertPlatformUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformRBACService.upsertPlatformUser(req.db, req.body);
  await audit(req, 'PLATFORM_USER_UPSERTED', { entityType: 'PLATFORM_USER', entityId: result.id });
  res.status(200).json(result);
});

export const searchPlatformUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformRBACService.searchPlatformUsers(req.db, req.query);
  await audit(req, 'PLATFORM_USERS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const assignPlatformRole = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformRBACService.assignRole(req.db, {
    platformUserId: req.body.platformUserId,
    roleKey: req.body.roleKey,
  });
  await audit(req, 'PLATFORM_ROLE_ASSIGNED', { entityType: 'PLATFORM_USER_ROLE', entityId: result.id });
  res.status(200).json(result);
});

export const listPlatformRoles = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformRBACService.listRoles(req.db);
  await audit(req, 'PLATFORM_ROLES_VIEWED', { metadata: { total: result.length } });
  res.status(200).json({ data: result });
});

export const listPlatformPermissions = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformRBACService.listPermissions(req.db);
  await audit(req, 'PLATFORM_PERMISSIONS_VIEWED', { metadata: { total: result.length } });
  res.status(200).json({ data: result });
});

export const upsertTenantProfile = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformTenantLifecycleService.upsertTenantProfile(req.db, req.body);
  await audit(req, 'TENANT_PROFILE_UPSERTED', { entityType: 'PLATFORM_TENANT_PROFILE', entityId: result.id, metadata: { tenantId: result.tenantId } });
  res.status(200).json(result);
});

export const searchTenantProfiles = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformTenantLifecycleService.searchTenantProfiles(req.db, req.query);
  await audit(req, 'TENANT_PROFILES_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const upsertSubscription = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformSubscriptionService.upsertSubscription(req.db, req.body);
  await audit(req, 'SUBSCRIPTION_UPSERTED', { entityType: 'TENANT_SUBSCRIPTION', entityId: result.id, metadata: { tenantId: result.tenantId } });
  res.status(200).json(result);
});

export const searchSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformSubscriptionService.searchSubscriptions(req.db, req.query);
  await audit(req, 'SUBSCRIPTIONS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const upsertEntitlement = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformSubscriptionService.upsertEntitlement(req.db, req.body);
  await audit(req, 'ENTITLEMENT_UPSERTED', { entityType: 'TENANT_MODULE_ENTITLEMENT', entityId: result.id, metadata: { tenantId: result.tenantId, moduleKey: result.moduleKey } });
  res.status(200).json(result);
});

export const searchEntitlements = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformSubscriptionService.searchEntitlements(req.db, req.query);
  await audit(req, 'ENTITLEMENTS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const upsertQuotaPolicy = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformQuotaService.upsertQuotaPolicy(req.db, req.body);
  await audit(req, 'QUOTA_POLICY_UPSERTED', { entityType: 'TENANT_QUOTA_POLICY', entityId: result.id });
  res.status(200).json(result);
});

export const searchQuotaPolicies = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformQuotaService.searchQuotaPolicies(req.db, req.query);
  await audit(req, 'QUOTA_POLICIES_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const upsertUsageMetric = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformQuotaService.upsertUsageMetric(req.db, req.body);
  await audit(req, 'USAGE_METRIC_UPSERTED', { entityType: 'TENANT_USAGE_METRIC', entityId: result.id });
  res.status(200).json(result);
});

export const searchUsageMetrics = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformQuotaService.searchUsageMetrics(req.db, req.query);
  await audit(req, 'USAGE_METRICS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const upsertFeatureFlag = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformFeatureFlagService.upsertFlag(req.db, req.body);
  await audit(req, 'FEATURE_FLAG_UPSERTED', { entityType: 'PLATFORM_FEATURE_FLAG', entityId: result.id, metadata: { key: result.key } });
  res.status(200).json(result);
});

export const searchFeatureFlags = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformFeatureFlagService.searchFlags(req.db, req.query);
  await audit(req, 'FEATURE_FLAGS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const upsertGlobalSetting = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformGlobalSettingsService.upsertSetting(req.db, req.body);
  await audit(req, 'GLOBAL_SETTING_UPSERTED', { entityType: 'PLATFORM_GLOBAL_SETTING', entityId: result.id, metadata: { key: result.key } });
  res.status(200).json(result);
});

export const searchGlobalSettings = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformGlobalSettingsService.searchSettings(req.db, req.query);
  await audit(req, 'GLOBAL_SETTINGS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const publishConfigVersion = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformGlobalSettingsService.publishConfigVersion(req.db, req.body);
  await audit(req, 'CONFIG_VERSION_PUBLISHED', { entityType: 'PLATFORM_CONFIG_VERSION', entityId: result.id, metadata: { subjectKey: result.subjectKey, version: result.version } });
  res.status(200).json(result);
});

export const searchConfigVersions = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformGlobalSettingsService.searchConfigVersions(req.db, req.query);
  await audit(req, 'CONFIG_VERSIONS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const requestImpersonation = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformImpersonationService.requestSession(req.db, req.body, actorUserId(req));
  await audit(req, 'IMPERSONATION_REQUESTED', { entityType: 'PLATFORM_IMPERSONATION_SESSION', entityId: result.id, metadata: { tenantId: result.tenantId, targetUserId: result.targetUserId } });
  res.status(201).json(result);
});

export const approveOrRevokeImpersonation = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformImpersonationService.approveOrRevoke(req.db, req.params.id, req.body, actorUserId(req));
  await audit(req, req.body.status === 'APPROVED' ? 'IMPERSONATION_APPROVED' : 'IMPERSONATION_REVOKED', { entityType: 'PLATFORM_IMPERSONATION_SESSION', entityId: result.id });
  res.status(200).json(result);
});

export const searchImpersonations = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformImpersonationService.searchSessions(req.db, req.query);
  await audit(req, 'IMPERSONATIONS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const upsertIncident = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformIncidentService.upsertIncident(req.db, req.body);
  await audit(req, 'INCIDENT_UPSERTED', { entityType: 'PLATFORM_INCIDENT', entityId: result.id });
  res.status(200).json(result);
});

export const searchIncidents = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformIncidentService.searchIncidents(req.db, req.query);
  await audit(req, 'INCIDENTS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const upsertMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformIncidentService.upsertMaintenanceWindow(req.db, req.body);
  await audit(req, 'MAINTENANCE_UPSERTED', { entityType: 'PLATFORM_MAINTENANCE_WINDOW', entityId: result.id });
  res.status(200).json(result);
});

export const searchMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformIncidentService.searchMaintenanceWindows(req.db, req.query);
  await audit(req, 'MAINTENANCE_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const createBackupJob = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformBackupService.createBackupJob(req.db, req.body, actorUserId(req));
  await audit(req, 'BACKUP_JOB_CREATED', { entityType: 'PLATFORM_BACKUP_JOB', entityId: result.id });
  res.status(201).json(result);
});

export const searchBackupJobs = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformBackupService.searchBackupJobs(req.db, req.query);
  await audit(req, 'BACKUP_JOBS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const searchWebhookLogs = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformMonitoringService.searchWebhookLogs(req.db, req.query);
  await audit(req, 'WEBHOOK_LOGS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const upsertTenantHealth = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformHealthService.upsertTenantHealth(req.db, req.body);
  await audit(req, 'TENANT_HEALTH_UPSERTED', { entityType: 'TENANT_HEALTH_SNAPSHOT', entityId: result.id, metadata: { tenantId: result.tenantId } });
  res.status(200).json(result);
});

export const searchTenantHealth = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformHealthService.searchTenantHealth(req.db, req.query);
  await audit(req, 'TENANT_HEALTH_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const upsertSupportTicket = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformTicketingService.upsertTicket(req.db, req.body);
  await audit(req, 'SUPPORT_TICKET_UPSERTED', { entityType: 'PLATFORM_SUPPORT_TICKET', entityId: result.id });
  res.status(200).json(result);
});

export const searchSupportTickets = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformTicketingService.searchTickets(req.db, req.query);
  await audit(req, 'SUPPORT_TICKETS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const createSupportComment = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformTicketingService.addComment(req.db, req.body);
  await audit(req, 'SUPPORT_COMMENT_CREATED', { entityType: 'PLATFORM_SUPPORT_TICKET_COMMENT', entityId: result.id });
  res.status(201).json(result);
});

export const upsertGlobalMessage = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformMessagingService.upsertMessage(req.db, req.body);
  await audit(req, 'GLOBAL_MESSAGE_UPSERTED', { entityType: 'PLATFORM_GLOBAL_MESSAGE', entityId: result.id });
  res.status(200).json(result);
});

export const searchGlobalMessages = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformMessagingService.searchMessages(req.db, req.query);
  await audit(req, 'GLOBAL_MESSAGES_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const upsertPatch = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformPatchService.upsertPatch(req.db, req.body);
  await audit(req, 'PATCH_UPSERTED', { entityType: 'PLATFORM_PATCH_DEPLOYMENT', entityId: result.id, metadata: { patchKey: result.patchKey, version: result.version } });
  res.status(200).json(result);
});

export const searchPatches = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformPatchService.searchPatches(req.db, req.query);
  await audit(req, 'PATCHES_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const searchQueueJobs = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformQueueOpsService.searchJobs(req.db, req.query);
  await audit(req, 'QUEUE_JOBS_SEARCHED', { metadata: { total: result.meta.total } });
  res.status(200).json(result);
});

export const retryQueueJob = asyncHandler(async (req: Request, res: Response) => {
  const result = await PlatformQueueOpsService.retryJob(req.db, req.params.id);
  await audit(req, 'QUEUE_JOB_RETRIED', { entityType: 'EXTERNAL_JOB_QUEUE', entityId: result.id });
  res.status(200).json(result);
});