import {
  AccountingPeriodStatus,
  AccountSubtype,
  AccountType,
  BalanceSide,
  PrismaClient,
  TenantRole,
} from '@prisma/client';

/*
 * 10_finance.seed.ts — Per-tenant finance foundation layer (CLAUDE.md §12).
 *
 * Seeds:
 *   - ChartOfAccount   : a complete, Kenya-specific legal-firm COA across all
 *                        5 account types. System accounts (AR 1200, WHT 1205,
 *                        VAT output 2100, legal fees 4000, trust bank 1500,
 *                        trust liability 2010, client deposits 2300) match the
 *                        codes/subtypes the billing/payment/trust posting
 *                        engines resolve, so posting finds them with no drift.
 *   - AccountingPeriod : one OPEN period for the CURRENT month (satisfies the
 *                        ensureOpenPeriod / assertPeriodOpen guard — FIN-TRUST-002).
 *   - JournalEntry +   : one balanced opening-balance entry. Trust bank (1500)
 *     JournalLine        is mirrored exactly by trust liability (2010) — trust
 *                        asset = trust liability, no commingling (ADR-004).
 *   - AccountBalance   : opening balances for the touched accounts so trial-
 *                        balance reads are correct without a rebuild pass.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Design notes:
 * - normalBalance is DERIVED from AccountType (FIN-G-001) via normalSideFor,
 *   never hand-set per account. ASSET/EXPENSE = DEBIT; LIABILITY/EQUITY/
 *   REVENUE = CREDIT. Mirrors apps/api finance/account.service.ts exactly;
 *   replicated locally to avoid a cross-package import (FINDING-INFRA-003).
 * - Client Trust Liability is seeded at 2010 (not 2300): the payment posting
 *   engine hard-owns code 2300 = Client Deposits (CLIENT_DEPOSITS) via
 *   ensureSystemAccount, which overwrites the subtype of any isSystem row on
 *   first post. Putting trust liability on 2300 would flip it to CLIENT_DEPOSITS
 *   and break trust posting (resolves TRUST_LIABILITY by subtype) — ADR-004.
 *   2010 is the canonical trust-liability code; trust posting keys off subtype,
 *   so the code is transparent to it. 2300 is seeded separately as Client
 *   Deposits so payment posting reuses it cleanly.
 * - 3200 Current Year Earnings is seeded flat (no opening line); the balance
 *   sheet handler derives it from Revenue − Expenses (FIN-I-001).
 *
 * Policy:
 * - Idempotent: COA upsert(tenantId_code); period upsert(tenantId_name);
 *   AccountBalance upsert(tenantId_accountId); opening journal =
 *   findFirst(tenantId, reference) then create-with-lines only if absent.
 * - Tenant-scoped. No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type CoaSeed = {
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype | null;
  system?: boolean; // system → isSystem:true, allowManualPosting:false
  manualPosting?: boolean; // non-system override (default true)
  description: string;
};

type OpeningLine = {
  code: string;
  debit: string;
  credit: string;
  description: string;
};

export type FinanceSeedResult = {
  status: 'finance_seed_complete';
  tenantId: string;
  accounts: number;
  accountingPeriods: number;
  journalEntries: number;
  journalLines: number;
  accountBalances: number;
  openingBalanced: boolean;
};

const OPENING_REFERENCE = 'OPENING-BALANCE-2026';

/* FIN-G-001: normalBalance derived from AccountType (never hand-set).
 * ASSET & EXPENSE are debit-normal; LIABILITY, EQUITY & REVENUE credit-normal. */
function normalSideFor(type: AccountType): BalanceSide {
  return type === AccountType.LIABILITY ||
    type === AccountType.EQUITY ||
    type === AccountType.REVENUE
    ? BalanceSide.CREDIT
    : BalanceSide.DEBIT;
}

