import type { Prisma } from '@global-wakili/database';

export type DecimalLike = Prisma.Decimal | string | number;

export type ProcurementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';

export type VendorBillStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED';

export type ProcurementValidationIssueCode =
  | 'INVALID_VENDOR'
  | 'INACTIVE_VENDOR'
  | 'BLACKLISTED_VENDOR'
  | 'DUPLICATE_VENDOR_EMAIL'
  | 'DUPLICATE_VENDOR_PIN'
  | 'INVALID_BILL_DATE'
  | 'INVALID_DUE_DATE'
  | 'INVALID_AMOUNT'
  | 'ZERO_AMOUNT'
  | 'NEGATIVE_AMOUNT'
  | 'INVALID_CURRENCY'
  | 'DUPLICATE_BILL_NUMBER'
  | 'INVALID_WHT'
  | 'INVALID_VAT'
  | 'INVALID_STATUS_TRANSITION'
  | 'PAYMENT_EXCEEDS_OUTSTANDING'
  | 'MISSING_EXPENSE_ACCOUNT'
  | 'MISSING_VENDOR'
  | 'MISSING_BILL'
  | 'POLICY_VIOLATION';

export type ProcurementValidationIssue = {
  code: ProcurementValidationIssueCode;
  message: string;
  meta?: Record<string, unknown>;
};

export type ProcurementValidationResult = {
  valid: boolean;
  issues: ProcurementValidationIssue[];
};

export type VendorInput = {
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  kraPin?: string | null;
  contactPerson?: string | null;
  address?: string | null;
  status?: VendorStatus;
  currency?: string | null;
  paymentTermsDays?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type VendorBillLineInput = {
  description: string;
  quantity: DecimalLike;
  unitPrice: DecimalLike;
  taxRate?: DecimalLike | null;
  taxAmount?: DecimalLike | null;
  lineTotal?: DecimalLike | null;
  expenseAccountId?: string | null;
  itemCode?: string | null;
};

export type VendorBillInput = {
  vendorId: string;
  billNumber: string;
  billDate: Date;
  dueDate?: Date | null;
  currency?: string | null;
  subTotal: DecimalLike;
  vatAmount?: DecimalLike | null;
  whtRate?: DecimalLike | null;
  whtAmount?: DecimalLike | null;
  total: DecimalLike;
  notes?: string | null;
  branchId?: string | null;
  matterId?: string | null;
  lines: VendorBillLineInput[];
};

export type TenantProcurementDbClient = {
  vendor: {
    findFirst: Function;
    findMany: Function;
    create: Function;
    update: Function;
  };
  vendorBill: {
    findFirst: Function;
    findMany: Function;
    create: Function;
    update: Function;
    aggregate: Function;
  };
  chartOfAccount: {
    findFirst: Function;
  };
  branch: {
    findFirst: Function;
  };
  matter: {
    findFirst: Function;
  };
  $transaction?: Function;
};