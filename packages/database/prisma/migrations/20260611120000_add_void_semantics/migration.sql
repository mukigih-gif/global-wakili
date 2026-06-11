-- AlterEnum
ALTER TYPE "TimeEntryStatus" ADD VALUE 'VOIDED';

-- AlterEnum
ALTER TYPE "ExpenseStatus" ADD VALUE 'VOIDED';

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" TEXT;

-- AlterTable
ALTER TABLE "ExpenseEntry" ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" TEXT;
