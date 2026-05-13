import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { TransactionEngine } from './transaction-engine';
import type { JournalPostingInput, PostingPolicyContext, TenantDbClient } from './finance.types';
import { AccountBalanceService } from './account-balance.service';
import { logAdminAction } from '../../utils/audit-logger';
import { AuditSeverity } from '../../types/audit';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

type FinanceRequestDbClient = TenantDbClient & {
  $transaction: <T>(
    callback: (
      tx: TenantDbClient & {
        journalEntry: {
          create: (args: unknown) => Promise<{ id: string }>;
        };
      },
    ) => Promise<T>,
  ) => Promise<T>;
};

type GeneralLedgerAccountBalanceDbClient = TenantDbClient & {
  journalLine: {
    aggregate: (args: unknown) => Promise<unknown>;
  };
  accountBalance: {
    upsert: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<AccountBalanceRow[]>;
  };
};

type AccountBalanceRow = {
  accountId: string;
  debitBalance?: Prisma.Decimal | number | string | null;
  creditBalance?: Prisma.Decimal | number | string | null;
  netBalance?: Prisma.Decimal | number | string | null;
};

type TrialBalanceAccountRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string | null;
};

type HistoricalTrialBalanceRow = {
  accountId: string;
  _sum?: {
    debit?: Prisma.Decimal | number | string | null;
    credit?: Prisma.Decimal | number | string | null;
  } | null;
};

export class GeneralLedgerService {
  static async postJournal(
    req: Request,
    input: JournalPostingInput,
    context: PostingPolicyContext = {},
  ) {
    const db = req.db;
    const tenantId = req.tenantId!;

    let journal: Awaited<ReturnType<typeof TransactionEngine.postJournalAtomically>>;

    try {
      journal = await TransactionEngine.postJournalAtomically(
        db as FinanceRequestDbClient,
        tenantId,
        input,
        context,
        req.user?.sub,
      );

      const accountIds = input.lines.map((line) => line.accountId);

      void AccountBalanceService.rebuildMany(db as GeneralLedgerAccountBalanceDbClient, tenantId, accountIds).catch((error) => {
        console.error(
          `[ASYNC_BALANCE_FAIL] failed to update balances for journal=${journal.id}`,
          error,
        );
      });
    } catch (error: any) {
      void Promise.resolve(
        logAdminAction({
          req,
          tenantId,
          action: 'POST_JOURNAL_FAILED',
          severity: AuditSeverity.HIGH,
          payload: {
            reference: input.reference,
            error: error?.message ?? 'Unknown error',
          },
        }),
      ).catch((auditError) => {
        console.error('[AUDIT_CRITICAL_FAIL] failed to log journal rejection', auditError);
      });

      throw error;
    }

    void Promise.resolve(
      logAdminAction({
        req,
        tenantId,
        action: 'POST_JOURNAL',
        severity: AuditSeverity.INFO,
        entityId: journal.id,
        payload: {
          reference: input.reference,
          totalLines: input.lines.length,
        },
      }),
    ).catch((auditError) => {
      console.error('[AUDIT_CRITICAL_FAIL] failed to log journal success', auditError);
    });

    return journal;
  }

  static async getCurrentTrialBalance(req: Request) {
    const db = req.db;
    const tenantId = req.tenantId!;

    const balances = await AccountBalanceService.list(db as GeneralLedgerAccountBalanceDbClient, tenantId);
    const accountIds = balances.map((balance: AccountBalanceRow) => balance.accountId);

    const accounts = await db.chartOfAccount.findMany({
      where: {
        tenantId,
        id: { in: accountIds },
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        subtype: true,
      },
      orderBy: {
        code: 'asc',
      },
    });

    return (accounts as TrialBalanceAccountRow[]).map((account: TrialBalanceAccountRow) => {
      const balance = balances.find((item: AccountBalanceRow) => item.accountId === account.id);

      return {
        ...account,
        debit: toDecimal(balance?.debitBalance),
        credit: toDecimal(balance?.creditBalance),
        netBalance: toDecimal(balance?.netBalance),
      };
    });
  }

  static async getHistoricalTrialBalance(req: Request, asOfDate: Date) {
    const db = req.db;
    const tenantId = req.tenantId!;

    const grouped = await db.journalLine.groupBy({
      by: ['accountId'],
      where: {
        tenantId,
        journal: {
          date: { lte: asOfDate },
          reversalOfId: null,
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const accountIds = (grouped as HistoricalTrialBalanceRow[]).map((row) => row.accountId);

    const accounts = await db.chartOfAccount.findMany({
      where: {
        tenantId,
        id: { in: accountIds },
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        subtype: true,
      },
      orderBy: {
        code: 'asc',
      },
    });

    return (accounts as TrialBalanceAccountRow[]).map((account: TrialBalanceAccountRow) => {
      const row = (grouped as HistoricalTrialBalanceRow[]).find((item) => item.accountId === account.id);
      const debit = toDecimal(row?._sum?.debit);
      const credit = toDecimal(row?._sum?.credit);

      return {
        ...account,
        debit,
        credit,
        netBalance: debit.minus(credit),
      };
    });
  }
}