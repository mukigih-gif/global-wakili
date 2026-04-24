// apps/api/src/modules/platform/platform.types.ts

export const PLATFORM_ADMIN_ROLES = [
  'PLATFORM_OWNER',
  'DEVOPS_ADMIN',
  'FINANCIAL_ADMIN',
  'SUPPORT_AGENT',
  'SECURITY_ADMIN',
] as const;

export const PLATFORM_USER_STATUSES = [
  'INVITED',
  'ACTIVE',
  'SUSPENDED',
  'DISABLED',
] as const;

export const SUBSCRIPTION_STATUSES = [
  'TRIAL',
  'ACTIVE',
  'GRACE_PERIOD',
  'PAST_DUE',
  'SUSPENDED',
  'CANCELLED',
  'EXPIRED',
] as const;

export const BILLING_PLANS = ['BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM'] as const;

export const USAGE_METRIC_TYPES = [
  'DATABASE_STORAGE',
  'FILE_STORAGE',
  'API_REQUESTS',
  'ACTIVE_USERS',
  'DOCUMENT_STORAGE',
  'EMAIL_DELIVERIES',
  'SMS_DELIVERIES',
  'WEBHOOK_EVENTS',
  'QUEUE_JOBS',
  'PAYROLL_BATCHES',
] as const;

export const QUOTA_ENFORCEMENT_MODES = [
  'SOFT',
  'HARD',
  'READ_ONLY',
  'SUSPEND',
] as const;

export const FEATURE_FLAG_SCOPES = ['GLOBAL', 'PLAN', 'TENANT', 'MODULE'] as const;
export const GLOBAL_SETTING_SCOPES = ['GLOBAL', 'PLAN', 'TENANT', 'MODULE'] as const;
export const PLATFORM_CONFIG_STATUSES = ['DRAFT', 'REVIEWED', 'PUBLISHED', 'ROLLED_BACK', 'ARCHIVED'] as const;
export const PLATFORM_ACCESS_MODES = ['READ_ONLY', 'ELEVATED'] as const;
export const PLATFORM_TARGET_SCOPES = ['GLOBAL', 'PLAN', 'TENANT', 'MODULE'] as const;
export const IMPERSONATION_STATUSES = ['REQUESTED', 'APPROVED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'DENIED'] as const;
export const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const INCIDENT_STATUSES = ['OPEN', 'INVESTIGATING', 'MONITORING', 'RESOLVED', 'CLOSED'] as const;
export const MAINTENANCE_STATUSES = ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
export const BACKUP_STATUSES = ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED'] as const;
export const TENANT_LIFECYCLE_STATUSES = ['PROVISIONING', 'ACTIVE', 'SUSPENDED', 'READ_ONLY', 'TERMINATED', 'ARCHIVED'] as const;
export const TENANT_HEALTH_STATUSES = ['HEALTHY', 'DEGRADED', 'AT_RISK', 'CRITICAL'] as const;
export const SUPPORT_TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_TENANT', 'WAITING_ON_INTERNAL', 'ESCALATED', 'RESOLVED', 'CLOSED'] as const;
export const SUPPORT_TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'URGENT'] as const;
export const SUPPORT_TICKET_CATEGORIES = ['GENERAL', 'BILLING', 'TECHNICAL', 'SECURITY', 'DATA', 'INTEGRATION', 'PAYROLL', 'COMPLIANCE'] as const;
export const SUPPORT_COMMENT_VISIBILITIES = ['INTERNAL', 'TENANT_VISIBLE'] as const;
export const GLOBAL_MESSAGE_STATUSES = ['DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED', 'EXPIRED'] as const;
export const GLOBAL_MESSAGE_AUDIENCES = ['ALL_TENANTS', 'PLAN', 'TENANT', 'ROLE', 'PLATFORM_USERS'] as const;
export const PATCH_DEPLOYMENT_STATUSES = ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'ROLLED_BACK', 'CANCELLED'] as const;
export const PATCH_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const PLATFORM_WEBHOOK_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export const PLATFORM_WEBHOOK_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED', 'RETRYING'] as const;
export const SCHEDULE_FREQUENCIES = ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'] as const;

export type PlatformAdminRole = (typeof PLATFORM_ADMIN_ROLES)[number];
export type PlatformUserStatus = (typeof PLATFORM_USER_STATUSES)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type BillingPlan = (typeof BILLING_PLANS)[number];
export type UsageMetricType = (typeof USAGE_METRIC_TYPES)[number];
export type QuotaEnforcementMode = (typeof QUOTA_ENFORCEMENT_MODES)[number];
export type FeatureFlagScope = (typeof FEATURE_FLAG_SCOPES)[number];
export type GlobalSettingScope = (typeof GLOBAL_SETTING_SCOPES)[number];
export type PlatformConfigStatus = (typeof PLATFORM_CONFIG_STATUSES)[number];
export type PlatformAccessMode = (typeof PLATFORM_ACCESS_MODES)[number];
export type PlatformTargetScope = (typeof PLATFORM_TARGET_SCOPES)[number];
export type ImpersonationStatus = (typeof IMPERSONATION_STATUSES)[number];
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];
export type BackupStatus = (typeof BACKUP_STATUSES)[number];
export type TenantLifecycleStatus = (typeof TENANT_LIFECYCLE_STATUSES)[number];
export type TenantHealthStatus = (typeof TENANT_HEALTH_STATUSES)[number];
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];
export type SupportTicketPriority = (typeof SUPPORT_TICKET_PRIORITIES)[number];
export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];
export type SupportCommentVisibility = (typeof SUPPORT_COMMENT_VISIBILITIES)[number];
export type GlobalMessageStatus = (typeof GLOBAL_MESSAGE_STATUSES)[number];
export type GlobalMessageAudience = (typeof GLOBAL_MESSAGE_AUDIENCES)[number];
export type PatchDeploymentStatus = (typeof PATCH_DEPLOYMENT_STATUSES)[number];
export type PatchSeverity = (typeof PATCH_SEVERITIES)[number];
export type PlatformWebhookDirection = (typeof PLATFORM_WEBHOOK_DIRECTIONS)[number];
export type PlatformWebhookStatus = (typeof PLATFORM_WEBHOOK_STATUSES)[number];
export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];

