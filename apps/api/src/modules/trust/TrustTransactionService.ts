import { Prisma } from '@global-wakili/database';
import { logAdminAction } from '../../utils/audit-logger';
import { AuditSeverity } from '../../types/audit';
import type {
  DecimalLike,
  TenantTrustDbClient,
  TrustTransactionInput,
  TrustValidationIssue,
  TrustValidationResult,
} from './trust.types';
import { ClientTrustLedgerService } from './ClientTrustLedgerService';
import { GeneralLedgerService } from '../finance/GeneralLedgerService';

function toDecimal(value: DecimalLike | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

export class TrustTransactionService {
  static async validate(
    db: TenantTrustDbClient,
    tenantId: string,
    input: TrustTransactionInput,
  ): Promise<TrustValidationResult> {
    const issues: TrustValidationIssue[] = [];

    if (!input.reference?.trim()) {
      issues.push({ code: 'INVALID_REFERENCE', message: 'Trust reference is required.' });
    }

    if (!(input.transactionDate instanceof Date) || Number.isNaN(input.transactionDate.getTime())) {
      issues.push({ code: 'INVALID_DATE', message: 'Transaction date is invalid.' });
    }

    const amount = toDecimal(input.amount);
    if (amount.lt(0)) {
      issues.push({ code: 'INVALID_AMOUNT', message: 'Trust amount cannot be negative.' });
    }
    if (amount.eq(0)) {
      issues.push({ code: 'ZERO_AMOUNT', message: 'Trust amount cannot be zero.' });
    }

    const duplicate = await db.trustTransaction.findFirst({
      where: { tenantId, reference: input.reference },
      select: { id: true },
    });

    if (duplicate) {
      issues.push({ code: 'DUPLICATE_REFERENCE', message: 'Trust reference already exists.' });
    }

    const trustAccount = await db.trustAccount.findFirst({
      where: { tenantId, id: input.trustAccountId },
      select: {
        id: true,
        isActive: true,
        balance: true,
        currency: true,
        clientId: true,
      },
    });

    if (!trustAccount) {
      issues.push({ code: 'MISSING_TRUST_ACCOUNT', message: 'Trust account not found.' });
    } else {
      if (!trustAccount.isActive) {
        issues.push({ code: 'INACTIVE_TRUST_ACCOUNT', message: 'Trust account is inactive.' });
      }

      if (input.currency && trustAccount.currency !== input.currency) {
        issues.push({
          code: 'CURRENCY_MISMATCH',
          message: 'Trust transaction currency does not match trust account currency.',
        });
      }

      if (trustAccount.clientId !== input.clientId) {
        issues.push({
          code: 'CLIENT_MISMATCH',
          message: 'Trust account does not belong to the supplied client.',
        });
      }

      if (
        input.transactionType === 'WITHDRAWAL' ||
        input.transactionType === 'TRANSFER_TO_OFFICE'
      ) {
        if (toDecimal(trustAccount.balance).lt(amount)) {
          issues.push({
            code: 'INSUFFICIENT_TRUST_ACCOUNT_BALANCE',
            message: 'Trust account has insufficient balance.',
          });
        }
      }
    }

    const client = await db.client.findFirst({
      where: { tenantId, id: input.clientId },
      select: { id: true },
    });

    if (!client) {
      issues.push({ code: 'CLIENT_MISMATCH', message: 'Client not found for tenant.' });
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

    if (
      (input.transactionType === 'WITHDRAWAL' ||
        input.transactionType === 'TRANSFER_TO_OFFICE') &&
      input.matterId
    ) {
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

      if (input.drnId && db.disbursementRequestNote) {
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

  static async create(req: any, input: TrustTransactionInput) {
    const db = req.db as TenantTrustDbClient & { $transaction: Function };
    const tenantId = req.tenantId as string;
    const actorId = req.user?.sub ?? null;
    const amount = toDecimal(input.amount);

    const validation = await this.validate(db, tenantId, input);
    if (!validation.valid) {
      throw Object.assign(new Error('Trust transaction validation failed'), {
        statusCode: 422,
        code: 'TRUST_TRANSACTION_VALIDATION_FAILED',
        details: validation.issues,
      });
    }

    const delta =
      input.transactionType === 'DEPOSIT' || input.transactionType === 'INTEREST'
        ? amount
        : amount.negated();

    return db.$transaction(async (tx: any) => {
      const trustTx = await tx.trustTransaction.create({
        data: {
          tenantId,
          trustAccountId: input.trustAccountId,
          clientId: input.clientId,
          matterId: input.matterId ?? null,
          transactionDate: input.transactionDate,
          transactionType: input.transactionType,
          amount,
          currency: input.currency ?? 'KES',
          reference: input.reference,
          description: input.description ?? null,
          notes: input.notes ?? null,
          bankTransactionId: input.bankTransactionId ?? null,
          createdById: actorId,
        },
      });

      await tx.trustAccount.update({
        where: { id: input.trustAccountId },
        data: {
          balance: {
            increment: delta,
          },
        },
      });

      await ClientTrustLedgerService.applyDelta(tx, tenantId, {
        trustAccountId: input.trustAccountId,
        clientId: input.clientId,
        matterId: input.matterId ?? null,
        delta,
      });

      const trustBank = await this.resolveAccountId(tx, tenantId, 'TRUST_BANK');
      const trustLiability = await this.resolveAccountId(tx, tenantId, 'TRUST_LIABILITY');

      const trustLines =
        input.transactionType === 'DEPOSIT' || input.transactionType === 'INTEREST'
          ? [
              {
                accountId: trustBank.id,
                debit: amount,
                credit: new Prisma.Decimal(0),
                clientId: input.clientId,
                matterId: input.matterId ?? null,
                reference: input.reference,
                description: input.description ?? null,
              },
              {
                accountId: trustLiability.id,
                debit: new Prisma.Decimal(0),
                credit: amount,
                clientId: input.clientId,
                matterId: input.matterId ?? null,
                reference: input.reference,
                description: input.description ?? null,
              },
            ]
          : [
              {
                accountId: trustLiability.id,
                debit: amount,
                credit: new Prisma.Decimal(0),
                clientId: input.clientId,
                matterId: input.matterId ?? null,
                reference: input.reference,
                description: input.description ?? null,
              },
              {
                accountId: trustBank.id,
                debit: new Prisma.Decimal(0),
                credit: amount,
                clientId: input.clientId,
                matterId: input.matterId ?? null,
                reference: input.reference,
                description: input.description ?? null,
              },
            ];

      await GeneralLedgerService.postJournal(
        { ...req, db: tx },
        {
          reference: `TRUST-${input.reference}`,
          description: input.description ?? `Trust transaction ${input.reference}`,
          date: input.transactionDate,
          currency: input.currency ?? 'KES',
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
        },
      );

      if (input.transactionType === 'TRANSFER_TO_OFFICE') {
        await this.postOfficeSideSettlement(tx, req, tenantId, trustTx.id, input, amount);

        if (input.invoiceId) {
          const invoice = await tx.invoice.findFirst({
            where: { tenantId, id: input.invoiceId },
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
            where: { id: input.invoiceId },
            data: {
              paidAmount: nextPaidAmount,
              status: nextStatus,
            },
          });
        }

        if (input.drnId && tx.disbursementRequestNote?.update) {
          await tx.disbursementRequestNote.update({
            where: { id: input.drnId },
            data: {
              status: 'SETTLED',
            },
          });
        }
      }

      await logAdminAction({
        req: { ...req, db: tx },
        tenantId,
        action:
          input.transactionType === 'DEPOSIT'
            ? 'TRUST_DEPOSIT'
            : input.transactionType === 'WITHDRAWAL'
              ? 'TRUST_WITHDRAWAL'
              : 'TRUST_TRANSFER',
        severity: AuditSeverity.HIGH,
        entityId: trustTx.id,
        payload: {
          reference: input.reference,
          amount: amount.toString(),
          transactionType: input.transactionType,
          trustAccountId: input.trustAccountId,
          clientId: input.clientId,
          matterId: input.matterId ?? null,
          invoiceId: input.invoiceId ?? null,
          drnId: input.drnId ?? null,
          ipAddress: req.ip ?? null,
          userAgent: req.headers?.['user-agent'] ?? null,
        },
      });

      return trustTx;
    });
  }

  private static async postOfficeSideSettlement(
    tx: any,
    req: any,
    tenantId: string,
    trustTransactionId: string,
    input: TrustTransactionInput,
    amount: Prisma.Decimal,
  ) {
    const officeBank = await this.resolveAccountId(tx, tenantId, 'OFFICE_BANK');
    const accountsReceivable = await this.resolveAccountId(tx, tenantId, 'ACCOUNTS_RECEIVABLE');

    await GeneralLedgerService.postJournal(
      { ...req, db: tx },
      {
        reference: `OFFICE-${input.reference}`,
        description: `Trust to office settlement: ${input.description ?? input.reference}`,
        date: input.transactionDate,
        currency: input.currency ?? 'KES',
        exchangeRate: 1,
        sourceModule: 'trust',
        sourceEntityType: 'TrustTransaction',
        sourceEntityId: trustTransactionId,
        lines: [
          {
            accountId: officeBank.id,
            debit: amount,
            credit: new Prisma.Decimal(0),
            clientId: input.clientId,
            matterId: input.matterId ?? null,
            reference: input.reference,
            description: 'Funds received into office bank from trust',
          },
          {
            accountId: accountsReceivable.id,
            debit: new Prisma.Decimal(0),
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
      },
    );
  }

  private static async resolveAccountId(db: any, tenantId: string, subtype: string) {
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