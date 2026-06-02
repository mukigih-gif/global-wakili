// apps/api/src/modules/finance/paymentservice.ts

import { Prisma } from '@global-wakili/database';
import { TransactionEngine } from './transaction-engine';

type PaymentProviderInitiationResult = {
  provider: string;
  checkoutRequestId?: string | null;
  merchantRequestId?: string | null;
  paymentReference?: string | null;
  status: 'PENDING' | 'QUEUED' | 'FAILED' | 'SUCCESS';
  rawResponse?: Record<string, unknown> | null;
};

type PaymentProvider = {
  initiateStkPush: (params: {
    tenantId: string;
    invoiceId: string;
    invoiceNumber: string;
    clientId: string | null;
    matterId: string | null;
    phone: string;
    amount: Prisma.Decimal;
    currency: string;
    description: string;
    initiatedById?: string | null;
    source: 'CLIENT_PORTAL' | 'BACK_OFFICE';
    metadata?: Record<string, unknown>;
  }) => Promise<PaymentProviderInitiationResult>;
};

type PaymentServiceContext = {
  tenantId: string;
  req: {
    db: any;
    app?: {
      locals?: {
        paymentProvider?: PaymentProvider;
        paymentsProvider?: PaymentProvider;
      };
    };
  };
  actor?: {
    id?: string | null;
  } | null;
  user?: {
    id?: string | null;
  } | null;
  portal?: {
    clientId?: string | null;
    userId?: string | null;
  } | null;
  paymentProvider?: PaymentProvider;
};

type InitiateStkPushParams = {
  invoiceId: string;
  phone: string;
  amount: number | string | Prisma.Decimal;
  source?: 'CLIENT_PORTAL' | 'BACK_OFFICE';
  clientId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type MpesaCallbackPayload = {
  Body?: {
    stkCallback?: {
      ResultCode?: number;
      CheckoutRequestID?: string;
      CallbackMetadata?: {
        Item?: Array<{
          Name: string;
          Value?: string | number;
        }>;
      };
    };
  };
  TransAmount?: string | number;
  TransID?: string;
  BillRefNumber?: string;
};

type PaymentPostingAccountRow = {
  id: string;
  subtype: string | null;
};

type PaymentInvoiceRecord = {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  total: Prisma.Decimal | number | string;
  paidAmount: Prisma.Decimal | number | string | null;
  balanceDue: Prisma.Decimal | number | string | null;
  paidDate: Date | null;
  matterId: string | null;
  clientId: string | null;
  branchId: string | null;
};

type FinancePaymentTransactionClient = {
  invoice: {
    findUnique: (args: unknown) => Promise<PaymentInvoiceRecord | null>;
    update: (args: unknown) => Promise<unknown>;
  };
  journalEntry: {
    findUnique: (args: unknown) => Promise<{ id: string } | null>;
    create: (args: unknown) => Promise<{ id: string }>;
  };
  chartOfAccount: {
    findMany: (args: unknown) => Promise<PaymentPostingAccountRow[]>;
  };
};

type FinancePaymentDbClient = FinancePaymentTransactionClient & {
  $transaction: <T>(callback: (tx: FinancePaymentTransactionClient) => Promise<T>) => Promise<T>;
};

type TransactionEngineBridgeClient = FinancePaymentTransactionClient & {
  $transaction: <T>(callback: (tx: FinancePaymentTransactionClient) => Promise<T>) => Promise<T>;
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

function nullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return null;
  }

  return trimmed;
}

function toDecimal(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(value);
}

function getStkCallbackItem(payload: MpesaCallbackPayload, name: string): string | number | null {
  const items = payload.Body?.stkCallback?.CallbackMetadata?.Item ?? [];

  return items.find((item) => item.Name === name)?.Value ?? null;
}

function resolvePaymentProvider(context: PaymentServiceContext): PaymentProvider | null {
  return (
    context.paymentProvider ??
    context.req.app?.locals?.paymentProvider ??
    context.req.app?.locals?.paymentsProvider ??
    null
  );
}

function resolveInitiatedById(context: PaymentServiceContext): string | null {
  return (
    context.actor?.id ??
    context.user?.id ??
    context.portal?.userId ??
    null
  );
}

/**
 * Legacy Finance payment compatibility service.
 *
 * Portal payment safety:
 * - Client portal can initiate payment only for its own invoice.
 * - Back-office can initiate payment for tenant invoices.
 * - Actual STK/provider initiation is delegated to Payments/Integrations.
 * - If no provider is configured, the service fails closed with 501.
 *
 * GL posting safety:
 * - Successful callbacks are idempotency-checked by JournalEntry tenant/reference.
 * - Payment posts through TransactionEngine.postJournalAtomically.
 * - Invoice paidAmount, balanceDue, paidDate, and status are updated after posting.
 */
