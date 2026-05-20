import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { AuditAction, AuditSeverity } from '../../types/audit';
import { withAudit } from '../../utils/audit-wrapper';
import { TransactionEngine } from './transaction-engine';

type PettyCashCategory = 'TRANSPORT' | 'OFFICE_SUPPLIES' | 'MEALS' | 'COMMUNICATION';

type PettyCashContext = {
  actor: {
    id: string;
  };
  tenantId: string;
  req: Request & {
    db: any;
    tenantId?: string;
  };
};

type PettyCashVoucherInput = {
  amount: number | string | Prisma.Decimal;
  description: string;
  category: PettyCashCategory;
  matterId?: string | null;
  pettyCashAssetAccountId: string;
  expenseAccountId: string;
  reference?: string | null;
  branchId?: string | null;
};

type PettyCashFloatInput = {
  pettyCashAssetAccountId: string;
  imprestLimit?: number | string | Prisma.Decimal | null;
  lowFloatThreshold?: number | string | Prisma.Decimal | null;
};

type TransactionCapableDb = {
  $transaction: <T>(callback: (tx: any) => Promise<T>) => Promise<T>;
  [key: string]: any;
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

function optionalString(value: unknown, label: string, code: string): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return requiredString(value, label, code);
}

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(value);
}

function assertPositiveMoney(value: Prisma.Decimal, label: string): void {
  if (value.lte(0)) {
    throw Object.assign(new Error(`${label} must be greater than zero`), {
      statusCode: 422,
      code: 'FINANCE_AMOUNT_INVALID',
    });
  }
}

function assertNonNegativeMoney(value: Prisma.Decimal, label: string): void {
  if (value.lt(0)) {
    throw Object.assign(new Error(`${label} cannot be negative`), {
      statusCode: 422,
      code: 'FINANCE_AMOUNT_INVALID',
    });
  }
}

