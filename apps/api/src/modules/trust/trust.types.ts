
import type { Prisma, PrismaClient, TrustTransactionType } from '@prisma/client';

export type DecimalLike = Prisma.Decimal | string | number;

export type TrustTransactionClient = Prisma.TransactionClient;

export type TrustDbDelegateClient = Pick<
  PrismaClient,
  | 'trustAccount'
  | 'trustTransaction'
  | 'clientTrustLedger'
  | 'client'
  | 'matter'
  | 'invoice'
  | 'chartOfAccount'
  | 'bankTransaction'
  | 'bankStatement'
  | 'trustReconciliation'
  | 'reconciliationRun'
  | 'reconciliationMatch'
  | 'disbursementRequestNote'
>;

export type TenantTrustDbClient = TrustDbDelegateClient & {
  $transaction<T>(
    fn: (tx: TrustTransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T>;
};

export type TrustDbClient = TrustDbDelegateClient | TrustTransactionClient;

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
  bankTransactionId?: string | null;
  notes?: string | null;
  currency?: string | null;
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
  | 'TRANSFER_EXCEEDS_DRN_AMOUNT'
  | 'TRUST_ACCOUNT_BOUNDARY_REQUIRED'
  | 'TENANT_BOUNDARY_REQUIRED';

export type TrustValidationIssue = {
  code: TrustValidationIssueCode;
  message: string;
  meta?: Record<string, unknown>;
};

export type TrustValidationResult = {
  valid: boolean;
  issues: TrustValidationIssue[];
};

export type TrustAccountBalanceView = {
  trustAccountId: string;
  accountName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  currency?: string | null;
  currentBalance: Prisma.Decimal;
  reconciliationBalance?: Prisma.Decimal | null;
  lastReconciled?: Date | null;
  isActive?: boolean;
};

export type TrustLedgerBalanceView = {
  trustAccountId: string;
  clientId: string;
  matterId?: string | null;
  balance: Prisma.Decimal;
};

export type TrustReconciliationBoundary = {
  tenantId: string;
  trustAccountId: string;
  periodStart?: Date;
  periodEnd?: Date;
};