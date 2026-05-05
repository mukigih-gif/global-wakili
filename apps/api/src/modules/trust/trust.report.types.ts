// apps/api/src/modules/trust/trust.report.types.ts

/**
 * Shared report/statement contracts for the Trust module.
 *
 * This file is intentionally type-only. It exists because trust statement,
 * report, dashboard, and export services need a common reporting contract
 * without importing service implementations from each other.
 */

export type TrustReportDateInput = Date | string;

export type TrustReportFormat = 'JSON' | 'CSV' | 'XLSX' | 'PDF';

export type TrustReportType =
  | 'TRUST_STATEMENT'
  | 'TRUST_LEDGER'
  | 'TRUST_RECONCILIATION'
  | 'THREE_WAY_RECONCILIATION'
  | 'CLIENT_TRUST_LEDGER'
  | 'MATTER_TRUST_LEDGER'
  | 'TRUST_VIOLATION'
  | 'TRUST_BALANCE'
  | 'TRUST_ACTIVITY'
  | 'TRUST_COMPLIANCE';

export type TrustReportScope =
  | 'TENANT'
  | 'TRUST_ACCOUNT'
  | 'CLIENT'
  | 'MATTER'
  | 'BRANCH'
  | 'WORKSPACE';

export type TrustReportCurrency = string;

export type TrustMoneyValue = string | number;

export type TrustReportDateRange = {
  from?: TrustReportDateInput | null;
  to?: TrustReportDateInput | null;
  asOfDate?: TrustReportDateInput | null;
};

export type TrustReportFilters = TrustReportDateRange & {
  tenantId: string;
  trustAccountId?: string | null;
  accountId?: string | null;
  clientId?: string | null;
  matterId?: string | null;
  branchId?: string | null;
  workspaceId?: string | null;
  currency?: TrustReportCurrency | null;
  status?: string | null;
  transactionType?: string | null;
  includeZeroBalances?: boolean;
  includeReversed?: boolean;
  includePending?: boolean;
};

export type TrustReportOptions = TrustReportFilters & {
  reportType?: TrustReportType;
  format?: TrustReportFormat;
  scope?: TrustReportScope;
  generatedById?: string | null;
  requestId?: string | null;
  timezone?: string | null;
};

export type TrustReportMetadata = {
  tenantId: string;
  reportType: TrustReportType;
  generatedAt: string;
  generatedById?: string | null;
  requestId?: string | null;
  currency?: TrustReportCurrency | null;
  filters?: Partial<TrustReportFilters>;
  [key: string]: unknown;
};

export type TrustReportColumn = {
  key: string;
  label: string;
  type?: 'string' | 'number' | 'money' | 'date' | 'datetime' | 'boolean';
  align?: 'left' | 'center' | 'right';
  width?: number;
};

export type TrustReportRow = Record<string, unknown>;

export type TrustReportDataset<TRow extends TrustReportRow = TrustReportRow> = {
  columns: TrustReportColumn[];
  rows: TRow[];
  totalRows: number;
};

export type TrustReportResult<TRow extends TrustReportRow = TrustReportRow> = {
  metadata: TrustReportMetadata;
  dataset: TrustReportDataset<TRow>;
  summary?: Record<string, unknown>;
};

export type TrustReportExportPayload<TRow extends TrustReportRow = TrustReportRow> =
  TrustReportResult<TRow> & {
    format: TrustReportFormat;
    filename: string;
    mimeType?: string | null;
  };

export type TrustStatementAccount = {
  id: string;
  accountId?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  trustAccountId?: string | null;
  trustAccountName?: string | null;
  currency?: TrustReportCurrency | null;
};

export type TrustStatementClient = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type TrustStatementMatter = {
  id?: string | null;
  title?: string | null;
  matterNumber?: string | null;
  caseNumber?: string | null;
  clientId?: string | null;
  clientName?: string | null;
};

export type TrustStatementLineType =
  | 'OPENING_BALANCE'
  | 'RECEIPT'
  | 'PAYMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'SETTLEMENT'
  | 'ADJUSTMENT'
  | 'REVERSAL'
  | 'CLOSING_BALANCE'
  | string;

