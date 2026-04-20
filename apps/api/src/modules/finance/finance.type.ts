import type {
  AccountSubtype,
  AccountType,
  Prisma,
} from '@global-wakili/database';

export type DecimalLike = Prisma.Decimal | string | number;

export type FinanceActorContext = {
  tenantId: string;
  userId: string;
  requestId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type JournalLineInput = {
  accountId: string;
  debit: DecimalLike;
  credit: DecimalLike;
  description?: string | null;
  clientId?: string | null;
  matterId?: string | null;
  branchId?: string | null;
  reference?: string | null;
};

export type JournalPostingInput = {
  reference: string;
  description: string;
  date: Date;
  currency?: string | null;
  exchangeRate?: DecimalLike | null;
  sourceModule?: string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  reversalOfId?: string | null;
  lines: JournalLineInput[];
};

export type JournalValidationIssueCode =
  | 'EMPTY_LINES'
  | 'INVALID_REFERENCE'
  | 'INVALID_DESCRIPTION'
  | 'INVALID_DATE'
  | 'INVALID_CURRENCY'
  | 'INVALID_EXCHANGE_RATE'
  | 'NEGATIVE_AMOUNT'
  | 'BOTH_DEBIT_AND_CREDIT_SET'
  | 'BOTH_DEBIT_AND_CREDIT_ZERO'
  | 'UNBALANCED_JOURNAL'
  | 'ZERO_VALUE_JOURNAL'
  | 'MISSING_ACCOUNT'
  | 'INACTIVE_ACCOUNT'
  | 'LOCKED_ACCOUNT'
  | 'ACCOUNT_TENANT_MISMATCH'
  | 'MISSING_PERIOD'
  | 'PERIOD_LOCKED'
  | 'DUPLICATE_REFERENCE'
  | 'TRUST_COMMINGLING'
  | 'TRUST_ACCOUNT_POLICY_VIOLATION'
  | 'OFFICE_ACCOUNT_POLICY_VIOLATION'
  | 'MULTI_CURRENCY_POLICY_VIOLATION'
  | 'INVALID_SOURCE_MODULE';

export type JournalValidationIssue = {
  code: JournalValidationIssueCode;
  message: string;
  lineIndex?: number;
  accountId?: string;
  meta?: Record<string, unknown>;
};

export type JournalValidationResult = {
  valid: boolean;
  totalDebit: Prisma.Decimal;
  totalCredit: Prisma.Decimal;
  issues: JournalValidationIssue[];
};

export type PostingPolicyContext = {
  allowTrustPosting?: boolean;
  allowOfficePosting?: boolean;
  enforcePeriodLock?: boolean;
  allowMultiCurrency?: boolean;
  expectedSourceModule?: string | null;
};

export type PostingPolicyResult = {
  allowed: boolean;
  issues: JournalValidationIssue[];
};

export type FinanceAccountSnapshot = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype | null;
  isActive: boolean;
  allowManualPosting: boolean;
  currency: string | null;
};

export type IdempotencyCheckResult<TRecord = unknown> = {
  isDuplicate: boolean;
  existingRecord: TRecord | null;
};

export type TenantDbClient = {
  chartOfAccount: {
    findMany: Function;
  };
  accountingPeriod: {
    findUnique: Function;
  };
  journalEntry: {
    findUnique: Function;
  };
  bankTransaction: {
    findFirst: Function;
  };
};