import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import type {
  TrustStatementReport,
  TrustStatementRow,
} from './trust.report.types';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class TrustStatementService {
  static async getTrustAccountStatement(
    req: Request,
    params: {
      trustAccountId: string;
      start?: Date;
      end?: Date;
    },
  ): Promise<TrustStatementReport> {
    const db = req.db;
    const tenantId = req.tenantId!;

    const trustAccount = await db.trustAccount.findFirst({
      where: {
        tenantId,
        id: params.trustAccountId,
      },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        currency: true,
        clientId: true,
      },
    });

    if (!trustAccount) {
      throw Object.assign(new Error('Trust account not found'), {
        statusCode: 404,
        code: 'TRUST_ACCOUNT_NOT_FOUND',
        details: {
          trustAccountId: params.trustAccountId,
        },
      });
    }

    const [openingInflows, openingOutflows] = await Promise.all([
      db.trustTransaction.aggregate({
        where: {
          tenantId,
          trustAccountId: params.trustAccountId,
          transactionType: {
            in: ['DEPOSIT', 'INTEREST'],
          },
          ...(params.start
            ? {
                transactionDate: { lt: params.start },
              }
            : {}),
        },
        _sum: {
          amount: true,
        },
      }),
      db.trustTransaction.aggregate({
        where: {
          tenantId,
          trustAccountId: params.trustAccountId,
          transactionType: {
            in: ['WITHDRAWAL', 'TRANSFER_TO_OFFICE', 'REVERSAL', 'ADJUSTMENT'],
          },
          ...(params.start
            ? {
                transactionDate: { lt: params.start },
              }
            : {}),
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const openingBalance = toDecimal(openingInflows._sum.amount).minus(
      toDecimal(openingOutflows._sum.amount),
    );

    const transactions = await db.trustTransaction.findMany({
      where: {
        tenantId,
        trustAccountId: params.trustAccountId,
        ...(params.start || params.end
          ? {
              transactionDate: {
                ...(params.start ? { gte: params.start } : {}),
                ...(params.end ? { lte: params.end } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        transactionDate: true,
        reference: true,
        transactionType: true,
        description: true,
        amount: true,
        clientId: true,
        matterId: true,
        invoiceId: true,
        drnId: true,
      },
    });

    let runningBalance = openingBalance;

    const rows: TrustStatementRow[] = transactions.map((tx: any) => {
      const amount = toDecimal(tx.amount);
      const isInflow = tx.transactionType === 'DEPOSIT' || tx.transactionType === 'INTEREST';
      const debit = isInflow ? amount : new Prisma.Decimal(0);
      const credit = isInflow ? new Prisma.Decimal(0) : amount;

      runningBalance = isInflow
        ? runningBalance.plus(amount)
        : runningBalance.minus(amount);

      return {
        trustTransactionId: tx.id,
        transactionDate: tx.transactionDate,
        reference: tx.reference,
        transactionType: tx.transactionType,
        description: tx.description ?? null,
        debit,
        credit,
        runningBalance,
        clientId: tx.clientId,
        matterId: tx.matterId ?? null,
        invoiceId: tx.invoiceId ?? null,
        drnId: tx.drnId ?? null,
      };
    });

    return {
      trustAccountId: trustAccount.id,
      trustAccountName: trustAccount.name,
      accountNumber: trustAccount.accountNumber,
      currency: trustAccount.currency,
      clientId: trustAccount.clientId,
      periodStart: params.start,
      periodEnd: params.end,
      openingBalance,
      closingBalance: runningBalance,
      rows,
    };
  }
}