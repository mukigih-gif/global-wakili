import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';

const ZERO = new Prisma.Decimal(0);

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return ZERO;
  }

  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
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
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return ledgers
      .filter((row) => toDecimal(row.balance).lt(ZERO))
      .map((row) => ({
        type: 'MATTER_OVERDRAW',
        trustAccountId: row.trustAccountId,
        client: row.client,
        matter: row.matter,
        clientId: row.clientId,
        matterId: row.matterId ?? null,
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
        accountName: true,
        accountNumber: true,
        currentBalance: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return trustAccounts
      .filter((row) => toDecimal(row.currentBalance).lt(ZERO))
      .map((row) => ({
        type: 'TRUST_ACCOUNT_OVERDRAW',
        trustAccountId: row.id,
        accountName: row.accountName,
        accountNumber: row.accountNumber,
        balance: toDecimal(row.currentBalance),
      }));
  }

  static async detectLedgerMismatch(req: Request) {
    const db = req.db;
    const tenantId = req.tenantId!;

    const [trustAccounts, ledgerBalances] = await Promise.all([
      db.trustAccount.findMany({
        where: { tenantId },
        select: {
          id: true,
          accountName: true,
          accountNumber: true,
          currentBalance: true,
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      db.clientTrustLedger.groupBy({
        by: ['trustAccountId'],
        where: {
          tenantId,
          trustAccountId: {
            not: null,
          },
        },
        _sum: {
          debit: true,
          credit: true,
        },
      }),
    ]);

    const ledgerByTrustAccountId = new Map<string, Prisma.Decimal>();

    for (const ledger of ledgerBalances) {
      if (!ledger.trustAccountId) continue;

      const creditTotal = toDecimal(ledger._sum.credit);
      const debitTotal = toDecimal(ledger._sum.debit);

      ledgerByTrustAccountId.set(
        ledger.trustAccountId,
        creditTotal.minus(debitTotal),
      );
    }

    return trustAccounts
      .map((account) => {
        const trustAccountBalance = toDecimal(account.currentBalance);
        const clientLedgerTotal = ledgerByTrustAccountId.get(account.id) ?? ZERO;
        const variance = trustAccountBalance.minus(clientLedgerTotal);

        return {
          type: 'TRUST_ACCOUNT_LEDGER_MISMATCH',
          trustAccountId: account.id,
          accountName: account.accountName,
          accountNumber: account.accountNumber,
          trustAccountBalance,
          clientLedgerTotal,
          variance,
          scope: 'TRUST_ACCOUNT_LEVEL',
        };
      })
      .filter((row) => !row.variance.equals(ZERO));
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