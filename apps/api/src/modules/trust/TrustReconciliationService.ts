import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { logAdminAction } from '../../utils/audit-logger';
import { AuditSeverity } from '../../types/audit';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
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
        balance: true,
        clientId: true,
      },
    });

    if (!trustAccount) {
      throw Object.assign(new Error('Trust account not found'), {
        statusCode: 404,
        code: 'TRUST_ACCOUNT_NOT_FOUND',
        details: { trustAccountId: params.trustAccountId },
      });
    }

    const trustMovementAggregate = await db.trustTransaction.aggregate({
      where: {
        tenantId,
        trustAccountId: params.trustAccountId,
        transactionDate: { lte: params.statementDate },
      },
      _sum: {
        amount: true,
      },
    });

    const clientLedgerAggregate = await db.clientTrustLedger.aggregate({
      where: {
        tenantId,
        trustAccountId: params.trustAccountId,
      },
      _sum: {
        balance: true,
      },
    });

    const bankAggregate = await db.bankTransaction.aggregate({
      where: {
        tenantId,
        trustAccountId: params.trustAccountId,
        transactionDate: { lte: params.statementDate },
      },
      _sum: {
        amount: true,
      },
    });

    const trustBookBalance = toDecimal(trustMovementAggregate._sum.amount);
    const clientLedgerBalance = toDecimal(clientLedgerAggregate._sum.balance);
    const bankBalance = toDecimal(bankAggregate._sum.amount);

    return {
      trustAccount,
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
    const tenantId = req.tenantId!;

    const existing = await db.trustReconciliation.findFirst({
      where: {
        tenantId,
        trustAccountId: params.trustAccountId,
        statementDate: params.statementDate,
      },
      select: {
        id: true,
        isBalanced: true,
        reconciledAt: true,
      },
    });

    if (existing?.isBalanced) {
      throw Object.assign(
        new Error('A balanced reconciliation already exists for this trust account and statement date'),
        {
          statusCode: 409,
          code: 'TRUST_RECONCILIATION_LOCKED',
          details: {
            trustAccountId: params.trustAccountId,
            statementDate: params.statementDate,
            reconciliationId: existing.id,
          },
        },
      );
    }

    const snapshot = await this.getTrustAccountSnapshot(req, params);

    const reconciliation = existing
      ? await db.trustReconciliation.update({
          where: { id: existing.id },
          data: {
            trustBookBalance: snapshot.trustBookBalance,
            clientLedgerBalance: snapshot.clientLedgerBalance,
            bankBalance: snapshot.bankBalance,
            varianceAmount: snapshot.ledgerVsBankVariance,
            isBalanced: snapshot.isThreeWayBalanced,
            notes: params.notes ?? null,
            reconciledById: req.user?.sub ?? null,
            reconciledAt: new Date(),
          },
        })
      : await db.trustReconciliation.create({
          data: {
            tenantId,
            trustAccountId: params.trustAccountId,
            statementDate: params.statementDate,
            trustBookBalance: snapshot.trustBookBalance,
            clientLedgerBalance: snapshot.clientLedgerBalance,
            bankBalance: snapshot.bankBalance,
            varianceAmount: snapshot.ledgerVsBankVariance,
            isBalanced: snapshot.isThreeWayBalanced,
            notes: params.notes ?? null,
            reconciledById: req.user?.sub ?? null,
            reconciledAt: new Date(),
          },
        });

    await logAdminAction({
      req,
      tenantId,
      action: 'TRUST_RECONCILIATION_RECORDED',
      severity: snapshot.isThreeWayBalanced ? AuditSeverity.INFO : AuditSeverity.HIGH,
      entityId: reconciliation.id,
      payload: {
        trustAccountId: params.trustAccountId,
        statementDate: params.statementDate,
        isBalanced: snapshot.isThreeWayBalanced,
        ledgerVsBankVariance: snapshot.ledgerVsBankVariance.toString(),
        ledgerVsClientVariance: snapshot.ledgerVsClientVariance.toString(),
      },
    });

    return reconciliation;
  }

  static async listReconciliations(req: Request, trustAccountId?: string) {
    const db = req.db;
    const tenantId = req.tenantId!;

    return db.trustReconciliation.findMany({
      where: {
        tenantId,
        ...(trustAccountId ? { trustAccountId } : {}),
      },
      include: {
        trustAccount: {
          select: {
            id: true,
            name: true,
            accountNumber: true,
          },
        },
        reconciledBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ statementDate: 'desc' }],
    });
  }
}