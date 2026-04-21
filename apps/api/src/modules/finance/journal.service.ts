// apps/api/src/modules/finance/journal.service.ts

import { prisma } from '@global-wakili/database';

import type {
  JournalListFilters,
} from './finance.types';

type JournalDbClient = {
  journalEntry: {
    findMany: Function;
    findUnique?: Function;
    findFirst?: Function;
    count?: Function;
  };
};

function getDelegate(db: JournalDbClient | any) {
  if (!db?.journalEntry) {
    throw Object.assign(
      new Error('journalEntry delegate is unavailable'),
      {
        statusCode: 500,
        code: 'JOURNAL_ENTRY_DELEGATE_MISSING',
      },
    );
  }

  return db.journalEntry;
}

function dateRangeWhere(filters: JournalListFilters) {
  if (!filters.startDate && !filters.endDate) return {};

  return {
    createdAt: {
      ...(filters.startDate ? { gte: filters.startDate } : {}),
      ...(filters.endDate ? { lte: filters.endDate } : {}),
    },
  };
}

export class JournalService {
  static async list(
    context: {
      tenantId: string;
      req?: any;
      db?: any;
    },
    filters: JournalListFilters = {},
  ) {
    const db = context.db ?? context.req?.db ?? prisma;

    return new JournalService(db).listJournals({
      tenantId: context.tenantId,
      ...filters,
    });
  }

  static async getById(
    context: {
      tenantId: string;
      req?: any;
      db?: any;
    },
    journalId: string,
  ) {
    const db = context.db ?? context.req?.db ?? prisma;

    return new JournalService(db).getJournalById(context.tenantId, journalId);
  }

  constructor(private readonly db: JournalDbClient | any = prisma) {}

  async listJournals(input: JournalListFilters & {
    tenantId: string;
  }) {
    const journalEntry = getDelegate(this.db);

    return journalEntry.findMany({
      where: {
        tenantId: input.tenantId,
        ...dateRangeWhere(input),
        ...(input.reference
          ? { reference: { contains: input.reference, mode: 'insensitive' } }
          : {}),
        ...(input.sourceModule ? { sourceModule: input.sourceModule } : {}),
        ...(input.sourceEntityType ? { sourceEntityType: input.sourceEntityType } : {}),
        ...(input.sourceEntityId ? { sourceEntityId: input.sourceEntityId } : {}),
        ...(input.matterId
          ? {
              lines: {
                some: {
                  matterId: input.matterId,
                },
              },
            }
          : {}),
        ...(input.clientId
          ? {
              lines: {
                some: {
                  clientId: input.clientId,
                },
              },
            }
          : {}),
      },
      include: {
        lines: {
          include: {
            account: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(input.take ?? input.limit ?? 50, 100),
      skip: input.skip ?? 0,
    });
  }

  async getJournalById(tenantId: string, journalId: string) {
    const journalEntry = getDelegate(this.db);

    const finder = typeof journalEntry.findFirst === 'function'
      ? journalEntry.findFirst.bind(journalEntry)
      : journalEntry.findUnique.bind(journalEntry);

    const journal = typeof journalEntry.findFirst === 'function'
      ? await finder({
          where: {
            id: journalId,
            tenantId,
          },
          include: {
            lines: {
              include: {
                account: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        })
      : await finder({
          where: {
            id: journalId,
          },
          include: {
            lines: {
              include: {
                account: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        });

    if (!journal || journal.tenantId !== tenantId) {
      throw Object.assign(new Error('Journal entry not found'), {
        statusCode: 404,
        code: 'JOURNAL_ENTRY_NOT_FOUND',
      });
    }

    return journal;
  }
}

export const journalService = new JournalService();

export default JournalService;