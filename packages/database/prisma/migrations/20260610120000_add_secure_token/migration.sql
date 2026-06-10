-- CreateEnum
CREATE TYPE "SecureTokenType" AS ENUM ('PASSWORD_RESET', 'EMAIL_INVITE', 'EMAIL_VERIFY', 'ACCOUNT_ACTIVATE');

-- CreateTable
CREATE TABLE "SecureToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "SecureTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecureToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecureToken_tokenHash_key" ON "SecureToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SecureToken_userId_type_idx" ON "SecureToken"("userId", "type");

-- CreateIndex
CREATE INDEX "SecureToken_tenantId_idx" ON "SecureToken"("tenantId");

-- AddForeignKey
ALTER TABLE "SecureToken" ADD CONSTRAINT "SecureToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecureToken" ADD CONSTRAINT "SecureToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
