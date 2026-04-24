// apps/api/src/modules/trust/TrustLedgerService.ts

import { Prisma } from '@global-wakili/database';
import { ClientTrustLedgerService } from './ClientTrustLedgerService';

const ZERO = new Prisma.Decimal(0);

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  const parsed = new Prisma.Decimal(value as any);
  return parsed.isFinite() ? parsed.toDecimalPlaces(2) : ZERO;
}

export class TrustLedgerService {
  static async getMatterBalance(req: any, input: {
    clientId: string;
    matterId: string;
    trustAccountId: string;
  }) {
    return ClientTrustLedgerService.getMatterBalance(
      req.db,
      req.tenantId,
      input.clientId,
      input.matterId,
      input.trustAccountId,
    );
  }

  static async listClientLedger(req: any, filters: {
    clientId?: string;
    matterId?: string;
    trustAccountId?: string;
    take?: number;
    skip?: number;
  } = {}) {
    return req.db.clientTrustLedger.findMany({
      where: {
        tenantId: req.tenantId,
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.matterId ? { matterId: filters.matterId } : {}),
        ...(filters.trustAccountId ? { trustAccountId: filters.trustAccountId } : {}),
      },
      include: {
        client: true,
        matter: true,
        trustAccount: true,
      },
      orderBy: [
        { clientId: 'asc' },
        { matterId: 'asc' },
      ],
      take: Math.min(filters.take ?? 100, 100),
      skip: filters.skip ?? 0,
    });
  }

  static async listTransactions(req: any, filters: {
    trustAccountId?: string;
    clientId?: string;
    matterId?: string;
    start?: Date;
    end?: Date;
    take?: number;
    skip?: number;
  } = {}) {
    return req.db.trustTransaction.findMany({
      where: {
        tenantId: req.tenantId,
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
        trustAccount: true,
      },
      orderBy: {
        transactionDate: 'asc',
      },
      take: Math.min(filters.take ?? 500, 1000),
      skip: filters.skip ?? 0,
    });
  }

  static async getLedgerSummary(req: any, filters: {
    trustAccountId?: string;
    clientId?: string;
    matterId?: string;
  } = {}) {
    const rows = await this.listClientLedger(req, filters);

    const total = rows.reduce(
      (sum: Prisma.Decimal, row: any) => sum.plus(money(row.balance)),
      ZERO,
    );

    return {
      tenantId: req.tenantId,
      filters,
      ledgerCount: rows.length,
      totalBalance: total.toDecimalPlaces(2),
      rows,
      generatedAt: new Date(),
    };
  }
}

export default TrustLedgerService;