export class PaymentService {
  static async initiateStkPush(
    context: PaymentServiceContext,
    params: InitiateStkPushParams,
  ) {
    const tenantId = requiredString(
      context.tenantId,
      'Tenant ID',
      'FINANCE_PAYMENT_TENANT_REQUIRED',
    );

    const invoiceId = requiredString(
      params.invoiceId,
      'Invoice ID',
      'FINANCE_PAYMENT_INVOICE_REQUIRED',
    );

    const phone = requiredString(
      params.phone,
      'Phone number',
      'FINANCE_PAYMENT_PHONE_REQUIRED',
    );

    const amount = toDecimal(params.amount);
    const source = params.source ?? (context.portal?.clientId ? 'CLIENT_PORTAL' : 'BACK_OFFICE');

    if (amount.lte(0)) {
      throw Object.assign(new Error('Payment amount must be greater than zero'), {
        statusCode: 422,
        code: 'FINANCE_PAYMENT_AMOUNT_INVALID',
      });
    }

    const invoice = await context.req.db.invoice.findFirst({
      where: {
        tenantId,
        id: invoiceId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        paidAmount: true,
        balanceDue: true,
        currency: true,
        clientId: true,
        matterId: true,
      },
    });

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), {
        statusCode: 404,
        code: 'FINANCE_PAYMENT_INVOICE_NOT_FOUND',
      });
    }

    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      throw Object.assign(new Error('Invoice is not payable'), {
        statusCode: 409,
        code: 'FINANCE_PAYMENT_INVOICE_NOT_PAYABLE',
        details: {
          invoiceId: invoice.id,
          status: invoice.status,
        },
      });
    }

    const portalClientId = nullableString(context.portal?.clientId ?? params.clientId);

    if (source === 'CLIENT_PORTAL') {
      if (!portalClientId) {
        throw Object.assign(
          new Error('Portal client context is required for client invoice payment'),
          {
            statusCode: 403,
            code: 'FINANCE_PORTAL_CLIENT_CONTEXT_REQUIRED',
          },
        );
      }

      if (invoice.clientId !== portalClientId) {
        throw Object.assign(
          new Error('Client portal cannot pay an invoice belonging to another client'),
          {
            statusCode: 403,
            code: 'FINANCE_PORTAL_INVOICE_CLIENT_MISMATCH',
            details: {
              invoiceId: invoice.id,
            },
          },
        );
      }
    }

    const balanceDue = toDecimal(invoice.balanceDue);

    if (amount.gt(balanceDue)) {
      throw Object.assign(new Error('Payment amount exceeds invoice balance due'), {
        statusCode: 422,
        code: 'FINANCE_PAYMENT_EXCEEDS_BALANCE',
        details: {
          invoiceId: invoice.id,
          requestedAmount: amount.toFixed(2),
          balanceDue: balanceDue.toFixed(2),
        },
      });
    }

    const provider = resolvePaymentProvider(context);

    if (!provider?.initiateStkPush) {
      throw Object.assign(
        new Error('Payment provider is not configured; client portal payment initiation is unavailable'),
        {
          statusCode: 501,
          code: 'FINANCE_PAYMENT_PROVIDER_NOT_CONFIGURED',
          details: {
            tenantId,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            source,
            expectedOwner: 'Payments/Integrations module',
          },
        },
      );
    }

    return provider.initiateStkPush({
      tenantId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId ?? null,
      matterId: invoice.matterId ?? null,
      phone,
      amount,
      currency: invoice.currency ?? 'KES',
      description: `Invoice payment for ${invoice.invoiceNumber}`,
      initiatedById: resolveInitiatedById(context),
      source,
      metadata: {
        sourceModule: 'FINANCE',
        compatibilityService: 'paymentservice',
        ...(params.metadata ?? {}),
      },
    });
  }

  static async processMpesaCallback(payload: MpesaCallbackPayload, globalDb: FinancePaymentDbClient) {
    const isStk = payload.Body?.stkCallback;

    if (isStk && isStk.ResultCode !== 0) {
      return {
        status: 'PAYMENT_FAILED',
        checkoutRequestId: isStk.CheckoutRequestID ?? null,
      };
    }

    const amount = isStk ? getStkCallbackItem(payload, 'Amount') : payload.TransAmount;
    const mpesaCode = isStk
      ? nullableString(getStkCallbackItem(payload, 'MpesaReceiptNumber'))
      : nullableString(payload.TransID);

    const invoiceNo = nullableString(payload.BillRefNumber);

    if (!invoiceNo || !mpesaCode) {
      throw Object.assign(new Error('Malformed M-Pesa payload'), {
        statusCode: 422,
        code: 'FINANCE_MPESA_PAYLOAD_INVALID',
      });
    }

    const paymentAmount = toDecimal(amount);

    if (paymentAmount.lte(0)) {
      throw Object.assign(new Error('M-Pesa payment amount must be greater than zero'), {
        statusCode: 422,
        code: 'FINANCE_MPESA_AMOUNT_INVALID',
      });
    }

    return globalDb.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: {
          invoiceNumber: invoiceNo,
        },
        include: {
          matter: true,
          tenant: true,
        },
      });

      if (!invoice) {
        throw Object.assign(new Error(`Invoice ${invoiceNo} not found in system`), {
          statusCode: 404,
          code: 'FINANCE_MPESA_INVOICE_NOT_FOUND',
        });
      }

      const existingJournal = await tx.journalEntry.findUnique({
        where: {
          tenantId_reference: {
            tenantId: invoice.tenantId,
            reference: mpesaCode,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingJournal) {
        return {
          status: 'ALREADY_PROCESSED',
          mpesaCode,
          invoiceId: invoice.id,
        };
      }

      const accountMap = await resolvePaymentAccounts(tx, invoice.tenantId);

      await TransactionEngine.postJournalAtomically(
        {
          ...globalDb,
          ...tx,
          $transaction: async <T>(callback: (innerTx: FinancePaymentTransactionClient) => Promise<T>): Promise<T> => callback(tx),
        },
        invoice.tenantId,
        {
          date: new Date(),
          reference: mpesaCode,
          description: `M-Pesa payment for ${invoice.invoiceNumber}`,
          sourceModule: 'FINANCE',
          sourceEntityType: 'MPESA_CALLBACK',
          sourceEntityId: invoice.id,
          lines: [
            {
              accountId: accountMap.officeBankAccountId,
              debit: paymentAmount,
              credit: new Prisma.Decimal(0),
              matterId: invoice.matterId,
              clientId: invoice.clientId ?? null,
              branchId: invoice.branchId ?? null,
              description: 'Office bank receipt',
            },
            {
              accountId: accountMap.accountsReceivableAccountId,
              debit: new Prisma.Decimal(0),
              credit: paymentAmount,
              matterId: invoice.matterId,
              clientId: invoice.clientId ?? null,
              branchId: invoice.branchId ?? null,
              description: 'Accounts receivable settlement',
            },
          ],
        },
        {},
        undefined,
      );

      const newPaidAmount = toDecimal(invoice.paidAmount).plus(paymentAmount);
      const invoiceTotal = toDecimal(invoice.total);
      const balanceDue = Prisma.Decimal.max(
        invoiceTotal.minus(newPaidAmount),
        new Prisma.Decimal(0),
      );

      const newStatus = newPaidAmount.gte(invoiceTotal) ? 'PAID' : 'PARTIALLY_PAID';

      await tx.invoice.update({
        where: {
          id: invoice.id,
          tenantId: invoice.tenantId,
        },
        data: {
          paidAmount: newPaidAmount,
          balanceDue,
          status: newStatus,
          paidDate: newStatus === 'PAID' ? new Date() : invoice.paidDate ?? null,
        },
      });

      return {
        status: 'SUCCESS',
        mpesaCode,
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        amount: paymentAmount,
      };
    });
  }
}

