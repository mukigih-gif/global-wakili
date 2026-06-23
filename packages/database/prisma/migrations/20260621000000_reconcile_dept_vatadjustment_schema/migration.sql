-- Reconcile un-migrated drift applied via `prisma db push`:
--   1. Department: isActive -> status (DepartmentStatus) + hierarchy/manager/audit/metadata
--      columns and FKs (committed dcdf568, FINDING-008-002), never captured in a migration.
--   2. VatAdjustment: new model + enums (FIN-E-002).
-- This migration mirrors the live schema exactly; it is recorded on the live database via
-- `prisma migrate resolve --applied` (objects already exist there). On a fresh database it
-- builds the same schema from scratch.

-- CreateEnum
CREATE TYPE "VatAdjustmentType" AS ENUM ('OUTPUT_VAT', 'INPUT_VAT', 'VAT_PAYABLE', 'VAT_REFUND', 'OTHER');

-- CreateEnum
CREATE TYPE "VatAdjustmentStatus" AS ENUM ('POSTED', 'VOID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- DropIndex
DROP INDEX "Department_isActive_idx";

-- AlterTable
ALTER TABLE "Department" DROP COLUMN "isActive",
ADD COLUMN     "archiveReason" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT,
ADD COLUMN     "costCenterCode" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "managerEmployeeId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "parentDepartmentId" TEXT,
ADD COLUMN     "status" "DepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedById" TEXT;

-- CreateTable
CREATE TABLE "VatAdjustment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "VatAdjustmentType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "adjustmentDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "status" "VatAdjustmentStatus" NOT NULL DEFAULT 'POSTED',
    "createdById" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VatAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VatAdjustment_tenantId_idx" ON "VatAdjustment"("tenantId");

-- CreateIndex
CREATE INDEX "VatAdjustment_tenantId_adjustmentDate_idx" ON "VatAdjustment"("tenantId", "adjustmentDate");

-- CreateIndex
CREATE INDEX "VatAdjustment_type_idx" ON "VatAdjustment"("type");

-- CreateIndex
CREATE INDEX "VatAdjustment_status_idx" ON "VatAdjustment"("status");

-- CreateIndex
CREATE INDEX "VatAdjustment_createdById_idx" ON "VatAdjustment"("createdById");

-- CreateIndex
CREATE INDEX "VatAdjustment_voidedById_idx" ON "VatAdjustment"("voidedById");

-- AddForeignKey
ALTER TABLE "VatAdjustment" ADD CONSTRAINT "VatAdjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VatAdjustment" ADD CONSTRAINT "VatAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VatAdjustment" ADD CONSTRAINT "VatAdjustment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
