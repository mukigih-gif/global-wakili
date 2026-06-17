import type { Request } from 'express';
import { AccountSubtype, Prisma } from '@global-wakili/database';
import { logAdminAction } from '../../utils/audit-logger';
import { AuditAction, AuditSeverity } from '../../types/audit';
import type {
  DecimalLike,
  TenantTrustDbClient,
  TrustDbClient,
  TrustTransactionClient,
  TrustTransactionInput,
  TrustValidationIssue,
  TrustValidationResult,
} from './trust.types';
import { ClientTrustLedgerService } from './ClientTrustLedgerService';
import { GeneralLedgerService } from '../finance/general-ledger.service';

type TrustRequestUser = {
  sub?: string | null;
  id?: string | null;
  userId?: string | null;
};

type RequestWithTrustContext = Request & {
  tenantId?: string | null;
  user?: TrustRequestUser;
};

type TrustChartAccount = {
  id: string;
};

const ZERO = new Prisma.Decimal(0);

function toDecimal(value: DecimalLike | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return ZERO;
  }

  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function requireTenantId(req: RequestWithTrustContext): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for trust transactions'), {
      statusCode: 401,
      code: 'TENANT_BOUNDARY_REQUIRED',
    });
  }

  return req.tenantId.trim();
}

function requireTrustAccountId(input: TrustTransactionInput): string {
  if (!input.trustAccountId?.trim()) {
    throw Object.assign(new Error('Trust account boundary is required for trust transactions'), {
      statusCode: 400,
      code: 'TRUST_ACCOUNT_BOUNDARY_REQUIRED',
    });
  }

  return input.trustAccountId.trim();
}

function requireClientId(input: TrustTransactionInput): string {
  if (!input.clientId?.trim()) {
    throw Object.assign(new Error('Client boundary is required for trust transactions'), {
      statusCode: 400,
      code: 'CLIENT_MISMATCH',
    });
  }

  return input.clientId.trim();
}

function actorIdFrom(req: RequestWithTrustContext): string | null {
  return req.user?.sub ?? req.user?.id ?? req.user?.userId ?? null;
}

function transactionDescription(input: TrustTransactionInput): string {
  return input.description?.trim() || `Trust transaction ${input.reference}`;
}

function transactionCurrency(input: TrustTransactionInput, fallback = 'KES'): string {
  return input.currency?.trim() || fallback;
}

function isTrustInflow(transactionType: TrustTransactionInput['transactionType']): boolean {
  return transactionType === 'DEPOSIT' || transactionType === 'INTEREST';
}

function isTrustOutflow(transactionType: TrustTransactionInput['transactionType']): boolean {
  return transactionType === 'WITHDRAWAL' || transactionType === 'TRANSFER_TO_OFFICE';
}

function requestWithDb(req: Request, db: TrustTransactionClient): Request {
  return {
    ...req,
    db,
  } as unknown as Request;
}

function requestDb(req: Request): TenantTrustDbClient {
  return req.db as unknown as TenantTrustDbClient;
}