const COA_SEEDS: CoaSeed[] = [
  // ----- ASSETS (1000s) -----
  { code: '1000', name: 'Operating Bank Account (KCB)', type: AccountType.ASSET, subtype: AccountSubtype.OFFICE_BANK, system: true, description: 'Primary firm operating bank account (KCB).' },
  { code: '1100', name: 'Petty Cash', type: AccountType.ASSET, subtype: null, description: 'Office petty cash float.' },
  { code: '1200', name: 'Accounts Receivable - Clients', type: AccountType.ASSET, subtype: AccountSubtype.ACCOUNTS_RECEIVABLE, system: true, description: 'Trade receivables from client invoices (billing/payment posting AR).' },
  { code: '1205', name: 'WHT Receivable', type: AccountType.ASSET, subtype: AccountSubtype.ACCOUNTS_RECEIVABLE, system: true, description: 'Withholding tax withheld by clients, recoverable against the KRA.' },
  { code: '1300', name: 'Prepaid Expenses', type: AccountType.ASSET, subtype: null, description: 'Expenses paid in advance and not yet consumed.' },
  { code: '1400', name: 'Office Equipment', type: AccountType.ASSET, subtype: null, description: 'Office equipment and fixed assets at cost.' },
  { code: '1500', name: 'Client Trust Bank Account', type: AccountType.ASSET, subtype: AccountSubtype.TRUST_BANK, system: true, description: 'Client money held in trust under the Advocates (Accounts) Rules.' },
  { code: '1510', name: 'Trust Interest Receivable', type: AccountType.ASSET, subtype: null, description: 'Interest accrued on client trust funds, receivable.' },

  // ----- LIABILITIES (2000s) -----
  { code: '2000', name: 'Accounts Payable - Vendors', type: AccountType.LIABILITY, subtype: AccountSubtype.ACCOUNTS_PAYABLE, description: 'Trade payables to suppliers and vendors.' },
  { code: '2010', name: 'Client Trust Liability', type: AccountType.LIABILITY, subtype: AccountSubtype.TRUST_LIABILITY, system: true, description: 'Amount owed back to clients from trust funds; mirrors the trust bank (1500).' },
  { code: '2100', name: 'VAT Output Payable', type: AccountType.LIABILITY, subtype: AccountSubtype.VAT_OUTPUT, system: true, description: 'Output VAT collected on taxable invoices, payable to the KRA.' },
  { code: '2110', name: 'VAT Input Recoverable', type: AccountType.LIABILITY, subtype: AccountSubtype.VAT_INPUT, description: 'Recoverable input VAT from supplier bills (net VAT control).' },
  { code: '2200', name: 'PAYE Payable (KRA)', type: AccountType.LIABILITY, subtype: AccountSubtype.PAYE_LIABILITY, description: 'PAYE withheld from staff, pending remittance to the KRA.' },
  { code: '2210', name: 'SHIF Payable', type: AccountType.LIABILITY, subtype: AccountSubtype.SHIF_LIABILITY, description: 'SHIF deductions pending remittance.' },
  { code: '2220', name: 'NSSF Payable', type: AccountType.LIABILITY, subtype: AccountSubtype.NSSF_LIABILITY, description: 'NSSF deductions and employer contributions pending remittance.' },
  { code: '2230', name: 'Housing Levy Payable', type: AccountType.LIABILITY, subtype: AccountSubtype.HOUSING_LEVY_LIABILITY, description: 'Affordable Housing Levy deductions and employer portion pending remittance.' },
  { code: '2300', name: 'Client Deposits and Unallocated Receipts', type: AccountType.LIABILITY, subtype: AccountSubtype.CLIENT_DEPOSITS, system: true, description: 'Client deposits and unapplied receipts pending allocation (payment posting).' },
  { code: '2310', name: 'Retainer Liability', type: AccountType.LIABILITY, subtype: AccountSubtype.RETAINER_LIABILITY, description: 'Unearned retainer fees received in advance.' },

  // ----- EQUITY (3000s) -----
  { code: '3000', name: 'Partners Capital', type: AccountType.EQUITY, subtype: null, description: "Partners' capital contributions." },
  { code: '3100', name: 'Retained Earnings', type: AccountType.EQUITY, subtype: null, description: 'Accumulated earnings retained from prior years.' },
  { code: '3200', name: 'Current Year Earnings', type: AccountType.EQUITY, subtype: null, description: 'Current-year net result; derived by the balance sheet handler (Revenue − Expenses).' },

  // ----- REVENUE (4000s) -----
  { code: '4000', name: 'Legal Fees Income', type: AccountType.REVENUE, subtype: AccountSubtype.LEGAL_FEES_INCOME, system: true, description: 'Revenue recognised from professional legal services.' },
  { code: '4100', name: 'Consultation Fees', type: AccountType.REVENUE, subtype: null, description: 'Income from advisory and consultation engagements.' },
  { code: '4200', name: 'Disbursement Recovery', type: AccountType.REVENUE, subtype: null, description: 'Recovery of disbursements billed to clients.' },
  { code: '4300', name: 'Trust Interest Income', type: AccountType.REVENUE, subtype: null, description: 'Interest income earned on client trust funds.' },
  { code: '4400', name: 'Retainer Fees Earned', type: AccountType.REVENUE, subtype: null, description: 'Retainer fees recognised as earned from the retainer liability.' },

  // ----- EXPENSES (5000s) -----
  { code: '5000', name: 'Staff Salaries', type: AccountType.EXPENSE, subtype: null, description: 'Staff salaries and wages.' },
  { code: '5100', name: 'Office Rent', type: AccountType.EXPENSE, subtype: null, description: 'Office rent and premises costs.' },
  { code: '5200', name: 'Professional Subscriptions', type: AccountType.EXPENSE, subtype: null, description: 'LSK practising fees, software and professional subscriptions.' },
  { code: '5300', name: 'Court Filing Fees', type: AccountType.EXPENSE, subtype: null, description: 'Court filing and registry fees.' },
  { code: '5400', name: 'Travel and Transport', type: AccountType.EXPENSE, subtype: null, description: 'Travel, transport and mileage costs.' },
  { code: '5500', name: 'Utilities', type: AccountType.EXPENSE, subtype: null, description: 'Electricity, water, internet and telephone.' },
  { code: '5600', name: 'Marketing', type: AccountType.EXPENSE, subtype: null, description: 'Marketing, business development and client events.' },
  { code: '5700', name: 'Professional Indemnity Insurance', type: AccountType.EXPENSE, subtype: null, description: 'Professional indemnity and other insurance premiums.' },
  { code: '5800', name: 'Bank Charges', type: AccountType.EXPENSE, subtype: null, description: 'Bank charges and transaction fees.' },
];

