// apps/api/src/modules/payments/payment-reversal.service.ts

import {
  PaymentReceiptStatus,
  prisma,
} from '@global-wakili/database';

import {
  PaymentAllocationService,
  paymentAllocationService,
} from './payment-allocation.service';
import {
  PaymentPostingService,
  paymentPostingService,
} from './payment-posting.service';
import {
  PaymentReceiptService,
  paymentReceiptService,
} from './payment-receipt.service';
import type { PaymentReceiptWithRelations, ReversePaymentReceiptInput } from './payment.types';

export class PaymentReversalService {
  constructor(
    private readonly allocations: PaymentAllocationService = paymentAllocationService,
    private readonly posting: PaymentPostingService = paymentPostingService,
    private readonly receipts: PaymentReceiptService = paymentReceiptService,
  ) {}

  async reversePaymentReceipt(
    input: ReversePaymentReceiptInput,
  ): Promise<PaymentReceiptWithRelations> {
    await prisma.$transaction(async (tx) => {
      const receipt = await tx.paymentReceipt.findFirst({
        where: {
          id: input.paymentReceiptId,
          tenantId: input.tenantId,
        },
        include: {
          allocations: true,
        },
      });

      if (!receipt) {
        throw new Error('Payment receipt not found.');
      }

      if (receipt.status === PaymentReceiptStatus.REVERSED) {
        throw new Error('Payment receipt is already reversed.');
      }

      const isBankReconciled = await tx.journalEntry.findFirst({
        where: {
          tenantId: input.tenantId,
          sourceModule: 'PAYMENTS',
          sourceEntityType: 'PAYMENT_RECEIPT',
          sourceEntityId: receipt.id,
          isReconciled: true,
        },
        select: {
          id: true,
        },
      });

      if (isBankReconciled) {
        throw new Error('Bank-reconciled receipts cannot be reversed directly.');
      }

      await this.allocations.reverseAllocationsForReceipt(tx, {
        tenantId: input.tenantId,
        paymentReceiptId: receipt.id,
        reversedById: input.reversedById,
        reason: input.reason,
      });

      await this.posting.reverseReceiptPosting(tx, {
        tenantId: input.tenantId,
        paymentReceiptId: receipt.id,
        reason: input.reason,
        reversedById: input.reversedById,
        reversalDate: new Date(),
      });

      await this.receipts.markReversed(tx, {
        tenantId: input.tenantId,
        paymentReceiptId: receipt.id,
        reversedById: input.reversedById,
        reason: input.reason,
      });
    });

    return this.receipts.getReceiptById(input.tenantId, input.paymentReceiptId);
  }

  async canReverse(input: {
    tenantId: string;
    paymentReceiptId: string;
  }) {
    const receipt = await prisma.paymentReceipt.findFirst({
      where: {
        id: input.paymentReceiptId,
        tenantId: input.tenantId,
      },
      include: {
        allocations: true,
      },
    });

    if (!receipt) {
      return {
        canReverse: false,
        reason: 'Payment receipt not found.',
      };
    }

    if (receipt.status === PaymentReceiptStatus.REVERSED) {
      return {
        canReverse: false,
        reason: 'Payment receipt is already reversed.',
      };
    }

    const reconciledJournal = await prisma.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_RECEIPT',
        sourceEntityId: receipt.id,
        isReconciled: true,
      },
      select: {
        id: true,
      },
    });

    if (reconciledJournal) {
      return {
        canReverse: false,
        reason: 'Receipt has already been bank-reconciled.',
      };
    }

    return {
      canReverse: true,
      reason: null,
      allocationCount: receipt.allocations.length,
      amount: receipt.amount,
      unallocatedAmount: receipt.unallocatedAmount,
    };
  }
}

export const paymentReversalService = new PaymentReversalService();

export default PaymentReversalService;