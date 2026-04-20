import type { Prisma, TrustTransactionType } from '@global-wakili/database';

export type DecimalLike = Prisma.Decimal | string | number;

export type TrustActorContext = {
  tenantId: string;
  userId: string;
  requestId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type TrustBalanceSnapshot = {
  trustAccountId: string;
  clientId: string;
  matterId: string | null;
  balance: Prisma.Decimal;
};

export type TrustTransactionInput = {
  trustAccountId: string;
  clientId: string;
  matterId?: string | null;
  transactionDate: Date;
  transactionType: TrustTransactionType;
  amount: DecimalLike;
  currency?: string | null;
  reference: string;
  description?: string | null;
  notes?: string | null;
  bankTransactionId?: string | null;
  invoiceId?: string | null;
  drnId?: string | null;
};

export type TrustTransferInput = {
  trustAccountId: string;
  clientId: string;
  matterId: string;
  amount: DecimalLike;
  reference: string;
  description: string;
  transactionDate: Date;
  invoiceId?: string | null;
  disbursementId?: string | null;
  drnId?: string | null;
};

export type TrustValidationIssueCode =
  | 'INVALID_REFERENCE'
  | 'INVALID_DESCRIPTION'
  | 'INVALID_DATE'
  | 'INVALID_AMOUNT'
  | 'ZERO_AMOUNT'
  | 'MISSING_TRUST_ACCOUNT'
  | 'INACTIVE_TRUST_ACCOUNT'
  | 'CURRENCY_MISMATCH'
  | 'CLIENT_MISMATCH'
  | 'MATTER_MISMATCH'
  | 'INSUFFICIENT_CLIENT_TRUST_BALANCE'
  | 'INSUFFICIENT_TRUST_ACCOUNT_BALANCE'
  | 'INVALID_TRANSACTION_TYPE'
  | 'DUPLICATE_REFERENCE'
  | 'TRUST_TO_OFFICE_POLICY_VIOLATION'
  | 'INVOICE_NOT_FOUND'
  | 'TRANSFER_EXCEEDS_AMOUNT_DUE'
  | 'DRN_NOT_FOUND'
  | 'TRANSFER_EXCEEDS_DRN_AMOUNT';

export type TrustValidationIssue = {
  code: TrustValidationIssueCode;
  message: string;
  meta?: Record<string, unknown>;
};

export type TrustValidationResult = {
  valid: boolean;
  issues: TrustValidationIssue[];
};

export type TenantTrustDbClient = {
  trustAccount: {
    findFirst: Function;
    update: Function;
  };
  trustTransaction: {
    create: Function;
    findFirst: Function;
  };
  clientTrustLedger: {
    findFirst: Function;
    create: Function;
    update: Function;
  };
  client: {
    findFirst: Function;
  };
  matter: {
    findFirst: Function;
  };
  invoice: {
    findFirst: Function;
    update: Function;
  };
  disbursementRequestNote?: {
    findFirst: Function;
    update?: Function;
  };
  chartOfAccount: {
    findFirst: Function;
  };
  $transaction?: Function;
};