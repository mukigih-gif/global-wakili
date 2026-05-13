-- AlterTable
ALTER TABLE "Matter" ADD COLUMN     "caseNumber" TEXT,
ADD COLUMN     "matterCode" TEXT,
ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "Matter_tenantId_matterCode_idx" ON "Matter"("tenantId", "matterCode");

-- CreateIndex
CREATE INDEX "Matter_tenantId_caseNumber_idx" ON "Matter"("tenantId", "caseNumber");
