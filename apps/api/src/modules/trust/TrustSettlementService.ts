// apps/api/src/modules/trust/TrustSettlementService.ts

import { Prisma } from '@global-wakili/database';
import type { Request } from 'express';
import { TrustTransferService } from './TrustTransferService';
import { TrustPolicyService } from './TrustPolicyService';
import { TrustAccountService } from './TrustAccountService';

const ZERO = new Prisma.Decimal(0);

function money(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  return value instanceof Prisma.Decimal
    ? value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    : new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export class TrustSettlementService {
  static async settleInvoiceFromTrust(req: Request, input: {
    trustAccountId: string;
    clientId: string;
    matterId: string;
    invoiceId: string;
    amount: Prisma.Decimal | string | number;
    reference: string;
    description?: string | null;
    transactionDate?: Date;
  }) {
    const amount = money(input.amount);

    await TrustPolicyService.assertTrustAccountActive({
      db: req.db,
      tenantId: req.tenantId!,
      trustAccountId: input.trustAccountId,
    });

    // Account-level balance guard: fail fast before transaction, defense-in-depth
    // (TrustTransactionService.validate() also checks this inside the transaction)
    await TrustAccountService.assertSufficientBalance(req, {
      trustAccountId: input.trustAccountId,
      amount,
    });

    await TrustPolicyService.assertNoNegativeMatterBalance({
      db: req.db,
      tenantId: req.tenantId!,
      clientId: input.clientId,
      matterId: input.matterId,
      trustAccountId: input.trustAccountId,
      amount,
    });

    await TrustPolicyService.assertTransferDoesNotExceedInvoiceDue({
      db: req.db,
      tenantId: req.tenantId!,
      clientId: input.clientId,
      matterId: input.matterId,
      invoiceId: input.invoiceId,
      amount,
    });

    return TrustTransferService.transferToOffice(req, {
      trustAccountId: input.trustAccountId,
      clientId: input.clientId,
      matterId: input.matterId,
      amount,
      reference: input.reference,
      description: input.description ?? `Trust settlement for invoice ${input.invoiceId}`,
      transactionDate: input.transactionDate ?? new Date(),
      invoiceId: input.invoiceId,
    });
  }

  static async settleDrnFromTrust(req: Request, input: {
    trustAccountId: string;
    clientId: string;
    matterId: string;
    drnId: string;
    amount: Prisma.Decimal | string | number;
    reference: string;
    description?: string | null;
    transactionDate?: Date;
  }) {
    const amount = money(input.amount);

    await TrustPolicyService.assertTrustAccountActive({
      db: req.db,
      tenantId: req.tenantId!,
      trustAccountId: input.trustAccountId,
    });

    // Account-level balance guard: fail fast before transaction
    await TrustAccountService.assertSufficientBalance(req, {
      trustAccountId: input.trustAccountId,
      amount,
    });

    await TrustPolicyService.assertNoNegativeMatterBalance({
      db: req.db,
      tenantId: req.tenantId!,
      clientId: input.clientId,
      matterId: input.matterId,
      trustAccountId: input.trustAccountId,
      amount,
    });

    return TrustTransferService.transferToOffice(req, {
      trustAccountId: input.trustAccountId,
      clientId: input.clientId,
      matterId: input.matterId,
      amount,
      reference: input.reference,
      description: input.description ?? `Trust settlement for DRN ${input.drnId}`,
      transactionDate: input.transactionDate ?? new Date(),
      drnId: input.drnId,
    });
  }
}

export default TrustSettlementService;