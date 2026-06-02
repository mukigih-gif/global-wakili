// apps/api/src/modules/trust/TrustPolicyService.ts

import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { detectCommingling } from '../../utils/trust-commingling';

type TrustDbClient = Request['db'];

const ZERO = new Prisma.Decimal(0);

export type TrustPolicyDecision = {
  allowed: boolean;
  code: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  meta?: Record<string, unknown>;
};

function money(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  return value instanceof Prisma.Decimal
    ? value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    : new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function requireTrustAccountId(trustAccountId?: string | null): string {
  if (!trustAccountId?.trim()) {
    throw Object.assign(new Error('Trust account context is required for trust policy checks'), {
      statusCode: 400,
      code: 'TRUST_ACCOUNT_BOUNDARY_REQUIRED',
    });
  }

  return trustAccountId.trim();
}

export class TrustPolicyService {
  static async assertNoNegativeMatterBalance(input: {
    db: TrustDbClient;
    tenantId: string;
    clientId: string;
    matterId: string | null;
    trustAccountId: string;
    amount: Prisma.Decimal | string | number;
  }) {
    const amount = money(input.amount);
    const trustAccountId = requireTrustAccountId(input.trustAccountId);

    if (!input.matterId) {
      throw Object.assign(new Error('Matter is required for trust withdrawal or transfer'), {
        statusCode: 400,
        code: 'TRUST_MATTER_REQUIRED',
      });
    }

    const ledger = await input.db.clientTrustLedger.aggregate({
      where: {
        tenantId: input.tenantId,
        trustAccountId,
        clientId: input.clientId,
        matterId: input.matterId,
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const available = money(ledger._sum.credit).minus(money(ledger._sum.debit));

    if (available.lt(amount)) {
      throw Object.assign(new Error('Matter-level trust balance is insufficient'), {
        statusCode: 409,
        code: 'INSUFFICIENT_MATTER_TRUST_BALANCE',
        details: {
          trustAccountId,
          clientId: input.clientId,
          matterId: input.matterId,
          available: available.toString(),
          requested: amount.toString(),
          scope: 'TRUST_ACCOUNT_LEVEL',
        },
      });
    }

    return {
      allowed: true,
      code: 'TRUST_MATTER_BALANCE_OK',
      message: 'Matter-level trust balance is sufficient within the scoped trust account.',
      severity: 'INFO',
      meta: {
        trustAccountId,
        clientId: input.clientId,
        matterId: input.matterId,
        available: available.toString(),
        requested: amount.toString(),
        scope: 'TRUST_ACCOUNT_LEVEL',
      },
    } satisfies TrustPolicyDecision;
  }

  static async assertTrustAccountActive(input: {
    db: TrustDbClient;
    tenantId: string;
    trustAccountId: string;
  }) {
    const trustAccountId = requireTrustAccountId(input.trustAccountId);

    const account = await input.db.trustAccount.findFirst({
      where: {
        tenantId: input.tenantId,
        id: trustAccountId,
      },
      select: {
        id: true,
        isActive: true,
        currentBalance: true,
        reconciliationBalance: true,
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
    db: TrustDbClient;
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
        balanceDue: true,
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

    const total = money(invoice.total);
    const paid = money(invoice.paidAmount);
    const due = money(invoice.balanceDue);
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
    const result = detectCommingling(input.accountPurpose, input.targetPurpose);

    if (result.isCommingling) {
      throw Object.assign(new Error(result.reason ?? 'Trust/office commingling policy violation'), {
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