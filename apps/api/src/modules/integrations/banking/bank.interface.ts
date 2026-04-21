export type BankProviderCode = 'equity' | 'kcb' | 'ncba' | 'mpesa';

export type BankAccountCredentials = {
  accountId: string;
  accountNumber: string;
  branchCode?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type BankStatementFetchParams = {
  accountId: string;
  startDate?: Date;
  endDate?: Date;
};

export type NormalizedBankTransaction = {
  externalId: string;
  accountId: string;
  transactionDate: Date;
  amount: string;
  currency: string;
  type: 'DEBIT' | 'CREDIT';
  reference?: string | null;
  narration?: string | null;
  balanceAfter?: string | null;
  counterpartyName?: string | null;
  counterpartyAccount?: string | null;
  rawPayload?: Record<string, unknown> | null;
};

export type BankStatementSnapshot = {
  provider: BankProviderCode;
  accountId: string;
  fetchedAt: Date;
  openingBalance?: string | null;
  closingBalance?: string | null;
  currency: string;
  transactions: NormalizedBankTransaction[];
};

export interface BankProvider {
  readonly code: BankProviderCode;
  readonly displayName: string;

  fetchStatement(
    credentials: BankAccountCredentials,
    params: BankStatementFetchParams,
  ): Promise<BankStatementSnapshot>;

  validateConfig(credentials: BankAccountCredentials): Promise<void>;
}