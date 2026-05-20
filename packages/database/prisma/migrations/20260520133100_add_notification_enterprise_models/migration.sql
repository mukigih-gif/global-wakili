-- Migration B: Notifications N2B enterprise models.
-- Purpose: add approved notification persistence boundary.
-- Safety: create-only SQL. No DROP. No RENAME. No existing table rewrite.

DO $$
BEGIN
  CREATE TYPE "NotificationDeliveryAttemptStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DELIVERED', 'FAILED', 'BOUNCED', 'RETRYING', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NotificationProviderConfigStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TESTING', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NotificationWebhookVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NotificationTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NotificationPreferenceScope" AS ENUM ('TENANT', 'USER', 'ROLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "NotificationDeliveryAttempt" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "notificationId" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "provider" TEXT,
  "providerMessageId" TEXT,
  "status" "NotificationDeliveryAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "acceptedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "bouncedAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "requestPayloadHash" TEXT,
  "responsePayloadHash" TEXT,
  "rawResponse" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationProviderConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "providerKey" TEXT NOT NULL,
  "displayName" TEXT,
  "status" "NotificationProviderConfigStatus" NOT NULL DEFAULT 'INACTIVE',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "credentialsRef" TEXT,
  "webhookSecretRef" TEXT,
  "config" JSONB,
  "metadata" JSONB,
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationWebhookEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "notificationId" TEXT,
  "provider" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "eventType" TEXT NOT NULL,
  "status" "NotificationStatus",
  "verificationStatus" "NotificationWebhookVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "payloadHash" TEXT,
  "payload" JSONB,
  "headers" JSONB,
  "signature" TEXT,
  "processedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "channel" "NotificationChannel",
  "subject" TEXT,
  "body" TEXT,
  "smsContent" TEXT,
  "systemTitle" TEXT,
  "systemMessage" TEXT,
  "variables" JSONB,
  "status" "NotificationTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "scope" "NotificationPreferenceScope" NOT NULL DEFAULT 'USER',
  "scopeId" TEXT NOT NULL,
  "userId" TEXT,
  "category" TEXT NOT NULL DEFAULT 'all',
  "channel" "NotificationChannel" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "quietHoursStart" INTEGER,
  "quietHoursEnd" INTEGER,
  "timezone" TEXT,
  "criticalBypass" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- Migration B companion: Notifications N2B foreign keys, indexes, and uniqueness.
-- Purpose: complete tenant-scoped relational integrity for the approved notification models.
-- Safety posture: additive constraints and indexes only.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationDeliveryAttempt_tenantId_fkey'
  ) THEN
    ALTER TABLE "NotificationDeliveryAttempt"
      ADD CONSTRAINT "NotificationDeliveryAttempt_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationDeliveryAttempt_notificationId_fkey'
  ) THEN
    ALTER TABLE "NotificationDeliveryAttempt"
      ADD CONSTRAINT "NotificationDeliveryAttempt_notificationId_fkey"
      FOREIGN KEY ("notificationId") REFERENCES "Notification"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationProviderConfig_tenantId_fkey'
  ) THEN
    ALTER TABLE "NotificationProviderConfig"
      ADD CONSTRAINT "NotificationProviderConfig_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationWebhookEvent_tenantId_fkey'
  ) THEN
    ALTER TABLE "NotificationWebhookEvent"
      ADD CONSTRAINT "NotificationWebhookEvent_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationWebhookEvent_notificationId_fkey'
  ) THEN
    ALTER TABLE "NotificationWebhookEvent"
      ADD CONSTRAINT "NotificationWebhookEvent_notificationId_fkey"
      FOREIGN KEY ("notificationId") REFERENCES "Notification"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationTemplate_tenantId_fkey'
  ) THEN
    ALTER TABLE "NotificationTemplate"
      ADD CONSTRAINT "NotificationTemplate_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationPreference_tenantId_fkey'
  ) THEN
    ALTER TABLE "NotificationPreference"
      ADD CONSTRAINT "NotificationPreference_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationPreference_userId_fkey'
  ) THEN
    ALTER TABLE "NotificationPreference"
      ADD CONSTRAINT "NotificationPreference_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "NotificationDeliveryAttempt_tenantId_idx"
  ON "NotificationDeliveryAttempt"("tenantId");

