import { Prisma } from '@global-wakili/database';
import type {
  DecimalLike,
  TrustBalanceSnapshot,
  TrustDbClient,
} from './trust.types';

const ZERO = new Prisma.Decimal(0);

function toDecimal(value: DecimalLike | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return ZERO;
  }

  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function normalizeMatterId(matterId?: string | null): string | null {
  return matterId?.trim() ? matterId.trim() : null;
}

function requireNonEmpty(value: string | null | undefined, fieldName: string): string {
  if (!value?.trim()) {
    throw Object.assign(
      new Error(`${fieldName} is required for client trust ledger operations`),
      {
        statusCode: 400,
        code: 'TRUST_LEDGER_BOUNDARY_REQUIRED',
        details: { fieldName },
      },
    );
  }

  return value.trim();
}

function movementDescription(delta: Prisma.Decimal): string {
  return `Client trust ledger ${delta.gt(ZERO) ? 'credit' : 'debit'} movement`;
}

export class ClientTrustLedgerService {
  static async getMatterBalance(
    db: TrustDbClient,
    tenantId: string,
    clientId: string,
    matterId: string | null,
    trustAccountId: string,
  ): Promise<TrustBalanceSnapshot> {
    const scopedTenantId = requireNonEmpty(tenantId, 'tenantId');
    const scopedTrustAccountId = requireNonEmpty(trustAccountId, 'trustAccountId');
    const scopedClientId = requireNonEmpty(clientId, 'clientId');
    const scopedMatterId = normalizeMatterId(matterId);

    // Authoritative balance = SUM(credit) - SUM(debit) across ALL ledger rows for this
    // (tenant, account, client, matter). The per-row `balance` snapshot is NOT trusted —
    // it can drift from truth (FINDING-007-002). Backed by
    // @@index([tenantId, trustAccountId, clientId, matterId]). When called from applyDelta
    // this runs under the advisory lock, so read-check-insert is serialized per matter.
    const totals = await db.clientTrustLedger.aggregate({
      where: {
        tenantId: scopedTenantId,
        trustAccountId: scopedTrustAccountId,
        clientId: scopedClientId,
        matterId: scopedMatterId,
      },
      _sum: { debit: true, credit: true },
    });

    return {
      trustAccountId: scopedTrustAccountId,
      clientId: scopedClientId,
      matterId: scopedMatterId,
      balance: toDecimal(totals._sum.credit).minus(toDecimal(totals._sum.debit)),
    };
  }

  static async assertSufficientMatterBalance(
    db: TrustDbClient,
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
    db: TrustDbClient,
    tenantId: string,
    params: {
      trustAccountId: string;
      clientId: string;
      matterId?: string | null;
      delta: DecimalLike;
      description?: string | null;
      transactionDate?: Date | null;
    },
  ) {
    const scopedTenantId = requireNonEmpty(tenantId, 'tenantId');
    const scopedTrustAccountId = requireNonEmpty(params.trustAccountId, 'trustAccountId');
    const scopedClientId = requireNonEmpty(params.clientId, 'clientId');
    const scopedMatterId = normalizeMatterId(params.matterId);

    const delta = toDecimal(params.delta);

    if (delta.eq(ZERO)) {
      throw Object.assign(
        new Error('Client trust ledger delta cannot be zero'),
        {
          statusCode: 400,
          code: 'ZERO_TRUST_LEDGER_DELTA',
          details: {
            trustAccountId: scopedTrustAccountId,
            clientId: scopedClientId,
            matterId: scopedMatterId,
          },
        },
      );
    }

    // FINDING-007-002: serialize concurrent movements for THIS exact
    // (tenant, account, client, matter) tuple via a Postgres transaction-scoped advisory
    // lock (auto-released on commit/rollback). Combined with the SUM-based getMatterBalance,
    // this makes read-check-insert atomic per matter — no overdraw, no negative sub-balance
    // (ADR-004). tenantId is in the key, so the lock is tenant-scoped (ADR-001).
    const lockKey =
      `trust-ledger:${scopedTenantId}|${scopedTrustAccountId}|${scopedClientId}|${scopedMatterId ?? ''}`;
    await (db as Prisma.TransactionClient)
      .$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;

    const currentSnapshot = await this.getMatterBalance(
      db,
      scopedTenantId,
      scopedClientId,
      scopedMatterId,
      scopedTrustAccountId,
    );

    const nextBalance = currentSnapshot.balance.plus(delta);

    if (nextBalance.lt(ZERO)) {
      throw Object.assign(
        new Error('Client trust ledger movement would overdraw the scoped ledger'),
        {
          statusCode: 409,
          code: 'CLIENT_TRUST_LEDGER_OVERDRAW',
          details: {
            trustAccountId: scopedTrustAccountId,
            clientId: scopedClientId,
            matterId: scopedMatterId,
            currentBalance: currentSnapshot.balance.toString(),
            delta: delta.toString(),
            nextBalance: nextBalance.toString(),
          },
        },
      );
    }

    const debit = delta.lt(ZERO) ? delta.abs() : ZERO;
    const credit = delta.gt(ZERO) ? delta : ZERO;

    return db.clientTrustLedger.create({
      data: {
        tenantId: scopedTenantId,
        trustAccountId: scopedTrustAccountId,
        clientId: scopedClientId,
        matterId: scopedMatterId,
        debit,
        credit,
        balance: nextBalance,
        description: params.description?.trim() || movementDescription(delta),
        transactionDate: params.transactionDate ?? new Date(),
      },
    });
  }
}