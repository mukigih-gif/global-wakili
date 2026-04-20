-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'GRACE_PERIOD', 'DORMANT', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'CORPORATE', 'STATE_AGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "ScreeningStatus" AS ENUM ('CLEAR', 'MATCHED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN', 'CONSULTANT');

-- CreateEnum
CREATE TYPE "RiskBand" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MalwareScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ReconciliationVarianceStatus" AS ENUM ('NONE', 'EXPLAINED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "ComplianceCheckType" AS ENUM ('KYC', 'PEP', 'SANCTIONS', 'RISK');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'RETIRED');

-- CreateEnum
CREATE TYPE "CalendarReminderChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "CalendarReminderStatus" AS ENUM ('SCHEDULED', 'QUEUED', 'SENT', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CalendarRecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "CalendarSubscriptionScope" AS ENUM ('USER', 'MATTER', 'TEAM', 'TENANT_PUBLIC');

-- CreateEnum
CREATE TYPE "CalendarSubscriptionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CalendarFeedFormat" AS ENUM ('ICAL', 'WEBCAL');

-- CreateEnum
CREATE TYPE "ExternalCalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK', 'MICROSOFT_365', 'ICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ExternalCalendarAccountStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'TOKEN_EXPIRED', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "CalendarSyncDirection" AS ENUM ('IMPORT', 'EXPORT', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "CalendarSyncStatus" AS ENUM ('IDLE', 'SYNCING', 'SUCCESS', 'FAILED', 'PAUSED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'REMOTE');

-- CreateEnum
CREATE TYPE "StatutoryDeductionType" AS ENUM ('PAYE', 'SHIF', 'NSSF', 'HOUSING_LEVY', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmployeeDocumentType" AS ENUM ('CONTRACT', 'NATIONAL_ID', 'PASSPORT', 'KRA_PIN', 'NSSF', 'SHIF', 'PRACTISING_CERTIFICATE', 'CV', 'ACADEMIC_CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'GRACE_PERIOD');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('SYSTEM_POLICY', 'FIRM_TEMPLATE', 'DEMO_VIDEO', 'GLOBAL_NOTE');

-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('DOC_INCOMING', 'DOC_OUTGOING', 'VISITOR', 'CALL_LOG');

-- CreateEnum
CREATE TYPE "AuthStrategy" AS ENUM ('LOCAL', 'GOOGLE', 'AZURE_AD', 'SAML');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('SUPER_ADMIN', 'SYSTEM_ADMIN', 'SYSTEM_SUPPORT', 'NONE');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('FIRM_ADMIN', 'BRANCH_MANAGER', 'ADVOCATE', 'ASSOCIATE', 'ACCOUNTANT', 'CLERK', 'CLIENT', 'GUEST', 'NONE');

-- CreateEnum
CREATE TYPE "PermissionScope" AS ENUM ('SYSTEM', 'TENANT', 'BRANCH', 'MATTER', 'RESOURCE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT', 'DOWNLOAD', 'UPLOAD', 'APPROVE', 'REJECT', 'ARCHIVE', 'RESTORE', 'VIEW', 'PRINT', 'SIGN', 'VERIFY', 'AUTHORIZE', 'REVOKE', 'ESCALATE', 'REASSIGN', 'DUPLICATE', 'MERGE', 'POST_JOURNAL', 'POST_JOURNAL_FAILED', 'REQUEST_FAILURE', 'SYSTEM_ERROR', 'TRUST_DEPOSIT', 'TRUST_WITHDRAWAL', 'TRUST_TRANSFER', 'JOURNAL_POSTED', 'JOURNAL_REVERSED', 'RATE_LIMIT_EXCEEDED');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'WARNING', 'CRITICAL', 'ALERT');

-- CreateEnum
CREATE TYPE "DataClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'SEALED');

-- CreateEnum
CREATE TYPE "MfaMethod" AS ENUM ('TOTP', 'EMAIL_OTP', 'SMS_OTP', 'AUTHENTICATOR_APP', 'BACKUP_CODES');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'IDLE');

-- CreateEnum
CREATE TYPE "DeviceTrustStatus" AS ENUM ('TRUSTED', 'UNTRUSTED', 'COMPROMISED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('INVOICED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'ETIMS_REJECTED');

