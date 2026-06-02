import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { logAdminAction } from '../../utils/audit-logger';
import { AuditAction, AuditSeverity } from '../../types/audit';

const ZERO = new Prisma.Decimal(0);

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return ZERO;
  }

  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function requireTenantId(req: Request): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for trust reconciliation'), {
      statusCode: 400,
      code: 'TRUST_TENANT_REQUIRED',
    });
  }

  return req.tenantId;
}

function requireTrustAccountId(trustAccountId?: string | null): string {
  if (!trustAccountId?.trim()) {
    throw Object.assign(new Error('Trust account context is required for trust reconciliation'), {
      statusCode: 400,
      code: 'TRUST_ACCOUNT_BOUNDARY_REQUIRED',
    });
  }

  return trustAccountId.trim();
}

export class TrustReconciliationService {
  static async getTrustAccountSnapshot(
    req: Request,
    params: {
      trustAccountId: string;
      statementDate: Date;
    },
  ) {
    const db = req.db;
    const tenantId = requireTenantId(req);
    const trustAccountId = requireTrustAccountId(params.trustAccountId);

    const trustAccount = await db.trustAccount.findFirst({
      where: {
        tenantId,
        id: trustAccountId,
      },
      select: {
        id: true,
        accountName: true,
        accountNumber: true,
        bankName: true,
        currentBalance: true,
        reconciliationBalance: true,
        lastReconciled: true,
        isActive: true,
      },
    });

    if (!trustAccount) {
      throw Object.assign(new Error('Trust account not found'), {
        statusCode: 404,
        code: 'TRUST_ACCOUNT_NOT_FOUND',
        details: { trustAccountId },
      });
    }

    const [trustMovementAggregate, clientLedgerAggregate, bankAggregate] = await Promise.all([
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
      db.bankTransaction.aggregate({
        where: {
          tenantId,
          trustAccountId,
          transactionDate: { lte: params.statementDate },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const trustBookBalance = toDecimal(trustMovementAggregate._sum.credit).minus(
      toDecimal(trustMovementAggregate._sum.debit),
    );
    const clientLedgerBalance = toDecimal(clientLedgerAggregate._sum.credit).minus(
      toDecimal(clientLedgerAggregate._sum.debit),
    );
    const bankBalance = toDecimal(bankAggregate._sum.amount);

    return {
      trustAccount,
      trustAccountId,
      statementDate: params.statementDate,
      trustBookBalance,
      clientLedgerBalance,
      bankBalance,
      ledgerVsClientVariance: trustBookBalance.minus(clientLedgerBalance),
      ledgerVsBankVariance: trustBookBalance.minus(bankBalance),
      bankVsClientVariance: bankBalance.minus(clientLedgerBalance),
      isThreeWayBalanced:
        trustBookBalance.equals(clientLedgerBalance) &&
        trustBookBalance.equals(bankBalance),
      scope: {
        bankBalanceScope: 'TRUST_ACCOUNT_SCOPE',
        clientLedgerScope: 'TRUST_ACCOUNT_SCOPE',
        trustBookScope: 'TRUST_ACCOUNT_SCOPE',
      },
    };
  }

  static async recordReconciliation(
    req: Request,
    params: {
      trustAccountId: string;
      statementDate: Date;
      notes?: string | null;
    },
  ) {
    const db = req.db;
    const tenantId = requireTenantId(req);
    const trustAccountId = requireTrustAccountId(params.trustAccountId);

    const existing = await db.trustReconciliation.findFirst({
      where: {
        tenantId,
        trustAccountId,
        statementDate: params.statementDate,
      },
      select: {
        id: true,
        isCompleted: true,
        completedAt: true,
      },
    });

    if (existing?.isCompleted) {
      throw Object.assign(
        new Error('A completed reconciliation already exists for this trust account and statement date'),
        {
          statusCode: 409,
          code: 'TRUST_RECONCILIATION_LOCKED',
          details: {
            trustAccountId,
            statementDate: params.statementDate.toISOString(),
            reconciliationId: existing.id,
          },
        },
      );
    }

    const snapshot = await this.getTrustAccountSnapshot(req, {
      trustAccountId,
      statementDate: params.statementDate,
    });

    const reconciliation = existing
      ? await db.trustReconciliation.update({
          where: { id: existing.id, tenantId },
          data: {
            statementBalance: snapshot.bankBalance,
            isCompleted: snapshot.isThreeWayBalanced,
            completedAt: snapshot.isThreeWayBalanced ? new Date() : null,
          },
        })
      : await db.trustReconciliation.create({
          data: {
            tenantId,
            trustAccountId,
            statementDate: params.statementDate,
            statementBalance: snapshot.bankBalance,
            isCompleted: snapshot.isThreeWayBalanced,
            completedAt: snapshot.isThreeWayBalanced ? new Date() : null,
          },
        });

    await db.trustAccount.update({
      where: { id: trustAccountId, tenantId },
      data: {
        lastReconciled: params.statementDate,
        reconciliationBalance: snapshot.bankBalance,
      },
    });

    await logAdminAction({
      req,
      tenantId,
      action: AuditAction.UPDATE,
      severity: snapshot.isThreeWayBalanced ? AuditSeverity.INFO : AuditSeverity.WARNING,
      entityType: 'TrustReconciliation',
      entityId: reconciliation.id,
      payload: {
        eventCode: 'TRUST_RECONCILIATION_RECORDED',
        trustAccountId,
        statementDate: params.statementDate.toISOString(),
        isThreeWayBalanced: snapshot.isThreeWayBalanced,
        ledgerVsBankVariance: snapshot.ledgerVsBankVariance.toString(),
        ledgerVsClientVariance: snapshot.ledgerVsClientVariance.toString(),
        bankVsClientVariance: snapshot.bankVsClientVariance.toString(),
        scope: snapshot.scope,
        notes: params.notes ?? undefined,
      },
    });

    return {
      ...reconciliation,
      snapshot,
    };
  }

  static async listReconciliations(req: Request, trustAccountId?: string) {
    const db = req.db;
    const tenantId = requireTenantId(req);

    return db.trustReconciliation.findMany({
      where: {
        tenantId,
        ...(trustAccountId ? { trustAccountId } : {}),
      },
      include: {
        account: {
          select: {
            id: true,
            accountName: true,
            accountNumber: true,
          },
        },
      },
      orderBy: [{ statementDate: 'desc' }],
    });
  }
}