// apps/api/src/modules/finance/client-ledger.service.ts

import { Prisma } from '@global-wakili/database';

type ClientLedgerJournalLineAggregateResult = {
  _sum?: {
    debit?: Prisma.Decimal | number | string | null;
    credit?: Prisma.Decimal | number | string | null;
  } | null;
};

type ClientLedgerAccountRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string | null;
};

type ClientLedgerJournalRow = {
  id: string;
  date: Date | null;
  reference: string | null;
  description: string | null;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
};

type ClientLedgerLineRow = {
  id: string;
  debit: Prisma.Decimal | number | string | null;
  credit: Prisma.Decimal | number | string | null;
  reference: string | null;
  description: string | null;
  journal: ClientLedgerJournalRow | null;
  account: ClientLedgerAccountRow | null;
};

type ClientLedgerDbClient = {
  journalLine: {
    aggregate: (args: unknown) => Promise<ClientLedgerJournalLineAggregateResult>;
    findMany: (args: unknown) => Promise<ClientLedgerLineRow[]>;
  };
};

type ClientLedgerContext = {
  tenantId: string;
  req: {
    db: ClientLedgerDbClient;
  };
};

type ClientLedgerParams = {
  clientId: string;
  matterId?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
};

function requiredString(value: unknown, label: string, code: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error(`${label} is required`), {
      statusCode: 422,
      code,
    });
  }

  return value.trim();
}

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export class ClientLedgerService {
  /**
   * Client ledger view backed by JournalLine.
   *
   * Current schema notes:
   * - JournalLine has `clientId`, `matterId`, `debit`, `credit`, and relation `journal`.
   * - ChartOfAccount does not have `isTrust`; trust classification belongs to account type/subtype.
   * - JournalLine has no `createdAt`, so ordering is by journal date then line id.
   */
  static async getLedger(context: ClientLedgerContext, params: ClientLedgerParams) {
    const db = context.req.db;
    const tenantId = requiredString(context.tenantId, 'Tenant ID', 'FINANCE_TENANT_REQUIRED');
    const clientId = requiredString(params.clientId, 'Client ID', 'CLIENT_LEDGER_CLIENT_REQUIRED');

    const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), 200);
    const offset = Math.max(Number(params.offset ?? 0), 0);

    const whereBase = {
      tenantId,
      clientId,
      ...(params.matterId ? { matterId: params.matterId } : {}),
    };

    const openingBalanceAgg = await db.journalLine.aggregate({
      where: {
        ...whereBase,
        ...(params.startDate
          ? {
              journal: {
                date: {
                  lt: params.startDate,
                },
              },
            }
          : {}),
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const openingBalance = toDecimal(openingBalanceAgg._sum?.debit).minus(
      toDecimal(openingBalanceAgg._sum?.credit),
    );

    const entries = await db.journalLine.findMany({
      where: {
        ...whereBase,
        ...(params.startDate
          ? {
              journal: {
                date: {
                  gte: params.startDate,
                },
              },
            }
          : {}),
      },
      include: {
        journal: {
          select: {
            id: true,
            date: true,
            reference: true,
            description: true,
            sourceModule: true,
            sourceEntityType: true,
            sourceEntityId: true,
          },
        },
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            subtype: true,
          },
        },
      },
      orderBy: [{ journal: { date: 'asc' } }, { id: 'asc' }],
      take: limit,
      skip: offset,
    });

    let runningBalance = openingBalance;

    const ledger = entries.map((line: ClientLedgerLineRow) => {
      const debit = toDecimal(line.debit);
      const credit = toDecimal(line.credit);

      runningBalance = runningBalance.plus(debit).minus(credit);

      return {
        id: line.id,
        date: line.journal?.date ?? null,
        journalId: line.journal?.id ?? null,
        reference: line.reference ?? line.journal?.reference ?? null,
        description: line.description ?? line.journal?.description ?? null,
        account: line.account
          ? {
              id: line.account.id,
              code: line.account.code,
              name: line.account.name,
              type: line.account.type,
              subtype: line.account.subtype,
            }
          : null,
        debit,
        credit,
        runningBalance: new Prisma.Decimal(runningBalance),
        sourceModule: line.journal?.sourceModule ?? null,
        sourceEntityType: line.journal?.sourceEntityType ?? null,
        sourceEntityId: line.journal?.sourceEntityId ?? null,
      };
    });

    return {
      openingBalance,
      entries: ledger,
      closingBalance: runningBalance,
      metadata: {
        limit,
        offset,
        clientId,
        matterId: params.matterId ?? null,
        startDate: params.startDate ?? null,
      },
    };
  }
}

export default ClientLedgerService;