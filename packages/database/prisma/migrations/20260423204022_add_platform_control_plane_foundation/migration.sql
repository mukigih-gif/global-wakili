-- CreateEnum
CREATE TYPE "PlatformAdminRole" AS ENUM ('PLATFORM_OWNER', 'DEVOPS_ADMIN', 'FINANCIAL_ADMIN', 'SUPPORT_AGENT', 'SECURITY_ADMIN');

-- CreateEnum
CREATE TYPE "PlatformUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "BillingPlan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "UsageMetricType" AS ENUM ('DATABASE_STORAGE', 'FILE_STORAGE', 'API_REQUESTS', 'ACTIVE_USERS', 'DOCUMENT_STORAGE', 'EMAIL_DELIVERIES', 'SMS_DELIVERIES', 'WEBHOOK_EVENTS', 'QUEUE_JOBS', 'PAYROLL_BATCHES');

-- CreateEnum
CREATE TYPE "QuotaEnforcementMode" AS ENUM ('SOFT', 'HARD', 'READ_ONLY', 'SUSPEND');

-- CreateEnum
CREATE TYPE "FeatureFlagScope" AS ENUM ('GLOBAL', 'PLAN', 'TENANT', 'MODULE');

-- CreateEnum
CREATE TYPE "GlobalSettingScope" AS ENUM ('GLOBAL', 'PLAN', 'TENANT', 'MODULE');

