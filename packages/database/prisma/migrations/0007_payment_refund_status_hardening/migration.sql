-- packages/database/prisma/migrations/0007_payment_refund_status_hardening/migration.sql

ALTER TYPE "AccountSubtype" ADD VALUE IF NOT EXISTS 'CLIENT_DEPOSITS';

CREATE TABLE IF NOT EXISTS "PaymentRefund" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "paymentReceiptId" TEXT NOT NULL,
  "clientId" TEXT,
  "matterId" TEXT,
  "amount" DECIMAL(18, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "exchangeRate" DECIMAL(18, 6) NOT NULL DEFAULT 1,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  "requestedById" TEXT,
  "approvedById" TEXT,
  "rejectedById" TEXT,
  "paidById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "bankReference" TEXT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentRefund_tenantId_idx"
ON "PaymentRefund" ("tenantId");

CREATE INDEX IF NOT EXISTS "PaymentRefund_paymentReceiptId_idx"
ON "PaymentRefund" ("paymentReceiptId");

CREATE INDEX IF NOT EXISTS "PaymentRefund_clientId_idx"
ON "PaymentRefund" ("clientId");

CREATE INDEX IF NOT EXISTS "PaymentRefund_matterId_idx"
ON "PaymentRefund" ("matterId");

CREATE INDEX IF NOT EXISTS "PaymentRefund_status_idx"
ON "PaymentRefund" ("status");

CREATE INDEX IF NOT EXISTS "PaymentRefund_createdAt_idx"
ON "PaymentRefund" ("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRefund_tenantId_fkey'
  ) THEN
    ALTER TABLE "PaymentRefund"
    ADD CONSTRAINT "PaymentRefund_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRefund_paymentReceiptId_fkey'
  ) THEN
    ALTER TABLE "PaymentRefund"
    ADD CONSTRAINT "PaymentRefund_paymentReceiptId_fkey"
    FOREIGN KEY ("paymentReceiptId") REFERENCES "PaymentReceipt"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRefund_clientId_fkey'
  ) THEN
    ALTER TABLE "PaymentRefund"
    ADD CONSTRAINT "PaymentRefund_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRefund_matterId_fkey'
  ) THEN
    ALTER TABLE "PaymentRefund"
    ADD CONSTRAINT "PaymentRefund_matterId_fkey"
    FOREIGN KEY ("matterId") REFERENCES "Matter"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRefund_requestedById_fkey'
  ) THEN
    ALTER TABLE "PaymentRefund"
    ADD CONSTRAINT "PaymentRefund_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRefund_approvedById_fkey'
  ) THEN
    ALTER TABLE "PaymentRefund"
    ADD CONSTRAINT "PaymentRefund_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRefund_rejectedById_fkey'
  ) THEN
    ALTER TABLE "PaymentRefund"
    ADD CONSTRAINT "PaymentRefund_rejectedById_fkey"
    FOREIGN KEY ("rejectedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRefund_paidById_fkey'
  ) THEN
    ALTER TABLE "PaymentRefund"
    ADD CONSTRAINT "PaymentRefund_paidById_fkey"
    FOREIGN KEY ("paidById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_refund_amount_positive'
  ) THEN
    ALTER TABLE "PaymentRefund"
    ADD CONSTRAINT "payment_refund_amount_positive"
    CHECK ("amount" > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_refund_status_valid'
  ) THEN
    ALTER TABLE "PaymentRefund"
    ADD CONSTRAINT "payment_refund_status_valid"
    CHECK ("status" IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'));
  END IF;
END $$;