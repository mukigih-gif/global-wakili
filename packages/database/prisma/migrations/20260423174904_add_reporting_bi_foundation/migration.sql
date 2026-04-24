-- CreateEnum
CREATE TYPE "ReportDefinitionType" AS ENUM ('DASHBOARD', 'OPERATIONAL', 'FINANCIAL', 'TRUST', 'COMPLIANCE', 'ANALYTICS', 'AI', 'APPROVAL', 'PLATFORM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportSourceLayer" AS ENUM ('ANALYTICS', 'DIRECT_QUERY', 'SNAPSHOT', 'HYBRID');

-- CreateEnum
CREATE TYPE "ReportRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReportExportFormat" AS ENUM ('JSON', 'CSV', 'XLSX', 'PDF', 'POWER_BI');

-- CreateEnum
CREATE TYPE "ReportExportStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReportDeliveryChannel" AS ENUM ('DOWNLOAD', 'EMAIL', 'WEBHOOK', 'INTERNAL');

-- CreateEnum
CREATE TYPE "DashboardVisibility" AS ENUM ('PRIVATE', 'ROLE', 'TENANT', 'PLATFORM');

-- CreateEnum
CREATE TYPE "BIConnectorType" AS ENUM ('POWER_BI', 'GENERIC_API', 'WEBHOOK', 'DATA_EXPORT');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "ReportDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ReportDefinitionType" NOT NULL DEFAULT 'OPERATIONAL',
    "sourceLayer" "ReportSourceLayer" NOT NULL DEFAULT 'HYBRID',
    "defaultFormat" "ReportExportFormat" NOT NULL DEFAULT 'JSON',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "filterSchema" JSONB,
    "columnSchema" JSONB,
    "tags" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportDefinitionId" TEXT NOT NULL,
    "status" "ReportRunStatus" NOT NULL DEFAULT 'QUEUED',
    "sourceLayer" "ReportSourceLayer" NOT NULL DEFAULT 'HYBRID',
    "triggeredByUserId" TEXT,
    "parameters" JSONB,
    "resultSummary" JSONB,
    "snapshotRefType" TEXT,
    "snapshotRefId" TEXT,
    "rowCount" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportDefinitionId" TEXT NOT NULL,
    "reportRunId" TEXT,
    "status" "ReportExportStatus" NOT NULL DEFAULT 'PENDING',
    "format" "ReportExportFormat" NOT NULL DEFAULT 'JSON',
    "deliveryChannel" "ReportDeliveryChannel" NOT NULL DEFAULT 'DOWNLOAD',
    "fileName" TEXT,
    "mimeType" TEXT,
    "storageKey" TEXT,
    "checksum" TEXT,
    "byteSize" INTEGER,
    "downloadUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "DashboardVisibility" NOT NULL DEFAULT 'TENANT',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "layout" JSONB,
    "filters" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardWidget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dashboardDefinitionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "dataSource" TEXT,
    "config" JSONB,
    "position" JSONB,
    "visibilityRules" JSONB,
    "refreshIntervalSec" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BIConnectorConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectorType" "BIConnectorType" NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "endpointUrl" TEXT,
    "workspaceId" TEXT,
    "datasetId" TEXT,
    "credentialsRef" TEXT,
    "config" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BIConnectorConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportDefinitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" "ScheduleFrequency" NOT NULL,
    "cronExpression" TEXT,
    "timezone" TEXT,
    "format" "ReportExportFormat" NOT NULL DEFAULT 'JSON',
    "deliveryChannel" "ReportDeliveryChannel" NOT NULL DEFAULT 'DOWNLOAD',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "recipients" JSONB,
    "parameters" JSONB,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportDefinition_tenantId_idx" ON "ReportDefinition"("tenantId");

-- CreateIndex
CREATE INDEX "ReportDefinition_tenantId_type_idx" ON "ReportDefinition"("tenantId", "type");

-- CreateIndex
CREATE INDEX "ReportDefinition_tenantId_isActive_idx" ON "ReportDefinition"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "ReportDefinition_tenantId_sourceLayer_idx" ON "ReportDefinition"("tenantId", "sourceLayer");

-- CreateIndex
CREATE INDEX "ReportDefinition_createdAt_idx" ON "ReportDefinition"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportDefinition_tenantId_key_key" ON "ReportDefinition"("tenantId", "key");

-- CreateIndex
CREATE INDEX "ReportRun_tenantId_idx" ON "ReportRun"("tenantId");

-- CreateIndex
CREATE INDEX "ReportRun_tenantId_status_idx" ON "ReportRun"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReportRun_reportDefinitionId_idx" ON "ReportRun"("reportDefinitionId");

-- CreateIndex
CREATE INDEX "ReportRun_triggeredByUserId_idx" ON "ReportRun"("triggeredByUserId");

-- CreateIndex
CREATE INDEX "ReportRun_snapshotRefType_snapshotRefId_idx" ON "ReportRun"("snapshotRefType", "snapshotRefId");

-- CreateIndex
CREATE INDEX "ReportRun_createdAt_idx" ON "ReportRun"("createdAt");

-- CreateIndex
CREATE INDEX "ReportExport_tenantId_idx" ON "ReportExport"("tenantId");

-- CreateIndex
CREATE INDEX "ReportExport_tenantId_status_idx" ON "ReportExport"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReportExport_tenantId_format_idx" ON "ReportExport"("tenantId", "format");

-- CreateIndex
CREATE INDEX "ReportExport_reportDefinitionId_idx" ON "ReportExport"("reportDefinitionId");

-- CreateIndex
CREATE INDEX "ReportExport_reportRunId_idx" ON "ReportExport"("reportRunId");

-- CreateIndex
CREATE INDEX "ReportExport_expiresAt_idx" ON "ReportExport"("expiresAt");

-- CreateIndex
CREATE INDEX "ReportExport_createdAt_idx" ON "ReportExport"("createdAt");

-- CreateIndex
CREATE INDEX "DashboardDefinition_tenantId_idx" ON "DashboardDefinition"("tenantId");

-- CreateIndex
CREATE INDEX "DashboardDefinition_tenantId_visibility_idx" ON "DashboardDefinition"("tenantId", "visibility");

-- CreateIndex
CREATE INDEX "DashboardDefinition_tenantId_isActive_idx" ON "DashboardDefinition"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "DashboardDefinition_createdAt_idx" ON "DashboardDefinition"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardDefinition_tenantId_key_key" ON "DashboardDefinition"("tenantId", "key");

-- CreateIndex
CREATE INDEX "DashboardWidget_tenantId_idx" ON "DashboardWidget"("tenantId");

-- CreateIndex
CREATE INDEX "DashboardWidget_dashboardDefinitionId_idx" ON "DashboardWidget"("dashboardDefinitionId");

-- CreateIndex
CREATE INDEX "DashboardWidget_tenantId_isActive_idx" ON "DashboardWidget"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "DashboardWidget_createdAt_idx" ON "DashboardWidget"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardWidget_dashboardDefinitionId_key_key" ON "DashboardWidget"("dashboardDefinitionId", "key");

-- CreateIndex
CREATE INDEX "BIConnectorConfig_tenantId_idx" ON "BIConnectorConfig"("tenantId");

-- CreateIndex
CREATE INDEX "BIConnectorConfig_tenantId_connectorType_idx" ON "BIConnectorConfig"("tenantId", "connectorType");

-- CreateIndex
CREATE INDEX "BIConnectorConfig_tenantId_isEnabled_idx" ON "BIConnectorConfig"("tenantId", "isEnabled");

-- CreateIndex
CREATE INDEX "BIConnectorConfig_createdAt_idx" ON "BIConnectorConfig"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BIConnectorConfig_tenantId_name_key" ON "BIConnectorConfig"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ScheduledReport_tenantId_idx" ON "ScheduledReport"("tenantId");

-- CreateIndex
CREATE INDEX "ScheduledReport_tenantId_frequency_idx" ON "ScheduledReport"("tenantId", "frequency");

-- CreateIndex
CREATE INDEX "ScheduledReport_tenantId_isEnabled_idx" ON "ScheduledReport"("tenantId", "isEnabled");

-- CreateIndex
CREATE INDEX "ScheduledReport_reportDefinitionId_idx" ON "ScheduledReport"("reportDefinitionId");

-- CreateIndex
CREATE INDEX "ScheduledReport_nextRunAt_idx" ON "ScheduledReport"("nextRunAt");

-- CreateIndex
CREATE INDEX "ScheduledReport_createdAt_idx" ON "ScheduledReport"("createdAt");

-- AddForeignKey
ALTER TABLE "ReportDefinition" ADD CONSTRAINT "ReportDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRun" ADD CONSTRAINT "ReportRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRun" ADD CONSTRAINT "ReportRun_reportDefinitionId_fkey" FOREIGN KEY ("reportDefinitionId") REFERENCES "ReportDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_reportDefinitionId_fkey" FOREIGN KEY ("reportDefinitionId") REFERENCES "ReportDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_reportRunId_fkey" FOREIGN KEY ("reportRunId") REFERENCES "ReportRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardDefinition" ADD CONSTRAINT "DashboardDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_dashboardDefinitionId_fkey" FOREIGN KEY ("dashboardDefinitionId") REFERENCES "DashboardDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BIConnectorConfig" ADD CONSTRAINT "BIConnectorConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_reportDefinitionId_fkey" FOREIGN KEY ("reportDefinitionId") REFERENCES "ReportDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
