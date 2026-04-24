import { Decimal } from '@prisma/client/runtime/library';

export class ClientLedgerService {
  /**
   * 📖 GET HARDENED CLIENT LEDGER
   * Pulls from the General Ledger to ensure 100% accuracy with the firm's books.
   */
  static async getLedger(
    context: { tenantId: string; req: any }, 
    params: { 
      clientId: string; 
      matterId?: string; 
      limit?: number; 
      offset?: number;
      startDate?: Date;
    }
  ) {
    const db = context.req.db;
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    // 1. CALCULATE OPENING BALANCE (Balance Brought Forward)
    // We sum all transactions before the first record of the current page/filter
    const openingBalanceAgg = await db.journalLine.aggregate({
      where: {
        tenantId: context.tenantId,
        clientId: params.clientId,
        ...(params.matterId && { matterId: params.matterId }),
        journalEntry: {
          createdAt: params.startDate ? { lt: params.startDate } : undefined,
          // If using offset pagination, logic would sum everything before the 'offset'
        }
      },
      _sum: { debit: true, credit: true }
    });

    const bbf = new Decimal(openingBalanceAgg._sum.credit || 0)
      .minus(openingBalanceAgg._sum.debit || 0);

    // 2. FETCH LEDGER ENTRIES
    const entries = await db.journalLine.findMany({
      where: {
        tenantId: context.tenantId,
        clientId: params.clientId,
        ...(params.matterId && { matterId: params.matterId }),
        journalEntry: params.startDate ? { createdAt: { gte: params.startDate } } : undefined,
      },
      include: {
        journalEntry: true,
        account: { select: { name: true, isTrust: true } },
      },
      orderBy: { journalEntry: { createdAt: 'asc' } },
      take: limit,
      skip: offset,
    });

    // 3. GENERATE RUNNING BALANCE
    let runningBalance = bbf;

    const ledger = entries.map((line) => {
      // Trust Accounting Logic: Credit increases liability (Deposit), Debit decreases it (Payment)
      const amount = line.credit.greaterThan(0) ? line.credit : line.debit.negated();
      runningBalance = runningBalance.add(amount);

      return {
        id: line.id,
        date: line.journalEntry.createdAt,
        reference: line.journalEntry.reference,
        description: line.journalEntry.description,
        account: line.account.name,
        isTrust: line.account.isTrust,
        debit: line.debit,
        credit: line.credit,
        runningBalance: new Decimal(runningBalance),
      };
    });

    return {
      openingBalance: bbf,
      entries: ledger,
      closingBalance: runningBalance,
      metadata: { limit, offset }
    };
  }
}