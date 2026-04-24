-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'AZURE_OPENAI', 'ANTHROPIC', 'GOOGLE_GEMINI', 'AWS_BEDROCK', 'INTERNAL_RULES', 'OCR_ONLY');

-- CreateEnum
CREATE TYPE "AITaskType" AS ENUM ('DOCUMENT_ANALYSIS', 'LEGAL_RESEARCH', 'CONTRACT_REVIEW', 'MATTER_RISK', 'DEADLINE_INTELLIGENCE', 'BILLING_INSIGHT', 'TRUST_COMPLIANCE_ALERT', 'CLIENT_INTAKE_ASSISTANT', 'DRAFTING_ASSISTANT', 'KNOWLEDGE_BASE', 'EXTRACTION', 'SUMMARIZATION', 'RECOMMENDATION');

-- CreateEnum
CREATE TYPE "AIExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'BLOCKED', 'CANCELLED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "AIArtifactStatus" AS ENUM ('DRAFT', 'GENERATED', 'REVIEW_REQUIRED', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AIReviewStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "AIRecommendationStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED', 'DISMISSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AIDataSensitivity" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'PRIVILEGED', 'HIGHLY_RESTRICTED');

-- CreateTable
CREATE TABLE "AIProviderConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultModel" TEXT,
    "endpointUrl" TEXT,
    "apiKeyRef" TEXT,
    "humanReviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "redactionRequired" BOOLEAN NOT NULL DEFAULT true,
    "usageCapDaily" INTEGER,
    "usageCapMonthly" INTEGER,
    "allowedScopes" JSONB,
    "blockedScopes" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPromptAudit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "taskType" "AITaskType" NOT NULL,
    "executionStatus" "AIExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "sensitivity" "AIDataSensitivity" NOT NULL DEFAULT 'CONFIDENTIAL',
    "promptTemplateKey" TEXT,
    "systemPrompt" TEXT,
    "userPrompt" TEXT,
    "redactedInput" JSONB,
    "outputPreview" JSONB,
    "requesterUserId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "queueJobId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPromptAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "taskType" "AITaskType" NOT NULL,
    "status" "AIExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "sensitivity" "AIDataSensitivity" NOT NULL DEFAULT 'CONFIDENTIAL',
    "requesterUserId" TEXT,
    "reviewerUserId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "promptAuditId" TEXT,
    "queueJobId" TEXT,
    "providerRequestId" TEXT,
    "modelName" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "estimatedCost" DECIMAL(14,4),
    "latencyMs" INTEGER,
    "redactionApplied" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIArtifact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskType" "AITaskType" NOT NULL,
    "status" "AIArtifactStatus" NOT NULL DEFAULT 'GENERATED',
    "sensitivity" "AIDataSensitivity" NOT NULL DEFAULT 'CONFIDENTIAL',
    "entityType" TEXT,
    "entityId" TEXT,
    "title" TEXT,
    "content" JSONB NOT NULL,
    "summary" TEXT,
    "promptAuditId" TEXT,
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT true,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "queueJobId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIReviewTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "artifactId" TEXT,
    "taskType" "AITaskType" NOT NULL,
    "status" "AIReviewStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "ApprovalPriority" NOT NULL DEFAULT 'NORMAL',
    "entityType" TEXT,
    "entityId" TEXT,
    "assignedReviewerId" TEXT,
    "reason" TEXT,
    "decisionReason" TEXT,
    "dueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRecommendation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskType" "AITaskType" NOT NULL,
    "status" "AIRecommendationStatus" NOT NULL DEFAULT 'OPEN',
    "sensitivity" "AIDataSensitivity" NOT NULL DEFAULT 'CONFIDENTIAL',
    "entityType" TEXT,
    "entityId" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "recommendation" JSONB NOT NULL,
    "confidence" DECIMAL(5,4),
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT true,
    "artifactId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIProviderConfig_tenantId_idx" ON "AIProviderConfig"("tenantId");

