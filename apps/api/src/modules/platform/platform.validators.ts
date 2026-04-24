// apps/api/src/modules/platform/platform.validators.ts

import { z } from 'zod';
import {
  BACKUP_STATUSES,
  BILLING_PLANS,
  FEATURE_FLAG_SCOPES,
  GLOBAL_MESSAGE_AUDIENCES,
  GLOBAL_MESSAGE_STATUSES,
  GLOBAL_SETTING_SCOPES,
  IMPERSONATION_STATUSES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  MAINTENANCE_STATUSES,
  PATCH_DEPLOYMENT_STATUSES,
  PATCH_SEVERITIES,
  PLATFORM_ACCESS_MODES,
  PLATFORM_ADMIN_ROLES,
  PLATFORM_CONFIG_STATUSES,
  PLATFORM_TARGET_SCOPES,
  PLATFORM_USER_STATUSES,
  PLATFORM_WEBHOOK_DIRECTIONS,
  PLATFORM_WEBHOOK_STATUSES,
  QUOTA_ENFORCEMENT_MODES,
  SCHEDULE_FREQUENCIES,
  SUBSCRIPTION_STATUSES,
  SUPPORT_COMMENT_VISIBILITIES,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  TENANT_HEALTH_STATUSES,
  TENANT_LIFECYCLE_STATUSES,
  USAGE_METRIC_TYPES,
} from './platform.types';

const safeJsonObject = z.record(z.string(), z.unknown());
const isoDateTime = z.string().datetime();

function nullableDateField() {
  return z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') return null;
      if (value instanceof Date) return value;
      return new Date(String(value));
    }, z.date().nullable())
    .optional();
}

const pageLimitQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const idParamSchema = z.object({ id: z.string().trim().min(1) }).strict();

export const platformUserStatusSchema = z.enum(PLATFORM_USER_STATUSES);
export const platformRoleSchema = z.enum(PLATFORM_ADMIN_ROLES);
export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);
export const billingPlanSchema = z.enum(BILLING_PLANS);
export const usageMetricTypeSchema = z.enum(USAGE_METRIC_TYPES);
export const quotaEnforcementModeSchema = z.enum(QUOTA_ENFORCEMENT_MODES);
export const featureFlagScopeSchema = z.enum(FEATURE_FLAG_SCOPES);
export const globalSettingScopeSchema = z.enum(GLOBAL_SETTING_SCOPES);
export const platformConfigStatusSchema = z.enum(PLATFORM_CONFIG_STATUSES);
export const platformAccessModeSchema = z.enum(PLATFORM_ACCESS_MODES);
export const platformTargetScopeSchema = z.enum(PLATFORM_TARGET_SCOPES);
export const impersonationStatusSchema = z.enum(IMPERSONATION_STATUSES);
export const incidentSeveritySchema = z.enum(INCIDENT_SEVERITIES);
export const incidentStatusSchema = z.enum(INCIDENT_STATUSES);
export const maintenanceStatusSchema = z.enum(MAINTENANCE_STATUSES);
export const backupStatusSchema = z.enum(BACKUP_STATUSES);
export const tenantLifecycleStatusSchema = z.enum(TENANT_LIFECYCLE_STATUSES);
export const tenantHealthStatusSchema = z.enum(TENANT_HEALTH_STATUSES);
export const supportTicketStatusSchema = z.enum(SUPPORT_TICKET_STATUSES);
export const supportTicketPrioritySchema = z.enum(SUPPORT_TICKET_PRIORITIES);
export const supportTicketCategorySchema = z.enum(SUPPORT_TICKET_CATEGORIES);
export const supportCommentVisibilitySchema = z.enum(SUPPORT_COMMENT_VISIBILITIES);
export const globalMessageStatusSchema = z.enum(GLOBAL_MESSAGE_STATUSES);
export const globalMessageAudienceSchema = z.enum(GLOBAL_MESSAGE_AUDIENCES);
export const patchDeploymentStatusSchema = z.enum(PATCH_DEPLOYMENT_STATUSES);
export const patchSeveritySchema = z.enum(PATCH_SEVERITIES);
export const platformWebhookDirectionSchema = z.enum(PLATFORM_WEBHOOK_DIRECTIONS);
export const platformWebhookStatusSchema = z.enum(PLATFORM_WEBHOOK_STATUSES);
export const scheduleFrequencySchema = z.enum(SCHEDULE_FREQUENCIES);

