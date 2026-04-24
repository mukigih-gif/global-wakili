/*
  Warnings:

  - You are about to drop the column `reversalReason` on the `PaymentReceipt` table. All the data in the column will be lost.
  - You are about to drop the column `reversedAt` on the `PaymentReceipt` table. All the data in the column will be lost.
  - You are about to drop the column `reversedById` on the `PaymentReceipt` table. All the data in the column will be lost.
  - You are about to drop the `PaymentReceiptSequence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProformaInvoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProformaInvoiceLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SaasActivityLog` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `invoiceNumber` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AnalyticsModule" AS ENUM ('OVERVIEW', 'CLIENT', 'MATTER', 'BILLING', 'TRUST', 'PRODUCTIVITY', 'COURT', 'CALENDAR', 'COMPLIANCE', 'NOTIFICATIONS', 'QUEUES', 'FINANCE', 'PROCUREMENT', 'PAYROLL', 'HR', 'RECEPTION', 'PLATFORM');

-- CreateEnum
CREATE TYPE "AnalyticsMetricScope" AS ENUM ('TENANT', 'CLIENT', 'MATTER', 'USER', 'MODULE', 'ENTITY');

-- CreateEnum
CREATE TYPE "AnalyticsMetricValueType" AS ENUM ('NUMBER', 'MONEY', 'PERCENTAGE', 'COUNT', 'BOOLEAN', 'DURATION', 'RATIO', 'JSON');

-- CreateEnum
CREATE TYPE "AnalyticsSnapshotStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AnalyticsInsightSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AnalyticsInsightStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- DropForeignKey
ALTER TABLE "PaymentReceipt" DROP CONSTRAINT "PaymentReceipt_reversedById_fkey";

-- DropForeignKey
ALTER TABLE "PaymentReceiptSequence" DROP CONSTRAINT "PaymentReceiptSequence_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ProformaInvoice" DROP CONSTRAINT "ProformaInvoice_branchId_fkey";

-- DropForeignKey
ALTER TABLE "ProformaInvoice" DROP CONSTRAINT "ProformaInvoice_clientId_fkey";

-- DropForeignKey
ALTER TABLE "ProformaInvoice" DROP CONSTRAINT "ProformaInvoice_convertedInvoiceId_fkey";

-- DropForeignKey
ALTER TABLE "ProformaInvoice" DROP CONSTRAINT "ProformaInvoice_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ProformaInvoice" DROP CONSTRAINT "ProformaInvoice_matterId_fkey";

-- DropForeignKey
ALTER TABLE "ProformaInvoice" DROP CONSTRAINT "ProformaInvoice_sentById_fkey";

-- DropForeignKey
ALTER TABLE "ProformaInvoice" DROP CONSTRAINT "ProformaInvoice_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ProformaInvoiceLine" DROP CONSTRAINT "ProformaInvoiceLine_proformaInvoiceId_fkey";

-- DropForeignKey
ALTER TABLE "ProformaInvoiceLine" DROP CONSTRAINT "ProformaInvoiceLine_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SaasActivityLog" DROP CONSTRAINT "SaasActivityLog_tenantId_fkey";

-- DropIndex
DROP INDEX "Invoice_tenantId_issuedDate_idx";

-- DropIndex
DROP INDEX "Invoice_tenantId_matterId_idx";

-- DropIndex
DROP INDEX "Invoice_tenantId_status_idx";

-- DropIndex
DROP INDEX "JournalEntry_source_idx";

-- DropIndex
DROP INDEX "PaymentReceipt_reversedById_idx";

-- DropIndex
DROP INDEX "PaymentReceipt_tenantId_receiptNumber_idx";

-- DropIndex
DROP INDEX "PaymentReceipt_tenantId_reference_idx";

-- DropIndex
DROP INDEX "PaymentReceiptAllocation_tenantId_invoiceId_idx";

-- DropIndex
DROP INDEX "PaymentReceiptAllocation_tenantId_paymentReceiptId_idx";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "invoiceNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "InvoiceSequence" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PaymentReceipt" DROP COLUMN "reversalReason",
DROP COLUMN "reversedAt",
DROP COLUMN "reversedById";

-- AlterTable
ALTER TABLE "PaymentRefund" ADD COLUMN     "paymentReceiptAllocationId" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WithholdingTaxCertificate" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "PaymentReceiptSequence";

-- DropTable
DROP TABLE "ProformaInvoice";

-- DropTable
DROP TABLE "ProformaInvoiceLine";

-- DropTable
DROP TABLE "SaasActivityLog";

-- CreateTable
CREATE TABLE "AnalyticsMetric" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "AnalyticsModule" NOT NULL,
    "scope" "AnalyticsMetricScope" NOT NULL DEFAULT 'TENANT',
    "metricKey" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "valueType" "AnalyticsMetricValueType" NOT NULL DEFAULT 'NUMBER',
    "unit" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "dimensions" JSONB,
    "metadata" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "AnalyticsModule" NOT NULL,
    "snapshotKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "AnalyticsSnapshotStatus" NOT NULL DEFAULT 'ACTIVE',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "metrics" JSONB,
    "metadata" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsInsight" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "AnalyticsModule" NOT NULL,
    "insightKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" "AnalyticsInsightSeverity" NOT NULL DEFAULT 'INFO',
    "status" "AnalyticsInsightStatus" NOT NULL DEFAULT 'OPEN',
    "entityType" TEXT,
    "entityId" TEXT,
    "score" INTEGER,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "payload" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformActivityLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "performedBy" TEXT,
    "module" TEXT NOT NULL DEFAULT 'PLATFORM',
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "source" TEXT NOT NULL DEFAULT 'PLATFORM_ADMIN',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "correlationId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "beforeState" JSONB,
    "afterState" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsMetric_tenantId_idx" ON "AnalyticsMetric"("tenantId");

-- CreateIndex
CREATE INDEX "AnalyticsMetric_tenantId_module_idx" ON "AnalyticsMetric"("tenantId", "module");

-- CreateIndex
CREATE INDEX "AnalyticsMetric_tenantId_scope_idx" ON "AnalyticsMetric"("tenantId", "scope");

-- CreateIndex
CREATE INDEX "AnalyticsMetric_tenantId_metricKey_idx" ON "AnalyticsMetric"("tenantId", "metricKey");

-- CreateIndex
CREATE INDEX "AnalyticsMetric_tenantId_periodStart_periodEnd_idx" ON "AnalyticsMetric"("tenantId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "AnalyticsMetric_sourceEntityType_sourceEntityId_idx" ON "AnalyticsMetric"("sourceEntityType", "sourceEntityId");

-- CreateIndex
CREATE INDEX "AnalyticsMetric_computedAt_idx" ON "AnalyticsMetric"("computedAt");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_tenantId_idx" ON "AnalyticsSnapshot"("tenantId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_tenantId_module_idx" ON "AnalyticsSnapshot"("tenantId", "module");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_tenantId_snapshotKey_idx" ON "AnalyticsSnapshot"("tenantId", "snapshotKey");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_tenantId_status_idx" ON "AnalyticsSnapshot"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_tenantId_periodStart_periodEnd_idx" ON "AnalyticsSnapshot"("tenantId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_generatedAt_idx" ON "AnalyticsSnapshot"("generatedAt");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_tenantId_idx" ON "AnalyticsInsight"("tenantId");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_tenantId_module_idx" ON "AnalyticsInsight"("tenantId", "module");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_tenantId_severity_idx" ON "AnalyticsInsight"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_tenantId_status_idx" ON "AnalyticsInsight"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_entityType_entityId_idx" ON "AnalyticsInsight"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_detectedAt_idx" ON "AnalyticsInsight"("detectedAt");

-- CreateIndex
CREATE INDEX "PlatformActivityLog_tenantId_idx" ON "PlatformActivityLog"("tenantId");

-- CreateIndex
CREATE INDEX "PlatformActivityLog_performedBy_idx" ON "PlatformActivityLog"("performedBy");

-- CreateIndex
CREATE INDEX "PlatformActivityLog_module_idx" ON "PlatformActivityLog"("module");

-- CreateIndex
CREATE INDEX "PlatformActivityLog_action_idx" ON "PlatformActivityLog"("action");

-- CreateIndex
CREATE INDEX "PlatformActivityLog_entityType_entityId_idx" ON "PlatformActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "PlatformActivityLog_severity_idx" ON "PlatformActivityLog"("severity");

-- CreateIndex
CREATE INDEX "PlatformActivityLog_outcome_idx" ON "PlatformActivityLog"("outcome");

-- CreateIndex
CREATE INDEX "PlatformActivityLog_source_idx" ON "PlatformActivityLog"("source");

-- CreateIndex
CREATE INDEX "PlatformActivityLog_requestId_idx" ON "PlatformActivityLog"("requestId");

-- CreateIndex
CREATE INDEX "PlatformActivityLog_correlationId_idx" ON "PlatformActivityLog"("correlationId");

-- CreateIndex
CREATE INDEX "PlatformActivityLog_timestamp_idx" ON "PlatformActivityLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_matterId_idx" ON "Invoice"("matterId");

-- CreateIndex
CREATE INDEX "Invoice_etimsValidated_idx" ON "Invoice"("etimsValidated");

-- CreateIndex
CREATE INDEX "Invoice_issuedDate_idx" ON "Invoice"("issuedDate");

-- RenameForeignKey
ALTER TABLE "PaymentReceiptAllocation" RENAME CONSTRAINT "PaymentReceiptAllocation_whtCertificate_fkey" TO "PaymentReceiptAllocation_withholdingTaxCertificateId_fkey";

-- AddForeignKey
ALTER TABLE "AnalyticsMetric" ADD CONSTRAINT "AnalyticsMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsInsight" ADD CONSTRAINT "AnalyticsInsight_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformActivityLog" ADD CONSTRAINT "PlatformActivityLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentReceiptAllocationId_fkey" FOREIGN KEY ("paymentReceiptAllocationId") REFERENCES "PaymentReceiptAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "PaymentReceiptAllocation_whtCertificateId_idx" RENAME TO "PaymentReceiptAllocation_withholdingTaxCertificateId_idx";