async function resolvePaymentAccounts(
  tx: FinancePaymentTransactionClient,
  tenantId: string,
): Promise<{
  officeBankAccountId: string;
  accountsReceivableAccountId: string;
}> {
  const accounts = await tx.chartOfAccount.findMany({
    where: {
      tenantId,
      isSystem: true,
      subtype: {
        in: ['OFFICE_BANK', 'ACCOUNTS_RECEIVABLE'],
      },
    },
    select: {
      id: true,
      subtype: true,
    },
  });

  const officeBankAccountId = accounts.find(
    (account: { id: string; subtype: string | null }) => account.subtype === 'OFFICE_BANK',
  )?.id;

  const accountsReceivableAccountId = accounts.find(
    (account: { id: string; subtype: string | null }) =>
      account.subtype === 'ACCOUNTS_RECEIVABLE',
  )?.id;

  if (!officeBankAccountId || !accountsReceivableAccountId) {
    throw Object.assign(new Error('Required payment posting accounts are missing'), {
      statusCode: 500,
      code: 'FINANCE_PAYMENT_POSTING_ACCOUNTS_MISSING',
      details: {
        requiredSubtypes: ['OFFICE_BANK', 'ACCOUNTS_RECEIVABLE'],
      },
    });
  }

  return {
    officeBankAccountId,
    accountsReceivableAccountId,
  };
}

export default PaymentService;