CREATE TABLE IF NOT EXISTS "ProformaInvoice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "proformaNumber" TEXT NOT NULL,
  "matterId" TEXT NOT NULL,
  "clientId" TEXT,
  "branchId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "exchangeRate" DECIMAL(18, 6) NOT NULL DEFAULT 1,
  "subTotal" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "vatAmount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "whtAmount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "netAmount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "total" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "balanceDue" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "sentById" TEXT,
  "convertedAt" TIMESTAMP(3),
  "convertedInvoiceId" TEXT,
  "cancellationReason" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProformaInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProformaInvoiceLine" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "proformaInvoiceId" TEXT NOT NULL,
  "matterId" TEXT,
  "clientId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(18, 2) NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "subTotal" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "taxRate" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "taxMode" TEXT NOT NULL DEFAULT 'VATABLE',
  "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
  "taxAmount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "isWhtApplicable" BOOLEAN NOT NULL DEFAULT false,
  "whtRate" DECIMAL(18, 4) NOT NULL DEFAULT 0,
  "whtAmount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "total" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProformaInvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProformaInvoice_proformaNumber_key"
ON "ProformaInvoice" ("proformaNumber");

CREATE INDEX IF NOT EXISTS "ProformaInvoice_tenantId_idx"
ON "ProformaInvoice" ("tenantId");

CREATE INDEX IF NOT EXISTS "ProformaInvoice_tenantId_status_idx"
ON "ProformaInvoice" ("tenantId", "status");

CREATE INDEX IF NOT EXISTS "ProformaInvoice_tenantId_matterId_idx"
ON "ProformaInvoice" ("tenantId", "matterId");

CREATE INDEX IF NOT EXISTS "ProformaInvoice_tenantId_clientId_idx"
ON "ProformaInvoice" ("tenantId", "clientId");

CREATE INDEX IF NOT EXISTS "ProformaInvoice_tenantId_issuedDate_idx"
ON "ProformaInvoice" ("tenantId", "issuedDate");

CREATE INDEX IF NOT EXISTS "ProformaInvoiceLine_tenantId_idx"
ON "ProformaInvoiceLine" ("tenantId");

CREATE INDEX IF NOT EXISTS "ProformaInvoiceLine_proformaInvoiceId_idx"
ON "ProformaInvoiceLine" ("proformaInvoiceId");

CREATE INDEX IF NOT EXISTS "ProformaInvoiceLine_sourceType_sourceId_idx"
ON "ProformaInvoiceLine" ("sourceType", "sourceId");

ALTER TABLE "ProformaInvoice"
ADD CONSTRAINT "ProformaInvoice_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProformaInvoice"
ADD CONSTRAINT "ProformaInvoice_matterId_fkey"
FOREIGN KEY ("matterId") REFERENCES "Matter"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProformaInvoice"
ADD CONSTRAINT "ProformaInvoice_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProformaInvoice"
ADD CONSTRAINT "ProformaInvoice_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProformaInvoice"
ADD CONSTRAINT "ProformaInvoice_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProformaInvoice"
ADD CONSTRAINT "ProformaInvoice_sentById_fkey"
FOREIGN KEY ("sentById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProformaInvoice"
ADD CONSTRAINT "ProformaInvoice_convertedInvoiceId_fkey"
FOREIGN KEY ("convertedInvoiceId") REFERENCES "Invoice"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProformaInvoiceLine"
ADD CONSTRAINT "ProformaInvoiceLine_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProformaInvoiceLine"
ADD CONSTRAINT "ProformaInvoiceLine_proformaInvoiceId_fkey"
FOREIGN KEY ("proformaInvoiceId") REFERENCES "ProformaInvoice"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProformaInvoiceLine"
ADD CONSTRAINT "proforma_invoice_line_tax_mode_valid"
CHECK ("taxMode" IN ('VATABLE', 'EXEMPT', 'ZERO_RATED', 'NON_VATABLE'));

ALTER TABLE "ProformaInvoice"
ADD CONSTRAINT "proforma_invoice_amounts_non_negative"
CHECK (
  "subTotal" >= 0
  AND "taxAmount" >= 0
  AND "vatAmount" >= 0
  AND "whtAmount" >= 0
  AND "netAmount" >= 0
  AND "total" >= 0
  AND "balanceDue" >= 0
);

ALTER TABLE "ProformaInvoice"
ADD CONSTRAINT "proforma_invoice_balance_due_consistency"
CHECK ("balanceDue" <= "total");