-- CreateEnum
CREATE TYPE "PlatformConfigStatus" AS ENUM ('DRAFT', 'REVIEWED', 'PUBLISHED', 'ROLLED_BACK', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlatformAccessMode" AS ENUM ('READ_ONLY', 'ELEVATED');

-- CreateEnum
CREATE TYPE "PlatformTargetScope" AS ENUM ('GLOBAL', 'PLAN', 'TENANT', 'MODULE');

-- CreateEnum
CREATE TYPE "ImpersonationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'DENIED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'MONITORING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TenantLifecycleStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'READ_ONLY', 'TERMINATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TenantHealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'AT_RISK', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_TENANT', 'WAITING_ON_INTERNAL', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'URGENT');

-- CreateEnum
CREATE TYPE "SupportTicketCategory" AS ENUM ('GENERAL', 'BILLING', 'TECHNICAL', 'SECURITY', 'DATA', 'INTEGRATION', 'PAYROLL', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "SupportCommentVisibility" AS ENUM ('INTERNAL', 'TENANT_VISIBLE');

-- CreateEnum
CREATE TYPE "GlobalMessageStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GlobalMessageAudience" AS ENUM ('ALL_TENANTS', 'PLAN', 'TENANT', 'ROLE', 'PLATFORM_USERS');

-- CreateEnum
CREATE TYPE "PatchDeploymentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'ROLLED_BACK', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PatchSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PlatformWebhookDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "PlatformWebhookStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "PlatformUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "status" "PlatformUserStatus" NOT NULL DEFAULT 'INVITED',
    "mfaEnforced" BOOLEAN NOT NULL DEFAULT true,
    "isReadOnlySupportOnly" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRole" (
    "id" TEXT NOT NULL,
    "key" "PlatformAdminRole" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPermission" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformUserRole" (
    "id" TEXT NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedByPlatformUserId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformUserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformTenantProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lifecycleStatus" "TenantLifecycleStatus" NOT NULL DEFAULT 'PROVISIONING',
    "environmentKey" TEXT,
    "initialAdminEmail" TEXT,
    "readOnlyMode" BOOLEAN NOT NULL DEFAULT false,
    "suspensionReason" TEXT,
    "provisionedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformTenantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "BillingPlan" NOT NULL DEFAULT 'BASIC',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "provider" TEXT,
    "providerCustomerRef" TEXT,
    "providerSubscriptionRef" TEXT,
    "currency" TEXT,
    "billingEmail" TEXT,
    "seatLimit" INTEGER,
    "seatsAllocated" INTEGER NOT NULL DEFAULT 0,
    "graceEndsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantQuotaPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metricType" "UsageMetricType" NOT NULL,
    "softLimit" DECIMAL(18,2),
    "hardLimit" DECIMAL(18,2),
    "enforcementMode" "QuotaEnforcementMode" NOT NULL DEFAULT 'SOFT',
    "warningThresholdPercent" INTEGER DEFAULT 80,
    "resetFrequency" "ScheduleFrequency",
    "metadata" JSONB,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantQuotaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantUsageMetric" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metricType" "UsageMetricType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "currentValue" DECIMAL(18,2) NOT NULL,
    "peakValue" DECIMAL(18,2),
    "unit" TEXT,
    "lastRecordedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantUsageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantModuleEntitlement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "planSource" "BillingPlan",
    "seatLimit" INTEGER,
    "usageLimit" DECIMAL(18,2),
    "metadata" JSONB,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantModuleEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "FeatureFlagScope" NOT NULL DEFAULT 'GLOBAL',
    "targetPlan" "BillingPlan",
    "targetTenantId" TEXT,
    "targetModuleKey" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercentage" INTEGER,
    "rolloutRing" TEXT,
    "config" JSONB,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdByPlatformUserId" TEXT,
    "publishedByPlatformUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformGlobalSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "GlobalSettingScope" NOT NULL DEFAULT 'GLOBAL',
    "targetPlan" "BillingPlan",
    "targetTenantId" TEXT,
    "targetModuleKey" TEXT,
    "dataType" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "currentValue" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformGlobalSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfigVersion" (
    "id" TEXT NOT NULL,
    "platformGlobalSettingId" TEXT,
    "subjectKey" TEXT NOT NULL,
    "scope" "GlobalSettingScope" NOT NULL DEFAULT 'GLOBAL',
    "targetPlan" "BillingPlan",
    "targetTenantId" TEXT,
    "targetModuleKey" TEXT,
    "version" INTEGER NOT NULL,
    "status" "PlatformConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "changeSummary" TEXT,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdByPlatformUserId" TEXT,
    "reviewedByPlatformUserId" TEXT,
    "publishedByPlatformUserId" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfigVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformImpersonationSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedByPlatformUserId" TEXT NOT NULL,
    "approvedByPlatformUserId" TEXT,
    "targetUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ImpersonationStatus" NOT NULL DEFAULT 'REQUESTED',
    "accessMode" "PlatformAccessMode" NOT NULL DEFAULT 'READ_ONLY',
    "consentRequired" BOOLEAN NOT NULL DEFAULT true,
    "consentToken" TEXT,
    "consentGrantedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "requestIpAddress" TEXT,
    "requestUserAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformImpersonationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformIncident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "scope" "PlatformTargetScope" NOT NULL DEFAULT 'GLOBAL',
    "targetTenantId" TEXT,
    "targetModuleKey" TEXT,
    "ownerPlatformUserId" TEXT,
    "detectedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformMaintenanceWindow" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scope" "PlatformTargetScope" NOT NULL DEFAULT 'GLOBAL',
    "targetTenantId" TEXT,
    "targetModuleKey" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT true,
    "bannerMessage" TEXT,
    "initiatedByPlatformUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformMaintenanceWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformBackupJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "scope" "PlatformTargetScope" NOT NULL DEFAULT 'GLOBAL',
    "status" "BackupStatus" NOT NULL DEFAULT 'PENDING',
    "targetModuleKey" TEXT,
    "storageRef" TEXT,
    "checksum" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "requestedByPlatformUserId" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformBackupJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformWebhookLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "direction" "PlatformWebhookDirection" NOT NULL DEFAULT 'INBOUND',
    "status" "PlatformWebhookStatus" NOT NULL DEFAULT 'PENDING',
    "requestId" TEXT,
    "endpoint" TEXT,
    "responseCode" INTEGER,
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "responseBody" JSONB,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantHealthSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "TenantHealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "healthScore" INTEGER NOT NULL DEFAULT 100,
    "apiErrorRate" DECIMAL(8,4),
    "queueBacklog" INTEGER NOT NULL DEFAULT 0,
    "storageUsagePercent" DECIMAL(8,4),
    "rateLimitEvents" INTEGER NOT NULL DEFAULT 0,
    "failedWebhookCount" INTEGER NOT NULL DEFAULT 0,
    "lastEvaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSupportTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "requestedByTenantUserId" TEXT,
    "assignedPlatformUserId" TEXT,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "category" "SupportTicketCategory" NOT NULL DEFAULT 'GENERAL',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "moduleKey" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSupportTicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorPlatformUserId" TEXT,
    "authorTenantUserId" TEXT,
    "visibility" "SupportCommentVisibility" NOT NULL DEFAULT 'INTERNAL',
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSupportTicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformGlobalMessage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "GlobalMessageStatus" NOT NULL DEFAULT 'DRAFT',
    "audience" "GlobalMessageAudience" NOT NULL DEFAULT 'ALL_TENANTS',
    "targetPlan" "BillingPlan",
    "targetTenantId" TEXT,
    "targetRoleKey" TEXT,
    "channels" JSONB,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdByPlatformUserId" TEXT,
    "sentAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformGlobalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPatchDeployment" (
    "id" TEXT NOT NULL,
    "patchKey" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "PatchSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "PatchDeploymentStatus" NOT NULL DEFAULT 'DRAFT',
    "scope" "PlatformTargetScope" NOT NULL DEFAULT 'GLOBAL',
    "targetPlan" "BillingPlan",
    "targetTenantId" TEXT,
    "targetModuleKey" TEXT,
    "artifactRef" TEXT,
    "checksum" TEXT,
    "rollbackRef" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "createdByPlatformUserId" TEXT,
    "approvedByPlatformUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPatchDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformUser_email_key" ON "PlatformUser"("email");

-- CreateIndex
CREATE INDEX "PlatformUser_status_idx" ON "PlatformUser"("status");

-- CreateIndex
CREATE INDEX "PlatformUser_createdAt_idx" ON "PlatformUser"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRole_key_key" ON "PlatformRole"("key");

-- CreateIndex
CREATE INDEX "PlatformRole_isSystem_idx" ON "PlatformRole"("isSystem");

-- CreateIndex
CREATE INDEX "PlatformPermission_module_idx" ON "PlatformPermission"("module");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPermission_module_action_key" ON "PlatformPermission"("module", "action");

-- CreateIndex
CREATE INDEX "PlatformRolePermission_permissionId_idx" ON "PlatformRolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRolePermission_roleId_permissionId_key" ON "PlatformRolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "PlatformUserRole_roleId_idx" ON "PlatformUserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformUserRole_platformUserId_roleId_key" ON "PlatformUserRole"("platformUserId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformTenantProfile_tenantId_key" ON "PlatformTenantProfile"("tenantId");

-- CreateIndex
CREATE INDEX "PlatformTenantProfile_lifecycleStatus_idx" ON "PlatformTenantProfile"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "PlatformTenantProfile_createdAt_idx" ON "PlatformTenantProfile"("createdAt");

-- CreateIndex
CREATE INDEX "TenantSubscription_tenantId_idx" ON "TenantSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSubscription_plan_status_idx" ON "TenantSubscription"("plan", "status");

-- CreateIndex
CREATE INDEX "TenantSubscription_providerSubscriptionRef_idx" ON "TenantSubscription"("providerSubscriptionRef");

-- CreateIndex
CREATE INDEX "TenantQuotaPolicy_enforcementMode_idx" ON "TenantQuotaPolicy"("enforcementMode");

-- CreateIndex
CREATE UNIQUE INDEX "TenantQuotaPolicy_tenantId_metricType_key" ON "TenantQuotaPolicy"("tenantId", "metricType");

-- CreateIndex
CREATE INDEX "TenantUsageMetric_metricType_periodStart_idx" ON "TenantUsageMetric"("metricType", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "TenantUsageMetric_tenantId_metricType_periodStart_periodEnd_key" ON "TenantUsageMetric"("tenantId", "metricType", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "TenantModuleEntitlement_isEnabled_idx" ON "TenantModuleEntitlement"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "TenantModuleEntitlement_tenantId_moduleKey_key" ON "TenantModuleEntitlement"("tenantId", "moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformFeatureFlag_key_key" ON "PlatformFeatureFlag"("key");

-- CreateIndex
CREATE INDEX "PlatformFeatureFlag_scope_isEnabled_idx" ON "PlatformFeatureFlag"("scope", "isEnabled");

-- CreateIndex
CREATE INDEX "PlatformFeatureFlag_targetTenantId_idx" ON "PlatformFeatureFlag"("targetTenantId");

-- CreateIndex
CREATE INDEX "PlatformFeatureFlag_targetModuleKey_idx" ON "PlatformFeatureFlag"("targetModuleKey");

-- CreateIndex
CREATE INDEX "PlatformGlobalSetting_key_scope_idx" ON "PlatformGlobalSetting"("key", "scope");

-- CreateIndex
CREATE INDEX "PlatformGlobalSetting_targetTenantId_idx" ON "PlatformGlobalSetting"("targetTenantId");

-- CreateIndex
CREATE INDEX "PlatformGlobalSetting_targetModuleKey_idx" ON "PlatformGlobalSetting"("targetModuleKey");

-- CreateIndex
CREATE INDEX "PlatformConfigVersion_subjectKey_scope_version_idx" ON "PlatformConfigVersion"("subjectKey", "scope", "version");

-- CreateIndex
CREATE INDEX "PlatformConfigVersion_status_idx" ON "PlatformConfigVersion"("status");

-- CreateIndex
CREATE INDEX "PlatformConfigVersion_targetTenantId_idx" ON "PlatformConfigVersion"("targetTenantId");

-- CreateIndex
CREATE INDEX "PlatformConfigVersion_targetModuleKey_idx" ON "PlatformConfigVersion"("targetModuleKey");

-- CreateIndex
CREATE INDEX "PlatformImpersonationSession_tenantId_status_idx" ON "PlatformImpersonationSession"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PlatformImpersonationSession_requestedByPlatformUserId_idx" ON "PlatformImpersonationSession"("requestedByPlatformUserId");

-- CreateIndex
CREATE INDEX "PlatformImpersonationSession_targetUserId_idx" ON "PlatformImpersonationSession"("targetUserId");

-- CreateIndex
CREATE INDEX "PlatformImpersonationSession_expiresAt_idx" ON "PlatformImpersonationSession"("expiresAt");

-- CreateIndex
CREATE INDEX "PlatformIncident_severity_status_idx" ON "PlatformIncident"("severity", "status");

-- CreateIndex
CREATE INDEX "PlatformIncident_targetTenantId_idx" ON "PlatformIncident"("targetTenantId");

-- CreateIndex
CREATE INDEX "PlatformIncident_targetModuleKey_idx" ON "PlatformIncident"("targetModuleKey");

-- CreateIndex
CREATE INDEX "PlatformMaintenanceWindow_status_startsAt_idx" ON "PlatformMaintenanceWindow"("status", "startsAt");

-- CreateIndex
CREATE INDEX "PlatformMaintenanceWindow_targetTenantId_idx" ON "PlatformMaintenanceWindow"("targetTenantId");

-- CreateIndex
CREATE INDEX "PlatformMaintenanceWindow_targetModuleKey_idx" ON "PlatformMaintenanceWindow"("targetModuleKey");

-- CreateIndex
CREATE INDEX "PlatformBackupJob_status_createdAt_idx" ON "PlatformBackupJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformBackupJob_tenantId_idx" ON "PlatformBackupJob"("tenantId");

-- CreateIndex
CREATE INDEX "PlatformBackupJob_targetModuleKey_idx" ON "PlatformBackupJob"("targetModuleKey");

-- CreateIndex
CREATE INDEX "PlatformWebhookLog_provider_eventType_idx" ON "PlatformWebhookLog"("provider", "eventType");

-- CreateIndex
CREATE INDEX "PlatformWebhookLog_status_createdAt_idx" ON "PlatformWebhookLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformWebhookLog_tenantId_idx" ON "PlatformWebhookLog"("tenantId");

-- CreateIndex
CREATE INDEX "TenantHealthSnapshot_tenantId_status_idx" ON "TenantHealthSnapshot"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TenantHealthSnapshot_lastEvaluatedAt_idx" ON "TenantHealthSnapshot"("lastEvaluatedAt");

-- CreateIndex
CREATE INDEX "PlatformSupportTicket_tenantId_idx" ON "PlatformSupportTicket"("tenantId");

-- CreateIndex
CREATE INDEX "PlatformSupportTicket_status_priority_idx" ON "PlatformSupportTicket"("status", "priority");

-- CreateIndex
CREATE INDEX "PlatformSupportTicket_assignedPlatformUserId_idx" ON "PlatformSupportTicket"("assignedPlatformUserId");

-- CreateIndex
CREATE INDEX "PlatformSupportTicket_moduleKey_idx" ON "PlatformSupportTicket"("moduleKey");

-- CreateIndex
CREATE INDEX "PlatformSupportTicketComment_ticketId_visibility_idx" ON "PlatformSupportTicketComment"("ticketId", "visibility");

-- CreateIndex
CREATE INDEX "PlatformGlobalMessage_status_audience_idx" ON "PlatformGlobalMessage"("status", "audience");

-- CreateIndex
CREATE INDEX "PlatformGlobalMessage_targetTenantId_idx" ON "PlatformGlobalMessage"("targetTenantId");

-- CreateIndex
CREATE INDEX "PlatformGlobalMessage_startsAt_endsAt_idx" ON "PlatformGlobalMessage"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PlatformPatchDeployment_patchKey_version_idx" ON "PlatformPatchDeployment"("patchKey", "version");

-- CreateIndex
CREATE INDEX "PlatformPatchDeployment_status_scheduledAt_idx" ON "PlatformPatchDeployment"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "PlatformPatchDeployment_targetTenantId_idx" ON "PlatformPatchDeployment"("targetTenantId");

-- CreateIndex
CREATE INDEX "PlatformPatchDeployment_targetModuleKey_idx" ON "PlatformPatchDeployment"("targetModuleKey");

-- AddForeignKey
ALTER TABLE "PlatformRolePermission" ADD CONSTRAINT "PlatformRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PlatformRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRolePermission" ADD CONSTRAINT "PlatformRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "PlatformPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformUserRole" ADD CONSTRAINT "PlatformUserRole_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformUserRole" ADD CONSTRAINT "PlatformUserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PlatformRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformTenantProfile" ADD CONSTRAINT "PlatformTenantProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantQuotaPolicy" ADD CONSTRAINT "TenantQuotaPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantUsageMetric" ADD CONSTRAINT "TenantUsageMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantModuleEntitlement" ADD CONSTRAINT "TenantModuleEntitlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformFeatureFlag" ADD CONSTRAINT "PlatformFeatureFlag_targetTenantId_fkey" FOREIGN KEY ("targetTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformGlobalSetting" ADD CONSTRAINT "PlatformGlobalSetting_targetTenantId_fkey" FOREIGN KEY ("targetTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformConfigVersion" ADD CONSTRAINT "PlatformConfigVersion_platformGlobalSettingId_fkey" FOREIGN KEY ("platformGlobalSettingId") REFERENCES "PlatformGlobalSetting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformConfigVersion" ADD CONSTRAINT "PlatformConfigVersion_targetTenantId_fkey" FOREIGN KEY ("targetTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformImpersonationSession" ADD CONSTRAINT "PlatformImpersonationSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformIncident" ADD CONSTRAINT "PlatformIncident_targetTenantId_fkey" FOREIGN KEY ("targetTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformMaintenanceWindow" ADD CONSTRAINT "PlatformMaintenanceWindow_targetTenantId_fkey" FOREIGN KEY ("targetTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformBackupJob" ADD CONSTRAINT "PlatformBackupJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformWebhookLog" ADD CONSTRAINT "PlatformWebhookLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantHealthSnapshot" ADD CONSTRAINT "TenantHealthSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformSupportTicket" ADD CONSTRAINT "PlatformSupportTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformSupportTicketComment" ADD CONSTRAINT "PlatformSupportTicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PlatformSupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformGlobalMessage" ADD CONSTRAINT "PlatformGlobalMessage_targetTenantId_fkey" FOREIGN KEY ("targetTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPatchDeployment" ADD CONSTRAINT "PlatformPatchDeployment_targetTenantId_fkey" FOREIGN KEY ("targetTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