function buildTransactionCapableDb(tx: any): TransactionCapableDb {
  return new Proxy(tx, {
    get(target, property, receiver) {
      if (property === '$transaction') {
        return async (callback: (innerTx: any) => Promise<unknown>) => callback(target);
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as TransactionCapableDb;
}

async function assertChartAccount(
  db: any,
  tenantId: string,
  accountId: string,
  expectedType: 'ASSET' | 'EXPENSE',
  label: string,
) {
  const account = await db.chartOfAccount.findFirst({
    where: {
      id: accountId,
      tenantId,
      isActive: true,
      type: expectedType,
    },
    select: {
      id: true,
      tenantId: true,
      code: true,
      name: true,
      type: true,
      subtype: true,
      isActive: true,
      allowManualPosting: true,
    },
  });

  if (!account) {
    throw Object.assign(new Error(`${label} is invalid, inactive, wrong type, or outside this tenant`), {
      statusCode: 422,
      code: 'FINANCE_ACCOUNT_INVALID',
      details: {
        accountId,
        expectedType,
      },
    });
  }

  if (account.allowManualPosting === false) {
    throw Object.assign(new Error(`${label} does not allow manual posting`), {
      statusCode: 422,
      code: 'FINANCE_ACCOUNT_MANUAL_POSTING_DISABLED',
      details: {
        accountId,
      },
    });
  }

  return account;
}

async function assertMatterIfProvided(db: any, tenantId: string, matterId: string | null) {
  if (!matterId) {
    return null;
  }

  const matter = await db.matter.findFirst({
    where: {
      id: matterId,
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      tenantId: true,
      branchId: true,
      title: true,
    },
  });

  if (!matter) {
    throw Object.assign(new Error('Matter is invalid, deleted, or outside this tenant'), {
      statusCode: 422,
      code: 'FINANCE_MATTER_INVALID',
      details: {
        matterId,
      },
    });
  }

  return matter;
}

async function assertBranchIfProvided(db: any, tenantId: string, branchId: string | null) {
  if (!branchId) {
    return null;
  }

  const branch = await db.branch.findFirst({
    where: {
      id: branchId,
      tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
    },
  });

  if (!branch) {
    throw Object.assign(new Error('Branch is invalid or outside this tenant'), {
      statusCode: 422,
      code: 'FINANCE_BRANCH_INVALID',
      details: {
        branchId,
      },
    });
  }

  return branch;
}

export class PettyCashService {
  /**
   * Records a petty cash voucher as a double-entry journal:
   * - Dr expense account
   * - Cr petty cash asset account
   *
   * The current schema has no tenant-level petty cash configuration model.
   * Callers must provide the concrete ChartOfAccount IDs, and this service
   * validates tenant ownership, account type, active status, and manual-posting permission.
   */
  static async recordVoucher(context: PettyCashContext, params: PettyCashVoucherInput) {
    const db = context.req.db;
    const tenantId = requiredString(context.tenantId, 'Tenant ID', 'FINANCE_TENANT_REQUIRED');
    const actorId = requiredString(context.actor?.id, 'Actor ID', 'FINANCE_ACTOR_REQUIRED');

    const amount = toDecimal(params.amount);
    assertPositiveMoney(amount, 'Petty cash voucher amount');

    const description = requiredString(
      params.description,
      'Description',
      'FINANCE_PETTY_CASH_DESCRIPTION_REQUIRED',
    );

    const pettyCashAssetAccountId = requiredString(
      params.pettyCashAssetAccountId,
      'Petty cash asset account ID',
      'FINANCE_PETTY_CASH_ASSET_REQUIRED',
    );

    const expenseAccountId = requiredString(
      params.expenseAccountId,
      'Expense account ID',
      'FINANCE_PETTY_CASH_EXPENSE_REQUIRED',
    );

    const matterId = optionalString(params.matterId, 'Matter ID', 'FINANCE_MATTER_INVALID');
    const branchId = optionalString(params.branchId, 'Branch ID', 'FINANCE_BRANCH_INVALID');
    const reference =
      optionalString(params.reference, 'Reference', 'FINANCE_REFERENCE_INVALID') ??
      `PCV-${Date.now().toString().slice(-8)}`;

    return withAudit(
      context.req,
      {
        action: AuditAction.CREATE,
        severity: AuditSeverity.INFO,
        entityType: 'PETTY_CASH_VOUCHER',
        entityId: reference,
        buildSuccessPayload: (result: any) => ({
          success: true,
          eventCode: 'PETTY_CASH_VOUCHER_RECORDED',
          tenantId,
          reference,
          amount: amount.toString(),
          journalId: result?.journal?.id ?? result?.journal?.journalEntry?.id ?? null,
          expenseEntryId: result?.expenseEntry?.id ?? null,
          matterId,
          branchId,
        }),
        buildFailurePayload: (error: unknown) => ({
          success: false,
          eventCode: 'PETTY_CASH_VOUCHER_RECORDED',
          tenantId,
          reference,
          amount: amount.toString(),
          matterId,
          branchId,
          error: error instanceof Error ? error.message : 'Unknown petty cash error',
        }),
      },
      async () =>
        db.$transaction(async (tx: any) => {
          const [assetAccount, expenseAccount, matter, branch] = await Promise.all([
            assertChartAccount(tx, tenantId, pettyCashAssetAccountId, 'ASSET', 'Petty cash asset account'),
            assertChartAccount(tx, tenantId, expenseAccountId, 'EXPENSE', 'Expense account'),
            assertMatterIfProvided(tx, tenantId, matterId),
            assertBranchIfProvided(tx, tenantId, branchId),
          ]);

          if (matter && branch && matter.branchId !== branch.id) {
            throw Object.assign(new Error('Selected branch does not match the selected matter branch'), {
              statusCode: 422,
              code: 'FINANCE_BRANCH_MATTER_MISMATCH',
              details: {
                matterId: matter.id,
                matterBranchId: matter.branchId,
                branchId: branch.id,
              },
            });
          }

          const transactionDb = buildTransactionCapableDb(tx);

          const journal = await TransactionEngine.postJournalAtomically(
            transactionDb as any,
            tenantId,
            {
              date: new Date(),
              reference,
              description: `Petty Cash: ${description}`,
              sourceModule: 'FINANCE',
              sourceEntityType: 'PETTY_CASH_VOUCHER',
              sourceEntityId: matterId ?? reference,
              lines: [
                {
                  accountId: expenseAccount.id,
                  debit: amount,
                  credit: new Prisma.Decimal(0),
                  matterId,
                  branchId: branch?.id ?? matter?.branchId ?? null,
                  reference,
                  description,
                },
                {
                  accountId: assetAccount.id,
                  debit: new Prisma.Decimal(0),
                  credit: amount,
                  matterId,
                  branchId: branch?.id ?? matter?.branchId ?? null,
                  reference,
                  description: `Petty cash disbursement: ${description}`,
                },
              ],
            },
            {},
            actorId,
          );

          /**
           * ExpenseEntry requires a non-null matterId in the current schema.
           * Office-only petty cash is represented by the journal only.
           * Matter-linked petty cash additionally records a schema-valid ExpenseEntry.
           */
          const expenseEntry = matterId
            ? await tx.expenseEntry.create({
                data: {
                  tenantId,
                  matterId,
                  branchId: branch?.id ?? matter?.branchId ?? null,
                  expenseAccountId: expenseAccount.id,
                  amount,
                  description,
                  reference,
                  userId: actorId,
                  status: 'PAID',
                  expenseDate: new Date(),
                },
              })
            : null;

          return {
            journal,
            expenseEntry,
            accounts: {
              pettyCashAssetAccountId: assetAccount.id,
              expenseAccountId: expenseAccount.id,
            },
          };
        }),
    );
  }

  /**
   * Reads petty cash float status from JournalLine for the supplied petty-cash asset account.
   *
   * No tenant settings fallback is used because the current schema does not expose
   * tenant-level petty cash/imprest configuration.
   */
  static async getFloatStatus(context: { tenantId: string; req: { db: any } }, params: PettyCashFloatInput) {
    const db = context.req.db;
    const tenantId = requiredString(context.tenantId, 'Tenant ID', 'FINANCE_TENANT_REQUIRED');

    const pettyCashAssetAccountId = requiredString(
      params?.pettyCashAssetAccountId,
      'Petty cash asset account ID',
      'FINANCE_PETTY_CASH_ASSET_REQUIRED',
    );

    const imprestLimit = toDecimal(params?.imprestLimit ?? 50_000);
    assertPositiveMoney(imprestLimit, 'Petty cash imprest limit');

    const lowFloatThreshold = toDecimal(params?.lowFloatThreshold ?? 10_000);
    assertNonNegativeMoney(lowFloatThreshold, 'Petty cash low-float threshold');

    await assertChartAccount(db, tenantId, pettyCashAssetAccountId, 'ASSET', 'Petty cash asset account');

    const cashAggregation = await db.journalLine.aggregate({
      where: {
        tenantId,
        accountId: pettyCashAssetAccountId,
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const currentCashInTin = toDecimal(cashAggregation._sum?.debit).minus(
      toDecimal(cashAggregation._sum?.credit),
    );

    const spentAmount = imprestLimit.minus(currentCashInTin);
    const utilizationPercent = spentAmount.div(imprestLimit).mul(100);

    return {
      authorizedFloat: imprestLimit,
      currentCashInTin,
      spentAmount,
      utilizationPercent: utilizationPercent.toNumber(),
      replenishmentNeeded: currentCashInTin.lt(lowFloatThreshold),
      metadata: {
        pettyCashAssetAccountId,
        lowFloatThreshold,
      },
    };
  }
}

export default PettyCashService;