-- CreateEnum
CREATE TYPE "MatterStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RateCardStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WriteOffSource" AS ENUM ('MANUAL', 'TIME_ENTRY', 'INVOICE', 'DISBURSEMENT', 'CREDIT_NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "WriteOffStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "CourtHearingType" AS ENUM ('MENTION', 'DIRECTIONS', 'HEARING', 'JUDGMENT', 'RULING', 'TAXATION', 'APPLICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CourtHearingStatus" AS ENUM ('SCHEDULED', 'ADJOURNED', 'COMPLETED', 'CANCELLED', 'MISSED');

-- CreateEnum
CREATE TYPE "ProfitabilitySnapshotType" AS ENUM ('AD_HOC', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'MATTER_CLOSING');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('SUBMITTED', 'SELECTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseReceiptStatus" AS ENUM ('DRAFT', 'RECEIVED', 'PARTIALLY_RECEIVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisbursementRequestNoteStatus" AS ENUM ('DRAFT', 'APPROVED', 'SETTLED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "WorkflowState" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ESCALATED', 'DELEGATED', 'AUTO_APPROVED');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RFQStatus" AS ENUM ('OPEN', 'CLOSED', 'AWARDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SYSTEM_ALERT', 'EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('DOCUMENT', 'EMAIL', 'MESSAGE', 'CHAT', 'RECORDING', 'PHOTO', 'VIDEO', 'TESTIMONY', 'ARTIFACT');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('PENDING_REVIEW', 'UNDER_INVESTIGATION', 'DISPUTED', 'RESOLVED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'MATCHED', 'UNMATCHED', 'FLAGGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CLAIMANT', 'DEFENDANT', 'THIRD_PARTY', 'WITNESS', 'EXPERT', 'OPPOSING_COUNSEL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'MPESA', 'CHEQUE', 'CASH', 'CARD', 'BANK_STANDING_ORDER', 'TRUST_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentReceiptStatus" AS ENUM ('RECEIVED', 'PARTIALLY_ALLOCATED', 'ALLOCATED', 'REVERSED');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'ETIMS_PENDING', 'ETIMS_SUBMITTED', 'ETIMS_REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AmlReportType" AS ENUM ('STR', 'CTR', 'KYC_EXCEPTION', 'AML_REVIEW');

-- CreateEnum
CREATE TYPE "AmlStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'SUBMITTED', 'ACKNOWLEDGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExternalJobProvider" AS ENUM ('ETIMS', 'BANKING', 'GOAML', 'NOTIFICATIONS', 'OUTLOOK', 'GOOGLE');

-- CreateEnum
CREATE TYPE "ExternalJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRYING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "LienStatus" AS ENUM ('ACTIVE', 'RELEASED', 'EXPIRED', 'WAIVED');

-- CreateEnum
CREATE TYPE "StatuteType" AS ENUM ('CLAIM', 'CONTRACT', 'TORT', 'CRIMINAL', 'JUDGMENT', 'PRESCRIPTION');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFTING', 'REVIEW', 'EXECUTED', 'TERMINATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AccountingMethod" AS ENUM ('CASH', 'ACCRUAL');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'PENDING_INVITE');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'INCOMPLETE', 'UNDER_REVIEW', 'BASIC_VERIFIED', 'ENHANCED_DUE_DILIGENCE', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('MATTER', 'BILLING', 'PAYROLL', 'PROCUREMENT', 'COMPLIANCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AlertFrequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'BILLED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "BillingModel" AS ENUM ('HOURLY', 'FIXED_FEE', 'CONTINGENCY', 'CAPPED_FEE');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'SUPERSEDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CommissionPayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "TrustTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_TO_OFFICE', 'REVERSAL', 'INTEREST', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('GENERAL', 'COURT_DATE', 'STATUTORY_DEADLINE', 'MEETING', 'TASK');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PRIVATE', 'PUBLIC', 'TEAM_ONLY');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'COMPASSIONATE', 'UNPAID', 'STUDY');

-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- CreateEnum
CREATE TYPE "PayrollBatchStatus" AS ENUM ('DRAFT', 'APPROVED', 'POSTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorBillStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PARTIALLY_PAID', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "ReconciliationRunType" AS ENUM ('TRUST', 'OFFICE', 'EXPENSE', 'FULL');

-- CreateEnum
CREATE TYPE "AccountSubtype" AS ENUM ('TRUST_BANK', 'TRUST_LIABILITY', 'OFFICE_BANK', 'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'VAT_OUTPUT', 'VAT_INPUT', 'PAYE_LIABILITY', 'NSSF_LIABILITY', 'SHIF_LIABILITY', 'HOUSING_LEVY_LIABILITY', 'LEGAL_FEES_INCOME', 'DISBURSEMENT_ASSET', 'GENERAL_EXPENSE', 'RETAINER_LIABILITY', 'SUSPENSE');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "BalanceSide" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletionRequestedAt" TIMESTAMP(3),
    "deletionApprovedAt" TIMESTAMP(3),
    "deletionApprovedBy" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "kraPin" TEXT NOT NULL,
    "etimsId" TEXT,
    "subscriptionPlan" "PlanType" NOT NULL DEFAULT 'BASIC',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingCycleStart" TIMESTAMP(3) NOT NULL,
    "billingCycleEnd" TIMESTAMP(3) NOT NULL,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1A1A1A',
    "accentColor" TEXT NOT NULL DEFAULT '#D4AF37',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    "locale" TEXT NOT NULL DEFAULT 'en-KE',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "dataResidencyRegion" TEXT NOT NULL DEFAULT 'KE',
    "complianceMode" BOOLEAN NOT NULL DEFAULT true,
    "enableEtims" BOOLEAN NOT NULL DEFAULT true,
    "enableTrust" BOOLEAN NOT NULL DEFAULT true,
    "enableAml" BOOLEAN NOT NULL DEFAULT true,
    "gdprMode" BOOLEAN NOT NULL DEFAULT false,
    "auditLogRetention" INTEGER NOT NULL DEFAULT 2555,
    "backupRetention" INTEGER NOT NULL DEFAULT 90,
    "betaFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disabledFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accountingMethod" "AccountingMethod" NOT NULL DEFAULT 'ACCRUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "mPesaVolumeMonth" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "storageUsedGb" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalMatters" INTEGER NOT NULL DEFAULT 0,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kraPin" TEXT NOT NULL,
    "etimsId" TEXT,
    "location" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "etimsDrn" TEXT,
    "vscuSerial" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "osName" TEXT,
    "osVersion" TEXT,
    "browserName" TEXT,
    "browserVersion" TEXT,
    "trustStatus" "DeviceTrustStatus" NOT NULL DEFAULT 'UNTRUSTED',
    "trustedAt" TIMESTAMP(3),
    "trustedBy" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddressHistory" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locationHistory" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastIpAddress" TEXT,
    "lastLocation" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "suspiciousActivity" BOOLEAN NOT NULL DEFAULT false,
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "tenantId" TEXT,
    "sessionToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityType" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "location" TEXT,
    "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" "MfaMethod",
    "mfaVerifiedAt" TIMESTAMP(3),
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "requiresMfaReverify" BOOLEAN NOT NULL DEFAULT false,
    "suspiciousActivity" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaSecret" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totpSecret" TEXT,
    "totpVerified" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT,
    "backupCodesUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "otpToken" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "otpMaxAttempts" INTEGER NOT NULL DEFAULT 3,
    "recoveryEmail" TEXT,
    "recoveryPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountNumber" TEXT,
    "admissionNumber" TEXT,
    "bankName" TEXT,
    "basicSalary" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "defaultRate" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "department" TEXT,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "googleId" TEXT,
    "idNumber" TEXT,
    "taxableAllowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "nonTaxableAllowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "kraPin" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en-KE',
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "lockReason" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "shifNumber" TEXT,
    "nssfNumber" TEXT,
    "oauth2Providers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "passwordChangedAt" TIMESTAMP(3),
    "passwordExpiresAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "pcExpiryDate" TIMESTAMP(3),
    "phone" TEXT,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "systemRole" "SystemRole" NOT NULL DEFAULT 'NONE',
    "tenantId" TEXT,
    "tenantRole" "TenantRole" NOT NULL DEFAULT 'ADVOCATE',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "parentRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "scope" "PermissionScope" NOT NULL,
    "description" TEXT,
    "conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "constraints" JSONB NOT NULL DEFAULT '{}',
    "delegatedFrom" TEXT,
    "delegatedTo" TEXT,
    "delegationExpiry" TIMESTAMP(3),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionCondition" (
    "id" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "conditionType" TEXT NOT NULL,
    "conditionValue" TEXT,
    "operator" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldAccessPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "visibleTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldAccessPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnershipRecord" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnershipRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "ipWhitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastDeliveryAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantEncryptionKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "keyAlgorithm" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRotated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),

    CONSTRAINT "TenantEncryptionKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldEncryption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "encryptionKeyId" TEXT,
    "classification" "DataClassification" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldEncryption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensitiveField" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "classification" "DataClassification" NOT NULL,
    "requiresEncryption" BOOLEAN NOT NULL DEFAULT true,
    "requiresMasking" BOOLEAN NOT NULL DEFAULT false,
    "maskingPattern" TEXT,

    CONSTRAINT "SensitiveField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "isGranted" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "apiKeyId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "limitExceeded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RateLimitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "targetTenantId" TEXT,
    "actionType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "beforeState" JSONB,
    "afterState" JSONB,
    "hash" TEXT NOT NULL,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "action" "AuditAction" NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,
    "hash" TEXT NOT NULL,
    "previousHash" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "failureReason" TEXT,
    "correlationId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "triggerRule" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "emailRecipients" TEXT[],
    "alertFrequency" "AlertFrequency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogArchive" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "originalAuditLogIds" TEXT[],
    "archivedAt" TIMESTAMP(3) NOT NULL,
    "archiveLocation" TEXT NOT NULL,
    "archiveChecksum" TEXT NOT NULL,

    CONSTRAINT "AuditLogArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataLineage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceEntity" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "transformationType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataLineage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "targetUsers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetBranches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "launchDate" TIMESTAMP(3),
    "sunsetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseCache" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "cacheKey" TEXT NOT NULL,
    "cacheData" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatabaseCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "WorkflowType" NOT NULL,
    "states" TEXT[],
    "startState" TEXT NOT NULL,
    "endStates" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerConditions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowHistory" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromState" TEXT NOT NULL,
    "toState" TEXT NOT NULL,
    "transitionReason" TEXT,
    "transitionBy" TEXT NOT NULL,
    "transitionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "currentState" "WorkflowState" NOT NULL,
    "nextState" "WorkflowState" NOT NULL,
    "approvedBy" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "escalatedTo" TEXT,
    "escalationReason" TEXT,
    "delegatedFrom" TEXT,
    "delegatedTo" TEXT,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "investigatedBy" TEXT,
    "investigationNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classification" "DataClassification" NOT NULL DEFAULT 'CONFIDENTIAL',
    "confidentialityLevel" TEXT NOT NULL DEFAULT 'CONFIDENTIAL',
    "isSensitive" BOOLEAN NOT NULL DEFAULT true,
    "acquisitionMetadata" JSONB,
    "chainOfCustody" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "accessLog" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "checksumAlgorithm" TEXT NOT NULL DEFAULT 'SHA256',
    "integrityVerifiedAt" TIMESTAMP(3),
    "malwareScanStatus" "MalwareScanStatus" NOT NULL DEFAULT 'PENDING',
    "malwareScannedAt" TIMESTAMP(3),
    "malwareScanResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFTING',
    "executionDate" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "counterpartyName" TEXT,
    "counterpartyEmail" TEXT,
    "counterpartyPhone" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "changesSummary" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpressService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "mpesaRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpressService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "branchId" TEXT,
    "expenseAccountId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "supplierId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringTemplateId" TEXT,
    "etimsInvoiceUrl" TEXT,
    "etimsValidated" BOOLEAN NOT NULL DEFAULT false,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "MatterStatus" NOT NULL DEFAULT 'ACTIVE',
    "category" TEXT NOT NULL,
    "description" TEXT,
    "trustBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "wipValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "clientId" TEXT NOT NULL,
    "leadAdvocateId" TEXT NOT NULL,
    "openedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedDate" TIMESTAMP(3),
    "archivedDate" TIMESTAMP(3),
    "statuteOfLimitationsDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Matter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterOriginator" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "originatorId" TEXT NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterOriginator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterLien" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "lienholder" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL,
    "registeredWith" TEXT NOT NULL,
    "status" "LienStatus" NOT NULL DEFAULT 'ACTIVE',
    "releaseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterLien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matterId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "RateCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "defaultHourlyRate" DECIMAL(18,2),
    "partnerRate" DECIMAL(18,2),
    "seniorRate" DECIMAL(18,2),
    "associateRate" DECIMAL(18,2),
    "traineeRate" DECIMAL(18,2),
    "paralegalRate" DECIMAL(18,2),
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WriteOff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "sourceType" "WriteOffSource" NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "WriteOffStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedById" TEXT,
    "approvedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "journalEntryId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WriteOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtHearing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "calendarEventId" TEXT,
    "title" TEXT NOT NULL,
    "caseNumber" TEXT,
    "courtName" TEXT,
    "courtStation" TEXT,
    "courtroom" TEXT,
    "judge" TEXT,
    "hearingType" "CourtHearingType" NOT NULL DEFAULT 'OTHER',
    "status" "CourtHearingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "hearingDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "outcome" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourtHearing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterProfitabilitySnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "snapshotType" "ProfitabilitySnapshotType" NOT NULL DEFAULT 'AD_HOC',
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "billedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "collectedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "writeOffAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "disbursementAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "costAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netRevenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grossProfit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netProfit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "realizationRate" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "collectionRate" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "profitMargin" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "wipValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "trustBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterProfitabilitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatuteOfLimitations" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "statueType" "StatuteType" NOT NULL,
    "limitationPeriod" INTEGER NOT NULL,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "notifyAt" TIMESTAMP(3) NOT NULL,
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatuteOfLimitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterParty" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "partyType" "PartyType" NOT NULL,
    "contactDate" TIMESTAMP(3),
    "lastContactDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "defaultTasks" TEXT[],
    "defaultDocuments" TEXT[],
    "defaultAdvocates" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "advocateId" TEXT NOT NULL,
    "branchId" TEXT,
    "invoiceId" TEXT,
    "billingRunId" TEXT,
    "description" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "durationHours" DECIMAL(8,2) NOT NULL,
    "durationMinutes" INTEGER,
    "appliedRate" DECIMAL(18,2) NOT NULL,
    "billableAmount" DECIMAL(18,2) NOT NULL,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "isInvoiced" BOOLEAN NOT NULL DEFAULT false,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "billingModel" "BillingModel" NOT NULL DEFAULT 'HOURLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disbursement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "officeAccountId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciliationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpenseTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "frequency" "RecurringFrequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "expenseAccountId" TEXT,
    "supplierId" TEXT,
    "branchId" TEXT,
    "matterId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpenseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnbilledWip" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "timeEntryCount" INTEGER NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "totalUnbilledAmount" DECIMAL(18,2) NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnbilledWip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kraControlNumber" TEXT,
    "etimsReference" TEXT,
    "etimsValidated" BOOLEAN NOT NULL DEFAULT false,
    "etimsValidatedAt" TIMESTAMP(3),
    "etimsStatus" TEXT,
    "etimsReceiptNumber" TEXT,
    "etimsRejectionReason" TEXT,
    "etimsLastSyncedAt" TIMESTAMP(3),
    "total" DECIMAL(18,2) NOT NULL,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "subTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'INVOICED',
    "matterId" TEXT NOT NULL,
    "branchId" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "billingRunId" TEXT,
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL,
    "invoicesGenerated" INTEGER NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL,
    "submittedToEtims" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartOfAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "subtype" "AccountSubtype",
    "normalBalance" "BalanceSide" NOT NULL DEFAULT 'DEBIT',
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "allowManualPosting" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChartOfAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountBalance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debitBalance" DECIMAL(18,2) NOT NULL,
    "creditBalance" DECIMAL(18,2) NOT NULL,
    "netBalance" DECIMAL(18,2) NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "postedById" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "sourceModule" TEXT,
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "reversalOfId" TEXT,
    "matterId" TEXT,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "clientId" TEXT,
    "matterId" TEXT,
    "branchId" TEXT,
    "reference" TEXT,
    "description" TEXT,
    "debit" DECIMAL(18,2) NOT NULL,
    "credit" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeProfileId" TEXT,
    "grossPay" DECIMAL(18,2) NOT NULL,
    "netPay" DECIMAL(18,2) NOT NULL,
    "totalDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "employerCost" DECIMAL(18,2),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatutoryDeductionRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "type" "StatutoryDeductionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatutoryDeductionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "recipientName" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "systemTitle" TEXT,
    "systemMessage" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "smsContent" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateKey" TEXT,
    "category" TEXT,
    "priority" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "debounceKey" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "description" TEXT,
    "expiryDate" TIMESTAMP(3),
    "previousId" TEXT,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "matterId" TEXT,
    "mimeType" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "encryptionKeyId" TEXT,
    "checksumAlgorithm" TEXT NOT NULL DEFAULT 'SHA256',
    "malwareScanStatus" "MalwareScanStatus" NOT NULL DEFAULT 'PENDING',
    "malwareScannedAt" TIMESTAMP(3),
    "malwareScanProvider" TEXT,
    "malwareScanResult" JSONB,
    "retainedUntil" TIMESTAMP(3),
    "retentionPolicyCode" TEXT,
    "disposalEligibleAt" TIMESTAMP(3),
    "disposedAt" TIMESTAMP(3),
    "disposalReason" TEXT,
    "disposalApprovedBy" TEXT,
    "metadata" JSONB,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidentiality" "DataClassification" NOT NULL DEFAULT 'INTERNAL',
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "clientCode" TEXT,
    "name" TEXT NOT NULL,
    "type" "ClientType" NOT NULL DEFAULT 'INDIVIDUAL',
    "email" TEXT,
    "phoneNumber" TEXT,
    "registrationNumber" TEXT,
    "postalAddress" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "primaryContactName" TEXT,
    "primaryContactEmail" TEXT,
    "primaryContactPhone" TEXT,
    "portalUserId" TEXT,
    "alternatePhoneNumber" TEXT,
    "kraPin" TEXT,
    "nationalId" TEXT,
    "passportNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "incorporationDate" TIMESTAMP(3),
    "address" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'Kenya',
    "postalCode" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "pepStatus" "ScreeningStatus" NOT NULL DEFAULT 'CLEAR',
    "sanctionsStatus" "ScreeningStatus" NOT NULL DEFAULT 'CLEAR',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskBand" "RiskBand" NOT NULL DEFAULT 'LOW',
    "needsEnhancedDueDiligence" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastKycReviewedAt" TIMESTAMP(3),
    "lastPepScreenedAt" TIMESTAMP(3),
    "lastSanctionsScreenedAt" TIMESTAMP(3),
    "lastRiskAssessedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientComplianceCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "checkType" "ComplianceCheckType" NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT,
    "score" INTEGER,
    "riskBand" "RiskBand",
    "notes" TEXT,
    "resultPayload" JSONB,
    "createdById" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "alternatePhone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientKycProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "sourceOfFunds" TEXT,
    "sourceOfWealth" TEXT,
    "pepCheckStatus" TEXT,
    "sanctionsStatus" TEXT,
    "adverseMediaNotes" TEXT,
    "amlNotes" TEXT,
    "supportingData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientKycProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTrustLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "matterId" TEXT,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(18,2) NOT NULL,
    "description" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientTrustLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kraPin" TEXT NOT NULL,
    "etimsId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contactPerson" TEXT,
    "address" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "quoteDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "status" "QuotationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "rfqItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "QuotationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "branchId" TEXT,
    "matterId" TEXT,
    "notes" TEXT,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderReceipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT,
    "status" "PurchaseReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderReceiptLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "purchaseOrderLineId" TEXT,
    "description" TEXT NOT NULL,
    "quantityReceived" DECIMAL(18,2) NOT NULL,
    "quantityRejected" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "matterId" TEXT,
    "creatorId" TEXT NOT NULL,
    "type" "CalendarEventType" NOT NULL DEFAULT 'GENERAL',
    "visibility" "EventVisibility" NOT NULL DEFAULT 'PRIVATE',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "googleEventId" TEXT,
    "outlookEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarReminder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "recipientId" TEXT,
    "createdById" TEXT,
    "channel" "CalendarReminderChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "CalendarReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "remindAt" TIMESTAMP(3) NOT NULL,
    "offsetMinutes" INTEGER,
    "title" TEXT,
    "message" TEXT,
    "queuedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "notificationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarRecurrenceRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "frequency" "CalendarRecurrenceFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "count" INTEGER,
    "byWeekday" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "byMonthDay" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "byMonth" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "rrule" TEXT,
    "exDates" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarRecurrenceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "matterId" TEXT,
    "name" TEXT NOT NULL,
    "scope" "CalendarSubscriptionScope" NOT NULL DEFAULT 'USER',
    "status" "CalendarSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "feedFormat" "CalendarFeedFormat" NOT NULL DEFAULT 'ICAL',
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT,
    "includePrivate" BOOLEAN NOT NULL DEFAULT false,
    "includeTeamOnly" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "lastAccessedIp" TEXT,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCalendarAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ExternalCalendarProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "externalEmail" TEXT,
    "displayName" TEXT,
    "accessTokenCiphertext" TEXT,
    "refreshTokenCiphertext" TEXT,
    "idTokenCiphertext" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ExternalCalendarAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "syncDirection" "CalendarSyncDirection" NOT NULL DEFAULT 'BIDIRECTIONAL',
    "defaultCalendarId" TEXT,
    "webhookResourceId" TEXT,
    "webhookChannelId" TEXT,
    "webhookExpiresAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCalendarAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSyncCursor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "provider" "ExternalCalendarProvider" NOT NULL,
    "externalCalendarId" TEXT NOT NULL DEFAULT 'primary',
    "direction" "CalendarSyncDirection" NOT NULL DEFAULT 'BIDIRECTIONAL',
    "status" "CalendarSyncStatus" NOT NULL DEFAULT 'IDLE',
    "syncToken" TEXT,
    "deltaLink" TEXT,
    "pageToken" TEXT,
    "lastStartedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lockUntil" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarSyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisbursementRequestNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisbursementRequestNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisbursementRequestNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTitle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "level" TEXT,
    "isBillableRole" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT,
    "departmentId" TEXT,
    "jobTitleId" TEXT,
    "employeeNumber" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "hireDate" TIMESTAMP(3) NOT NULL,
    "confirmationDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "reportingManagerId" TEXT,
    "workLocation" TEXT,
    "personalEmail" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeProfileId" TEXT,
    "branchId" TEXT,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "clockInAt" TIMESTAMP(3),
    "clockOutAt" TIMESTAMP(3),
    "totalHours" DECIMAL(8,2),
    "overtimeHours" DECIMAL(8,2) DEFAULT 0,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeProfileId" TEXT,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "daysRequested" DECIMAL(8,2) NOT NULL,
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeProfileId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "year" INTEGER NOT NULL,
    "openingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "accruedDays" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "usedDays" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adjustedDays" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePerformance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeProfileId" TEXT,
    "reviewPeriodStart" TIMESTAMP(3) NOT NULL,
    "reviewPeriodEnd" TIMESTAMP(3) NOT NULL,
    "score" DECIMAL(5,2),
    "summary" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeePerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeGoal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeProfileId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetDate" TIMESTAMP(3),
    "achievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeProfileId" TEXT,
    "documentType" "EmployeeDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPayout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payrollBatchId" TEXT,
    "matterId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "reason" TEXT,
    "status" "CommissionPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "routingNumber" TEXT,
    "swiftCode" TEXT,
    "currentBalance" DECIMAL(18,2) NOT NULL,
    "lastReconciled" TIMESTAMP(3),
    "reconciliationBalance" DECIMAL(18,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "custodian" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "routingNumber" TEXT,
    "swiftCode" TEXT,
    "currentBalance" DECIMAL(18,2) NOT NULL,
    "lastReconciled" TIMESTAMP(3),
    "reconciliationBalance" DECIMAL(18,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trustAccountId" TEXT NOT NULL,
    "matterId" TEXT,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "transactionType" "TrustTransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "postedDate" TIMESTAMP(3),
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciliationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT,

    CONSTRAINT "TrustTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustReconciliation" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "trustAccountId" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "statementBalance" DECIMAL(18,2) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeReconciliation" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "officeAccountId" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "statementBalance" DECIMAL(18,2) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficeReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseReconciliation" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "reconciledBy" TEXT NOT NULL,
    "reconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaasActivityLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "SaasActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceptionLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "LogType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT NOT NULL,
    "matterId" TEXT,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "deliveryMethod" TEXT,
    "trackingNumber" TEXT,
    "digitalCopyUrl" TEXT,
    "personMeeting" TEXT,
    "durationMinutes" INTEGER,
    "isPlanned" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ReceptionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "matterId" TEXT,
    "clientId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "subTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestForQuotation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "closingDate" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT,
    "matterId" TEXT,
    "status" "RFQStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestForQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestForQuotationItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "estimatedUnitPrice" DECIMAL(18,2),

    CONSTRAINT "RequestForQuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestForQuotationSupplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,

    CONSTRAINT "RequestForQuotationSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceiptAllocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentReceiptId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountApplied" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceiptAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBill" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "matterId" TEXT,
    "branchId" TEXT,
    "billNumber" TEXT NOT NULL,
    "supplierInvoice" TEXT,
    "billDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "subTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "whtRate" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "whtAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "rejectionReason" TEXT,
    "isRecoverable" BOOLEAN NOT NULL DEFAULT false,
    "hasVat" BOOLEAN NOT NULL DEFAULT false,
    "status" "VendorBillStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "expenseAccountId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "taxRate" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "itemCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "clientId" TEXT,
    "matterId" TEXT,
    "invoiceId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "status" "PaymentReceiptStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "matterId" TEXT,
    "noteNumber" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "etimsReference" TEXT,
    "createdById" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportType" "AmlReportType" NOT NULL,
    "status" "AmlStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "referenceNumber" TEXT,
    "payload" JSONB,
    "regulatorAck" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,

    CONSTRAINT "ComplianceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalJobQueue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "provider" "ExternalJobProvider" NOT NULL,
    "jobType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" "ExternalJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalJobQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayrollBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeProfileId" TEXT,
    "grossPay" DECIMAL(18,2) NOT NULL,
    "taxablePay" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(18,2) NOT NULL,
    "paye" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "shif" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "nssf" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "housingLevy" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "allowances" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "employerCost" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "importedById" TEXT,
    "accountType" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sourceFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bankStatementId" TEXT NOT NULL,
    "externalId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "isMatched" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ReconciliationRunType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationMatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "bankTransactionId" TEXT,
    "trustTransactionId" TEXT,
    "clientTrustLedgerId" TEXT,
    "matchType" TEXT NOT NULL,
    "matchedAmount" DECIMAL(18,2) NOT NULL,
    "varianceAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "varianceExplanation" TEXT,
    "varianceStatus" "ReconciliationVarianceStatus" NOT NULL DEFAULT 'NONE',
    "varianceApprovedBy" TEXT,
    "varianceApprovedAt" TIMESTAMP(3),
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimerSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stoppedAt" TIMESTAMP(3),
    "isRunning" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" BIGINT,
    "durationHours" DECIMAL(12,6),

    CONSTRAINT "TimerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserRoles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RolePermissions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RolePermissions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_UserPermissions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserPermissions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EventAttendees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventAttendees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_name_key" ON "Tenant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_kraPin_key" ON "Tenant"("kraPin");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_etimsId_key" ON "Tenant"("etimsId");

-- CreateIndex
CREATE INDEX "Tenant_subscriptionStatus_idx" ON "Tenant"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "Tenant_createdAt_idx" ON "Tenant"("createdAt");

-- CreateIndex
CREATE INDEX "Tenant_dataResidencyRegion_idx" ON "Tenant"("dataResidencyRegion");

-- CreateIndex
CREATE INDEX "TenantMembership_tenantId_idx" ON "TenantMembership"("tenantId");

-- CreateIndex
CREATE INDEX "TenantMembership_userId_idx" ON "TenantMembership"("userId");

-- CreateIndex
CREATE INDEX "TenantMembership_roleId_idx" ON "TenantMembership"("roleId");

-- CreateIndex
CREATE INDEX "TenantMembership_status_idx" ON "TenantMembership"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Workspace_tenantId_idx" ON "Workspace"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_tenantId_slug_key" ON "Workspace"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_kraPin_key" ON "Branch"("kraPin");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_etimsId_key" ON "Branch"("etimsId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_etimsDrn_key" ON "Branch"("etimsDrn");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_vscuSerial_key" ON "Branch"("vscuSerial");

-- CreateIndex
CREATE INDEX "Branch_tenantId_idx" ON "Branch"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_tenantId_kraPin_key" ON "Branch"("tenantId", "kraPin");

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceFingerprint_key" ON "Device"("deviceFingerprint");

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE INDEX "Device_trustStatus_idx" ON "Device"("trustStatus");

-- CreateIndex
CREATE INDEX "Device_lastUsedAt_idx" ON "Device"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_status_expiresAt_idx" ON "Session"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_deviceId_idx" ON "Session"("deviceId");

-- CreateIndex
CREATE INDEX "Session_lastActivityAt_idx" ON "Session"("lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "MfaSecret_userId_key" ON "MfaSecret"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_admissionNumber_key" ON "User"("admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_idNumber_key" ON "User"("idNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_kraPin_key" ON "User"("kraPin");

-- CreateIndex
CREATE UNIQUE INDEX "User_shifNumber_key" ON "User"("shifNumber");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_branchId_idx" ON "User"("branchId");

-- CreateIndex
CREATE INDEX "User_lastActivityAt_idx" ON "User"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Role_tenantId_idx" ON "Role"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_name_key" ON "Role"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Permission_tenantId_idx" ON "Permission"("tenantId");

-- CreateIndex
CREATE INDEX "Permission_resource_idx" ON "Permission"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_tenantId_action_resource_key" ON "Permission"("tenantId", "action", "resource");

-- CreateIndex
CREATE INDEX "PermissionCondition_permissionId_idx" ON "PermissionCondition"("permissionId");

-- CreateIndex
CREATE INDEX "FieldAccessPolicy_tenantId_idx" ON "FieldAccessPolicy"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldAccessPolicy_tenantId_roleName_entityType_fieldName_key" ON "FieldAccessPolicy"("tenantId", "roleName", "entityType", "fieldName");

-- CreateIndex
CREATE INDEX "OwnershipRecord_ownerId_idx" ON "OwnershipRecord"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnershipRecord_resourceType_resourceId_key" ON "OwnershipRecord"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_prefix_key" ON "ApiKey"("prefix");

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_idx" ON "ApiKey"("tenantId");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_expiresAt_idx" ON "ApiKey"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "Webhook_tenantId_idx" ON "Webhook"("tenantId");

-- CreateIndex
CREATE INDEX "TenantEncryptionKey_tenantId_isActive_idx" ON "TenantEncryptionKey"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "FieldEncryption_tenantId_idx" ON "FieldEncryption"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldEncryption_tenantId_modelName_fieldName_key" ON "FieldEncryption"("tenantId", "modelName", "fieldName");

-- CreateIndex
CREATE UNIQUE INDEX "SensitiveField_tenantId_entityType_fieldName_key" ON "SensitiveField"("tenantId", "entityType", "fieldName");

-- CreateIndex
CREATE INDEX "ConsentRecord_tenantId_idx" ON "ConsentRecord"("tenantId");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_idx" ON "ConsentRecord"("userId");

-- CreateIndex
CREATE INDEX "RateLimitLog_tenantId_ipAddress_endpoint_idx" ON "RateLimitLog"("tenantId", "ipAddress", "endpoint");

-- CreateIndex
CREATE INDEX "RateLimitLog_limitExceeded_idx" ON "RateLimitLog"("limitExceeded");

-- CreateIndex
CREATE INDEX "GlobalAuditLog_actorId_idx" ON "GlobalAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "GlobalAuditLog_targetTenantId_idx" ON "GlobalAuditLog"("targetTenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_hash_key" ON "AuditLog"("hash");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_severity_idx" ON "AuditLog"("action", "severity");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditAlert_tenantId_idx" ON "AuditAlert"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLogArchive_tenantId_archivedAt_idx" ON "AuditLogArchive"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "DataLineage_sourceEntity_sourceId_idx" ON "DataLineage"("sourceEntity", "sourceId");

-- CreateIndex
CREATE INDEX "DataLineage_targetEntity_targetId_idx" ON "DataLineage"("targetEntity", "targetId");

-- CreateIndex
CREATE INDEX "FeatureFlag_isEnabled_idx" ON "FeatureFlag"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_tenantId_name_key" ON "FeatureFlag"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseCache_cacheKey_key" ON "DatabaseCache"("cacheKey");

-- CreateIndex
CREATE INDEX "DatabaseCache_tenantId_idx" ON "DatabaseCache"("tenantId");

-- CreateIndex
CREATE INDEX "DatabaseCache_expiresAt_idx" ON "DatabaseCache"("expiresAt");

-- CreateIndex
CREATE INDEX "Workflow_tenantId_idx" ON "Workflow"("tenantId");

-- CreateIndex
CREATE INDEX "WorkflowHistory_workflowId_transitionAt_idx" ON "WorkflowHistory"("workflowId", "transitionAt");

-- CreateIndex
CREATE INDEX "WorkflowHistory_entityType_entityId_idx" ON "WorkflowHistory"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Approval_tenantId_idx" ON "Approval"("tenantId");

-- CreateIndex
CREATE INDEX "Approval_status_idx" ON "Approval"("status");

-- CreateIndex
CREATE INDEX "Approval_deadlineAt_idx" ON "Approval"("deadlineAt");

-- CreateIndex
CREATE INDEX "Dispute_tenantId_idx" ON "Dispute"("tenantId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_entityType_entityId_idx" ON "Dispute"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "EvidenceItem_tenantId_idx" ON "EvidenceItem"("tenantId");

-- CreateIndex
CREATE INDEX "EvidenceItem_tenantId_createdAt_idx" ON "EvidenceItem"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "EvidenceItem_matterId_idx" ON "EvidenceItem"("matterId");

-- CreateIndex
CREATE INDEX "EvidenceItem_classification_idx" ON "EvidenceItem"("classification");

-- CreateIndex
CREATE INDEX "EvidenceItem_malwareScanStatus_idx" ON "EvidenceItem"("malwareScanStatus");

-- CreateIndex
CREATE INDEX "EvidenceItem_fileHash_idx" ON "EvidenceItem"("fileHash");

-- CreateIndex
CREATE INDEX "Contract_tenantId_idx" ON "Contract"("tenantId");

-- CreateIndex
CREATE INDEX "Contract_matterId_idx" ON "Contract"("matterId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_tenantId_contractNumber_key" ON "Contract"("tenantId", "contractNumber");

-- CreateIndex
CREATE INDEX "ContractVersion_tenantId_idx" ON "ContractVersion"("tenantId");

-- CreateIndex
CREATE INDEX "ContractVersion_contractId_idx" ON "ContractVersion"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractVersion_contractId_versionNumber_key" ON "ContractVersion"("contractId", "versionNumber");

-- CreateIndex
CREATE INDEX "ExpenseEntry_tenantId_idx" ON "ExpenseEntry"("tenantId");

-- CreateIndex
CREATE INDEX "ExpenseEntry_matterId_idx" ON "ExpenseEntry"("matterId");

-- CreateIndex
CREATE INDEX "ExpenseEntry_branchId_idx" ON "ExpenseEntry"("branchId");

-- CreateIndex
CREATE INDEX "ExpenseEntry_userId_idx" ON "ExpenseEntry"("userId");

-- CreateIndex
CREATE INDEX "ExpenseEntry_supplierId_idx" ON "ExpenseEntry"("supplierId");

-- CreateIndex
CREATE INDEX "ExpenseEntry_expenseAccountId_idx" ON "ExpenseEntry"("expenseAccountId");

-- CreateIndex
CREATE INDEX "ExpenseEntry_status_idx" ON "ExpenseEntry"("status");

-- CreateIndex
CREATE INDEX "ExpenseEntry_expenseDate_idx" ON "ExpenseEntry"("expenseDate");

-- CreateIndex
CREATE INDEX "Matter_tenantId_idx" ON "Matter"("tenantId");

-- CreateIndex
CREATE INDEX "Matter_tenantId_status_idx" ON "Matter"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Matter_tenantId_createdAt_idx" ON "Matter"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Matter_tenantId_clientId_idx" ON "Matter"("tenantId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "MatterOriginator_matterId_key" ON "MatterOriginator"("matterId");

-- CreateIndex
CREATE INDEX "MatterOriginator_originatorId_idx" ON "MatterOriginator"("originatorId");

-- CreateIndex
CREATE INDEX "MatterLien_matterId_idx" ON "MatterLien"("matterId");

-- CreateIndex
CREATE INDEX "MatterLien_status_idx" ON "MatterLien"("status");

-- CreateIndex
CREATE INDEX "RateCard_tenantId_idx" ON "RateCard"("tenantId");

-- CreateIndex
CREATE INDEX "RateCard_matterId_idx" ON "RateCard"("matterId");

-- CreateIndex
CREATE INDEX "RateCard_status_idx" ON "RateCard"("status");

-- CreateIndex
CREATE INDEX "RateCard_effectiveFrom_idx" ON "RateCard"("effectiveFrom");

-- CreateIndex
CREATE INDEX "RateCard_effectiveTo_idx" ON "RateCard"("effectiveTo");

-- CreateIndex
CREATE INDEX "WriteOff_tenantId_idx" ON "WriteOff"("tenantId");

-- CreateIndex
CREATE INDEX "WriteOff_matterId_idx" ON "WriteOff"("matterId");

-- CreateIndex
CREATE INDEX "WriteOff_status_idx" ON "WriteOff"("status");

-- CreateIndex
CREATE INDEX "WriteOff_requestedById_idx" ON "WriteOff"("requestedById");

-- CreateIndex
CREATE INDEX "WriteOff_approvedById_idx" ON "WriteOff"("approvedById");

-- CreateIndex
CREATE INDEX "WriteOff_postedAt_idx" ON "WriteOff"("postedAt");

-- CreateIndex
CREATE INDEX "CourtHearing_tenantId_idx" ON "CourtHearing"("tenantId");

-- CreateIndex
CREATE INDEX "CourtHearing_matterId_idx" ON "CourtHearing"("matterId");

-- CreateIndex
CREATE INDEX "CourtHearing_calendarEventId_idx" ON "CourtHearing"("calendarEventId");

-- CreateIndex
CREATE INDEX "CourtHearing_hearingDate_idx" ON "CourtHearing"("hearingDate");

-- CreateIndex
CREATE INDEX "CourtHearing_status_idx" ON "CourtHearing"("status");

-- CreateIndex
CREATE INDEX "MatterProfitabilitySnapshot_tenantId_idx" ON "MatterProfitabilitySnapshot"("tenantId");

-- CreateIndex
CREATE INDEX "MatterProfitabilitySnapshot_matterId_idx" ON "MatterProfitabilitySnapshot"("matterId");

-- CreateIndex
CREATE INDEX "MatterProfitabilitySnapshot_snapshotDate_idx" ON "MatterProfitabilitySnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "MatterProfitabilitySnapshot_snapshotType_idx" ON "MatterProfitabilitySnapshot"("snapshotType");

-- CreateIndex
CREATE INDEX "MatterProfitabilitySnapshot_periodStart_periodEnd_idx" ON "MatterProfitabilitySnapshot"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "StatuteOfLimitations_matterId_key" ON "StatuteOfLimitations"("matterId");

-- CreateIndex
CREATE UNIQUE INDEX "StatuteOfLimitations_matterId_statueType_key" ON "StatuteOfLimitations"("matterId", "statueType");

-- CreateIndex
CREATE INDEX "MatterParty_matterId_idx" ON "MatterParty"("matterId");

-- CreateIndex
CREATE INDEX "MatterParty_partyType_idx" ON "MatterParty"("partyType");

-- CreateIndex
CREATE UNIQUE INDEX "MatterTemplate_tenantId_name_key" ON "MatterTemplate"("tenantId", "name");

-- CreateIndex
CREATE INDEX "TimeEntry_tenantId_idx" ON "TimeEntry"("tenantId");

-- CreateIndex
CREATE INDEX "TimeEntry_matterId_idx" ON "TimeEntry"("matterId");

-- CreateIndex
CREATE INDEX "TimeEntry_advocateId_idx" ON "TimeEntry"("advocateId");

-- CreateIndex
CREATE INDEX "TimeEntry_branchId_idx" ON "TimeEntry"("branchId");

-- CreateIndex
CREATE INDEX "TimeEntry_status_idx" ON "TimeEntry"("status");

-- CreateIndex
CREATE INDEX "TimeEntry_entryDate_idx" ON "TimeEntry"("entryDate");

-- CreateIndex
CREATE INDEX "TimeEntry_invoiceId_idx" ON "TimeEntry"("invoiceId");

-- CreateIndex
CREATE INDEX "MatterTask_tenantId_idx" ON "MatterTask"("tenantId");

-- CreateIndex
CREATE INDEX "MatterTask_matterId_idx" ON "MatterTask"("matterId");

-- CreateIndex
CREATE INDEX "MatterTask_assignedTo_idx" ON "MatterTask"("assignedTo");

-- CreateIndex
CREATE INDEX "MatterTask_status_idx" ON "MatterTask"("status");

-- CreateIndex
CREATE INDEX "MatterTask_dueDate_idx" ON "MatterTask"("dueDate");

-- CreateIndex
CREATE INDEX "TaskComment_tenantId_idx" ON "TaskComment"("tenantId");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");

-- CreateIndex
CREATE INDEX "TaskComment_userId_idx" ON "TaskComment"("userId");

-- CreateIndex
CREATE INDEX "Disbursement_tenantId_idx" ON "Disbursement"("tenantId");

-- CreateIndex
CREATE INDEX "OfficeTransaction_tenantId_idx" ON "OfficeTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "OfficeTransaction_officeAccountId_idx" ON "OfficeTransaction"("officeAccountId");

-- CreateIndex
CREATE INDEX "OfficeTransaction_transactionDate_idx" ON "OfficeTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "RecurringExpenseTemplate_tenantId_idx" ON "RecurringExpenseTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "RecurringExpenseTemplate_isActive_idx" ON "RecurringExpenseTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UnbilledWip_matterId_key" ON "UnbilledWip"("matterId");

-- CreateIndex
CREATE INDEX "UnbilledWip_tenantId_idx" ON "UnbilledWip"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_kraControlNumber_key" ON "Invoice"("kraControlNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_etimsReference_key" ON "Invoice"("etimsReference");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_etimsReceiptNumber_key" ON "Invoice"("etimsReceiptNumber");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_issuedDate_idx" ON "Invoice"("tenantId", "issuedDate");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_matterId_idx" ON "Invoice"("tenantId", "matterId");

-- CreateIndex
CREATE INDEX "BillingRun_tenantId_idx" ON "BillingRun"("tenantId");

-- CreateIndex
CREATE INDEX "BillingRun_period_idx" ON "BillingRun"("period");

-- CreateIndex
CREATE INDEX "ChartOfAccount_tenantId_idx" ON "ChartOfAccount"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ChartOfAccount_tenantId_code_key" ON "ChartOfAccount"("tenantId", "code");

-- CreateIndex
CREATE INDEX "AccountBalance_tenantId_idx" ON "AccountBalance"("tenantId");

-- CreateIndex
CREATE INDEX "AccountBalance_accountId_idx" ON "AccountBalance"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountBalance_tenantId_accountId_key" ON "AccountBalance"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_idx" ON "JournalEntry"("tenantId");

-- CreateIndex
CREATE INDEX "JournalEntry_date_idx" ON "JournalEntry"("date");

-- CreateIndex
CREATE INDEX "JournalEntry_postedById_idx" ON "JournalEntry"("postedById");

-- CreateIndex
CREATE INDEX "JournalEntry_matterId_idx" ON "JournalEntry"("matterId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_tenantId_reference_key" ON "JournalEntry"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "JournalLine_tenantId_idx" ON "JournalLine"("tenantId");

-- CreateIndex
CREATE INDEX "JournalLine_journalId_idx" ON "JournalLine"("journalId");

-- CreateIndex
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");

-- CreateIndex
CREATE INDEX "JournalLine_clientId_idx" ON "JournalLine"("clientId");

-- CreateIndex
CREATE INDEX "JournalLine_matterId_idx" ON "JournalLine"("matterId");

-- CreateIndex
CREATE INDEX "JournalLine_branchId_idx" ON "JournalLine"("branchId");

-- CreateIndex
CREATE INDEX "JournalLine_tenantId_reference_idx" ON "JournalLine"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "PayrollRecord_tenantId_idx" ON "PayrollRecord"("tenantId");

-- CreateIndex
CREATE INDEX "PayrollRecord_batchId_idx" ON "PayrollRecord"("batchId");

-- CreateIndex
CREATE INDEX "PayrollRecord_userId_idx" ON "PayrollRecord"("userId");

-- CreateIndex
CREATE INDEX "StatutoryDeductionRecord_tenantId_idx" ON "StatutoryDeductionRecord"("tenantId");

-- CreateIndex
CREATE INDEX "StatutoryDeductionRecord_payslipId_idx" ON "StatutoryDeductionRecord"("payslipId");

-- CreateIndex
CREATE INDEX "StatutoryDeductionRecord_type_idx" ON "StatutoryDeductionRecord"("type");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Document_tenantId_idx" ON "Document"("tenantId");

-- CreateIndex
CREATE INDEX "Document_tenantId_status_idx" ON "Document"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Document_tenantId_createdAt_idx" ON "Document"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_matterId_idx" ON "Document"("matterId");

-- CreateIndex
CREATE INDEX "Document_previousId_idx" ON "Document"("previousId");

-- CreateIndex
CREATE INDEX "Document_fileHash_idx" ON "Document"("fileHash");

-- CreateIndex
CREATE INDEX "Document_expiryDate_idx" ON "Document"("expiryDate");

-- CreateIndex
CREATE INDEX "Document_retainedUntil_idx" ON "Document"("retainedUntil");

-- CreateIndex
CREATE INDEX "Document_malwareScanStatus_idx" ON "Document"("malwareScanStatus");

-- CreateIndex
CREATE INDEX "Client_tenantId_idx" ON "Client"("tenantId");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "Client_type_idx" ON "Client"("type");

-- CreateIndex
CREATE INDEX "Client_branchId_idx" ON "Client"("branchId");

-- CreateIndex
CREATE INDEX "Client_portalUserId_idx" ON "Client"("portalUserId");

-- CreateIndex
CREATE INDEX "Client_kycStatus_idx" ON "Client"("kycStatus");

-- CreateIndex
CREATE INDEX "Client_pepStatus_idx" ON "Client"("pepStatus");

-- CreateIndex
CREATE INDEX "Client_sanctionsStatus_idx" ON "Client"("sanctionsStatus");

-- CreateIndex
CREATE INDEX "Client_riskBand_idx" ON "Client"("riskBand");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_clientCode_key" ON "Client"("tenantId", "clientCode");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_email_key" ON "Client"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_kraPin_key" ON "Client"("tenantId", "kraPin");

-- CreateIndex
CREATE INDEX "ClientComplianceCheck_tenantId_idx" ON "ClientComplianceCheck"("tenantId");

-- CreateIndex
CREATE INDEX "ClientComplianceCheck_clientId_idx" ON "ClientComplianceCheck"("clientId");

-- CreateIndex
CREATE INDEX "ClientComplianceCheck_checkType_idx" ON "ClientComplianceCheck"("checkType");

-- CreateIndex
CREATE INDEX "ClientComplianceCheck_checkedAt_idx" ON "ClientComplianceCheck"("checkedAt");

-- CreateIndex
CREATE INDEX "ClientContact_tenantId_idx" ON "ClientContact"("tenantId");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_idx" ON "ClientContact"("clientId");

-- CreateIndex
CREATE INDEX "ClientKycProfile_tenantId_idx" ON "ClientKycProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ClientKycProfile_clientId_idx" ON "ClientKycProfile"("clientId");

-- CreateIndex
CREATE INDEX "ClientKycProfile_status_idx" ON "ClientKycProfile"("status");

-- CreateIndex
CREATE INDEX "ClientTrustLedger_tenantId_idx" ON "ClientTrustLedger"("tenantId");

-- CreateIndex
CREATE INDEX "ClientTrustLedger_clientId_idx" ON "ClientTrustLedger"("clientId");

-- CreateIndex
CREATE INDEX "ClientTrustLedger_transactionDate_idx" ON "ClientTrustLedger"("transactionDate");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");

-- CreateIndex
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_kraPin_key" ON "Supplier"("tenantId", "kraPin");

-- CreateIndex
CREATE INDEX "Quotation_tenantId_idx" ON "Quotation"("tenantId");

-- CreateIndex
CREATE INDEX "Quotation_rfqId_idx" ON "Quotation"("rfqId");

-- CreateIndex
CREATE INDEX "Quotation_vendorId_idx" ON "Quotation"("vendorId");

-- CreateIndex
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");

-- CreateIndex
CREATE INDEX "QuotationLine_tenantId_idx" ON "QuotationLine"("tenantId");

-- CreateIndex
CREATE INDEX "QuotationLine_quotationId_idx" ON "QuotationLine"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationLine_rfqItemId_idx" ON "QuotationLine"("rfqItemId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_idx" ON "PurchaseOrder"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_poNumber_key" ON "PurchaseOrder"("tenantId", "poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_tenantId_idx" ON "PurchaseOrderLine"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderReceipt_tenantId_idx" ON "PurchaseOrderReceipt"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrderReceipt_purchaseOrderId_idx" ON "PurchaseOrderReceipt"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderReceipt_status_idx" ON "PurchaseOrderReceipt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderReceipt_tenantId_receiptNumber_key" ON "PurchaseOrderReceipt"("tenantId", "receiptNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderReceiptLine_tenantId_idx" ON "PurchaseOrderReceiptLine"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrderReceiptLine_receiptId_idx" ON "PurchaseOrderReceiptLine"("receiptId");

-- CreateIndex
CREATE INDEX "PurchaseOrderReceiptLine_purchaseOrderLineId_idx" ON "PurchaseOrderReceiptLine"("purchaseOrderLineId");

-- CreateIndex
CREATE INDEX "CalendarEvent_tenantId_idx" ON "CalendarEvent"("tenantId");

-- CreateIndex
CREATE INDEX "CalendarEvent_matterId_idx" ON "CalendarEvent"("matterId");

-- CreateIndex
CREATE INDEX "CalendarEvent_startTime_idx" ON "CalendarEvent"("startTime");

-- CreateIndex
CREATE INDEX "CalendarEvent_googleEventId_idx" ON "CalendarEvent"("googleEventId");

-- CreateIndex
CREATE INDEX "CalendarEvent_outlookEventId_idx" ON "CalendarEvent"("outlookEventId");

-- CreateIndex
CREATE INDEX "CalendarReminder_tenantId_idx" ON "CalendarReminder"("tenantId");

-- CreateIndex
CREATE INDEX "CalendarReminder_eventId_idx" ON "CalendarReminder"("eventId");

-- CreateIndex
CREATE INDEX "CalendarReminder_recipientId_idx" ON "CalendarReminder"("recipientId");

-- CreateIndex
CREATE INDEX "CalendarReminder_status_idx" ON "CalendarReminder"("status");

-- CreateIndex
CREATE INDEX "CalendarReminder_remindAt_idx" ON "CalendarReminder"("remindAt");

-- CreateIndex
CREATE INDEX "CalendarReminder_status_remindAt_idx" ON "CalendarReminder"("status", "remindAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarReminder_tenantId_eventId_recipientId_channel_remin_key" ON "CalendarReminder"("tenantId", "eventId", "recipientId", "channel", "remindAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarRecurrenceRule_eventId_key" ON "CalendarRecurrenceRule"("eventId");

-- CreateIndex
CREATE INDEX "CalendarRecurrenceRule_tenantId_idx" ON "CalendarRecurrenceRule"("tenantId");

-- CreateIndex
CREATE INDEX "CalendarRecurrenceRule_frequency_idx" ON "CalendarRecurrenceRule"("frequency");

-- CreateIndex
CREATE INDEX "CalendarRecurrenceRule_startsAt_idx" ON "CalendarRecurrenceRule"("startsAt");

-- CreateIndex
CREATE INDEX "CalendarRecurrenceRule_endsAt_idx" ON "CalendarRecurrenceRule"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSubscription_tokenHash_key" ON "CalendarSubscription"("tokenHash");

-- CreateIndex
CREATE INDEX "CalendarSubscription_tenantId_idx" ON "CalendarSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "CalendarSubscription_ownerId_idx" ON "CalendarSubscription"("ownerId");

-- CreateIndex
CREATE INDEX "CalendarSubscription_matterId_idx" ON "CalendarSubscription"("matterId");

-- CreateIndex
CREATE INDEX "CalendarSubscription_status_idx" ON "CalendarSubscription"("status");

-- CreateIndex
CREATE INDEX "CalendarSubscription_expiresAt_idx" ON "CalendarSubscription"("expiresAt");

-- CreateIndex
CREATE INDEX "ExternalCalendarAccount_tenantId_idx" ON "ExternalCalendarAccount"("tenantId");

-- CreateIndex
CREATE INDEX "ExternalCalendarAccount_userId_idx" ON "ExternalCalendarAccount"("userId");

-- CreateIndex
CREATE INDEX "ExternalCalendarAccount_provider_idx" ON "ExternalCalendarAccount"("provider");

-- CreateIndex
CREATE INDEX "ExternalCalendarAccount_status_idx" ON "ExternalCalendarAccount"("status");

-- CreateIndex
CREATE INDEX "ExternalCalendarAccount_lastSyncAt_idx" ON "ExternalCalendarAccount"("lastSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendarAccount_tenantId_userId_provider_providerAc_key" ON "ExternalCalendarAccount"("tenantId", "userId", "provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "CalendarSyncCursor_tenantId_idx" ON "CalendarSyncCursor"("tenantId");

-- CreateIndex
CREATE INDEX "CalendarSyncCursor_externalAccountId_idx" ON "CalendarSyncCursor"("externalAccountId");

-- CreateIndex
CREATE INDEX "CalendarSyncCursor_provider_idx" ON "CalendarSyncCursor"("provider");

-- CreateIndex
CREATE INDEX "CalendarSyncCursor_status_idx" ON "CalendarSyncCursor"("status");

-- CreateIndex
CREATE INDEX "CalendarSyncCursor_lastSyncedAt_idx" ON "CalendarSyncCursor"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "CalendarSyncCursor_lockUntil_idx" ON "CalendarSyncCursor"("lockUntil");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSyncCursor_tenantId_externalAccountId_externalCalen_key" ON "CalendarSyncCursor"("tenantId", "externalAccountId", "externalCalendarId", "direction");

-- CreateIndex
CREATE INDEX "DisbursementRequestNote_tenantId_idx" ON "DisbursementRequestNote"("tenantId");

-- CreateIndex
CREATE INDEX "DisbursementRequestNote_status_idx" ON "DisbursementRequestNote"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DisbursementRequestNote_tenantId_reference_key" ON "DisbursementRequestNote"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");

-- CreateIndex
CREATE INDEX "Department_branchId_idx" ON "Department"("branchId");

-- CreateIndex
CREATE INDEX "Department_isActive_idx" ON "Department"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Department_tenantId_name_key" ON "Department"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_tenantId_code_key" ON "Department"("tenantId", "code");

-- CreateIndex
CREATE INDEX "JobTitle_tenantId_idx" ON "JobTitle"("tenantId");

-- CreateIndex
CREATE INDEX "JobTitle_isActive_idx" ON "JobTitle"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "JobTitle_tenantId_title_key" ON "JobTitle"("tenantId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "JobTitle_tenantId_code_key" ON "JobTitle"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_userId_key" ON "EmployeeProfile"("userId");

-- CreateIndex
CREATE INDEX "EmployeeProfile_tenantId_idx" ON "EmployeeProfile"("tenantId");

-- CreateIndex
CREATE INDEX "EmployeeProfile_branchId_idx" ON "EmployeeProfile"("branchId");

-- CreateIndex
CREATE INDEX "EmployeeProfile_departmentId_idx" ON "EmployeeProfile"("departmentId");

-- CreateIndex
CREATE INDEX "EmployeeProfile_jobTitleId_idx" ON "EmployeeProfile"("jobTitleId");

-- CreateIndex
CREATE INDEX "EmployeeProfile_employmentStatus_idx" ON "EmployeeProfile"("employmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_tenantId_employeeNumber_key" ON "EmployeeProfile"("tenantId", "employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_tenantId_userId_key" ON "EmployeeProfile"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Attendance_tenantId_idx" ON "Attendance"("tenantId");

-- CreateIndex
CREATE INDEX "Attendance_branchId_idx" ON "Attendance"("branchId");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_tenantId_userId_attendanceDate_key" ON "Attendance"("tenantId", "userId", "attendanceDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_tenantId_idx" ON "LeaveRequest"("tenantId");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_idx" ON "LeaveRequest"("userId");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- CreateIndex
CREATE INDEX "LeaveRequest_startDate_idx" ON "LeaveRequest"("startDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_endDate_idx" ON "LeaveRequest"("endDate");

-- CreateIndex
CREATE INDEX "LeaveBalance_tenantId_idx" ON "LeaveBalance"("tenantId");

-- CreateIndex
CREATE INDEX "LeaveBalance_employeeProfileId_idx" ON "LeaveBalance"("employeeProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_tenantId_employeeProfileId_leaveType_year_key" ON "LeaveBalance"("tenantId", "employeeProfileId", "leaveType", "year");

-- CreateIndex
CREATE INDEX "EmployeePerformance_tenantId_idx" ON "EmployeePerformance"("tenantId");

-- CreateIndex
CREATE INDEX "EmployeePerformance_userId_idx" ON "EmployeePerformance"("userId");

-- CreateIndex
CREATE INDEX "EmployeePerformance_reviewPeriodStart_idx" ON "EmployeePerformance"("reviewPeriodStart");

-- CreateIndex
CREATE INDEX "EmployeePerformance_reviewPeriodEnd_idx" ON "EmployeePerformance"("reviewPeriodEnd");

-- CreateIndex
CREATE INDEX "EmployeeGoal_tenantId_idx" ON "EmployeeGoal"("tenantId");

-- CreateIndex
CREATE INDEX "EmployeeGoal_userId_idx" ON "EmployeeGoal"("userId");

-- CreateIndex
CREATE INDEX "EmployeeGoal_status_idx" ON "EmployeeGoal"("status");

-- CreateIndex
CREATE INDEX "EmployeeDocument_tenantId_idx" ON "EmployeeDocument"("tenantId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_userId_idx" ON "EmployeeDocument"("userId");

-- CreateIndex
CREATE INDEX "EmployeeDocument_documentType_idx" ON "EmployeeDocument"("documentType");

-- CreateIndex
CREATE INDEX "CommissionPayout_tenantId_idx" ON "CommissionPayout"("tenantId");

-- CreateIndex
CREATE INDEX "CommissionPayout_userId_idx" ON "CommissionPayout"("userId");

-- CreateIndex
CREATE INDEX "CommissionPayout_status_idx" ON "CommissionPayout"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrustAccount_accountNumber_key" ON "TrustAccount"("accountNumber");

-- CreateIndex
CREATE INDEX "TrustAccount_tenantId_idx" ON "TrustAccount"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeAccount_accountNumber_key" ON "OfficeAccount"("accountNumber");

-- CreateIndex
CREATE INDEX "OfficeAccount_tenantId_idx" ON "OfficeAccount"("tenantId");

-- CreateIndex
CREATE INDEX "TrustTransaction_tenantId_idx" ON "TrustTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "TrustTransaction_trustAccountId_idx" ON "TrustTransaction"("trustAccountId");

-- CreateIndex
CREATE INDEX "TrustTransaction_matterId_idx" ON "TrustTransaction"("matterId");

-- CreateIndex
CREATE INDEX "TrustTransaction_transactionDate_idx" ON "TrustTransaction"("transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "TrustTransaction_tenantId_reference_key" ON "TrustTransaction"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "TrustReconciliation_tenantId_idx" ON "TrustReconciliation"("tenantId");

-- CreateIndex
CREATE INDEX "TrustReconciliation_trustAccountId_idx" ON "TrustReconciliation"("trustAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustReconciliation_tenantId_trustAccountId_statementDate_key" ON "TrustReconciliation"("tenantId", "trustAccountId", "statementDate");

-- CreateIndex
CREATE INDEX "OfficeReconciliation_tenantId_idx" ON "OfficeReconciliation"("tenantId");

-- CreateIndex
CREATE INDEX "OfficeReconciliation_officeAccountId_idx" ON "OfficeReconciliation"("officeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseReconciliation_expenseId_key" ON "ExpenseReconciliation"("expenseId");

-- CreateIndex
CREATE INDEX "ExpenseReconciliation_tenantId_idx" ON "ExpenseReconciliation"("tenantId");

-- CreateIndex
CREATE INDEX "SaasActivityLog_tenantId_idx" ON "SaasActivityLog"("tenantId");

-- CreateIndex
CREATE INDEX "SaasActivityLog_timestamp_idx" ON "SaasActivityLog"("timestamp");

-- CreateIndex
CREATE INDEX "ReceptionLog_tenantId_idx" ON "ReceptionLog"("tenantId");

-- CreateIndex
CREATE INDEX "ReceptionLog_type_idx" ON "ReceptionLog"("type");

-- CreateIndex
CREATE INDEX "ReceptionLog_matterId_idx" ON "ReceptionLog"("matterId");

-- CreateIndex
CREATE INDEX "ReceptionLog_receivedById_idx" ON "ReceptionLog"("receivedById");

-- CreateIndex
CREATE INDEX "ReceptionLog_timestamp_idx" ON "ReceptionLog"("timestamp");

-- CreateIndex
CREATE INDEX "InvoiceLine_tenantId_idx" ON "InvoiceLine"("tenantId");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "RequestForQuotation_tenantId_idx" ON "RequestForQuotation"("tenantId");

-- CreateIndex
CREATE INDEX "RequestForQuotation_status_idx" ON "RequestForQuotation"("status");

-- CreateIndex
CREATE INDEX "RequestForQuotation_closingDate_idx" ON "RequestForQuotation"("closingDate");

-- CreateIndex
CREATE INDEX "RequestForQuotationItem_tenantId_idx" ON "RequestForQuotationItem"("tenantId");

-- CreateIndex
CREATE INDEX "RequestForQuotationItem_rfqId_idx" ON "RequestForQuotationItem"("rfqId");

-- CreateIndex
CREATE INDEX "RequestForQuotationSupplier_tenantId_idx" ON "RequestForQuotationSupplier"("tenantId");

-- CreateIndex
CREATE INDEX "RequestForQuotationSupplier_rfqId_idx" ON "RequestForQuotationSupplier"("rfqId");

-- CreateIndex
CREATE INDEX "RequestForQuotationSupplier_vendorId_idx" ON "RequestForQuotationSupplier"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestForQuotationSupplier_tenantId_rfqId_vendorId_key" ON "RequestForQuotationSupplier"("tenantId", "rfqId", "vendorId");

-- CreateIndex
CREATE INDEX "PaymentReceiptAllocation_tenantId_idx" ON "PaymentReceiptAllocation"("tenantId");

-- CreateIndex
CREATE INDEX "PaymentReceiptAllocation_paymentReceiptId_idx" ON "PaymentReceiptAllocation"("paymentReceiptId");

-- CreateIndex
CREATE INDEX "PaymentReceiptAllocation_invoiceId_idx" ON "PaymentReceiptAllocation"("invoiceId");

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_idx" ON "VendorBill"("tenantId");

-- CreateIndex
CREATE INDEX "VendorBill_supplierId_idx" ON "VendorBill"("supplierId");

-- CreateIndex
CREATE INDEX "VendorBill_matterId_idx" ON "VendorBill"("matterId");

-- CreateIndex
CREATE INDEX "VendorBill_branchId_idx" ON "VendorBill"("branchId");

-- CreateIndex
CREATE INDEX "VendorBill_status_idx" ON "VendorBill"("status");

-- CreateIndex
CREATE INDEX "VendorBill_billDate_idx" ON "VendorBill"("billDate");

-- CreateIndex
CREATE INDEX "VendorBill_dueDate_idx" ON "VendorBill"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBill_tenantId_billNumber_key" ON "VendorBill"("tenantId", "billNumber");

-- CreateIndex
CREATE INDEX "VendorBillLine_tenantId_idx" ON "VendorBillLine"("tenantId");

-- CreateIndex
CREATE INDEX "VendorBillLine_vendorBillId_idx" ON "VendorBillLine"("vendorBillId");

-- CreateIndex
CREATE INDEX "VendorBillLine_expenseAccountId_idx" ON "VendorBillLine"("expenseAccountId");

-- CreateIndex
CREATE INDEX "VendorPayment_tenantId_idx" ON "VendorPayment"("tenantId");

-- CreateIndex
CREATE INDEX "VendorPayment_vendorBillId_idx" ON "VendorPayment"("vendorBillId");

-- CreateIndex
CREATE INDEX "VendorPayment_supplierId_idx" ON "VendorPayment"("supplierId");

-- CreateIndex
CREATE INDEX "VendorPayment_paymentDate_idx" ON "VendorPayment"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_receiptNumber_key" ON "PaymentReceipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "PaymentReceipt_tenantId_idx" ON "PaymentReceipt"("tenantId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_clientId_idx" ON "PaymentReceipt"("clientId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_matterId_idx" ON "PaymentReceipt"("matterId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_invoiceId_idx" ON "PaymentReceipt"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_status_idx" ON "PaymentReceipt"("status");

-- CreateIndex
CREATE INDEX "PaymentReceipt_receivedAt_idx" ON "PaymentReceipt"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_noteNumber_key" ON "CreditNote"("noteNumber");

-- CreateIndex
CREATE INDEX "CreditNote_tenantId_idx" ON "CreditNote"("tenantId");

-- CreateIndex
CREATE INDEX "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");

-- CreateIndex
CREATE INDEX "CreditNote_matterId_idx" ON "CreditNote"("matterId");

-- CreateIndex
CREATE INDEX "CreditNote_status_idx" ON "CreditNote"("status");

-- CreateIndex
CREATE INDEX "ComplianceReport_tenantId_idx" ON "ComplianceReport"("tenantId");

-- CreateIndex
CREATE INDEX "ComplianceReport_reportType_idx" ON "ComplianceReport"("reportType");

-- CreateIndex
CREATE INDEX "ComplianceReport_status_idx" ON "ComplianceReport"("status");

-- CreateIndex
CREATE INDEX "ExternalJobQueue_tenantId_idx" ON "ExternalJobQueue"("tenantId");

-- CreateIndex
CREATE INDEX "ExternalJobQueue_provider_status_idx" ON "ExternalJobQueue"("provider", "status");

-- CreateIndex
CREATE INDEX "ExternalJobQueue_entityType_entityId_idx" ON "ExternalJobQueue"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ExternalJobQueue_nextRetryAt_idx" ON "ExternalJobQueue"("nextRetryAt");

-- CreateIndex
CREATE INDEX "ExchangeRate_tenantId_idx" ON "ExchangeRate"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_tenantId_baseCurrency_quoteCurrency_effectiveD_key" ON "ExchangeRate"("tenantId", "baseCurrency", "quoteCurrency", "effectiveDate");

-- CreateIndex
CREATE INDEX "AccountingPeriod_tenantId_idx" ON "AccountingPeriod"("tenantId");

-- CreateIndex
CREATE INDEX "AccountingPeriod_status_idx" ON "AccountingPeriod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_tenantId_name_key" ON "AccountingPeriod"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_tenantId_month_year_key" ON "AccountingPeriod"("tenantId", "month", "year");

-- CreateIndex
CREATE INDEX "PayrollBatch_tenantId_idx" ON "PayrollBatch"("tenantId");

-- CreateIndex
CREATE INDEX "PayrollBatch_branchId_idx" ON "PayrollBatch"("branchId");

-- CreateIndex
CREATE INDEX "PayrollBatch_status_idx" ON "PayrollBatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollBatch_tenantId_month_year_branchId_key" ON "PayrollBatch"("tenantId", "month", "year", "branchId");

-- CreateIndex
CREATE INDEX "Payslip_tenantId_idx" ON "Payslip"("tenantId");

-- CreateIndex
CREATE INDEX "Payslip_batchId_idx" ON "Payslip"("batchId");

-- CreateIndex
CREATE INDEX "Payslip_userId_idx" ON "Payslip"("userId");

-- CreateIndex
CREATE INDEX "BankStatement_tenantId_idx" ON "BankStatement"("tenantId");

-- CreateIndex
CREATE INDEX "BankTransaction_tenantId_idx" ON "BankTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "BankTransaction_bankStatementId_idx" ON "BankTransaction"("bankStatementId");

-- CreateIndex
CREATE INDEX "BankTransaction_tenantId_reference_idx" ON "BankTransaction"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "ReconciliationRun_tenantId_idx" ON "ReconciliationRun"("tenantId");

-- CreateIndex
CREATE INDEX "ReconciliationMatch_tenantId_idx" ON "ReconciliationMatch"("tenantId");

-- CreateIndex
CREATE INDEX "ReconciliationMatch_tenantId_status_idx" ON "ReconciliationMatch"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReconciliationMatch_runId_idx" ON "ReconciliationMatch"("runId");

-- CreateIndex
CREATE INDEX "ReconciliationMatch_bankTransactionId_idx" ON "ReconciliationMatch"("bankTransactionId");

-- CreateIndex
CREATE INDEX "ReconciliationMatch_trustTransactionId_idx" ON "ReconciliationMatch"("trustTransactionId");

-- CreateIndex
CREATE INDEX "ReconciliationMatch_clientTrustLedgerId_idx" ON "ReconciliationMatch"("clientTrustLedgerId");

-- CreateIndex
CREATE INDEX "ReconciliationMatch_varianceStatus_idx" ON "ReconciliationMatch"("varianceStatus");

-- CreateIndex
CREATE INDEX "TimerSession_tenantId_idx" ON "TimerSession"("tenantId");

-- CreateIndex
CREATE INDEX "TimerSession_matterId_idx" ON "TimerSession"("matterId");

-- CreateIndex
CREATE INDEX "TimerSession_userId_idx" ON "TimerSession"("userId");

-- CreateIndex
CREATE INDEX "_UserRoles_B_index" ON "_UserRoles"("B");

-- CreateIndex
CREATE INDEX "_RolePermissions_B_index" ON "_RolePermissions"("B");

-- CreateIndex
CREATE INDEX "_UserPermissions_B_index" ON "_UserPermissions"("B");

-- CreateIndex
CREATE INDEX "_EventAttendees_B_index" ON "_EventAttendees"("B");

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaSecret" ADD CONSTRAINT "MfaSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_parentRoleId_fkey" FOREIGN KEY ("parentRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipRecord" ADD CONSTRAINT "OwnershipRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantEncryptionKey" ADD CONSTRAINT "TenantEncryptionKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldEncryption" ADD CONSTRAINT "FieldEncryption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLimitLog" ADD CONSTRAINT "RateLimitLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLimitLog" ADD CONSTRAINT "RateLimitLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAlert" ADD CONSTRAINT "AuditAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpressService" ADD CONSTRAINT "ExpressService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringExpenseTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_leadAdvocateId_fkey" FOREIGN KEY ("leadAdvocateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterOriginator" ADD CONSTRAINT "MatterOriginator_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterOriginator" ADD CONSTRAINT "MatterOriginator_originatorId_fkey" FOREIGN KEY ("originatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterLien" ADD CONSTRAINT "MatterLien_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WriteOff" ADD CONSTRAINT "WriteOff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WriteOff" ADD CONSTRAINT "WriteOff_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WriteOff" ADD CONSTRAINT "WriteOff_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WriteOff" ADD CONSTRAINT "WriteOff_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtHearing" ADD CONSTRAINT "CourtHearing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtHearing" ADD CONSTRAINT "CourtHearing_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtHearing" ADD CONSTRAINT "CourtHearing_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtHearing" ADD CONSTRAINT "CourtHearing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterProfitabilitySnapshot" ADD CONSTRAINT "MatterProfitabilitySnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterProfitabilitySnapshot" ADD CONSTRAINT "MatterProfitabilitySnapshot_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterProfitabilitySnapshot" ADD CONSTRAINT "MatterProfitabilitySnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatuteOfLimitations" ADD CONSTRAINT "StatuteOfLimitations_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterParty" ADD CONSTRAINT "MatterParty_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterTemplate" ADD CONSTRAINT "MatterTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_advocateId_fkey" FOREIGN KEY ("advocateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_billingRunId_fkey" FOREIGN KEY ("billingRunId") REFERENCES "BillingRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterTask" ADD CONSTRAINT "MatterTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterTask" ADD CONSTRAINT "MatterTask_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterTask" ADD CONSTRAINT "MatterTask_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterTask" ADD CONSTRAINT "MatterTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MatterTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeTransaction" ADD CONSTRAINT "OfficeTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeTransaction" ADD CONSTRAINT "OfficeTransaction_officeAccountId_fkey" FOREIGN KEY ("officeAccountId") REFERENCES "OfficeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeTransaction" ADD CONSTRAINT "OfficeTransaction_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "OfficeReconciliation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpenseTemplate" ADD CONSTRAINT "RecurringExpenseTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpenseTemplate" ADD CONSTRAINT "RecurringExpenseTemplate_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpenseTemplate" ADD CONSTRAINT "RecurringExpenseTemplate_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpenseTemplate" ADD CONSTRAINT "RecurringExpenseTemplate_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpenseTemplate" ADD CONSTRAINT "RecurringExpenseTemplate_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnbilledWip" ADD CONSTRAINT "UnbilledWip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnbilledWip" ADD CONSTRAINT "UnbilledWip_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_billingRunId_fkey" FOREIGN KEY ("billingRunId") REFERENCES "BillingRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRun" ADD CONSTRAINT "BillingRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountBalance" ADD CONSTRAINT "AccountBalance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountBalance" ADD CONSTRAINT "AccountBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PayrollBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatutoryDeductionRecord" ADD CONSTRAINT "StatutoryDeductionRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatutoryDeductionRecord" ADD CONSTRAINT "StatutoryDeductionRecord_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_previousId_fkey" FOREIGN KEY ("previousId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientComplianceCheck" ADD CONSTRAINT "ClientComplianceCheck_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientComplianceCheck" ADD CONSTRAINT "ClientComplianceCheck_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientComplianceCheck" ADD CONSTRAINT "ClientComplianceCheck_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientKycProfile" ADD CONSTRAINT "ClientKycProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientKycProfile" ADD CONSTRAINT "ClientKycProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientKycProfile" ADD CONSTRAINT "ClientKycProfile_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTrustLedger" ADD CONSTRAINT "ClientTrustLedger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTrustLedger" ADD CONSTRAINT "ClientTrustLedger_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTrustLedger" ADD CONSTRAINT "ClientTrustLedger_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RequestForQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_rfqItemId_fkey" FOREIGN KEY ("rfqItemId") REFERENCES "RequestForQuotationItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceipt" ADD CONSTRAINT "PurchaseOrderReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceipt" ADD CONSTRAINT "PurchaseOrderReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceiptLine" ADD CONSTRAINT "PurchaseOrderReceiptLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceiptLine" ADD CONSTRAINT "PurchaseOrderReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseOrderReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceiptLine" ADD CONSTRAINT "PurchaseOrderReceiptLine_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarReminder" ADD CONSTRAINT "CalendarReminder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarReminder" ADD CONSTRAINT "CalendarReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarReminder" ADD CONSTRAINT "CalendarReminder_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarReminder" ADD CONSTRAINT "CalendarReminder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarRecurrenceRule" ADD CONSTRAINT "CalendarRecurrenceRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarRecurrenceRule" ADD CONSTRAINT "CalendarRecurrenceRule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSubscription" ADD CONSTRAINT "CalendarSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSubscription" ADD CONSTRAINT "CalendarSubscription_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSubscription" ADD CONSTRAINT "CalendarSubscription_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCalendarAccount" ADD CONSTRAINT "ExternalCalendarAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCalendarAccount" ADD CONSTRAINT "ExternalCalendarAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSyncCursor" ADD CONSTRAINT "CalendarSyncCursor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSyncCursor" ADD CONSTRAINT "CalendarSyncCursor_externalAccountId_fkey" FOREIGN KEY ("externalAccountId") REFERENCES "ExternalCalendarAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementRequestNote" ADD CONSTRAINT "DisbursementRequestNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementRequestNote" ADD CONSTRAINT "DisbursementRequestNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementRequestNote" ADD CONSTRAINT "DisbursementRequestNote_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementRequestNote" ADD CONSTRAINT "DisbursementRequestNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTitle" ADD CONSTRAINT "JobTitle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePerformance" ADD CONSTRAINT "EmployeePerformance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePerformance" ADD CONSTRAINT "EmployeePerformance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePerformance" ADD CONSTRAINT "EmployeePerformance_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePerformance" ADD CONSTRAINT "EmployeePerformance_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGoal" ADD CONSTRAINT "EmployeeGoal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGoal" ADD CONSTRAINT "EmployeeGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGoal" ADD CONSTRAINT "EmployeeGoal_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_payrollBatchId_fkey" FOREIGN KEY ("payrollBatchId") REFERENCES "PayrollBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustAccount" ADD CONSTRAINT "TrustAccount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustAccount" ADD CONSTRAINT "TrustAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeAccount" ADD CONSTRAINT "OfficeAccount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeAccount" ADD CONSTRAINT "OfficeAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustTransaction" ADD CONSTRAINT "TrustTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustTransaction" ADD CONSTRAINT "TrustTransaction_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustTransaction" ADD CONSTRAINT "TrustTransaction_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "TrustReconciliation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustTransaction" ADD CONSTRAINT "TrustTransaction_trustAccountId_fkey" FOREIGN KEY ("trustAccountId") REFERENCES "TrustAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustTransaction" ADD CONSTRAINT "TrustTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustReconciliation" ADD CONSTRAINT "TrustReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustReconciliation" ADD CONSTRAINT "TrustReconciliation_trustAccountId_fkey" FOREIGN KEY ("trustAccountId") REFERENCES "TrustAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeReconciliation" ADD CONSTRAINT "OfficeReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeReconciliation" ADD CONSTRAINT "OfficeReconciliation_officeAccountId_fkey" FOREIGN KEY ("officeAccountId") REFERENCES "OfficeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReconciliation" ADD CONSTRAINT "ExpenseReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReconciliation" ADD CONSTRAINT "ExpenseReconciliation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "ExpenseEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasActivityLog" ADD CONSTRAINT "SaasActivityLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionLog" ADD CONSTRAINT "ReceptionLog_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionLog" ADD CONSTRAINT "ReceptionLog_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionLog" ADD CONSTRAINT "ReceptionLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForQuotation" ADD CONSTRAINT "RequestForQuotation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForQuotation" ADD CONSTRAINT "RequestForQuotation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForQuotation" ADD CONSTRAINT "RequestForQuotation_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForQuotationItem" ADD CONSTRAINT "RequestForQuotationItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForQuotationItem" ADD CONSTRAINT "RequestForQuotationItem_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RequestForQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForQuotationSupplier" ADD CONSTRAINT "RequestForQuotationSupplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForQuotationSupplier" ADD CONSTRAINT "RequestForQuotationSupplier_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RequestForQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForQuotationSupplier" ADD CONSTRAINT "RequestForQuotationSupplier_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceiptAllocation" ADD CONSTRAINT "PaymentReceiptAllocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceiptAllocation" ADD CONSTRAINT "PaymentReceiptAllocation_paymentReceiptId_fkey" FOREIGN KEY ("paymentReceiptId") REFERENCES "PaymentReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceiptAllocation" ADD CONSTRAINT "PaymentReceiptAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillLine" ADD CONSTRAINT "VendorBillLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillLine" ADD CONSTRAINT "VendorBillLine_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillLine" ADD CONSTRAINT "VendorBillLine_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceReport" ADD CONSTRAINT "ComplianceReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceReport" ADD CONSTRAINT "ComplianceReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceReport" ADD CONSTRAINT "ComplianceReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalJobQueue" ADD CONSTRAINT "ExternalJobQueue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollBatch" ADD CONSTRAINT "PayrollBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollBatch" ADD CONSTRAINT "PayrollBatch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollBatch" ADD CONSTRAINT "PayrollBatch_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollBatch" ADD CONSTRAINT "PayrollBatch_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PayrollBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankStatementId_fkey" FOREIGN KEY ("bankStatementId") REFERENCES "BankStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRun" ADD CONSTRAINT "ReconciliationRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_trustTransactionId_fkey" FOREIGN KEY ("trustTransactionId") REFERENCES "TrustTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationMatch" ADD CONSTRAINT "ReconciliationMatch_clientTrustLedgerId_fkey" FOREIGN KEY ("clientTrustLedgerId") REFERENCES "ClientTrustLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerSession" ADD CONSTRAINT "TimerSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerSession" ADD CONSTRAINT "TimerSession_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerSession" ADD CONSTRAINT "TimerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserRoles" ADD CONSTRAINT "_UserRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserRoles" ADD CONSTRAINT "_UserRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RolePermissions" ADD CONSTRAINT "_RolePermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RolePermissions" ADD CONSTRAINT "_RolePermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPermissions" ADD CONSTRAINT "_UserPermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPermissions" ADD CONSTRAINT "_UserPermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventAttendees" ADD CONSTRAINT "_EventAttendees_A_fkey" FOREIGN KEY ("A") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventAttendees" ADD CONSTRAINT "_EventAttendees_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