export class TrustTransactionService {
  static async validate(
    db: TenantTrustDbClient,
    tenantId: string,
    input: TrustTransactionInput,
  ): Promise<TrustValidationResult> {
    const issues: TrustValidationIssue[] = [];

    if (!tenantId?.trim()) {
      issues.push({
        code: 'TENANT_BOUNDARY_REQUIRED',
        message: 'Tenant context is required for trust transactions.',
      });
    }

    if (!input.trustAccountId?.trim()) {
      issues.push({
        code: 'TRUST_ACCOUNT_BOUNDARY_REQUIRED',
        message: 'Trust account is required for trust transactions.',
      });
    }

    if (!input.reference?.trim()) {
      issues.push({
        code: 'INVALID_REFERENCE',
        message: 'Trust reference is required.',
      });
    }

    if (!(input.transactionDate instanceof Date) || Number.isNaN(input.transactionDate.getTime())) {
      issues.push({
        code: 'INVALID_DATE',
        message: 'Transaction date is invalid.',
      });
    }

    const amount = toDecimal(input.amount);

    if (amount.lt(ZERO)) {
      issues.push({
        code: 'INVALID_AMOUNT',
        message: 'Trust amount cannot be negative.',
      });
    }

    if (amount.eq(ZERO)) {
      issues.push({
        code: 'ZERO_AMOUNT',
        message: 'Trust amount cannot be zero.',
      });
    }

    if (!input.transactionType) {
      issues.push({
        code: 'INVALID_TRANSACTION_TYPE',
        message: 'Trust transaction type is required.',
      });
    }

    if (!input.clientId?.trim()) {
      issues.push({
        code: 'CLIENT_MISMATCH',
        message: 'Client is required for trust transactions.',
      });
    }

    if (input.reference?.trim()) {
      const duplicate = await db.trustTransaction.findFirst({
        where: {
          tenantId,
          reference: input.reference.trim(),
        },
        select: { id: true },
      });

      if (duplicate) {
        issues.push({
          code: 'DUPLICATE_REFERENCE',
          message: 'Trust reference already exists.',
        });
      }
    }

    const trustAccount = input.trustAccountId?.trim()
      ? await db.trustAccount.findFirst({
          where: {
            tenantId,
            id: input.trustAccountId.trim(),
          },
          select: {
            id: true,
            isActive: true,
            currentBalance: true,
            currency: true,
          },
        })
      : null;

    if (!trustAccount) {
      issues.push({
        code: 'MISSING_TRUST_ACCOUNT',
        message: 'Trust account not found.',
      });
    } else {
      if (!trustAccount.isActive) {
        issues.push({
          code: 'INACTIVE_TRUST_ACCOUNT',
          message: 'Trust account is inactive.',
        });
      }

      if (input.currency && trustAccount.currency !== input.currency) {
        issues.push({
          code: 'CURRENCY_MISMATCH',
          message: 'Trust transaction currency does not match trust account currency.',
          meta: {
            trustAccountCurrency: trustAccount.currency,
            transactionCurrency: input.currency,
          },
        });
      }

      if (isTrustOutflow(input.transactionType) && toDecimal(trustAccount.currentBalance).lt(amount)) {
        issues.push({
          code: 'INSUFFICIENT_TRUST_ACCOUNT_BALANCE',
          message: 'Trust account has insufficient balance.',
          meta: {
            available: toDecimal(trustAccount.currentBalance).toString(),
            required: amount.toString(),
          },
        });
      }
    }

    const client = input.clientId?.trim()
      ? await db.client.findFirst({
          where: {
            tenantId,
            id: input.clientId.trim(),
          },
          select: { id: true },
        })
      : null;

    if (!client) {
      issues.push({
        code: 'CLIENT_MISMATCH',
        message: 'Client not found for tenant.',
      });
    }

    if (input.matterId) {
      const matter = await db.matter.findFirst({
        where: {
          tenantId,
          id: input.matterId,
          clientId: input.clientId,
        },
        select: { id: true },
      });

      if (!matter) {
        issues.push({
          code: 'MATTER_MISMATCH',
          message: 'Matter not found for supplied client and tenant.',
        });
      }
    }

    if (isTrustOutflow(input.transactionType) && input.matterId && input.trustAccountId) {
      const matterBalance = await ClientTrustLedgerService.getMatterBalance(
        db,
        tenantId,
        input.clientId,
        input.matterId,
        input.trustAccountId,
      );

      if (matterBalance.balance.lt(amount)) {
        issues.push({
          code: 'INSUFFICIENT_CLIENT_TRUST_BALANCE',
          message: 'Matter-level client trust balance is insufficient.',
          meta: {
            trustAccountId: input.trustAccountId,
            clientId: input.clientId,
            matterId: input.matterId,
            available: matterBalance.balance.toString(),
            required: amount.toString(),
          },
        });
      }
    }

    if (input.transactionType === 'TRANSFER_TO_OFFICE') {
      if (input.invoiceId) {
        const invoice = await db.invoice.findFirst({
          where: {
            tenantId,
            id: input.invoiceId,
            clientId: input.clientId,
            matterId: input.matterId ?? undefined,
          },
          select: {
            id: true,
            total: true,
            paidAmount: true,
          },
        });

        if (!invoice) {
          issues.push({
            code: 'INVOICE_NOT_FOUND',
            message: 'Invoice not found for trust transfer.',
          });
        } else {
          const amountDue = toDecimal(invoice.total).minus(toDecimal(invoice.paidAmount));

          if (amount.gt(amountDue)) {
            issues.push({
              code: 'TRANSFER_EXCEEDS_AMOUNT_DUE',
              message: 'Transfer amount exceeds invoice amount due.',
              meta: {
                total: toDecimal(invoice.total).toString(),
                paidAmount: toDecimal(invoice.paidAmount).toString(),
                amountDue: amountDue.toString(),
                requested: amount.toString(),
              },
            });
          }
        }
      }

      if (input.drnId) {
        const drn = await db.disbursementRequestNote.findFirst({
          where: {
            tenantId,
            id: input.drnId,
            clientId: input.clientId,
            matterId: input.matterId ?? undefined,
          },
          select: {
            id: true,
            amount: true,
          },
        });

        if (!drn) {
          issues.push({
            code: 'DRN_NOT_FOUND',
            message: 'Disbursement Request Note not found.',
          });
        } else if (amount.gt(toDecimal(drn.amount))) {
          issues.push({
            code: 'TRANSFER_EXCEEDS_DRN_AMOUNT',
            message: 'Transfer amount exceeds DRN amount.',
            meta: {
              drnAmount: toDecimal(drn.amount).toString(),
              requested: amount.toString(),
            },
          });
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  static async create(req: Request, input: TrustTransactionInput) {
    const db = requestDb(req);
    const trustReq = req as RequestWithTrustContext;
    const tenantId = requireTenantId(trustReq);
    const trustAccountId = requireTrustAccountId(input);
    const clientId = requireClientId(input);
    const actorId = actorIdFrom(trustReq);
    const amount = toDecimal(input.amount);
    const currency = transactionCurrency(input);

    const validation = await this.validate(db, tenantId, {
      ...input,
      trustAccountId,
      clientId,
      currency,
    });

    if (!validation.valid) {
      throw Object.assign(new Error('Trust transaction validation failed'), {
        statusCode: 422,
        code: 'TRUST_TRANSACTION_VALIDATION_FAILED',
        details: validation.issues,
      });
    }

    const delta = isTrustInflow(input.transactionType) ? amount : amount.negated();

    return db.$transaction(async (tx) => {
      const transactionReq = requestWithDb(req, tx);
      const description = transactionDescription(input);

      const trustTx = await tx.trustTransaction.create({
        data: {
          tenantId,
          trustAccountId,
          clientId,
          matterId: input.matterId ?? null,
          transactionDate: input.transactionDate,
          transactionType: input.transactionType,
          amount,
          debit: isTrustOutflow(input.transactionType) ? amount : ZERO,
          credit: isTrustInflow(input.transactionType) ? amount : ZERO,
          currency,
          reference: input.reference.trim(),
          description,
          notes: input.notes?.trim() || null,
          bankTransactionId: input.bankTransactionId ?? null,
          createdById: actorId,
        },
      });

      if (isTrustOutflow(input.transactionType)) {
        // Authoritative atomic overdraw guard. The conditional UPDATE re-checks the
        // balance under the row lock it takes, INSIDE this $transaction — closing the
        // race left open by validate()'s pre-transaction read. Decrement by the positive
        // `amount` (not `delta`) so the `gte` guard and the write are one atomic statement.
        const debited = await tx.trustAccount.updateMany({
          where: { id: trustAccountId, tenantId, currentBalance: { gte: amount } },
          data: { currentBalance: { decrement: amount } },
        });

        if (debited.count === 0) {
          throw Object.assign(new Error('Trust account has insufficient balance'), {
            statusCode: 422,
            code: 'INSUFFICIENT_TRUST_ACCOUNT_BALANCE',
            details: { trustAccountId, required: amount.toString() },
          });
        }
      } else {
        await tx.trustAccount.update({
          where: { id: trustAccountId, tenantId },
          data: {
            currentBalance: {
              increment: delta,
            },
          },
        });
      }

      await ClientTrustLedgerService.applyDelta(tx, tenantId, {
        trustAccountId,
        clientId,
        matterId: input.matterId ?? null,
        delta,
        description,
        transactionDate: input.transactionDate,
      });

      const trustBank = await this.resolveAccountId(tx, tenantId, AccountSubtype.TRUST_BANK);
const trustLiability = await this.resolveAccountId(tx, tenantId, AccountSubtype.TRUST_LIABILITY);

      const trustLines = isTrustInflow(input.transactionType)
        ? [
            {
              accountId: trustBank.id,
              debit: amount,
              credit: ZERO,
              clientId,
              matterId: input.matterId ?? null,
              reference: input.reference,
              description,
            },
            {
              accountId: trustLiability.id,
              debit: ZERO,
              credit: amount,
              clientId,
              matterId: input.matterId ?? null,
              reference: input.reference,
              description,
            },
          ]
        : [
            {
              accountId: trustLiability.id,
              debit: amount,
              credit: ZERO,
              clientId,
              matterId: input.matterId ?? null,
              reference: input.reference,
              description,
            },
            {
              accountId: trustBank.id,
              debit: ZERO,
              credit: amount,
              clientId,
              matterId: input.matterId ?? null,
              reference: input.reference,
              description,
            },
          ];

      await GeneralLedgerService.postJournal(
        transactionReq,
        {
          reference: `TRUST-${input.reference}`,
          description,
          date: input.transactionDate,
          currency,
          exchangeRate: 1,
          sourceModule: 'trust',
          sourceEntityType: 'TrustTransaction',
          sourceEntityId: trustTx.id,
          lines: trustLines,
        },
        {
          allowTrustPosting: true,
          allowOfficePosting: false,
          enforcePeriodLock: true,
          allowMultiCurrency: false,
          expectedSourceModule: 'trust',
          systemPosting: true,
        },
      );

      if (input.transactionType === 'TRANSFER_TO_OFFICE') {
        await this.postOfficeSideSettlement(tx, transactionReq, tenantId, trustTx.id, input, amount);

        if (input.invoiceId) {
          const invoice = await tx.invoice.findFirst({
            where: {
              tenantId,
              id: input.invoiceId,
            },
            select: {
              id: true,
              total: true,
              paidAmount: true,
            },
          });

          if (!invoice) {
            throw Object.assign(new Error('Invoice not found during trust settlement'), {
              statusCode: 404,
              code: 'INVOICE_NOT_FOUND',
            });
          }

          const nextPaidAmount = toDecimal(invoice.paidAmount).plus(amount);
          const total = toDecimal(invoice.total);
          const nextStatus = nextPaidAmount.gte(total) ? 'PAID' : 'PARTIALLY_PAID';

          await tx.invoice.update({
            where: { id: input.invoiceId, tenantId },
            data: {
              paidAmount: nextPaidAmount,
              status: nextStatus,
            },
          });
        }

        if (input.drnId) {
          await tx.disbursementRequestNote.update({
            where: { id: input.drnId, tenantId },
            data: {
              status: 'SETTLED',
            },
          });
        }
      }

      await logAdminAction({
        req: transactionReq,
        tenantId,
        action: AuditAction.CREATE,
        severity: AuditSeverity.HIGH,
        entityId: trustTx.id,
        payload: {
          eventCode:
            input.transactionType === 'DEPOSIT'
              ? 'TRUST_DEPOSIT'
              : input.transactionType === 'WITHDRAWAL'
                ? 'TRUST_WITHDRAWAL'
                : input.transactionType === 'INTEREST'
                  ? 'TRUST_INTEREST'
                  : 'TRUST_TRANSFER_TO_OFFICE',
          reference: input.reference,
          amount: amount.toString(),
          transactionType: input.transactionType,
          trustAccountId,
          clientId,
          matterId: input.matterId ?? null,
          bankTransactionId: input.bankTransactionId ?? null,
          invoiceId: input.invoiceId ?? null,
          drnId: input.drnId ?? null,
          createdById: actorId,
          ipAddress: req.ip ?? null,
          userAgent: req.headers?.['user-agent'] ?? null,
        },
      });

      return trustTx;
    }, { maxWait: 10000, timeout: 30000 });
  }

  private static async postOfficeSideSettlement(
    tx: TrustTransactionClient,
    req: Request,
    tenantId: string,
    trustTransactionId: string,
    input: TrustTransactionInput,
    amount: Prisma.Decimal,
  ) {
    const officeBank = await this.resolveAccountId(tx, tenantId, AccountSubtype.OFFICE_BANK);
const accountsReceivable = await this.resolveAccountId(tx, tenantId, AccountSubtype.ACCOUNTS_RECEIVABLE);

    await GeneralLedgerService.postJournal(
      req,
      {
        reference: `OFFICE-${input.reference}`,
        description: `Trust to office settlement: ${transactionDescription(input)}`,
        date: input.transactionDate,
        currency: transactionCurrency(input),
        exchangeRate: 1,
        sourceModule: 'trust',
        sourceEntityType: 'TrustTransaction',
        sourceEntityId: trustTransactionId,
        lines: [
          {
            accountId: officeBank.id,
            debit: amount,
            credit: ZERO,
            clientId: input.clientId,
            matterId: input.matterId ?? null,
            reference: input.reference,
            description: 'Funds received into office bank from trust',
          },
          {
            accountId: accountsReceivable.id,
            debit: ZERO,
            credit: amount,
            clientId: input.clientId,
            matterId: input.matterId ?? null,
            reference: input.reference,
            description: 'Settlement of office receivable from trust funds',
          },
        ],
      },
      {
        allowTrustPosting: false,
        allowOfficePosting: true,
        enforcePeriodLock: true,
        allowMultiCurrency: false,
        expectedSourceModule: 'trust',
        systemPosting: true,
      },
    );
  }

  private static async resolveAccountId(
  db: TrustDbClient,
  tenantId: string,
  subtype: AccountSubtype,
): Promise<TrustChartAccount> {
    const account = await db.chartOfAccount.findFirst({
      where: {
        tenantId,
        subtype,
        isActive: true,
      },
      select: { id: true },
    });

    if (!account) {
      throw Object.assign(new Error(`${subtype} account is not configured`), {
        statusCode: 500,
        code: `${subtype}_ACCOUNT_NOT_CONFIGURED`,
      });
    }

    return account;
  }
}