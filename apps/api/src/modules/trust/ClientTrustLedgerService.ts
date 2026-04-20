import { Prisma } from '@global-wakili/database';
import type {
  DecimalLike,
  TenantTrustDbClient,
  TrustBalanceSnapshot,
} from './trust.types';

function toDecimal(value: DecimalLike | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class ClientTrustLedgerService {
  static async getMatterBalance(
    db: TenantTrustDbClient,
    tenantId: string,
    clientId: string,
    matterId: string | null,
    trustAccountId: string,
  ): Promise<TrustBalanceSnapshot> {
    const existing = await db.clientTrustLedger.findFirst({
      where: {
        tenantId,
        trustAccountId,
        clientId,
        matterId,
      },
      select: {
        trustAccountId: true,
        clientId: true,
        matterId: true,
        balance: true,
      },
    });

    return {
      trustAccountId,
      clientId,
      matterId,
      balance: toDecimal(existing?.balance),
    };
  }

  static async assertSufficientMatterBalance(
    db: TenantTrustDbClient,
    tenantId: string,
    params: {
      trustAccountId: string;
      clientId: string;
      matterId: string;
      requiredAmount: DecimalLike;
    },
  ): Promise<TrustBalanceSnapshot> {
    const snapshot = await this.getMatterBalance(
      db,
      tenantId,
      params.clientId,
      params.matterId,
      params.trustAccountId,
    );

    const required = toDecimal(params.requiredAmount);

    if (snapshot.balance.lt(required)) {
      throw Object.assign(
        new Error('Insufficient client trust balance for this matter'),
        {
          statusCode: 409,
          code: 'INSUFFICIENT_CLIENT_TRUST_BALANCE',
          details: {
            trustAccountId: params.trustAccountId,
            clientId: params.clientId,
            matterId: params.matterId,
            available: snapshot.balance.toString(),
            required: required.toString(),
          },
        },
      );
    }

    return snapshot;
  }

  static async applyDelta(
    db: TenantTrustDbClient,
    tenantId: string,
    params: {
      trustAccountId: string;
      clientId: string;
      matterId?: string | null;
      delta: DecimalLike;
    },
  ) {
    const existing = await db.clientTrustLedger.findFirst({
      where: {
        tenantId,
        trustAccountId: params.trustAccountId,
        clientId: params.clientId,
        matterId: params.matterId ?? null,
      },
      select: {
        id: true,
        balance: true,
      },
    });

    const delta = toDecimal(params.delta);
    const currentBalance = toDecimal(existing?.balance);
    const nextBalance = currentBalance.plus(delta);

    if (existing) {
      return db.clientTrustLedger.update({
        where: { id: existing.id },
        data: {
          balance: nextBalance,
        },
      });
    }

    return db.clientTrustLedger.create({
      data: {
        tenantId,
        trustAccountId: params.trustAccountId,
        clientId: params.clientId,
        matterId: params.matterId ?? null,
        balance: nextBalance,
      },
    });
  }
}