import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import type {
  TrustStatementReport,
  TrustStatementRow,
} from './trust.report.types';

const ZERO = new Prisma.Decimal(0);

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return ZERO;
  }

  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function moneyString(value: Prisma.Decimal): string {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toString();
}

function isInflowTransaction(transactionType: unknown): boolean {
  const value = String(transactionType);

  return value === 'DEPOSIT' || value === 'INTEREST';
}

function isAdjustmentTransaction(transactionType: unknown): boolean {
  const value = String(transactionType);

  return value === 'ADJUSTMENT' || value === 'REVERSAL';
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
        accountName: true,
        accountNumber: true,
        bankName: true,
        currentBalance: true,
        reconciliationBalance: true,
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
        debit: true,
        credit: true,
        clientId: true,
        matterId: true,
        postedDate: true,
        isReconciled: true,
      },
    });

    let runningBalance = openingBalance;
    let totalReceipts = ZERO;
    let totalPayments = ZERO;
    let totalAdjustments = ZERO;

    const rows: TrustStatementRow[] = transactions.map((tx) => {
      const amount = toDecimal(tx.amount);
      const debit = toDecimal(tx.debit);
      const credit = toDecimal(tx.credit);

      runningBalance = runningBalance.plus(credit).minus(debit);

      if (isInflowTransaction(tx.transactionType)) {
        totalReceipts = totalReceipts.plus(amount);
      } else if (isAdjustmentTransaction(tx.transactionType)) {
        totalAdjustments = totalAdjustments.plus(amount);
      } else {
        totalPayments = totalPayments.plus(amount);
      }

      return {
        id: tx.id,
        transactionId: tx.id,
        transactionDate: tx.transactionDate,
        postedAt: tx.postedDate,
        reference: tx.reference,
        transactionType: tx.transactionType,
        description: tx.description ?? null,
        debit: moneyString(debit),
        credit: moneyString(credit),
        amount: moneyString(amount),
        runningBalance: moneyString(runningBalance),
        trustAccountId: params.trustAccountId,
        clientId: tx.clientId,
        matterId: tx.matterId ?? null,
        status: tx.isReconciled ? 'RECONCILED' : 'UNRECONCILED',
      };
    });

    return {
      metadata: {
        tenantId,
        reportType: 'TRUST_STATEMENT',
        generatedAt: new Date().toISOString(),
        generatedById: req.user?.sub ?? null,
        requestId: req.id ?? null,
        filters: {
          tenantId,
          trustAccountId: params.trustAccountId,
          from: params.start?.toISOString() ?? null,
          to: params.end?.toISOString() ?? null,
        },
      },
      account: {
        id: trustAccount.id,
        accountId: trustAccount.id,
        accountName: trustAccount.accountName,
        accountNumber: trustAccount.accountNumber,
        trustAccountId: trustAccount.id,
        trustAccountName: trustAccount.accountName,
      },
      rows,
      summary: {
        openingBalance: moneyString(openingBalance),
        totalReceipts: moneyString(totalReceipts),
        totalPayments: moneyString(totalPayments),
        totalAdjustments: moneyString(totalAdjustments),
        closingBalance: moneyString(runningBalance),
        rowCount: rows.length,
        from: params.start ?? null,
        to: params.end ?? null,
        trustAccountId: params.trustAccountId,
      },
    };
  }
}