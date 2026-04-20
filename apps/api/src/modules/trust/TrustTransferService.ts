import { Prisma } from '@global-wakili/database';
import type { TrustTransferInput } from './trust.types';
import { TrustTransactionService } from './TrustTransactionService';

function toDecimal(value: Prisma.Decimal | string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export class TrustTransferService {
  static async transferToOffice(req: any, input: TrustTransferInput) {
    const db = req.db;
    const tenantId = req.tenantId as string;

    if (!input.matterId) {
      throw Object.assign(new Error('Matter is required for trust transfer to office'), {
        statusCode: 400,
        code: 'MATTER_REQUIRED',
      });
    }

    if (input.invoiceId) {
      const invoice = await db.invoice.findFirst({
        where: {
          tenantId,
          id: input.invoiceId,
          clientId: input.clientId,
          matterId: input.matterId,
        },
        select: {
          id: true,
          total: true,
          paidAmount: true,
          status: true,
        },
      });

      if (!invoice) {
        throw Object.assign(new Error('Invoice not found for trust transfer'), {
          statusCode: 404,
          code: 'INVOICE_NOT_FOUND',
        });
      }

      const requested = toDecimal(input.amount);
      const amountDue = toDecimal(invoice.total).minus(toDecimal(invoice.paidAmount));

      if (requested.gt(amountDue)) {
        throw Object.assign(new Error('Transfer amount exceeds invoice amount due'), {
          statusCode: 409,
          code: 'TRANSFER_EXCEEDS_AMOUNT_DUE',
          details: {
            total: toDecimal(invoice.total).toString(),
            paidAmount: toDecimal(invoice.paidAmount).toString(),
            amountDue: amountDue.toString(),
            requested: requested.toString(),
          },
        });
      }
    }

    if (input.drnId && db.disbursementRequestNote) {
      const drn = await db.disbursementRequestNote.findFirst({
        where: {
          tenantId,
          id: input.drnId,
          clientId: input.clientId,
          matterId: input.matterId,
        },
        select: {
          id: true,
          amount: true,
          status: true,
        },
      });

      if (!drn) {
        throw Object.assign(new Error('Disbursement Request Note not found'), {
          statusCode: 404,
          code: 'DRN_NOT_FOUND',
        });
      }

      const requested = toDecimal(input.amount);
      const drnAmount = toDecimal(drn.amount);

      if (requested.gt(drnAmount)) {
        throw Object.assign(new Error('Transfer amount exceeds DRN amount'), {
          statusCode: 409,
          code: 'TRANSFER_EXCEEDS_DRN_AMOUNT',
          details: {
            drnAmount: drnAmount.toString(),
            requested: requested.toString(),
          },
        });
      }
    }

    return TrustTransactionService.create(req, {
      trustAccountId: input.trustAccountId,
      clientId: input.clientId,
      matterId: input.matterId,
      transactionDate: input.transactionDate,
      transactionType: 'TRANSFER_TO_OFFICE',
      amount: input.amount,
      currency: 'KES',
      reference: input.reference,
      description: input.description,
      notes: input.disbursementId
        ? `Disbursement reference: ${input.disbursementId}`
        : input.invoiceId
          ? `Invoice reference: ${input.invoiceId}`
          : input.drnId
            ? `DRN reference: ${input.drnId}`
            : null,
      invoiceId: input.invoiceId ?? null,
      drnId: input.drnId ?? null,
    });
  }
}