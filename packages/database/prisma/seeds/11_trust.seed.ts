import { AccountSubtype, Prisma, PrismaClient, TenantRole, TrustTransactionType } from '@prisma/client';

/*
 * 11_trust.seed.ts — Per-tenant trust-accounting layer (CLAUDE.md §12).
 *
 * Seeds, for every seeded client, a client trust account and a realistic set of
 * trust movements, each posted end-to-end the SAME way the production
 * TrustTransactionService posts them — but with raw prisma, because:
 *
 *   - This seed runs from @global-wakili/database (a leaf package: deps are only
 *     @prisma/client + pg). TrustTransactionService lives in apps/api and is
 *     coupled to express Request, the audit-logger, and GeneralLedgerService;
 *     importing it here would reverse the package→app dependency. Every seed
 *     (00–10) is self-contained raw prisma — 10_finance even posts its opening
 *     JOURNAL with raw prisma rather than GeneralLedgerService. This layer
 *     mirrors that discipline and reproduces the exact posting OUTCOME.
 *   - The service is not idempotent (it throws DUPLICATE_REFERENCE on rerun);
 *     this layer is reference-gated and safe to repeat.
 *
 * For each movement this faithfully replicates the service:
 *   - TrustTransaction : DEPOSIT/INTEREST → credit; WITHDRAWAL → debit. Never
 *                        negative; withdrawals never exceed the matter-level
 *                        client trust balance (ADR-004).
 *   - ClientTrustLedger: one row per movement (service side-effect), with the
 *                        running per-(account,client,matter) balance — replicates
 *                        ClientTrustLedgerService.applyDelta.
 *   - JournalEntry/Line: DR Trust Bank (1500) / CR Trust Liability (2010) on
 *                        inflow, reversed on outflow. Accounts resolved by
 *                        SUBTYPE (TRUST_BANK / TRUST_LIABILITY), exactly like the
 *                        service — code-transparent. Trust asset always mirrors
 *                        trust liability: no commingling (ADR-004).
 *   - BankStatement +  : a signed bank mirror per movement so the three-way
 *     BankTransaction     reconciliation (trust book = client ledger = bank)
 *                         actually balances. (TrustReconciliationService computes
 *                         bank side as SUM(BankTransaction.amount).)
 *   - TrustReconciliation: one per trust account (the model is account-scoped),
 *                          three-way computed; isCompleted = balanced.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy:
 * - Idempotent: trust account upsert(accountNumber, globally unique); each
 *   movement gated by findFirst(tenantId, reference) — txn/ledger/journal/bank
 *   created once; currentBalance & AccountBalance(1500/2010) RECOMPUTED from sums
 *   (set, never increment); reconciliation upsert(tenantId,trustAccountId,date).
 * - Tenant-scoped throughout. No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type TrustTxnSeed = {
  seq: string; // reference suffix + ordering (deposits before withdrawals)
  type: 'DEPOSIT' | 'WITHDRAWAL';
  matterCode: string;
  amount: string; // KES, 2dp string
  date: string; // ISO (UTC), <= RECON_STATEMENT_DATE
  description: string;
};

type TrustAccountSeed = {
  clientCode: string;
  accountName: string;
  bankName: string;
  txns: TrustTxnSeed[];
};

export type TrustSeedResult = {
  status: 'trust_seed_complete';
  tenantId: string;
  trustAccounts: number;
  trustTransactions: number;
  clientTrustLedgers: number;
  journalEntries: number;
  journalLines: number;
  bankStatements: number;
  bankTransactions: number;
  reconciliations: number;
  reconciliationsBalanced: number;
  allReconciliationsBalanced: boolean;
};

const ZERO = new Prisma.Decimal(0);

/* Statement date for the reconciliation pass — strictly after every txn date so
 * the three-way snapshot (transactionDate <= statementDate) includes them all. */
const RECON_STATEMENT_DATE = new Date('2026-06-30T00:00:00.000Z');

