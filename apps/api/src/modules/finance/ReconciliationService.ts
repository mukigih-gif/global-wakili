// apps/api/src/modules/finance/ReconciliationService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type ReconciliationScope =
  | 'BANK'
  | 'TRUST'
  | 'OFFICE'
  | 'FULL'
  | 'THREE_WAY';

export type ReconciliationStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'RECONCILED'
  | 'EXCEPTION'
  | 'FAILED'
  | 'COMPLETED';

export type RunReconciliationInput = {
  tenantId: string;
  actorId: string;
  type?: ReconciliationScope;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  bankAccountId?: string | null;
  trustAccountId?: string | null;
  matterId?: string | null;
  metadata?: Record<string, unknown>;
};

export type ReconciliationFinding = {
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  meta?: Record<string, unknown>;
};

const ZERO = new Prisma.Decimal(0);

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply Finance schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'FINANCE_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate;
}

function optionalDelegate(db: DbClient, name: string) {
  return db[name] ?? null;
}

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) return ZERO;

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function appendHistory(metadata: unknown, entry: Record<string, unknown>) {
  const current = asRecord(metadata);
  const history = Array.isArray(current.history) ? current.history : [];

  return {
    ...current,
    history: [...history, entry],
  };
}

function dateWindow(input: RunReconciliationInput, field = 'createdAt') {
  if (!input.periodStart && !input.periodEnd) return {};

  return {
    [field]: {
      ...(input.periodStart ? { gte: input.periodStart } : {}),
      ...(input.periodEnd ? { lte: input.periodEnd } : {}),
    },
  };
}

export class ReconciliationService {
  static async runFullReconciliation(input: RunReconciliationInput) {
    return new ReconciliationService().runFullReconciliation(input);
  }

  async runFullReconciliation(input: RunReconciliationInput) {
    return prisma.$transaction(async (tx) => {
      const reconciliation = optionalDelegate(tx, 'reconciliation');

      const findings = await this.collectFindings(tx, input);
      const status = findings.some((finding) => finding.severity === 'CRITICAL')
        ? 'EXCEPTION'
        : findings.some((finding) => finding.severity === 'WARNING')
          ? 'IN_PROGRESS'
          : 'RECONCILED';

      if (!reconciliation) {
        return {
          tenantId: input.tenantId,
          type: input.type ?? 'FULL',
          status,
          findings,
          persisted: false,
          message: 'Reconciliation delegate not found; returned derived reconciliation result only.',
          generatedAt: new Date(),
        };
      }

      const record = await reconciliation.create({
        data: {
          tenantId: input.tenantId,
          type: input.type ?? 'FULL',
          status,
          periodStart: input.periodStart ?? new Date(),
          periodEnd: input.periodEnd ?? new Date(),
          bankAccountId: input.bankAccountId ?? null,
          trustAccountId: input.trustAccountId ?? null,
          matterId: input.matterId ?? null,
          createdById: input.actorId,
          metadata: appendHistory(input.metadata, {
            action: 'FINANCE_RECONCILIATION_RUN',
            actorId: input.actorId,
            type: input.type ?? 'FULL',
            status,
            findingCount: findings.length,
            at: new Date().toISOString(),
          }) as any,
        },
      });

      return {
        ...record,
        findings,
        persisted: true,
      };
    });
  }

  async runTrustReconciliation(input: RunReconciliationInput) {
    return this.runFullReconciliation({
      ...input,
      type: 'TRUST',
    });
  }

  async runThreeWayReconciliation(input: RunReconciliationInput) {
    return this.runFullReconciliation({
      ...input,
      type: 'THREE_WAY',
    });
  }

