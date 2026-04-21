// apps/api/src/modules/trust/TrustPolicyService.ts

import { Prisma } from '@global-wakili/database';

type DbClient = any;

const ZERO = new Prisma.Decimal(0);

export type TrustPolicyDecision = {
  allowed: boolean;
  code: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  meta?: Record<string, unknown>;
};

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) return ZERO;

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export class TrustPolicyService {
  static async assertNoNegativeMatterBalance(input: {
    db: DbClient;
    tenantId: string;
    clientId: string;
    matterId: string | null;
    trustAccountId: string;
    amount: Prisma.Decimal | string | number;
  }) {
    const amount = money(input.amount);

    if (!input.matterId) {
      throw Object.assign(new Error('Matter is required for trust withdrawal or transfer'), {
        statusCode: 400,
        code: 'TRUST_MATTER_REQUIRED',
      });
    }

    const ledger = await input.db.clientTrustLedger.findFirst({
      where: {
        tenantId: input.tenantId,
        clientId: input.clientId,
        matterId: input.matterId,
        trustAccountId: input.trustAccountId,
      },
      select: {
        balance: true,
      },
    });

    const available = money(ledger?.balance);

    if (available.lt(amount)) {
      throw Object.assign(new Error('Matter-level trust balance is insufficient'), {
        statusCode: 409,
        code: 'INSUFFICIENT_MATTER_TRUST_BALANCE',
        details: {
          available: available.toString(),
          requested: amount.toString(),
        },
      });
    }

    return {
      allowed: true,
      code: 'TRUST_MATTER_BALANCE_OK',
      message: 'Matter-level trust balance is sufficient.',
      severity: 'INFO',
      meta: {
        available: available.toString(),
        requested: amount.toString(),
      },
    } satisfies TrustPolicyDecision;
  }

  static async assertTrustAccountActive(input: {
    db: DbClient;
    tenantId: string;
    trustAccountId: string;
  }) {
    const account = await input.db.trustAccount.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.trustAccountId,
      },
      select: {
        id: true,
        isActive: true,
        balance: true,
      },
    });

    if (!account) {
      throw Object.assign(new Error('Trust account not found'), {
        statusCode: 404,
        code: 'TRUST_ACCOUNT_NOT_FOUND',
      });
    }

    if (!account.isActive) {
      throw Object.assign(new Error('Trust account is inactive'), {
        statusCode: 409,
        code: 'TRUST_ACCOUNT_INACTIVE',
      });
    }

    return account;
  }

  static async assertTransferDoesNotExceedInvoiceDue(input: {
    db: DbClient;
    tenantId: string;
    clientId: string;
    matterId: string;
    invoiceId: string;
    amount: Prisma.Decimal | string | number;
  }) {
    const invoice = await input.db.invoice.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.invoiceId,
        clientId: input.clientId,
        matterId: input.matterId,
      },
      select: {
        id: true,
        total: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
      },
    });

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found for trust settlement'), {
        statusCode: 404,
        code: 'TRUST_SETTLEMENT_INVOICE_NOT_FOUND',
      });
    }

    const total = money(invoice.total ?? invoice.totalAmount);
    const paid = money(invoice.paidAmount);
    const due = total.minus(paid).toDecimalPlaces(2);
    const amount = money(input.amount);

    if (amount.gt(due)) {
      throw Object.assign(new Error('Trust settlement exceeds invoice amount due'), {
        statusCode: 409,
        code: 'TRUST_SETTLEMENT_EXCEEDS_AMOUNT_DUE',
        details: {
          invoiceId: invoice.id,
          total: total.toString(),
          paidAmount: paid.toString(),
          amountDue: due.toString(),
          requested: amount.toString(),
        },
      });
    }

    return {
      invoice,
      amountDue: due,
      allowed: true,
    };
  }

  static async assertNoTrustOfficeCommingling(input: {
    accountPurpose?: string | null;
    targetPurpose?: string | null;
  }) {
    const from = String(input.accountPurpose ?? '').toUpperCase();
    const to = String(input.targetPurpose ?? '').toUpperCase();

    if (from.includes('OFFICE') && to.includes('TRUST')) {
      throw Object.assign(new Error('Office funds cannot be posted as client trust funds without a trust receipt workflow'), {
        statusCode: 409,
        code: 'OFFICE_TO_TRUST_POLICY_VIOLATION',
      });
    }

    return {
      allowed: true,
      code: 'TRUST_OFFICE_SEGREGATION_OK',
      message: 'Trust/office account segregation policy passed.',
      severity: 'INFO',
    } satisfies TrustPolicyDecision;
  }
}

export default TrustPolicyService;