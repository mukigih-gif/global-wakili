-- Track eTIMS synchronization status
ALTER TABLE "Invoice" ADD COLUMN "etimsControlNumber" TEXT UNIQUE;
ALTER TABLE "Invoice" ADD COLUMN "fiscalizedAt" DATETIME;
ALTER TABLE "Invoice" ADD COLUMN "isEtimsSync" BOOLEAN DEFAULT FALSE;

CREATE INDEX "Invoice_etims_idx" ON "Invoice"("etimsControlNumber");