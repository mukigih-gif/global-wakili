import { Prisma } from '@global-wakili/database';
import type { DecimalLike, TenantProcurementDbClient } from './procurement.types';
import { ProcurementPolicyService } from './ProcurementPolicyService';

function toDecimal(value: DecimalLike | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export class VendorPaymentService {
  static async applyPayment(
    db: TenantProcurementDbClient & { $transaction: Function },
    tenantId: string,
    params: {
      vendorBillId: string;
      amount: DecimalLike;
      paymentDate?: Date | null;
      reference?: string | null;
      notes?: string | null;
    },
  ) {
    await ProcurementPolicyService.assertPaymentAllowed(db, tenantId, {
      vendorBillId: params.vendorBillId,
      amount: params.amount,
    });

    return db.$transaction(async (tx: any) => {
      const bill = await tx.vendorBill.findFirst({
        where: {
          tenantId,
          id: params.vendorBillId,
        },
        select: {
          id: true,
          total: true,
          paidAmount: true,
          status: true,
          vendorId: true,
          currency: true,
          billNumber: true,
        },
      });

      if (!bill) {
        throw Object.assign(new Error('Vendor bill not found'), {
          statusCode: 404,
          code: 'MISSING_BILL',
        });
      }

      const paymentAmount = toDecimal(params.amount);
      const nextPaidAmount = toDecimal(bill.paidAmount).plus(paymentAmount);
      const total = toDecimal(bill.total);

      const nextStatus =
        nextPaidAmount.gte(total) ? 'PAID' : 'PARTIALLY_PAID';

      const updatedBill = await tx.vendorBill.update({
        where: { id: bill.id },
        data: {
          paidAmount: nextPaidAmount,
          status: nextStatus,
          paidDate: nextStatus === 'PAID' ? params.paymentDate ?? new Date() : undefined,
        },
      });

      if (tx.vendorPayment?.create) {
        await tx.vendorPayment.create({
          data: {
            tenantId,
            vendorBillId: bill.id,
            vendorId: bill.vendorId,
            amount: paymentAmount,
            currency: bill.currency,
            paymentDate: params.paymentDate ?? new Date(),
            reference: params.reference ?? null,
            notes: params.notes ?? null,
          },
        });
      }

      return updatedBill;
    });
  }
}