import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class TrustViolationService {
  static async detectMatterOverdraws(req: Request) {
    const db = req.db;
    const tenantId = req.tenantId!;

    const ledgers = await db.clientTrustLedger.findMany({
      where: {
        tenantId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        matter: {
          select: {
            id: true,
            title: true,
            caseNumber: true,
          },
        },
        trustAccount: {
          select: {
            id: true,
            name: true,
            accountNumber: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return ledgers
      .filter((row: any) => toDecimal(row.balance).lt(0))
      .map((row: any) => ({
        type: 'MATTER_OVERDRAW',
        trustAccountId: row.trustAccountId,
        trustAccount: row.trustAccount,
        client: row.client,
        matter: row.matter,
        balance: toDecimal(row.balance),
      }));
  }

  static async detectTrustAccountOverdraws(req: Request) {
    const db = req.db;
    const tenantId = req.tenantId!;

    const trustAccounts = await db.trustAccount.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        balance: true,
        clientId: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return trustAccounts
      .filter((row: any) => toDecimal(row.balance).lt(0))
      .map((row: any) => ({
        type: 'TRUST_ACCOUNT_OVERDRAW',
        trustAccountId: row.id,
        name: row.name,
        accountNumber: row.accountNumber,
        balance: toDecimal(row.balance),
        clientId: row.clientId,
      }));
  }

  static async detectLedgerMismatch(req: Request) {
    const db = req.db;
    const tenantId = req.tenantId!;

    const trustAccounts = await db.trustAccount.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        balance: true,
      },
    });

    const issues = [];

    for (const trustAccount of trustAccounts) {
      const aggregate = await db.clientTrustLedger.aggregate({
        where: {
          tenantId,
          trustAccountId: trustAccount.id,
        },
        _sum: {
          balance: true,
        },
      });

      const ledgerTotal = toDecimal(aggregate._sum.balance);
      const trustBalance = toDecimal(trustAccount.balance);

      if (!ledgerTotal.equals(trustBalance)) {
        issues.push({
          type: 'TRUST_LEDGER_MISMATCH',
          trustAccountId: trustAccount.id,
          name: trustAccount.name,
          accountNumber: trustAccount.accountNumber,
          trustAccountBalance: trustBalance,
          clientLedgerTotal: ledgerTotal,
          variance: trustBalance.minus(ledgerTotal),
        });
      }
    }

    return issues;
  }

  static async getAllViolations(req: Request) {
    const [matterOverdraws, trustOverdraws, ledgerMismatch] = await Promise.all([
      this.detectMatterOverdraws(req),
      this.detectTrustAccountOverdraws(req),
      this.detectLedgerMismatch(req),
    ]);

    return {
      matterOverdraws,
      trustOverdraws,
      ledgerMismatch,
      totalViolations:
        matterOverdraws.length +
        trustOverdraws.length +
        ledgerMismatch.length,
    };
  }
}