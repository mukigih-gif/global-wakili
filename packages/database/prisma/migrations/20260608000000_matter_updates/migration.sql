-- CreateTable: MatterUpdate — matter timeline entries with client visibility control
CREATE TABLE "MatterUpdate" (
    "id"              TEXT NOT NULL,
    "tenantId"        TEXT NOT NULL,
    "matterId"        TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "content"         TEXT NOT NULL,
    "updateType"      TEXT NOT NULL DEFAULT 'GENERAL',
    "isClientVisible" BOOLEAN NOT NULL DEFAULT false,
    "notifyClient"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatterUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatterUpdate_tenantId_idx" ON "MatterUpdate"("tenantId");

-- CreateIndex
CREATE INDEX "MatterUpdate_matterId_idx" ON "MatterUpdate"("matterId");

-- CreateIndex
CREATE INDEX "MatterUpdate_createdAt_idx" ON "MatterUpdate"("createdAt");

-- AddForeignKey
ALTER TABLE "MatterUpdate" ADD CONSTRAINT "MatterUpdate_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterUpdate" ADD CONSTRAINT "MatterUpdate_matterId_fkey"
    FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterUpdate" ADD CONSTRAINT "MatterUpdate_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
