// apps/api/src/modules/trust/TrustLedgerService.ts

import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';

const ZERO = new Prisma.Decimal(0);

function money(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  return value instanceof Prisma.Decimal
    ? value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    : new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function requireTenantId(req: Request): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for trust ledger operations'), {
      statusCode: 400,
      code: 'TRUST_TENANT_REQUIRED',
    });
  }

  return req.tenantId;
}

function requireTrustAccountId(trustAccountId?: string | null): string {
  if (!trustAccountId?.trim()) {
    throw Object.assign(new Error('Trust account context is required for trust ledger operations'), {
      statusCode: 400,
      code: 'TRUST_ACCOUNT_BOUNDARY_REQUIRED',
    });
  }

  return trustAccountId.trim();
}

export class TrustLedgerService {
  static async getMatterBalance(req: Request, input: {
    clientId: string;
    matterId: string;
    trustAccountId: string;
  }) {
    const tenantId = requireTenantId(req);
    const trustAccountId = requireTrustAccountId(input.trustAccountId);

    const ledger = await req.db.clientTrustLedger.aggregate({
      where: {
        tenantId,
        trustAccountId,
        clientId: input.clientId,
        matterId: input.matterId,
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const balance = money(ledger._sum.credit).minus(money(ledger._sum.debit));

    return {
      tenantId,
      trustAccountId,
      clientId: input.clientId,
      matterId: input.matterId,
      balance,
      scope: 'TRUST_ACCOUNT_SCOPE',
    };
  }

  static async listClientLedger(req: Request, filters: {
    clientId?: string;
    matterId?: string;
    trustAccountId?: string;
    take?: number;
    skip?: number;
  } = {}) {
    const tenantId = requireTenantId(req);

    return req.db.clientTrustLedger.findMany({
      where: {
        tenantId,
        ...(filters.trustAccountId ? { trustAccountId: filters.trustAccountId } : {}),
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.matterId ? { matterId: filters.matterId } : {}),
      },
      include: {
        client: true,
        matter: true,
        trustAccount: true,
      },
      orderBy: [
        { trustAccountId: 'asc' },
        { clientId: 'asc' },
        { matterId: 'asc' },
        { transactionDate: 'asc' },
      ],
      take: Math.min(filters.take ?? 100, 100),
      skip: filters.skip ?? 0,
    });
  }

  static async listTransactions(req: Request, filters: {
    trustAccountId?: string;
    clientId?: string;
    matterId?: string;
    start?: Date;
    end?: Date;
    take?: number;
    skip?: number;
  } = {}) {
    const tenantId = requireTenantId(req);

    return req.db.trustTransaction.findMany({
      where: {
        tenantId,
        ...(filters.trustAccountId ? { trustAccountId: filters.trustAccountId } : {}),
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.matterId ? { matterId: filters.matterId } : {}),
        ...(filters.start || filters.end
          ? {
              transactionDate: {
                ...(filters.start ? { gte: filters.start } : {}),
                ...(filters.end ? { lte: filters.end } : {}),
              },
            }
          : {}),
      },
      include: {
        client: true,
        matter: true,
        account: true,
      },
      orderBy: [
        { trustAccountId: 'asc' },
        { transactionDate: 'asc' },
      ],
      take: Math.min(filters.take ?? 500, 1000),
      skip: filters.skip ?? 0,
    });
  }

  static async getLedgerSummary(req: Request, filters: {
    trustAccountId?: string;
    clientId?: string;
    matterId?: string;
  } = {}) {
    const rows = await this.listClientLedger(req, filters);

    const total = rows.reduce(
      (sum: Prisma.Decimal, row) => sum.plus(money(row.balance)),
      ZERO,
    );

    return {
      tenantId: requireTenantId(req),
      filters,
      scope: filters.trustAccountId ? 'TRUST_ACCOUNT_SCOPE' : 'MULTI_TRUST_ACCOUNT_AGGREGATE',
      ledgerCount: rows.length,
      totalBalance: total.toDecimalPlaces(2),
      rows,
      generatedAt: new Date(),
    };
  }
}

export default TrustLedgerService;