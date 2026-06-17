// apps/api/src/modules/finance/idempotency.service.ts

import type {
  IdempotencyCheckResult,
  TenantDbClient,
} from './finance.types';

type JournalReferenceRecord = {
  id: string;
  reference: string;
  date: Date;
};

type BankTransactionReferenceRecord = {
  id: string;
  reference: string | null;
  transactionDate: Date;
};

type JournalEntryDelegate = {
  findFirst: (args: unknown) => Promise<JournalReferenceRecord | null>;
};

type BankTransactionDelegate = {
  findFirst: (args: unknown) => Promise<BankTransactionReferenceRecord | null>;
};

function requireDelegate<T extends object>(
  delegate: T | null | undefined,
  label: string,
): T {
  if (!delegate) {
    throw Object.assign(new Error(`${label} delegate is not available`), {
      statusCode: 500,
      code: 'FINANCE_DELEGATE_UNAVAILABLE',
      details: { delegate: label },
    });
  }

  return delegate;
}

export class FinanceIdempotencyService {
  static async checkJournalReference(
    db: TenantDbClient,
    tenantId: string,
    reference: string,
  ): Promise<
    IdempotencyCheckResult<{
      id: string;
      reference: string;
      date: Date;
    }>
  > {
    const journalEntry = requireDelegate(db.journalEntry, 'journalEntry') as JournalEntryDelegate;

    const existingRecord = await journalEntry.findFirst({
      where: {
        tenantId,
        reference,
      },
      select: {
        id: true,
        reference: true,
        date: true,
      },
    });

    return {
      isDuplicate: Boolean(existingRecord),
      existingRecord,
    };
  }

  static async assertJournalReferenceAvailable(
    db: TenantDbClient,
    tenantId: string,
    reference: string,
  ): Promise<void> {
    const result = await this.checkJournalReference(db, tenantId, reference);

    if (result.isDuplicate) {
      throw Object.assign(new Error(`Journal reference already exists: ${reference}`), {
        statusCode: 409,
        code: 'DUPLICATE_REFERENCE',
        details: {
          reference,
          existingRecord: result.existingRecord,
        },
      });
    }
  }

  static async checkBankTransactionReference(
    db: TenantDbClient,
    tenantId: string,
    reference: string,
  ): Promise<
    IdempotencyCheckResult<{
      id: string;
      reference: string | null;
      transactionDate: Date;
    }>
  > {
    const bankTransaction = requireDelegate(db.bankTransaction, 'bankTransaction') as BankTransactionDelegate;

    const existingRecord = await bankTransaction.findFirst({
      where: {
        tenantId,
        reference,
      },
      select: {
        id: true,
        reference: true,
        transactionDate: true,
      },
    });

    return {
      isDuplicate: Boolean(existingRecord),
      existingRecord,
    };
  }

  static async assertBankTransactionReferenceAvailable(
    db: TenantDbClient,
    tenantId: string,
    reference: string,
  ): Promise<void> {
    const result = await this.checkBankTransactionReference(db, tenantId, reference);

    if (result.isDuplicate) {
      throw Object.assign(new Error(`Bank transaction reference already exists: ${reference}`), {
        statusCode: 409,
        code: 'DUPLICATE_BANK_TRANSACTION_REFERENCE',
        details: {
          reference,
          existingRecord: result.existingRecord,
        },
      });
    }
  }
}

export default FinanceIdempotencyService;