export type TrustStatementRow = {
  id?: string | null;
  transactionId?: string | null;
  ledgerEntryId?: string | null;

  date?: TrustReportDateInput | null;
  transactionDate?: TrustReportDateInput | null;
  postedAt?: TrustReportDateInput | null;

  type?: TrustStatementLineType;
  transactionType?: string | null;
  reference?: string | null;
  description?: string | null;
  narration?: string | null;

  trustAccountId?: string | null;
  accountId?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  matterId?: string | null;
  matterTitle?: string | null;
  matterNumber?: string | null;
  caseNumber?: string | null;
  invoiceId?: string | null;
  paymentId?: string | null;

  debit?: TrustMoneyValue | null;
  credit?: TrustMoneyValue | null;
  amount?: TrustMoneyValue | null;
  balance?: TrustMoneyValue | null;
  runningBalance?: TrustMoneyValue | null;

  currency?: TrustReportCurrency | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type TrustStatementTotals = {
  openingBalance: TrustMoneyValue;
  totalReceipts: TrustMoneyValue;
  totalPayments: TrustMoneyValue;
  totalTransfersIn?: TrustMoneyValue;
  totalTransfersOut?: TrustMoneyValue;
  totalAdjustments?: TrustMoneyValue;
  closingBalance: TrustMoneyValue;
  currency?: TrustReportCurrency | null;
};

export type TrustStatementSummary = TrustStatementTotals & {
  rowCount?: number;
  from?: TrustReportDateInput | null;
  to?: TrustReportDateInput | null;
  asOfDate?: TrustReportDateInput | null;
  trustAccountId?: string | null;
  clientId?: string | null;
  matterId?: string | null;
};

export type TrustStatementReport = {
  metadata: TrustReportMetadata;
  account?: TrustStatementAccount | null;
  client?: TrustStatementClient | null;
  matter?: TrustStatementMatter | null;
  rows: TrustStatementRow[];
  summary: TrustStatementSummary;
};

export type TrustStatementResponse = TrustStatementReport;
export type TrustStatementResult = TrustStatementReport;
export type TrustStatementDto = TrustStatementReport;
export type TrustStatementDTO = TrustStatementReport;

export type TrustStatementParams = TrustReportFilters;
export type TrustStatementQuery = TrustReportFilters;
export type GenerateTrustStatementParams = TrustReportFilters;

export type TrustStatementLine = TrustStatementRow;
export type TrustLedgerStatementRow = TrustStatementRow;

export type TrustBalanceReportRow = {
  trustAccountId?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  matterId?: string | null;
  matterTitle?: string | null;
  currency?: TrustReportCurrency | null;
  bookBalance?: TrustMoneyValue | null;
  bankBalance?: TrustMoneyValue | null;
  clientLedgerBalance?: TrustMoneyValue | null;
  variance?: TrustMoneyValue | null;
  status?: string | null;
};

export type TrustReconciliationReportRow = {
  reconciliationId?: string | null;
  runId?: string | null;
  trustAccountId?: string | null;
  matterId?: string | null;
  clientId?: string | null;
  bookBalance?: TrustMoneyValue | null;
  bankBalance?: TrustMoneyValue | null;
  clientLedgerBalance?: TrustMoneyValue | null;
  varianceAmount?: TrustMoneyValue | null;
  status?: string | null;
  notes?: string | null;
};

export type TrustViolationReportRow = {
  id?: string | null;
  trustAccountId?: string | null;
  matterId?: string | null;
  clientId?: string | null;
  violationType?: string | null;
  severity?: string | null;
  amount?: TrustMoneyValue | null;
  description?: string | null;
  detectedAt?: TrustReportDateInput | null;
  resolvedAt?: TrustReportDateInput | null;
  status?: string | null;
};

export type TrustComplianceReportRow =
  | TrustBalanceReportRow
  | TrustReconciliationReportRow
  | TrustViolationReportRow;

export type TrustReportPayload<TRow extends TrustReportRow = TrustReportRow> =
  TrustReportResult<TRow>;

export type TrustStatementExport = TrustReportExportPayload<TrustStatementRow>;