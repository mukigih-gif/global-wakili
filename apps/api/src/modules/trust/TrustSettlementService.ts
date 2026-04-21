// apps/api/src/modules/trust/TrustSettlementService.ts

import { Prisma } from '@global-wakili/database';
import { TrustTransferService } from './TrustTransferService';
import { TrustPolicyService } from './TrustPolicyService';

const ZERO = new Prisma.Decimal(0);

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  const parsed = new Prisma.Decimal(value as any);
  return parsed.isFinite() ? parsed.toDecimalPlaces(2) : ZERO;
}

export class TrustSettlementService {
  static async settleInvoiceFromTrust(req: any, input: {
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
      tenantId: req.tenantId,
      trustAccountId: input.trustAccountId,
    });

    await TrustPolicyService.assertNoNegativeMatterBalance({
      db: req.db,
      tenantId: req.tenantId,
      clientId: input.clientId,
      matterId: input.matterId,
      trustAccountId: input.trustAccountId,
      amount,
    });

    await TrustPolicyService.assertTransferDoesNotExceedInvoiceDue({
      db: req.db,
      tenantId: req.tenantId,
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

  static async settleDrnFromTrust(req: any, input: {
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
      tenantId: req.tenantId,
      trustAccountId: input.trustAccountId,
    });

    await TrustPolicyService.assertNoNegativeMatterBalance({
      db: req.db,
      tenantId: req.tenantId,
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