import {
  Prisma,
  ReconciliationRunType,
  ReconciliationStatus,
} from '@global-wakili/database';
import type { Request } from 'express';

const ZERO = new Prisma.Decimal(0);

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return ZERO;
  }

  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function dayStart(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function requireTenantId(req: Request): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for three-way reconciliation'), {
      statusCode: 400,
      code: 'TRUST_TENANT_REQUIRED',
    });
  }

  return req.tenantId;
}

function requireTrustAccountId(trustAccountId?: string | null): string {
  if (!trustAccountId?.trim()) {
    throw Object.assign(new Error('Trust account context is required for three-way reconciliation'), {
      statusCode: 400,
      code: 'TRUST_ACCOUNT_BOUNDARY_REQUIRED',
    });
  }

  return trustAccountId.trim();
}

function minDecimal(left: Prisma.Decimal, right: Prisma.Decimal): Prisma.Decimal {
  return left.lte(right) ? left : right;
}

function statusForVariance(
  variance: Prisma.Decimal,
  tolerance: Prisma.Decimal,
): ReconciliationStatus {
  return variance.abs().lte(tolerance)
    ? ReconciliationStatus.MATCHED
    : ReconciliationStatus.FLAGGED;
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
    const tenantId = requireTenantId(req);
    const trustAccountId = requireTrustAccountId(params.trustAccountId);
    const tolerance = toDecimal(params.tolerance ?? 0);

    const trustAccount = await db.trustAccount.findFirst({
      where: {
        tenantId,
        id: trustAccountId,
      },
      select: {
        id: true,
        accountName: true,
        accountNumber: true,
        currentBalance: true,
        reconciliationBalance: true,
      },
    });

    if (!trustAccount) {
      throw Object.assign(new Error('Trust account not found'), {
        statusCode: 404,
        code: 'TRUST_ACCOUNT_NOT_FOUND',
        details: { trustAccountId },
      });
    }

    const run = await db.reconciliationRun.create({
      data: {
        tenantId,
        trustAccountId,
        type: ReconciliationRunType.TRUST,
        periodStart: dayStart(params.statementDate),
        periodEnd: params.statementDate,
        status: ReconciliationStatus.PENDING,
        createdById: req.user?.sub ?? null,
      },
    });

    try {
      const [bankAggregate, trustAggregate, clientAggregate] = await Promise.all([
        db.bankTransaction.aggregate({
          where: {
            tenantId,
            trustAccountId,
            transactionDate: { lte: params.statementDate },
          },
          _sum: { amount: true },
        }),
        db.trustTransaction.aggregate({
          where: {
            tenantId,
            trustAccountId,
            transactionDate: { lte: params.statementDate },
          },
          _sum: {
            debit: true,
            credit: true,
          },
        }),
        db.clientTrustLedger.aggregate({
          where: {
            tenantId,
            trustAccountId,
            transactionDate: { lte: params.statementDate },
          },
          _sum: {
            debit: true,
            credit: true,
          },
        }),
      ]);

      const bankTotal = toDecimal(bankAggregate._sum.amount);
      const trustTotal = toDecimal(trustAggregate._sum.credit).minus(
        toDecimal(trustAggregate._sum.debit),
      );
      const clientTotal = toDecimal(clientAggregate._sum.credit).minus(
        toDecimal(clientAggregate._sum.debit),
      );

      const bankVsTrustVariance = bankTotal.minus(trustTotal);
      const trustVsClientVariance = trustTotal.minus(clientTotal);
      const bankVsClientVariance = bankTotal.minus(clientTotal);

      const matches = [
        {
          tenantId,
          runId: run.id,
          trustAccountId,
          matchType: 'BANK_VS_TRUST',
          matchedAmount: minDecimal(bankTotal.abs(), trustTotal.abs()),
          varianceAmount: bankVsTrustVariance,
          status: statusForVariance(bankVsTrustVariance, tolerance),
          notes: `Bank=${bankTotal.toString()} Trust=${trustTotal.toString()} Scope=TRUST_ACCOUNT_SCOPE`,
        },
        {
          tenantId,
          runId: run.id,
          trustAccountId,
          matchType: 'TRUST_VS_CLIENT',
          matchedAmount: minDecimal(trustTotal.abs(), clientTotal.abs()),
          varianceAmount: trustVsClientVariance,
          status: statusForVariance(trustVsClientVariance, tolerance),
          notes: `Trust=${trustTotal.toString()} Client=${clientTotal.toString()} Scope=TRUST_ACCOUNT_SCOPE`,
        },
        {
          tenantId,
          runId: run.id,
          trustAccountId,
          matchType: 'BANK_VS_CLIENT',
          matchedAmount: minDecimal(bankTotal.abs(), clientTotal.abs()),
          varianceAmount: bankVsClientVariance,
          status: statusForVariance(bankVsClientVariance, tolerance),
          notes: `Bank=${bankTotal.toString()} Client=${clientTotal.toString()} Scope=TRUST_ACCOUNT_SCOPE`,
        },
      ];

      await db.reconciliationMatch.createMany({
        data: matches,
      });

      const finalStatus =
        statusForVariance(bankVsTrustVariance, tolerance) === ReconciliationStatus.MATCHED &&
        statusForVariance(trustVsClientVariance, tolerance) === ReconciliationStatus.MATCHED &&
        statusForVariance(bankVsClientVariance, tolerance) === ReconciliationStatus.MATCHED
          ? ReconciliationStatus.MATCHED
          : ReconciliationStatus.FLAGGED;

      const completed = await db.reconciliationRun.update({
        where: { id: run.id },
        data: {
          status: finalStatus,
        },
        include: {
          matches: true,
        },
      });

      return {
        ...completed,
        trustAccount,
        trustAccountId,
        statementDate: params.statementDate,
        notes: params.notes ?? null,
        scope: 'TRUST_ACCOUNT_SCOPE',
        totals: {
          bankTotal,
          trustTotal,
          clientTotal,
        },
        variances: {
          bankVsTrust: bankVsTrustVariance,
          trustVsClient: trustVsClientVariance,
          bankVsClient: bankVsClientVariance,
        },
      };
    } catch (error) {
      await db.reconciliationRun.update({
        where: { id: run.id },
        data: {
          status: ReconciliationStatus.FLAGGED,
        },
      });

      throw error;
    }
  }
}