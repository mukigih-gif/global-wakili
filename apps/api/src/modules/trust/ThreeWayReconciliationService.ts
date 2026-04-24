import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class ThreeWayReconciliationService {
  static async run(
    req: Request,
    params: {
      trustAccountId: string;
      statementDate: Date;
      tolerance?: Prisma.Decimal | number | string;
      notes?: string | null;
    },
  ) {
    const db = req.db;
    const tenantId = req.tenantId!;
    const tolerance = toDecimal(params.tolerance ?? 0);

    const trustAccount = await db.trustAccount.findFirst({
      where: {
        tenantId,
        id: params.trustAccountId,
      },
      select: {
        id: true,
        name: true,
        accountNumber: true,
      },
    });

    if (!trustAccount) {
      throw Object.assign(new Error('Trust account not found'), {
        statusCode: 404,
        code: 'TRUST_ACCOUNT_NOT_FOUND',
        details: { trustAccountId: params.trustAccountId },
      });
    }

    const run = await db.reconciliationRun.create({
      data: {
        tenantId,
        trustAccountId: params.trustAccountId,
        runType: 'TRUST_THREE_WAY',
        statementDate: params.statementDate,
        status: 'RUNNING',
        notes: params.notes ?? null,
        startedById: req.user?.sub ?? null,
      },
    });

    try {
      const [bankAggregate, trustAggregate, clientAggregate] = await Promise.all([
        db.bankTransaction.aggregate({
          where: {
            tenantId,
            trustAccountId: params.trustAccountId,
            transactionDate: { lte: params.statementDate },
          },
          _sum: { amount: true },
        }),
        db.trustTransaction.aggregate({
          where: {
            tenantId,
            trustAccountId: params.trustAccountId,
            transactionDate: { lte: params.statementDate },
          },
          _sum: { amount: true },
        }),
        db.clientTrustLedger.aggregate({
          where: {
            tenantId,
            trustAccountId: params.trustAccountId,
          },
          _sum: { balance: true },
        }),
      ]);

      const bankTotal = toDecimal(bankAggregate._sum.amount);
      const trustTotal = toDecimal(trustAggregate._sum.amount);
      const clientTotal = toDecimal(clientAggregate._sum.balance);

      const bankVsTrustVariance = bankTotal.minus(trustTotal).abs();
      const trustVsClientVariance = trustTotal.minus(clientTotal).abs();
      const bankVsClientVariance = bankTotal.minus(clientTotal).abs();

      const matches = [
        {
          tenantId,
          runId: run.id,
          matchType: 'BANK_VS_TRUST',
          matchedAmount: Prisma.Decimal.min(bankTotal, trustTotal),
          varianceAmount: bankTotal.minus(trustTotal),
          status: bankVsTrustVariance.lte(tolerance) ? 'MATCHED' : 'VARIANCE',
          notes: `Bank=${bankTotal.toString()} Trust=${trustTotal.toString()}`,
        },
        {
          tenantId,
          runId: run.id,
          matchType: 'TRUST_VS_CLIENT',
          matchedAmount: Prisma.Decimal.min(trustTotal, clientTotal),
          varianceAmount: trustTotal.minus(clientTotal),
          status: trustVsClientVariance.lte(tolerance) ? 'MATCHED' : 'VARIANCE',
          notes: `Trust=${trustTotal.toString()} Client=${clientTotal.toString()}`,
        },
        {
          tenantId,
          runId: run.id,
          matchType: 'BANK_VS_CLIENT',
          matchedAmount: Prisma.Decimal.min(bankTotal, clientTotal),
          varianceAmount: bankTotal.minus(clientTotal),
          status: bankVsClientVariance.lte(tolerance) ? 'MATCHED' : 'VARIANCE',
          notes: `Bank=${bankTotal.toString()} Client=${clientTotal.toString()}`,
        },
      ];

      await db.reconciliationMatch.createMany({
        data: matches,
      });

      const finalStatus =
        bankVsTrustVariance.lte(tolerance) &&
        trustVsClientVariance.lte(tolerance) &&
        bankVsClientVariance.lte(tolerance)
          ? 'COMPLETED'
          : 'VARIANCE_FOUND';

      const completed = await db.reconciliationRun.update({
        where: { id: run.id },
        data: {
          status: finalStatus,
          finishedAt: new Date(),
          notes:
            params.notes ??
            `Bank=${bankTotal.toString()}, Trust=${trustTotal.toString()}, Client=${clientTotal.toString()}`,
        },
        include: {
          matches: true,
        },
      });

      return {
        ...completed,
        totals: {
          bankTotal,
          trustTotal,
          clientTotal,
        },
        variances: {
          bankVsTrust: bankTotal.minus(trustTotal),
          trustVsClient: trustTotal.minus(clientTotal),
          bankVsClient: bankTotal.minus(clientTotal),
        },
      };
    } catch (error) {
      await db.reconciliationRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
        },
      });

      throw error;
    }
  }
}