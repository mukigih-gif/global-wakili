import type {
  IdempotencyCheckResult,
  TenantDbClient,
} from './finance.types';

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
    const existingRecord = await db.journalEntry.findUnique({
      where: {
        tenantId_reference: {
          tenantId,
          reference,
        },
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
    const existingRecord = await db.bankTransaction.findFirst({
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