/* One trust account per seeded client (03_clients seeds 3 per tenant). Anchor
 * amounts match the v3 trust test data: CLI-0001 500k on MAT-0002,
 * CLI-0002 1.2M on MAT-0004. Each account: >=2 deposits + 1 withdrawal; every
 * withdrawal is on a matter that already holds enough (ADR-004, no overdraw). */
const TRUST_ACCOUNT_SEEDS: TrustAccountSeed[] = [
  {
    clientCode: 'CLI-0001',
    accountName: 'Acme Holdings Limited — Client Trust',
    bankName: 'KCB Bank Kenya',
    txns: [
      { seq: 'D1', type: 'DEPOSIT', matterCode: 'MAT-0002', amount: '500000.00', date: '2026-02-10T00:00:00.000Z', description: 'Settlement funds received into trust (Coastline matter).' },
      { seq: 'D2', type: 'DEPOSIT', matterCode: 'MAT-0001', amount: '300000.00', date: '2026-02-20T00:00:00.000Z', description: 'Deposit on account of acquisition disbursements.' },
      { seq: 'W1', type: 'WITHDRAWAL', matterCode: 'MAT-0002', amount: '150000.00', date: '2026-03-15T00:00:00.000Z', description: 'Court filing and process disbursements paid from trust.' },
    ],
  },
  {
    clientCode: 'CLI-0002',
    accountName: 'Grace Wanjiru Mwangi — Client Trust',
    bankName: 'Equity Bank Kenya',
    txns: [
      { seq: 'D1', type: 'DEPOSIT', matterCode: 'MAT-0004', amount: '1200000.00', date: '2026-02-12T00:00:00.000Z', description: 'Purchase deposit held in trust (Kilimani conveyance).' },
      { seq: 'D2', type: 'DEPOSIT', matterCode: 'MAT-0005', amount: '200000.00', date: '2026-02-22T00:00:00.000Z', description: 'Deposit on account of probate disbursements.' },
      { seq: 'W1', type: 'WITHDRAWAL', matterCode: 'MAT-0004', amount: '400000.00', date: '2026-03-18T00:00:00.000Z', description: 'Stamp duty and registration fees paid from trust.' },
    ],
  },
  {
    clientCode: 'CLI-0003',
    accountName: 'County Government of Nairobi — Client Trust',
    bankName: 'Co-operative Bank of Kenya',
    txns: [
      { seq: 'D1', type: 'DEPOSIT', matterCode: 'MAT-0007', amount: '400000.00', date: '2026-02-14T00:00:00.000Z', description: 'Funds in trust for judicial review disbursements.' },
      { seq: 'D2', type: 'DEPOSIT', matterCode: 'MAT-0008', amount: '150000.00', date: '2026-02-24T00:00:00.000Z', description: 'Deposit on account of lease drafting disbursements.' },
      { seq: 'W1', type: 'WITHDRAWAL', matterCode: 'MAT-0007', amount: '100000.00', date: '2026-03-20T00:00:00.000Z', description: 'Filing fees paid from trust (judicial review).' },
    ],
  },
];

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return ZERO;
  }
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function isInflow(type: TrustTxnSeed['type']): boolean {
  return type === 'DEPOSIT';
}

async function resolvePosterId(prisma: SeedPrisma, tenantId: string): Promise<string> {
  const poster =
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.FIRM_ADMIN }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.ADVOCATE }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } }));

  if (!poster) {
    throw new Error(`seedTrust: no user for tenant ${tenantId}. Run 02_users first.`);
  }
  return poster.id;
}

async function resolveAccountIdBySubtype(
  prisma: SeedPrisma,
  tenantId: string,
  subtype: AccountSubtype,
): Promise<string> {
  const account = await prisma.chartOfAccount.findFirst({
    where: { tenantId, subtype, isActive: true },
    select: { id: true },
  });
  if (!account) {
    throw new Error(`seedTrust: ${subtype} account not configured for tenant ${tenantId}. Run 10_finance first.`);
  }
  return account.id;
}