  async listReconciliations(input: {
    tenantId: string;
    type?: ReconciliationScope | string;
    status?: ReconciliationStatus | string;
    take?: number;
    skip?: number;
  }) {
    const reconciliation = optionalDelegate(prisma, 'reconciliation');

    if (!reconciliation) {
      return [];
    }

    return reconciliation.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.type ? { type: input.type } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  async getReconciliationById(tenantId: string, reconciliationId: string) {
    const reconciliation = delegate(prisma, 'reconciliation');

    const existing = await reconciliation.findFirst({
      where: {
        id: reconciliationId,
        tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Reconciliation record not found'), {
        statusCode: 404,
        code: 'RECONCILIATION_NOT_FOUND',
      });
    }

    return existing;
  }

  private async collectFindings(
    tx: Prisma.TransactionClient,
    input: RunReconciliationInput,
  ): Promise<ReconciliationFinding[]> {
    const findings: ReconciliationFinding[] = [];

    await this.checkJournalBalance(tx, input, findings);
    await this.checkTrustBalances(tx, input, findings);
    await this.checkUnreconciledBankTransactions(tx, input, findings);

    if (!findings.length) {
      findings.push({
        code: 'RECONCILIATION_NO_EXCEPTION',
        severity: 'INFO',
        message: 'No reconciliation exceptions were detected by the available checks.',
      });
    }

    return findings;
  }

  private async checkJournalBalance(
    tx: Prisma.TransactionClient,
    input: RunReconciliationInput,
    findings: ReconciliationFinding[],
  ) {
    const journalLine = optionalDelegate(tx, 'journalLine');

    if (!journalLine) {
      findings.push({
        code: 'JOURNAL_LINE_DELEGATE_MISSING',
        severity: 'WARNING',
        message: 'JournalLine delegate is unavailable; skipped journal balance reconciliation.',
      });
      return;
    }

    const lines = await journalLine.findMany({
      where: {
        tenantId: input.tenantId,
        ...dateWindow(input, 'createdAt'),
      },
      select: {
        debit: true,
        credit: true,
      },
      take: 10000,
    });

    const totals = lines.reduce(
      (acc: { debit: Prisma.Decimal; credit: Prisma.Decimal }, line: any) => ({
        debit: acc.debit.plus(money(line.debit)),
        credit: acc.credit.plus(money(line.credit)),
      }),
      { debit: ZERO, credit: ZERO },
    );

    if (!totals.debit.eq(totals.credit)) {
      findings.push({
        code: 'JOURNAL_LINES_UNBALANCED',
        severity: 'CRITICAL',
        message: 'Journal debits and credits do not balance for the selected reconciliation window.',
        meta: {
          totalDebit: totals.debit.toString(),
          totalCredit: totals.credit.toString(),
          variance: totals.debit.minus(totals.credit).toString(),
        },
      });
    }
  }

  private async checkTrustBalances(
    tx: Prisma.TransactionClient,
    input: RunReconciliationInput,
    findings: ReconciliationFinding[],
  ) {
    const trustTransaction = optionalDelegate(tx, 'trustTransaction');

    if (!trustTransaction) {
      return;
    }

    const rows = await trustTransaction.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.matterId ? { matterId: input.matterId } : {}),
        ...dateWindow(input, 'transactionDate'),
      },
      select: {
        id: true,
        matterId: true,
        amount: true,
        transactionType: true,
      },
      take: 10000,
    });

    const byMatter = new Map<string, Prisma.Decimal>();

    for (const row of rows) {
      const matterId = row.matterId ?? 'UNASSIGNED';
      const current = byMatter.get(matterId) ?? ZERO;
      const type = String(row.transactionType ?? '').toUpperCase();
      const amount = money(row.amount);

      const next = ['WITHDRAWAL', 'TRANSFER_TO_OFFICE', 'DISBURSEMENT'].includes(type)
        ? current.minus(amount)
        : current.plus(amount);

      byMatter.set(matterId, next);
    }

    for (const [matterId, balance] of byMatter.entries()) {
      if (balance.lt(0)) {
        findings.push({
          code: 'NEGATIVE_TRUST_BALANCE',
          severity: 'CRITICAL',
          message: 'Trust ledger has a negative matter-level balance.',
          meta: {
            matterId,
            balance: balance.toString(),
          },
        });
      }
    }
  }

  private async checkUnreconciledBankTransactions(
    tx: Prisma.TransactionClient,
    input: RunReconciliationInput,
    findings: ReconciliationFinding[],
  ) {
    const bankTransaction = optionalDelegate(tx, 'bankTransaction');

    if (!bankTransaction) {
      return;
    }

    const unreconciledCount = await bankTransaction.count({
      where: {
        tenantId: input.tenantId,
        reconciledAt: null,
        ...(input.bankAccountId ? { bankAccountId: input.bankAccountId } : {}),
        ...dateWindow(input, 'transactionDate'),
      },
    });

    if (unreconciledCount > 0) {
      findings.push({
        code: 'UNRECONCILED_BANK_TRANSACTIONS',
        severity: 'WARNING',
        message: 'There are unreconciled bank transactions in the selected reconciliation window.',
        meta: {
          unreconciledCount,
        },
      });
    }
  }
}

export const reconciliationService = new ReconciliationService();

export default ReconciliationService;