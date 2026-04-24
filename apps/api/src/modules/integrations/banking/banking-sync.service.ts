// apps/api/src/modules/integrations/banking/banking-sync.service.ts

import { Prisma } from '@global-wakili/database';
import type { BankStatementSnapshot } from './bank.interface';

function toDecimal(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(value as any).toDecimalPlaces(
    2,
    Prisma.Decimal.ROUND_HALF_UP,
  );
}

export class BankingSyncService {
  static async persistSnapshot(
    db: any,
    tenantId: string,
    snapshot: BankStatementSnapshot,
  ): Promise<number> {
    if (!tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for bank sync'), {
        statusCode: 400,
        code: 'BANK_SYNC_TENANT_REQUIRED',
      });
    }

    if (!snapshot.accountId?.trim()) {
      throw Object.assign(new Error('Bank account ID is required for bank sync'), {
        statusCode: 400,
        code: 'BANK_SYNC_ACCOUNT_REQUIRED',
      });
    }

    if (!snapshot.transactions.length) {
      return 0;
    }

    const externalIds = snapshot.transactions
      .map((tx) => tx.externalId)
      .filter(Boolean);

    if (!externalIds.length) {
      return 0;
    }

    const existing = await db.bankTransaction.findMany({
      where: {
        tenantId,
        bankAccountId: snapshot.accountId,
        externalId: { in: externalIds },
      },
      select: {
        externalId: true,
      },
    });

    const existingIds = new Set(existing.map((row: any) => row.externalId));

    const rowsToInsert = snapshot.transactions
      .filter((tx) => tx.externalId && !existingIds.has(tx.externalId))
      .map((tx) => {
        const signedAmount =
          tx.type === 'DEBIT'
            ? toDecimal(tx.amount).negated()
            : toDecimal(tx.amount);

        return {
          tenantId,
          bankAccountId: snapshot.accountId,
          externalId: tx.externalId,
          transactionDate: tx.transactionDate,
          amount: signedAmount,
          currency: tx.currency,
          reference: tx.reference ?? null,
          narration: tx.narration ?? null,
          balanceAfter:
            tx.balanceAfter !== null && tx.balanceAfter !== undefined
              ? toDecimal(tx.balanceAfter)
              : null,
          counterpartyName: tx.counterpartyName ?? null,
          counterpartyAccount: tx.counterpartyAccount ?? null,
          rawPayload: tx.rawPayload ?? null,
        };
      });

    if (!rowsToInsert.length) {
      return 0;
    }

    await db.bankTransaction.createMany({
      data: rowsToInsert,
      skipDuplicates: true,
    });

    return rowsToInsert.length;
  }
}

export default BankingSyncService;