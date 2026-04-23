/*
  Warnings:

  - Added the required column `updatedAt` to the `Approval` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('SUBMIT', 'APPROVE', 'REJECT', 'ESCALATE', 'DELEGATE', 'AUTO_APPROVE', 'REQUEST_CHANGES', 'CANCEL', 'EXPIRE', 'REASSIGN');

-- CreateEnum
CREATE TYPE "ApprovalLevel" AS ENUM ('INITIATOR', 'REVIEWER', 'MANAGER', 'HEAD_OF_DEPARTMENT', 'CFO', 'PARTNER', 'SENIOR_PARTNER', 'COMPLIANCE_OFFICER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ApprovalModule" AS ENUM ('PROCUREMENT', 'PAYROLL', 'FINANCE', 'TRUST', 'BILLING', 'COMPLIANCE', 'OPERATIONS', 'HR', 'RECEPTION', 'COURT', 'CALENDAR', 'DOCUMENT', 'CLIENT', 'MATTER', 'PLATFORM', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ApprovalPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- DropIndex
DROP INDEX "Approval_status_idx";

-- AlterTable
ALTER TABLE "Approval" ADD COLUMN     "action" "ApprovalAction" NOT NULL DEFAULT 'SUBMIT',
ADD COLUMN     "afterSnapshot" JSONB,
ADD COLUMN     "approvalKey" TEXT,
ADD COLUMN     "assignedApproverId" TEXT,
ADD COLUMN     "beforeSnapshot" JSONB,
ADD COLUMN     "decisionReason" TEXT,
ADD COLUMN     "level" "ApprovalLevel" NOT NULL DEFAULT 'REVIEWER',
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "module" "ApprovalModule" NOT NULL DEFAULT 'OPERATIONS',
ADD COLUMN     "priority" "ApprovalPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "requestedById" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Approval_tenantId_module_idx" ON "Approval"("tenantId", "module");

-- CreateIndex
CREATE INDEX "Approval_tenantId_entityType_entityId_idx" ON "Approval"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "Approval_tenantId_entityType_entityId_version_idx" ON "Approval"("tenantId", "entityType", "entityId", "version");

-- CreateIndex
CREATE INDEX "Approval_tenantId_status_level_idx" ON "Approval"("tenantId", "status", "level");

-- CreateIndex
CREATE INDEX "Approval_tenantId_module_status_idx" ON "Approval"("tenantId", "module", "status");

-- CreateIndex
CREATE INDEX "Approval_assignedApproverId_status_idx" ON "Approval"("assignedApproverId", "status");

-- CreateIndex
CREATE INDEX "Approval_requestedById_idx" ON "Approval"("requestedById");

-- CreateIndex
CREATE INDEX "Approval_approvedBy_idx" ON "Approval"("approvedBy");

-- CreateIndex
CREATE INDEX "Approval_createdAt_idx" ON "Approval"("createdAt");

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_assignedApproverId_fkey" FOREIGN KEY ("assignedApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_escalatedTo_fkey" FOREIGN KEY ("escalatedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_delegatedFrom_fkey" FOREIGN KEY ("delegatedFrom") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_delegatedTo_fkey" FOREIGN KEY ("delegatedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
