import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import type { AccountStatementReport, AccountStatementRow } from './report.types';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

function toDisplayBalance(
  balance: Prisma.Decimal,
  normalBalance: 'DEBIT' | 'CREDIT',
): Prisma.Decimal {
  return normalBalance === 'CREDIT' ? balance.negated() : balance;
}

export class StatementService {
  static async getAccountStatement(
    req: Request,
    params: {
      accountId: string;
      start?: Date;
      end?: Date;
    },
  ): Promise<AccountStatementReport> {
    const db = req.db;
    const tenantId = req.tenantId!;

    const account = await db.chartOfAccount.findFirst({
      where: {
        tenantId,
        id: params.accountId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        subtype: true,
        normalBalance: true,
        currency: true,
      },
    });

    if (!account) {
      throw Object.assign(new Error('Account not found'), {
        statusCode: 404,
        code: 'ACCOUNT_NOT_FOUND',
        details: {
          accountId: params.accountId,
        },
      });
    }

    const openingAggregate = await db.journalLine.aggregate({
      where: {
        tenantId,
        accountId: params.accountId,
        journal: params.start
          ? {
              date: { lt: params.start },
              reversalOfId: null,
            }
          : {
              reversalOfId: null,
            },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const openingBalance = toDecimal(openingAggregate._sum.debit).minus(
      toDecimal(openingAggregate._sum.credit),
    );

    const lines = await db.journalLine.findMany({
      where: {
        tenantId,
        accountId: params.accountId,
        journal: {
          ...(params.start ? { date: { gte: params.start } } : {}),
          ...(params.end ? { date: { lte: params.end } } : {}),
          reversalOfId: null,
        },
      },
      select: {
        id: true,
        debit: true,
        credit: true,
        reference: true,
        description: true,
        clientId: true,
        matterId: true,
        branchId: true,
        journal: {
          select: {
            id: true,
            reference: true,
            date: true,
          },
        },
      },
      orderBy: [{ journal: { date: 'asc' } }, { createdAt: 'asc' }],
    });

    let runningBalance = openingBalance;

    const rows: AccountStatementRow[] = lines.map((line: any) => {
      const debit = toDecimal(line.debit);
      const credit = toDecimal(line.credit);
      runningBalance = runningBalance.plus(debit).minus(credit);

      return {
        journalId: line.journal.id,
        journalReference: line.journal.reference,
        journalDate: line.journal.date,
        lineReference: line.reference ?? null,
        description: line.description ?? null,
        debit,
        credit,
        runningBalance,
        clientId: line.clientId ?? null,
        matterId: line.matterId ?? null,
        branchId: line.branchId ?? null,
      };
    });

    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      subtype: account.subtype ?? null,
      normalBalance: account.normalBalance,
      currency: account.currency,
      periodStart: params.start,
      periodEnd: params.end,
      openingBalance,
      closingBalance: runningBalance,
      displayOpeningBalance: toDisplayBalance(openingBalance, account.normalBalance),
      displayClosingBalance: toDisplayBalance(runningBalance, account.normalBalance),
      rows,
    };
  }
}