export const platformUserUpsertSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1).max(255),
  status: platformUserStatusSchema.optional(),
  mfaEnforced: z.boolean().optional(),
  isReadOnlySupportOnly: z.boolean().optional(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const platformUserSearchQuerySchema = pageLimitQuery.extend({
  email: z.string().trim().max(255).optional(),
  name: z.string().trim().max(255).optional(),
  status: platformUserStatusSchema.optional(),
}).strict();

// Platform 1C validators

export const onboardingProvisionSchema = z.object({
  tenantId: z.string().trim().min(1),
  initialAdminEmail: z.string().trim().email(),
  environmentKey: z.string().trim().max(255).nullable().optional(),
  plan: billingPlanSchema,
  billingEmail: z.string().trim().email().nullable().optional(),
  activateNow: z.boolean().optional(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const billingWebhookProcessSchema = z.object({
  tenantId: z.string().trim().min(1),
  provider: z.string().trim().min(1).max(100),
  eventType: z.string().trim().min(1).max(150),
  providerStatus: z.string().trim().max(100).nullable().optional(),
  providerCustomerRef: z.string().trim().max(255).nullable().optional(),
  providerSubscriptionRef: z.string().trim().max(255).nullable().optional(),
  plan: billingPlanSchema.nullable().optional(),
  currency: z.string().trim().max(20).nullable().optional(),
  billingEmail: z.string().trim().email().nullable().optional(),
  payload: safeJsonObject.nullable().optional(),
  signatureVerified: z.boolean().optional(),
  responseCode: z.coerce.number().int().nullable().optional(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const entitlementEvaluationQuerySchema = z.object({
  tenantId: z.string().trim().min(1),
  moduleKey: z.string().trim().min(1).max(150),
}).strict();

export const impersonationActivateSchema = z.object({
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const activeMaintenanceQuerySchema = z.object({
  tenantId: z.string().trim().max(150).optional(),
  moduleKey: z.string().trim().max(150).optional(),
}).strict();

export const activeBroadcastQuerySchema = z.object({
  tenantId: z.string().trim().max(150).optional(),
  plan: billingPlanSchema.optional(),
  roleKey: z.string().trim().max(100).optional(),
  moduleKey: z.string().trim().max(150).optional(),
}).strict();

export const healthRecomputeSchema = z.object({
  tenantId: z.string().trim().max(150).nullable().optional(),
}).strict();

export const platformRoleAssignmentSchema = z.object({
  platformUserId: z.string().trim().min(1),
  roleKey: platformRoleSchema,
  assignedByPlatformUserId: z.string().trim().max(150).nullable().optional(),
}).strict();

export const tenantProfileUpsertSchema = z.object({
  tenantId: z.string().trim().min(1),
  lifecycleStatus: tenantLifecycleStatusSchema,
  environmentKey: z.string().trim().max(255).nullable().optional(),
  initialAdminEmail: z.string().trim().email().nullable().optional(),
  readOnlyMode: z.boolean().optional(),
  suspensionReason: z.string().trim().max(5000).nullable().optional(),
  provisionedAt: nullableDateField(),
  activatedAt: nullableDateField(),
  suspendedAt: nullableDateField(),
  terminatedAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const tenantProfileSearchQuerySchema = pageLimitQuery.extend({
  tenantId: z.string().trim().max(150).optional(),
  status: tenantLifecycleStatusSchema.optional(),
}).strict();

export const subscriptionUpsertSchema = z.object({
  tenantId: z.string().trim().min(1),
  plan: billingPlanSchema,
  status: subscriptionStatusSchema,
  provider: z.string().trim().max(100).nullable().optional(),
  providerCustomerRef: z.string().trim().max(255).nullable().optional(),
  providerSubscriptionRef: z.string().trim().max(255).nullable().optional(),
  currency: z.string().trim().max(20).nullable().optional(),
  billingEmail: z.string().trim().email().nullable().optional(),
  seatLimit: z.coerce.number().int().min(0).nullable().optional(),
  seatsAllocated: z.coerce.number().int().min(0).optional(),
  graceEndsAt: nullableDateField(),
  trialEndsAt: nullableDateField(),
  currentPeriodStart: nullableDateField(),
  currentPeriodEnd: nullableDateField(),
  suspendedAt: nullableDateField(),
  cancelledAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const subscriptionSearchQuerySchema = pageLimitQuery.extend({
  tenantId: z.string().trim().max(150).optional(),
  plan: billingPlanSchema.optional(),
  status: subscriptionStatusSchema.optional(),
}).strict();

export const entitlementUpsertSchema = z.object({
  tenantId: z.string().trim().min(1),
  moduleKey: z.string().trim().min(1).max(150),
  isEnabled: z.boolean().optional(),
  planSource: billingPlanSchema.nullable().optional(),
  seatLimit: z.coerce.number().int().min(0).nullable().optional(),
  usageLimit: z.coerce.number().nonnegative().nullable().optional(),
  effectiveAt: nullableDateField(),
  expiresAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const entitlementSearchQuerySchema = pageLimitQuery.extend({
  tenantId: z.string().trim().max(150).optional(),
  moduleKey: z.string().trim().max(150).optional(),
  isEnabled: z.coerce.boolean().optional(),
}).strict();

export const quotaPolicyUpsertSchema = z.object({
  tenantId: z.string().trim().min(1),
  metricType: usageMetricTypeSchema,
  softLimit: z.coerce.number().nonnegative().nullable().optional(),
  hardLimit: z.coerce.number().nonnegative().nullable().optional(),
  enforcementMode: quotaEnforcementModeSchema,
  warningThresholdPercent: z.coerce.number().int().min(1).max(100).optional(),
  resetFrequency: scheduleFrequencySchema.nullable().optional(),
  effectiveAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const quotaPolicySearchQuerySchema = pageLimitQuery.extend({
  tenantId: z.string().trim().max(150).optional(),
  metricType: usageMetricTypeSchema.optional(),
  enforcementMode: quotaEnforcementModeSchema.optional(),
}).strict();

export const usageMetricUpsertSchema = z.object({
  tenantId: z.string().trim().min(1),
  metricType: usageMetricTypeSchema,
  periodStart: nullableDateField(),
  periodEnd: nullableDateField(),
  currentValue: z.coerce.number().nonnegative(),
  peakValue: z.coerce.number().nonnegative().nullable().optional(),
  unit: z.string().trim().max(50).nullable().optional(),
  lastRecordedAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const usageMetricSearchQuerySchema = pageLimitQuery.extend({
  tenantId: z.string().trim().max(150).optional(),
  metricType: usageMetricTypeSchema.optional(),
  createdFrom: isoDateTime.optional(),
  createdTo: isoDateTime.optional(),
}).strict();

export const featureFlagUpsertSchema = z.object({
  key: z.string().trim().min(1).max(150),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable().optional(),
  scope: featureFlagScopeSchema,
  targetPlan: billingPlanSchema.nullable().optional(),
  targetTenantId: z.string().trim().max(150).nullable().optional(),
  targetModuleKey: z.string().trim().max(150).nullable().optional(),
  isEnabled: z.boolean().optional(),
  rolloutPercentage: z.coerce.number().int().min(0).max(100).nullable().optional(),
  rolloutRing: z.string().trim().max(100).nullable().optional(),
  config: safeJsonObject.nullable().optional(),
  startsAt: nullableDateField(),
  endsAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const featureFlagSearchQuerySchema = pageLimitQuery.extend({
  key: z.string().trim().max(150).optional(),
  scope: featureFlagScopeSchema.optional(),
  tenantId: z.string().trim().max(150).optional(),
  moduleKey: z.string().trim().max(150).optional(),
  isEnabled: z.coerce.boolean().optional(),
}).strict();

export const globalSettingUpsertSchema = z.object({
  key: z.string().trim().min(1).max(150),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable().optional(),
  scope: globalSettingScopeSchema,
  targetPlan: billingPlanSchema.nullable().optional(),
  targetTenantId: z.string().trim().max(150).nullable().optional(),
  targetModuleKey: z.string().trim().max(150).nullable().optional(),
  dataType: z.string().trim().max(100).nullable().optional(),
  isEncrypted: z.boolean().optional(),
  currentValue: safeJsonObject.nullable().optional(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const globalSettingSearchQuerySchema = pageLimitQuery.extend({
  key: z.string().trim().max(150).optional(),
  scope: globalSettingScopeSchema.optional(),
  tenantId: z.string().trim().max(150).optional(),
  moduleKey: z.string().trim().max(150).optional(),
}).strict();

export const configVersionPublishSchema = z.object({
  platformGlobalSettingId: z.string().trim().max(150).nullable().optional(),
  subjectKey: z.string().trim().min(1).max(150),
  scope: globalSettingScopeSchema,
  targetPlan: billingPlanSchema.nullable().optional(),
  targetTenantId: z.string().trim().max(150).nullable().optional(),
  targetModuleKey: z.string().trim().max(150).nullable().optional(),
  version: z.coerce.number().int().min(1),
  status: platformConfigStatusSchema,
  payload: safeJsonObject,
  changeSummary: z.string().trim().max(5000).nullable().optional(),
  reviewRequired: z.boolean().optional(),
  effectiveFrom: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const configVersionSearchQuerySchema = pageLimitQuery.extend({
  subjectKey: z.string().trim().max(150).optional(),
  status: platformConfigStatusSchema.optional(),
  tenantId: z.string().trim().max(150).optional(),
  moduleKey: z.string().trim().max(150).optional(),
}).strict();

export const impersonationRequestSchema = z.object({
  tenantId: z.string().trim().min(1),
  targetUserId: z.string().trim().min(1),
  reason: z.string().trim().min(10).max(5000),
  accessMode: platformAccessModeSchema.optional(),
  consentRequired: z.boolean().optional(),
  expiresAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const impersonationApprovalSchema = z.object({
  approvedByPlatformUserId: z.string().trim().max(150).nullable().optional(),
  status: z.enum(['APPROVED', 'DENIED', 'REVOKED']),
  consentGrantedAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const impersonationSearchQuerySchema = pageLimitQuery.extend({
  tenantId: z.string().trim().max(150).optional(),
  targetUserId: z.string().trim().max(150).optional(),
  status: impersonationStatusSchema.optional(),
}).strict();

export const incidentUpsertSchema = z.object({
  id: z.string().trim().max(150).nullable().optional(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable().optional(),
  severity: incidentSeveritySchema,
  status: incidentStatusSchema,
  scope: platformTargetScopeSchema,
  targetTenantId: z.string().trim().max(150).nullable().optional(),
  targetModuleKey: z.string().trim().max(150).nullable().optional(),
  ownerPlatformUserId: z.string().trim().max(150).nullable().optional(),
  detectedAt: nullableDateField(),
  acknowledgedAt: nullableDateField(),
  resolvedAt: nullableDateField(),
  closedAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const incidentSearchQuerySchema = pageLimitQuery.extend({
  severity: incidentSeveritySchema.optional(),
  status: incidentStatusSchema.optional(),
  tenantId: z.string().trim().max(150).optional(),
  moduleKey: z.string().trim().max(150).optional(),
}).strict();

export const maintenanceUpsertSchema = z.object({
  id: z.string().trim().max(150).nullable().optional(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable().optional(),
  status: maintenanceStatusSchema,
  scope: platformTargetScopeSchema,
  targetTenantId: z.string().trim().max(150).nullable().optional(),
  targetModuleKey: z.string().trim().max(150).nullable().optional(),
  startsAt: nullableDateField(),
  endsAt: nullableDateField(),
  isReadOnly: z.boolean().optional(),
  bannerMessage: z.string().trim().max(5000).nullable().optional(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const maintenanceSearchQuerySchema = pageLimitQuery.extend({
  status: maintenanceStatusSchema.optional(),
  tenantId: z.string().trim().max(150).optional(),
  moduleKey: z.string().trim().max(150).optional(),
}).strict();

export const backupJobCreateSchema = z.object({
  tenantId: z.string().trim().max(150).nullable().optional(),
  scope: platformTargetScopeSchema,
  targetModuleKey: z.string().trim().max(150).nullable().optional(),
  expiresAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const backupJobSearchQuerySchema = pageLimitQuery.extend({
  tenantId: z.string().trim().max(150).optional(),
  status: backupStatusSchema.optional(),
  moduleKey: z.string().trim().max(150).optional(),
}).strict();

export const webhookLogSearchQuerySchema = pageLimitQuery.extend({
  tenantId: z.string().trim().max(150).optional(),
  provider: z.string().trim().max(100).optional(),
  eventType: z.string().trim().max(150).optional(),
  direction: platformWebhookDirectionSchema.optional(),
  status: platformWebhookStatusSchema.optional(),
}).strict();

export const healthSnapshotUpsertSchema = z.object({
  tenantId: z.string().trim().min(1),
  status: tenantHealthStatusSchema,
  healthScore: z.coerce.number().int().min(0).max(100),
  apiErrorRate: z.coerce.number().nonnegative().nullable().optional(),
  queueBacklog: z.coerce.number().int().min(0).optional(),
  storageUsagePercent: z.coerce.number().nonnegative().nullable().optional(),
  rateLimitEvents: z.coerce.number().int().min(0).optional(),
  failedWebhookCount: z.coerce.number().int().min(0).optional(),
  lastEvaluatedAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const healthSnapshotSearchQuerySchema = pageLimitQuery.extend({
  tenantId: z.string().trim().max(150).optional(),
  status: tenantHealthStatusSchema.optional(),
}).strict();

export const supportTicketUpsertSchema = z.object({
  id: z.string().trim().max(150).nullable().optional(),
  tenantId: z.string().trim().max(150).nullable().optional(),
  requestedByTenantUserId: z.string().trim().max(150).nullable().optional(),
  assignedPlatformUserId: z.string().trim().max(150).nullable().optional(),
  status: supportTicketStatusSchema.optional(),
  priority: supportTicketPrioritySchema.optional(),
  category: supportTicketCategorySchema,
  subject: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(10000),
  moduleKey: z.string().trim().max(150).nullable().optional(),
  relatedEntityType: z.string().trim().max(150).nullable().optional(),
  relatedEntityId: z.string().trim().max(150).nullable().optional(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const supportTicketSearchQuerySchema = pageLimitQuery.extend({
  tenantId: z.string().trim().max(150).optional(),
  status: supportTicketStatusSchema.optional(),
  priority: supportTicketPrioritySchema.optional(),
  category: supportTicketCategorySchema.optional(),
  assignedPlatformUserId: z.string().trim().max(150).optional(),
}).strict();

export const supportCommentCreateSchema = z.object({
  ticketId: z.string().trim().min(1),
  authorPlatformUserId: z.string().trim().max(150).nullable().optional(),
  authorTenantUserId: z.string().trim().max(150).nullable().optional(),
  visibility: supportCommentVisibilitySchema,
  body: z.string().trim().min(1).max(10000),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const globalMessageUpsertSchema = z.object({
  id: z.string().trim().max(150).nullable().optional(),
  title: z.string().trim().min(1).max(255),
  subject: z.string().trim().max(255).nullable().optional(),
  body: z.string().trim().min(1).max(10000),
  status: globalMessageStatusSchema.optional(),
  audience: globalMessageAudienceSchema,
  targetPlan: billingPlanSchema.nullable().optional(),
  targetTenantId: z.string().trim().max(150).nullable().optional(),
  targetRoleKey: z.string().trim().max(100).nullable().optional(),
  channels: z.array(z.string().trim().max(100)).nullable().optional(),
  startsAt: nullableDateField(),
  endsAt: nullableDateField(),
  sentAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const globalMessageSearchQuerySchema = pageLimitQuery.extend({
  status: globalMessageStatusSchema.optional(),
  audience: globalMessageAudienceSchema.optional(),
  tenantId: z.string().trim().max(150).optional(),
}).strict();

export const patchUpsertSchema = z.object({
  id: z.string().trim().max(150).nullable().optional(),
  patchKey: z.string().trim().min(1).max(150),
  version: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable().optional(),
  severity: patchSeveritySchema.optional(),
  status: patchDeploymentStatusSchema.optional(),
  scope: platformTargetScopeSchema,
  targetPlan: billingPlanSchema.nullable().optional(),
  targetTenantId: z.string().trim().max(150).nullable().optional(),
  targetModuleKey: z.string().trim().max(150).nullable().optional(),
  artifactRef: z.string().trim().max(500).nullable().optional(),
  checksum: z.string().trim().max(255).nullable().optional(),
  rollbackRef: z.string().trim().max(500).nullable().optional(),
  scheduledAt: nullableDateField(),
  startedAt: nullableDateField(),
  completedAt: nullableDateField(),
  rolledBackAt: nullableDateField(),
  metadata: safeJsonObject.nullable().optional(),
}).strict();

export const patchSearchQuerySchema = pageLimitQuery.extend({
  patchKey: z.string().trim().max(150).optional(),
  version: z.string().trim().max(100).optional(),
  status: patchDeploymentStatusSchema.optional(),
  severity: patchSeveritySchema.optional(),
  tenantId: z.string().trim().max(150).optional(),
  moduleKey: z.string().trim().max(150).optional(),
}).strict();

export const queueJobSearchQuerySchema = pageLimitQuery.extend({
  tenantId: z.string().trim().max(150).optional(),
  provider: z.string().trim().max(100).optional(),
  status: z.string().trim().max(100).optional(),
  entityType: z.string().trim().max(100).optional(),
  entityId: z.string().trim().max(150).optional(),
}).strict();