/* Balanced opening entry (DR 750,000 = CR 750,000).
 * Trust bank (1500) is mirrored exactly by trust liability (2010) — ADR-004. */
const OPENING_LINES: OpeningLine[] = [
  { code: '1000', debit: '500000.00', credit: '0.00', description: 'Opening operating bank balance.' },
  { code: '1500', debit: '250000.00', credit: '0.00', description: 'Opening client trust bank balance.' },
  { code: '2010', debit: '0.00', credit: '250000.00', description: 'Opening client trust liability (mirrors trust bank).' },
  { code: '3000', debit: '0.00', credit: '500000.00', description: 'Opening partners capital brought forward.' },
];

function currentPeriod(): { name: string; month: number; year: number; startDate: Date; endDate: Date } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1-based
  const name = `${year}-${String(month).padStart(2, '0')}`;
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // last day of month
  return { name, month, year, startDate, endDate };
}

async function resolvePosterId(prisma: SeedPrisma, tenantId: string): Promise<string> {
  const poster =
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.FIRM_ADMIN }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.ADVOCATE }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } }));

  if (!poster) {
    throw new Error(`seedFinance: no user for tenant ${tenantId}. Run 02_users first.`);
  }

  return poster.id;
}

export async function seedFinance(
  prisma: PrismaClient,
  tenantId: string,
): Promise<FinanceSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedFinance requires a tenantId.');
  }

  const posterId = await resolvePosterId(prisma, tenantId);
  const branch = await prisma.branch.findFirst({ where: { tenantId }, select: { id: true } });
  const branchId = branch?.id ?? null;

  // 1. Chart of accounts — upsert by tenantId_code; normalBalance derived from type.
  const accountIdByCode = new Map<string, string>();
  let accounts = 0;

  for (const def of COA_SEEDS) {
    const isSystem = def.system === true;
    const allowManualPosting = isSystem ? false : def.manualPosting ?? true;
    const normalBalance = normalSideFor(def.type);

    const record = await prisma.chartOfAccount.upsert({
      where: { tenantId_code: { tenantId, code: def.code } },
      update: {
        name: def.name,
        type: def.type,
        subtype: def.subtype,
        normalBalance,
        allowManualPosting,
        isSystem,
        isActive: true,
        currency: 'KES',
        description: def.description,
      },
      create: {
        tenantId,
        code: def.code,
        name: def.name,
        type: def.type,
        subtype: def.subtype,
        normalBalance,
        allowManualPosting,
        isSystem,
        isActive: true,
        currency: 'KES',
        description: def.description,
      },
      select: { id: true },
    });

    accountIdByCode.set(def.code, record.id);
    accounts += 1;
  }

  // 2. Accounting period — OPEN for the current month (upsert by tenantId_name).
  const period = currentPeriod();
  await prisma.accountingPeriod.upsert({
    where: { tenantId_name: { tenantId, name: period.name } },
    update: {
      month: period.month,
      year: period.year,
      startDate: period.startDate,
      endDate: period.endDate,
      status: AccountingPeriodStatus.OPEN,
      isClosed: false,
      closedAt: null,
      closedById: null,
    },
    create: {
      tenantId,
      name: period.name,
      month: period.month,
      year: period.year,
      startDate: period.startDate,
      endDate: period.endDate,
      status: AccountingPeriodStatus.OPEN,
      isClosed: false,
    },
  });
  const accountingPeriods = 1;

  // Confirm the opening entry balances (DR = CR) before posting.
  const totalDebit = OPENING_LINES.reduce((sum, l) => sum + Number(l.debit), 0);
  const totalCredit = OPENING_LINES.reduce((sum, l) => sum + Number(l.credit), 0);
  const openingBalanced = totalDebit === totalCredit;
  if (!openingBalanced) {
    throw new Error(`seedFinance: opening entry not balanced (DR ${totalDebit} != CR ${totalCredit}).`);
  }

  // 3. Opening-balance journal — create with nested lines only if absent.
  let journalEntries = 0;
  let journalLines = 0;

  const existingJournal = await prisma.journalEntry.findFirst({
    where: { tenantId, reference: OPENING_REFERENCE },
    select: { id: true },
  });

  if (existingJournal) {
    journalEntries = 1;
    journalLines = await prisma.journalLine.count({ where: { tenantId, journalId: existingJournal.id } });
  } else {
    const lineData = OPENING_LINES.map((line) => {
      const accountId = accountIdByCode.get(line.code);
      if (!accountId) {
        throw new Error(`seedFinance: opening line references unseeded account ${line.code}.`);
      }
      return {
        tenantId,
        accountId,
        branchId,
        reference: OPENING_REFERENCE,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
      };
    });

    await prisma.journalEntry.create({
      data: {
        tenantId,
        reference: OPENING_REFERENCE,
        description: 'Opening balances brought forward (seed).',
        date: period.startDate,
        amount: totalDebit.toFixed(2),
        currency: 'KES',
        postedById: posterId,
        sourceModule: 'SEED',
        sourceEntityType: 'OpeningBalance',
        sourceEntityId: tenantId,
        lines: { create: lineData },
      },
    });

    journalEntries = 1;
    journalLines = OPENING_LINES.length;
  }

  // 4. Account balances for the touched accounts (upsert by tenantId_accountId).
  let accountBalances = 0;

  for (const line of OPENING_LINES) {
    const accountId = accountIdByCode.get(line.code);
    if (!accountId) {
      continue;
    }

    const net = (Number(line.debit) - Number(line.credit)).toFixed(2);

    await prisma.accountBalance.upsert({
      where: { tenantId_accountId: { tenantId, accountId } },
      update: { debitBalance: line.debit, creditBalance: line.credit, netBalance: net },
      create: {
        tenantId,
        accountId,
        debitBalance: line.debit,
        creditBalance: line.credit,
        netBalance: net,
      },
    });

    accountBalances += 1;
  }

  return {
    status: 'finance_seed_complete',
    tenantId,
    accounts,
    accountingPeriods,
    journalEntries,
    journalLines,
    accountBalances,
    openingBalanced,
  };
}