export type PlatformAuditAction =
  | 'OVERVIEW_VIEWED'
  | 'CAPABILITY_VIEWED'
  | 'PLATFORM_USER_UPSERTED'
  | 'PLATFORM_USERS_SEARCHED'
  | 'PLATFORM_ROLE_ASSIGNED'
  | 'PLATFORM_ROLES_VIEWED'
  | 'PLATFORM_PERMISSIONS_VIEWED'
  | 'TENANT_PROFILE_UPSERTED'
  | 'TENANT_PROFILES_SEARCHED'
  | 'SUBSCRIPTION_UPSERTED'
  | 'SUBSCRIPTIONS_SEARCHED'
  | 'ENTITLEMENT_UPSERTED'
  | 'ENTITLEMENTS_SEARCHED'
  | 'QUOTA_POLICY_UPSERTED'
  | 'QUOTA_POLICIES_SEARCHED'
  | 'USAGE_METRIC_UPSERTED'
  | 'USAGE_METRICS_SEARCHED'
  | 'FEATURE_FLAG_UPSERTED'
  | 'FEATURE_FLAGS_SEARCHED'
  | 'GLOBAL_SETTING_UPSERTED'
  | 'GLOBAL_SETTINGS_SEARCHED'
  | 'CONFIG_VERSION_PUBLISHED'
  | 'CONFIG_VERSIONS_SEARCHED'
  | 'IMPERSONATION_REQUESTED'
  | 'IMPERSONATION_APPROVED'
  | 'IMPERSONATION_REVOKED'
  | 'IMPERSONATIONS_SEARCHED'
  | 'INCIDENT_UPSERTED'
  | 'INCIDENTS_SEARCHED'
  | 'MAINTENANCE_UPSERTED'
  | 'MAINTENANCE_SEARCHED'
  | 'BACKUP_JOB_CREATED'
  | 'BACKUP_JOBS_SEARCHED'
  | 'WEBHOOK_LOGS_SEARCHED'
  | 'TENANT_HEALTH_UPSERTED'
  | 'TENANT_HEALTH_SEARCHED'
  | 'SUPPORT_TICKET_UPSERTED'
  | 'SUPPORT_TICKETS_SEARCHED'
  | 'SUPPORT_COMMENT_CREATED'
  | 'GLOBAL_MESSAGE_UPSERTED'
  | 'GLOBAL_MESSAGES_SEARCHED'
  | 'PATCH_UPSERTED'
  | 'PATCHES_SEARCHED'
  | 'QUEUE_JOBS_SEARCHED'
  | 'QUEUE_JOB_RETRIED';

export type PlatformDbClient = {
  tenant: { findFirst: Function; findMany: Function; count: Function };
  user?: { findFirst: Function };
  platformUser: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformRole: { findFirst: Function; findMany: Function; count: Function };
  platformPermission: { findMany: Function; count: Function };
  platformUserRole: { findFirst: Function; findMany: Function; create: Function; count: Function };
  platformTenantProfile: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformPermission: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformRolePermission: { findFirst: Function; create: Function; count: Function };
  platformWebhookLog: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };  
  tenantSubscription: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  tenantQuotaPolicy: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  tenantUsageMetric: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  tenantModuleEntitlement: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformFeatureFlag: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformGlobalSetting: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformConfigVersion: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformImpersonationSession: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformIncident: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformMaintenanceWindow: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformBackupJob: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformWebhookLog: { findMany: Function; count: Function };
  tenantHealthSnapshot: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformSupportTicket: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformSupportTicketComment: { create: Function; findMany: Function; count: Function };
  platformGlobalMessage: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  platformPatchDeployment: { findFirst: Function; findMany: Function; create: Function; update: Function; count: Function };
  externalJobQueue: { findFirst: Function; findMany: Function; update: Function; count: Function };
  auditLog: { create: Function };
};

export type PlatformSearchFilters = {
  email?: string | null;
  name?: string | null;
  tenantId?: string | null;
  status?: string | null;
  roleKey?: PlatformAdminRole | null;
  plan?: BillingPlan | null;
  metricType?: UsageMetricType | null;
  scope?: PlatformTargetScope | FeatureFlagScope | GlobalSettingScope | null;
  moduleKey?: string | null;
  connector?: string | null;
  frequency?: ScheduleFrequency | null;
  category?: SupportTicketCategory | null;
  priority?: SupportTicketPriority | null;
  createdFrom?: Date | string | null;
  createdTo?: Date | string | null;
  isEnabled?: boolean | null;
  page?: number;
  limit?: number;
};