export async function seedTrust(prisma: PrismaClient, tenantId: string): Promise<TrustSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedTrust requires a tenantId.');
  }

  const posterId = await resolvePosterId(prisma, tenantId);
  const branch = await prisma.branch.findFirst({ where: { tenantId }, select: { id: true } });
  const branchId = branch?.id ?? null;

  const trustBankId = await resolveAccountIdBySubtype(prisma, tenantId, AccountSubtype.TRUST_BANK);
  const trustLiabilityId = await resolveAccountIdBySubtype(prisma, tenantId, AccountSubtype.TRUST_LIABILITY);

  const trustAccountIds: string[] = [];
  const trustRefs: string[] = [];

  for (const acctSeed of TRUST_ACCOUNT_SEEDS) {
    const client = await prisma.client.findFirst({
      where: { tenantId, clientCode: acctSeed.clientCode },
      select: { id: true },
    });
    // Defensive: 03_clients must have run first.
    if (!client) {
      continue;
    }

    const accountNumber = `TRUST-${tenantId}-${acctSeed.clientCode}`;

    const trustAccount = await prisma.trustAccount.upsert({
      where: { accountNumber },
      update: {
        accountName: acctSeed.accountName,
        bankName: acctSeed.bankName,
        branchId,
        currency: 'KES',
        isActive: true,
      },
      create: {
        tenantId,
        branchId,
        accountName: acctSeed.accountName,
        accountNumber,
        bankName: acctSeed.bankName,
        currency: 'KES',
        currentBalance: '0.00',
        reconciliationBalance: '0.00',
        isActive: true,
        custodian: 'Managing Partner',
      },
      select: { id: true },
    });
    trustAccountIds.push(trustAccount.id);

    // One TRUST bank statement per account (idempotent), parent for the bank mirror.
    let bankStatement = await prisma.bankStatement.findFirst({
      where: { tenantId, accountType: 'TRUST', accountId: trustAccount.id, statementDate: RECON_STATEMENT_DATE },
      select: { id: true },
    });
    if (!bankStatement) {
      bankStatement = await prisma.bankStatement.create({
        data: {
          tenantId,
          importedById: posterId,
          accountType: 'TRUST',
          accountId: trustAccount.id,
          statementDate: RECON_STATEMENT_DATE,
          openingBalance: '0.00',
          closingBalance: '0.00',
        },
        select: { id: true },
      });
    }

    // Deposits are authored before withdrawals, so each matter holds funds first.
    for (const txn of acctSeed.txns) {
      const reference = `${acctSeed.clientCode}-TRUST-${txn.seq}`;
      trustRefs.push(reference);

      const existing = await prisma.trustTransaction.findFirst({
        where: { tenantId, reference },
        select: { id: true },
      });
      if (existing) {
        continue; // already seeded — txn + ledger + journal + bank mirror all present.
      }

      const matter = await prisma.matter.findFirst({
        where: { tenantId, matterCode: txn.matterCode, clientId: client.id },
        select: { id: true },
      });
      // Defensive: every seeded movement targets a real matter for this client.
      if (!matter) {
        continue;
      }

      const amount = toDecimal(txn.amount);
      const inflow = isInflow(txn.type);
      const txnType: TrustTransactionType = inflow
        ? TrustTransactionType.DEPOSIT
        : TrustTransactionType.WITHDRAWAL;
      const transactionDate = new Date(txn.date);

      await prisma.$transaction(async (tx) => {
        // 1. TrustTransaction (DEPOSIT credit / WITHDRAWAL debit).
        const trustTx = await tx.trustTransaction.create({
          data: {
            tenantId,
            trustAccountId: trustAccount.id,
            clientId: client.id,
            matterId: matter.id,
            transactionDate,
            postedDate: transactionDate,
            transactionType: txnType,
            amount,
            debit: inflow ? ZERO : amount,
            credit: inflow ? amount : ZERO,
            currency: 'KES',
            reference,
            description: txn.description,
            createdById: posterId,
          },
          select: { id: true },
        });

        // 2. ClientTrustLedger movement — replicate applyDelta's running balance,
        //    scoped to (account, client, matter). Guard against overdraw (ADR-004).
        const priorMatter = await tx.clientTrustLedger.aggregate({
          where: { tenantId, trustAccountId: trustAccount.id, clientId: client.id, matterId: matter.id },
          _sum: { debit: true, credit: true },
        });
        const matterBalance = toDecimal(priorMatter._sum.credit).minus(toDecimal(priorMatter._sum.debit));
        const delta = inflow ? amount : amount.negated();
        const nextMatterBalance = matterBalance.plus(delta);
        if (nextMatterBalance.lt(ZERO)) {
          throw new Error(
            `seedTrust: ${reference} would overdraw matter ${txn.matterCode} ` +
              `(balance ${matterBalance.toString()}, delta ${delta.toString()}). Check seed amounts.`,
          );
        }
        await tx.clientTrustLedger.create({
          data: {
            tenantId,
            trustAccountId: trustAccount.id,
            clientId: client.id,
            matterId: matter.id,
            debit: inflow ? ZERO : amount,
            credit: inflow ? amount : ZERO,
            balance: nextMatterBalance,
            description: txn.description,
            transactionDate,
          },
        });

        // 3. GL journal — DR 1500 / CR 2010 on inflow, reversed on outflow.
        const lines = inflow
          ? [
              { accountId: trustBankId, debit: amount, credit: ZERO },
              { accountId: trustLiabilityId, debit: ZERO, credit: amount },
            ]
          : [
              { accountId: trustLiabilityId, debit: amount, credit: ZERO },
              { accountId: trustBankId, debit: ZERO, credit: amount },
            ];

        await tx.journalEntry.create({
          data: {
            tenantId,
            reference: `TRUST-${reference}`,
            description: txn.description,
            date: transactionDate,
            amount,
            currency: 'KES',
            postedById: posterId,
            sourceModule: 'trust',
            sourceEntityType: 'TrustTransaction',
            sourceEntityId: trustTx.id,
            lines: {
              create: lines.map((l) => ({
                tenantId,
                accountId: l.accountId,
                clientId: client.id,
                matterId: matter.id,
                branchId,
                reference,
                description: txn.description,
                debit: l.debit,
                credit: l.credit,
              })),
            },
          },
        });

        // 4. Signed bank mirror so the three-way reconciliation balances
        //    (bank side = SUM(amount); +inflow / -outflow).
        await tx.bankTransaction.create({
          data: {
            tenantId,
            bankStatementId: bankStatement!.id,
            trustAccountId: trustAccount.id,
            amount: inflow ? amount : amount.negated(),
            description: txn.description,
            transactionDate,
            reference: `BANK-${reference}`,
            isMatched: true,
          },
        });
      });
    }

    // Recompute currentBalance from the account's trust movements (idempotent set).
    const acctAgg = await prisma.trustTransaction.aggregate({
      where: { tenantId, trustAccountId: trustAccount.id },
      _sum: { debit: true, credit: true },
    });
    const currentBalance = toDecimal(acctAgg._sum.credit).minus(toDecimal(acctAgg._sum.debit));
    await prisma.trustAccount.update({
      where: { id: trustAccount.id },
      data: { currentBalance },
    });

    // Refresh the statement's closing balance to match (cosmetic, idempotent).
    await prisma.bankStatement.update({
      where: { id: bankStatement.id },
      data: { closingBalance: currentBalance },
    });
  }

  // Recompute AccountBalance for trust bank (1500) and liability (2010) from ALL
  // journal lines (opening + trust) so the trial balance stays correct. Idempotent.
  for (const accountId of [trustBankId, trustLiabilityId]) {
    const agg = await prisma.journalLine.aggregate({
      where: { tenantId, accountId },
      _sum: { debit: true, credit: true },
    });
    const debitBalance = toDecimal(agg._sum.debit);
    const creditBalance = toDecimal(agg._sum.credit);
    const netBalance = debitBalance.minus(creditBalance);
    await prisma.accountBalance.upsert({
      where: { tenantId_accountId: { tenantId, accountId } },
      update: { debitBalance, creditBalance, netBalance },
      create: { tenantId, accountId, debitBalance, creditBalance, netBalance },
    });
  }

  // One three-way reconciliation per trust account (the model is account-scoped).
  for (const trustAccountId of trustAccountIds) {
    const [trustAgg, ledgerAgg, bankAgg] = await Promise.all([
      prisma.trustTransaction.aggregate({
        where: { tenantId, trustAccountId, transactionDate: { lte: RECON_STATEMENT_DATE } },
        _sum: { debit: true, credit: true },
      }),
      prisma.clientTrustLedger.aggregate({
        where: { tenantId, trustAccountId, transactionDate: { lte: RECON_STATEMENT_DATE } },
        _sum: { debit: true, credit: true },
      }),
      prisma.bankTransaction.aggregate({
        where: { tenantId, trustAccountId, transactionDate: { lte: RECON_STATEMENT_DATE } },
        _sum: { amount: true },
      }),
    ]);

    const trustBook = toDecimal(trustAgg._sum.credit).minus(toDecimal(trustAgg._sum.debit));
    const clientLedger = toDecimal(ledgerAgg._sum.credit).minus(toDecimal(ledgerAgg._sum.debit));
    const bankBalance = toDecimal(bankAgg._sum.amount);
    const balanced = trustBook.equals(clientLedger) && trustBook.equals(bankBalance);

    await prisma.trustReconciliation.upsert({
      where: {
        tenantId_trustAccountId_statementDate: {
          tenantId,
          trustAccountId,
          statementDate: RECON_STATEMENT_DATE,
        },
      },
      update: {
        statementBalance: bankBalance,
        isCompleted: balanced,
        completedAt: balanced ? new Date() : null,
      },
      create: {
        tenantId,
        trustAccountId,
        statementDate: RECON_STATEMENT_DATE,
        statementBalance: bankBalance,
        isCompleted: balanced,
        completedAt: balanced ? new Date() : null,
      },
    });

    await prisma.trustAccount.update({
      where: { id: trustAccountId },
      data: { lastReconciled: RECON_STATEMENT_DATE, reconciliationBalance: bankBalance },
    });
  }

  // Final counts via queries → correct regardless of which rows were created vs
  // already present on a rerun.
  const childFilter = { tenantId, trustAccountId: { in: trustAccountIds } };
  const journalRefs = trustRefs.map((r) => `TRUST-${r}`);

  const [
    trustAccounts,
    trustTransactions,
    clientTrustLedgers,
    journalEntries,
    journalLines,
    bankStatements,
    bankTransactions,
    reconciliations,
    reconciliationsBalanced,
  ] = await Promise.all([
    prisma.trustAccount.count({ where: { tenantId, id: { in: trustAccountIds } } }),
    prisma.trustTransaction.count({ where: childFilter }),
    prisma.clientTrustLedger.count({ where: childFilter }),
    prisma.journalEntry.count({ where: { tenantId, reference: { in: journalRefs } } }),
    prisma.journalLine.count({ where: { tenantId, reference: { in: trustRefs } } }),
    prisma.bankStatement.count({ where: { tenantId, accountType: 'TRUST', accountId: { in: trustAccountIds } } }),
    prisma.bankTransaction.count({ where: childFilter }),
    prisma.trustReconciliation.count({ where: childFilter }),
    prisma.trustReconciliation.count({ where: { ...childFilter, isCompleted: true } }),
  ]);

  return {
    status: 'trust_seed_complete',
    tenantId,
    trustAccounts,
    trustTransactions,
    clientTrustLedgers,
    journalEntries,
    journalLines,
    bankStatements,
    bankTransactions,
    reconciliations,
    reconciliationsBalanced,
    allReconciliationsBalanced: reconciliations > 0 && reconciliations === reconciliationsBalanced,
  };
}