-- CreateIndex
CREATE INDEX "AIProviderConfig_tenantId_isEnabled_idx" ON "AIProviderConfig"("tenantId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "AIProviderConfig_tenantId_provider_key" ON "AIProviderConfig"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "AIPromptAudit_tenantId_idx" ON "AIPromptAudit"("tenantId");

-- CreateIndex
CREATE INDEX "AIPromptAudit_tenantId_provider_idx" ON "AIPromptAudit"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "AIPromptAudit_tenantId_taskType_idx" ON "AIPromptAudit"("tenantId", "taskType");

-- CreateIndex
CREATE INDEX "AIPromptAudit_tenantId_executionStatus_idx" ON "AIPromptAudit"("tenantId", "executionStatus");

-- CreateIndex
CREATE INDEX "AIPromptAudit_entityType_entityId_idx" ON "AIPromptAudit"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AIPromptAudit_createdAt_idx" ON "AIPromptAudit"("createdAt");

-- CreateIndex
CREATE INDEX "AIUsageLog_tenantId_idx" ON "AIUsageLog"("tenantId");

-- CreateIndex
CREATE INDEX "AIUsageLog_tenantId_provider_idx" ON "AIUsageLog"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "AIUsageLog_tenantId_taskType_idx" ON "AIUsageLog"("tenantId", "taskType");

-- CreateIndex
CREATE INDEX "AIUsageLog_tenantId_status_idx" ON "AIUsageLog"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AIUsageLog_promptAuditId_idx" ON "AIUsageLog"("promptAuditId");

-- CreateIndex
CREATE INDEX "AIUsageLog_entityType_entityId_idx" ON "AIUsageLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AIUsageLog_createdAt_idx" ON "AIUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "AIArtifact_tenantId_idx" ON "AIArtifact"("tenantId");

-- CreateIndex
CREATE INDEX "AIArtifact_tenantId_taskType_idx" ON "AIArtifact"("tenantId", "taskType");

-- CreateIndex
CREATE INDEX "AIArtifact_tenantId_status_idx" ON "AIArtifact"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AIArtifact_promptAuditId_idx" ON "AIArtifact"("promptAuditId");

-- CreateIndex
CREATE INDEX "AIArtifact_entityType_entityId_idx" ON "AIArtifact"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AIArtifact_createdAt_idx" ON "AIArtifact"("createdAt");

-- CreateIndex
CREATE INDEX "AIReviewTask_tenantId_idx" ON "AIReviewTask"("tenantId");

-- CreateIndex
CREATE INDEX "AIReviewTask_tenantId_status_idx" ON "AIReviewTask"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AIReviewTask_tenantId_taskType_idx" ON "AIReviewTask"("tenantId", "taskType");

-- CreateIndex
CREATE INDEX "AIReviewTask_artifactId_idx" ON "AIReviewTask"("artifactId");

-- CreateIndex
CREATE INDEX "AIReviewTask_assignedReviewerId_idx" ON "AIReviewTask"("assignedReviewerId");

-- CreateIndex
CREATE INDEX "AIReviewTask_dueAt_idx" ON "AIReviewTask"("dueAt");

-- CreateIndex
CREATE INDEX "AIReviewTask_createdAt_idx" ON "AIReviewTask"("createdAt");

-- CreateIndex
CREATE INDEX "AIRecommendation_tenantId_idx" ON "AIRecommendation"("tenantId");

-- CreateIndex
CREATE INDEX "AIRecommendation_tenantId_taskType_idx" ON "AIRecommendation"("tenantId", "taskType");

-- CreateIndex
CREATE INDEX "AIRecommendation_tenantId_status_idx" ON "AIRecommendation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AIRecommendation_artifactId_idx" ON "AIRecommendation"("artifactId");

-- CreateIndex
CREATE INDEX "AIRecommendation_entityType_entityId_idx" ON "AIRecommendation"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AIRecommendation_createdAt_idx" ON "AIRecommendation"("createdAt");

-- AddForeignKey
ALTER TABLE "AIProviderConfig" ADD CONSTRAINT "AIProviderConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPromptAudit" ADD CONSTRAINT "AIPromptAudit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_promptAuditId_fkey" FOREIGN KEY ("promptAuditId") REFERENCES "AIPromptAudit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIArtifact" ADD CONSTRAINT "AIArtifact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIArtifact" ADD CONSTRAINT "AIArtifact_promptAuditId_fkey" FOREIGN KEY ("promptAuditId") REFERENCES "AIPromptAudit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReviewTask" ADD CONSTRAINT "AIReviewTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReviewTask" ADD CONSTRAINT "AIReviewTask_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "AIArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "AIArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
