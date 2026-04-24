import { Prisma } from '@global-wakili/database';
import type {
  JournalPostingInput,
  PostingPolicyContext,
  TenantDbClient,
} from './finance.types';
import { PostingPolicyService } from './posting-policy.service';
import { FinanceIdempotencyService } from './idempotency.service';
import { AppError } from '../../utils/AppError';

export class UnbalancedJournalError extends AppError {
  constructor(message: string) {
    super(message, 400, 'UNBALANCED_JOURNAL_COMMIT');
  }
}

export class PeriodClosedError extends AppError {
  constructor(message: string) {
    super(message, 403, 'PERIOD_CLOSED');
  }
}

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class TransactionEngine {
  static async postJournalAtomically(
    db: TenantDbClient & { $transaction: Function },
    tenantId: string,
    input: JournalPostingInput,
    context: PostingPolicyContext = {},
    actorId?: string,
  ) {
    await FinanceIdempotencyService.assertJournalReferenceAvailable(db, tenantId, input.reference);
    await PostingPolicyService.assertAllowed(db, tenantId, input, context);

    const totals = input.lines.reduce(
      (acc, line) => {
        acc.debit = acc.debit.plus(toDecimal(line.debit));
        acc.credit = acc.credit.plus(toDecimal(line.credit));
        return acc;
      },
      {
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0),
      },
    );

    if (!totals.debit.equals(totals.credit)) {
      throw new UnbalancedJournalError(
        `Pre-commit validation failed: Debits (${totals.debit.toString()}) != Credits (${totals.credit.toString()})`,
      );
    }

    if (totals.debit.equals(0) && totals.credit.equals(0)) {
      throw new AppError('Journal cannot be zero value', 400, 'ZERO_VALUE_JOURNAL');
    }

    return db.$transaction(async (tx: TenantDbClient & { journalEntry: any; journalLine: any }) => {
      console.info(
        `[TX_START] tenant=${tenantId} ref=${input.reference} lines=${input.lines.length}`,
      );

      const inTxPolicy = await PostingPolicyService.evaluate(tx, tenantId, input, context);
      if (!inTxPolicy.allowed) {
        const periodLocked = inTxPolicy.issues.find((issue) => issue.code === 'PERIOD_LOCKED');
        if (periodLocked) {
          throw new PeriodClosedError(periodLocked.message);
        }

        throw Object.assign(new Error('Posting policy validation failed'), {
          statusCode: 422,
          code: 'POSTING_POLICY_VIOLATION',
          details: inTxPolicy.issues,
        });
      }

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId,
          reference: input.reference,
          description: input.description,
          date: input.date,
          amount: totals.debit,
          postedById: actorId ?? null,
          currency: input.currency ?? 'KES',
          exchangeRate: toDecimal(input.exchangeRate ?? 1),
          sourceModule: input.sourceModule ?? null,
          sourceEntityType: input.sourceEntityType ?? null,
          sourceEntityId: input.sourceEntityId ?? null,
          reversalOfId: input.reversalOfId ?? null,
          lines: {
            create: input.lines.map((line) => ({
              tenantId,
              accountId: line.accountId,
              debit: toDecimal(line.debit),
              credit: toDecimal(line.credit),
              clientId: line.clientId ?? null,
              matterId: line.matterId ?? null,
              branchId: line.branchId ?? null,
              reference: line.reference ?? null,
              description: line.description ?? null,
            })),
          },
        },
        include: {
          lines: true,
        },
      });

      console.info(`[TX_SUCCESS] journal=${journalEntry.id} committed`);

      return journalEntry;
    });
  }
}