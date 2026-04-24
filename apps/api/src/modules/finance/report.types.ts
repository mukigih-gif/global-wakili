import type { Prisma } from '@global-wakili/database';

export type DecimalValue = Prisma.Decimal;

export type TrialBalanceRow = {
  id?: string;
  accountId?: string;
  code: string;
  name: string;
  type: string;
  subtype?: string | null;
  debit: DecimalValue;
  credit: DecimalValue;
  netBalance: DecimalValue;
};

export type TrialBalanceReport = {
  generatedAt?: Date;
  asOfDate?: Date;
  rows: TrialBalanceRow[];
  totalDebit: DecimalValue;
  totalCredit: DecimalValue;
  isBalanced: boolean;
};

export type BalanceSheetReport = {
  asOfDate: Date;
  assets: DecimalValue;
  liabilities: DecimalValue;
  equity: DecimalValue;
  isBalanced: boolean;
};

export type CashflowRow = {
  accountId: string;
  code: string;
  name: string;
  subtype: string | null;
  inflow: DecimalValue;
  outflow: DecimalValue;
  net: DecimalValue;
};

export type CashflowReport = {
  periodStart: Date;
  periodEnd: Date;
  totalInflow: DecimalValue;
  totalOutflow: DecimalValue;
  netCashflow: DecimalValue;
  rows: CashflowRow[];
};

export type AccountStatementRow = {
  journalId: string;
  journalReference: string;
  journalDate: Date;
  lineReference: string | null;
  description: string | null;
  debit: DecimalValue;
  credit: DecimalValue;
  runningBalance: DecimalValue;
  clientId?: string | null;
  matterId?: string | null;
  branchId?: string | null;
};

export type AccountStatementReport = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  subtype?: string | null;
  normalBalance: 'DEBIT' | 'CREDIT';
  currency: string;
  periodStart?: Date;
  periodEnd?: Date;
  openingBalance: DecimalValue;
  closingBalance: DecimalValue;
  displayOpeningBalance: DecimalValue;
  displayClosingBalance: DecimalValue;
  rows: AccountStatementRow[];
};