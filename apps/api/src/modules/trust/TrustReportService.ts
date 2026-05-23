// apps/api/src/modules/trust/TrustReportService.ts

import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { TrustLedgerService } from './TrustLedgerService';
import { TrustReconciliationService } from './TrustReconciliationService';

const ZERO = new Prisma.Decimal(0);

function money(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  return value instanceof Prisma.Decimal
    ? value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    : new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function requireTenantId(req: Request): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for trust reports'), {
      statusCode: 400,
      code: 'TRUST_TENANT_REQUIRED',
    });
  }

  return req.tenantId;
}

export class TrustReportService {
  static async getClientTrustBalances(req: Request, filters: {
    clientId?: string;
    matterId?: string;
    trustAccountId?: string;
  } = {}) {
    return TrustLedgerService.getLedgerSummary(req, filters);
  }

  static async getTrustAccountBalances(req: Request) {
    const tenantId = requireTenantId(req);

    const accounts = await req.db.trustAccount.findMany({
      where: { tenantId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = accounts.reduce(
      (sum: Prisma.Decimal, account) => sum.plus(money(account.currentBalance)),
      ZERO,
    );

    return {
      tenantId,
      accountCount: accounts.length,
      totalTrustBalance: total.toDecimalPlaces(2),
      accounts,
      generatedAt: new Date(),
    };
  }

  static async getReconciliationReport(req: Request, filters: {
    trustAccountId?: string;
  } = {}) {
    const tenantId = requireTenantId(req);
    const reconciliations = await TrustReconciliationService.listReconciliations(
      req,
      filters.trustAccountId,
    );

    const completed = reconciliations.filter((row) => row.isCompleted).length;
    const exceptions = reconciliations.length - completed;

    return {
      tenantId,
      trustAccountId: filters.trustAccountId ?? null,
      reconciliationCount: reconciliations.length,
      completedCount: completed,
      exceptionCount: exceptions,
      reconciliations,
      generatedAt: new Date(),
    };
  }
}

export default TrustReportService;