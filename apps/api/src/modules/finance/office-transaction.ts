// apps/api/src/modules/finance/office-transaction.ts

import { Prisma } from '@global-wakili/database';
import { TransactionEngine } from './transaction-engine';
import type { TenantDbClient } from './finance.types';

type OfficeTransactionDbClient = TenantDbClient & {
  $transaction: <T>(
    callback: (
      tx: TenantDbClient & {
        journalEntry: {
          create: (args: unknown) => Promise<{ id: string }>;
        };
      },
    ) => Promise<T>,
  ) => Promise<T>;
};

type OfficeTransactionContext = {
  tenantId: string;
  req: {
    db: OfficeTransactionDbClient;
  };
  actor?: {
    id?: string | null;
  } | null;
};

function requiredString(value: unknown, label: string, code: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error(`${label} is required`), {
      statusCode: 422,
      code,
    });
  }

  return value.trim();
}

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export const recordLegalFee = async (
  context: OfficeTransactionContext,
  params:
    | number
    | {
        amount: number | string | Prisma.Decimal;
        officeBankAccountId: string;
        legalFeesIncomeAccountId: string;
        reference?: string | null;
        description?: string | null;
        matterId?: string | null;
        clientId?: string | null;
        branchId?: string | null;
      },
) => {
  const tenantId = requiredString(context.tenantId, 'Tenant ID', 'FINANCE_TENANT_REQUIRED');

  if (typeof params === 'number') {
    throw Object.assign(
      new Error(
        'recordLegalFee now requires explicit officeBankAccountId and legalFeesIncomeAccountId to avoid hardcoded chart-of-account codes.',
      ),
      {
        statusCode: 422,
        code: 'FINANCE_OFFICE_TRANSACTION_ACCOUNTS_REQUIRED',
      },
    );
  }

  const amount = toDecimal(params.amount);

  if (amount.lte(0)) {
    throw Object.assign(new Error('Legal fee amount must be greater than zero'), {
      statusCode: 422,
      code: 'FINANCE_AMOUNT_INVALID',
    });
  }

  const officeBankAccountId = requiredString(
    params.officeBankAccountId,
    'Office bank account ID',
    'FINANCE_OFFICE_BANK_ACCOUNT_REQUIRED',
  );

  const legalFeesIncomeAccountId = requiredString(
    params.legalFeesIncomeAccountId,
    'Legal fees income account ID',
    'FINANCE_LEGAL_FEES_ACCOUNT_REQUIRED',
  );

  return TransactionEngine.postJournalAtomically(
    context.req.db,
    tenantId,
    {
      date: new Date(),
      reference: params.reference ?? `LEGAL-FEE-${Date.now()}`,
      description: params.description ?? 'Legal Fee Earned',
      sourceModule: 'FINANCE',
      sourceEntityType: 'OFFICE_TRANSACTION',
      sourceEntityId: params.matterId ?? null,
      lines: [
        {
          accountId: officeBankAccountId,
          debit: amount,
          credit: new Prisma.Decimal(0),
          matterId: params.matterId ?? null,
          clientId: params.clientId ?? null,
          branchId: params.branchId ?? null,
          description: 'Office bank receipt',
        },
        {
          accountId: legalFeesIncomeAccountId,
          debit: new Prisma.Decimal(0),
          credit: amount,
          matterId: params.matterId ?? null,
          clientId: params.clientId ?? null,
          branchId: params.branchId ?? null,
          description: 'Legal fees revenue',
        },
      ],
    },
    {},
    context.actor?.id ?? undefined,
  );
};

export default recordLegalFee;