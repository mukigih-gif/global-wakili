// apps/api/src/modules/billing/billing.types.ts

import type {
  BillingModel,
  MatterStatus,
  Prisma,
  TimeEntryStatus,
} from '@global-wakili/database';

export type DecimalInput = Prisma.Decimal | Prisma.DecimalJsLike | string | number;

export type BillingLineKind =
  | 'TIME'
  | 'FIXED_FEE'
  | 'DISBURSEMENT'
  | 'EXPENSE'
  | 'RETAINER'
  | 'OTHER';

export type BillingTaxMode =
  | 'VATABLE'
  | 'ZERO_RATED'
  | 'EXEMPT'
  | 'OUT_OF_SCOPE';

export type BillableTimeEntrySnapshot = {
  id: string;
  tenantId: string;
  matterId: string;
  advocateId: string;
  description: string | null;
  entryDate: Date;
  durationHours: DecimalInput;
  appliedRate: DecimalInput | null;
  billableAmount: DecimalInput;
  billingModel: BillingModel;
  status: TimeEntryStatus;
  isBillable: boolean;
  isInvoiced: boolean;
  clientId?: string | null;
  sourceType?: BillingLineKind;
};

export type BillingMatterSnapshot = {
  id: string;
  tenantId: string;
  branchId: string | null;
  clientId: string;
  status: MatterStatus;
  client: {
    id: string;
    currency: string | null;
    taxExempt: boolean;
  };
};

export type InvoiceLineInput = {
  description: string;
  quantity: DecimalInput;
  unitPrice: DecimalInput;
  taxMode?: BillingTaxMode;
  taxInclusive?: boolean;
  taxRate?: DecimalInput | null;
  isWhtApplicable?: boolean;
  whtRate?: DecimalInput | null;
  sourceType?: BillingLineKind;
  sourceId?: string | null;
  matterId?: string | null;
  clientId?: string | null;
};

export type CalculatedInvoiceLine = {
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  grossUnitPrice: Prisma.Decimal;
  subTotal: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  vatAmount: Prisma.Decimal;
  taxMode: BillingTaxMode;
  taxInclusive: boolean;
  isWhtApplicable: boolean;
  whtRate: Prisma.Decimal;
  whtAmount: Prisma.Decimal;
  sourceType: BillingLineKind;
  sourceId?: string | null;
  matterId?: string | null;
  clientId?: string | null;
  total: Prisma.Decimal;
};

export type InvoiceTotals = {
  subTotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  vatAmount: Prisma.Decimal;
  whtAmount: Prisma.Decimal;
  netAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  balanceDue: Prisma.Decimal;
};

export type InvoiceComputation = InvoiceTotals & {
  currency: string;
  exchangeRate: Prisma.Decimal;
  lines: CalculatedInvoiceLine[];
};

export type ListInvoicesInput = {
  tenantId: string;
  matterId?: string;
  branchId?: string;
  status?: string;
  clientId?: string;
  search?: string;
  issuedFrom?: Date;
  issuedTo?: Date;
  dueFrom?: Date;
  dueTo?: Date;
  take?: number;
  skip?: number;
};

export type CreateManualInvoiceInput = {
  tenantId: string;
  matterId: string;
  branchId?: string;
  currency?: string;
  exchangeRate?: DecimalInput;
  issuedDate?: Date;
  dueDate?: Date;
  createdById: string;
  lines: InvoiceLineInput[];
};

export type CreateInvoiceFromTimeEntriesInput = {
  tenantId: string;
  matterId: string;
  branchId?: string;
  currency?: string;
  exchangeRate?: DecimalInput;
  issuedDate?: Date;
  dueDate?: Date;
  createdById: string;
  timeEntryIds: string[];
};

export type InvoiceWithRelations = any;

export const BILLING_DEFAULTS = {
  vatRate: '0.16',
  whtRate: '0.05',
  currency: 'KES',
  exchangeRate: '1',
  dueDays: 30,
  maxInvoiceLines: 500,
  maxBillingPageSize: 100,
} as const;