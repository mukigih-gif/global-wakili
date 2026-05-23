import type { Request } from 'express';
import { TrustTransactionType } from '@global-wakili/database';
import type { TrustTransactionInput, TrustTransferInput } from './trust.types';
import { TrustTransactionService } from './TrustTransactionService';

type TrustTransferRequest = Request & {
  tenantId?: string | null;
};

function requireTenantId(req: TrustTransferRequest): string {
  if (!req.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant context is required for trust transfer operations'), {
      statusCode: 401,
      code: 'TENANT_BOUNDARY_REQUIRED',
    });
  }

  return req.tenantId.trim();
}

function requireNonEmpty(value: string | null | undefined, fieldName: string): string {
  if (!value?.trim()) {
    throw Object.assign(new Error(`${fieldName} is required for trust transfer operations`), {
      statusCode: 400,
      code: 'TRUST_TRANSFER_BOUNDARY_REQUIRED',
      details: { fieldName },
    });
  }

  return value.trim();
}

function normalizeOptional(value: string | null | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

function normalizeTransactionDate(value: Date | string | null | undefined): Date {
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  throw Object.assign(new Error('transactionDate is required and must be valid for trust transfer'), {
    statusCode: 400,
    code: 'INVALID_DATE',
    details: { fieldName: 'transactionDate' },
  });
}

function buildDescription(input: TrustTransferInput): string {
  return (
    input.description?.trim() ||
    `Trust to office transfer ${input.reference}`
  );
}

export class TrustTransferService {
  static async transferToOffice(req: Request, input: TrustTransferInput) {
    requireTenantId(req as TrustTransferRequest);

    const trustAccountId = requireNonEmpty(input.trustAccountId, 'trustAccountId');
    const clientId = requireNonEmpty(input.clientId, 'clientId');
    const matterId = requireNonEmpty(input.matterId, 'matterId');
    const reference = requireNonEmpty(input.reference, 'reference');
    const transactionDate = normalizeTransactionDate(input.transactionDate);

    const transactionInput: TrustTransactionInput = {
      trustAccountId,
      clientId,
      matterId,
      bankTransactionId: normalizeOptional(input.bankTransactionId),
      transactionType: TrustTransactionType.TRANSFER_TO_OFFICE,
      amount: input.amount,
      reference,
      description: buildDescription(input),
      notes: input.notes ?? null,
      currency: input.currency ?? null,
      transactionDate,
      invoiceId: normalizeOptional(input.invoiceId),
      drnId: normalizeOptional(input.drnId ?? input.disbursementId),
    };

    return TrustTransactionService.create(req, transactionInput);
  }
}