CREATE INDEX IF NOT EXISTS "NotificationDeliveryAttempt_tenantId_notificationId_idx"
  ON "NotificationDeliveryAttempt"("tenantId", "notificationId");

CREATE INDEX IF NOT EXISTS "NotificationDeliveryAttempt_tenantId_providerMessageId_idx"
  ON "NotificationDeliveryAttempt"("tenantId", "providerMessageId");

CREATE INDEX IF NOT EXISTS "NotificationDeliveryAttempt_tenantId_status_idx"
  ON "NotificationDeliveryAttempt"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "NotificationDeliveryAttempt_tenantId_nextRetryAt_idx"
  ON "NotificationDeliveryAttempt"("tenantId", "nextRetryAt");

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationProviderConfig_tenantId_channel_providerKey_key"
  ON "NotificationProviderConfig"("tenantId", "channel", "providerKey");

CREATE INDEX IF NOT EXISTS "NotificationProviderConfig_tenantId_idx"
  ON "NotificationProviderConfig"("tenantId");

CREATE INDEX IF NOT EXISTS "NotificationProviderConfig_tenantId_channel_idx"
  ON "NotificationProviderConfig"("tenantId", "channel");

CREATE INDEX IF NOT EXISTS "NotificationProviderConfig_tenantId_status_idx"
  ON "NotificationProviderConfig"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "NotificationWebhookEvent_tenantId_idx"
  ON "NotificationWebhookEvent"("tenantId");

CREATE INDEX IF NOT EXISTS "NotificationWebhookEvent_tenantId_provider_idx"
  ON "NotificationWebhookEvent"("tenantId", "provider");

CREATE INDEX IF NOT EXISTS "NotificationWebhookEvent_tenantId_providerMessageId_idx"
  ON "NotificationWebhookEvent"("tenantId", "providerMessageId");

CREATE INDEX IF NOT EXISTS "NotificationWebhookEvent_tenantId_verificationStatus_idx"
  ON "NotificationWebhookEvent"("tenantId", "verificationStatus");

CREATE INDEX IF NOT EXISTS "NotificationWebhookEvent_tenantId_createdAt_idx"
  ON "NotificationWebhookEvent"("tenantId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationTemplate_tenantId_key_version_key"
  ON "NotificationTemplate"("tenantId", "key", "version");

CREATE INDEX IF NOT EXISTS "NotificationTemplate_tenantId_idx"
  ON "NotificationTemplate"("tenantId");

CREATE INDEX IF NOT EXISTS "NotificationTemplate_tenantId_key_idx"
  ON "NotificationTemplate"("tenantId", "key");

CREATE INDEX IF NOT EXISTS "NotificationTemplate_tenantId_status_idx"
  ON "NotificationTemplate"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "NotificationTemplate_category_idx"
  ON "NotificationTemplate"("category");

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_tenantId_scope_scopeId_category_channel_key"
  ON "NotificationPreference"("tenantId", "scope", "scopeId", "category", "channel");

CREATE INDEX IF NOT EXISTS "NotificationPreference_tenantId_idx"
  ON "NotificationPreference"("tenantId");

CREATE INDEX IF NOT EXISTS "NotificationPreference_tenantId_userId_idx"
  ON "NotificationPreference"("tenantId", "userId");

CREATE INDEX IF NOT EXISTS "NotificationPreference_tenantId_category_idx"
  ON "NotificationPreference"("tenantId", "category");

CREATE INDEX IF NOT EXISTS "NotificationPreference_tenantId_channel_idx"
  ON "NotificationPreference"("tenantId", "channel");
