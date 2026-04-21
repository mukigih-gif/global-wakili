// apps/api/src/modules/payments/payment.service.ts

import {
  PaymentReceiptStatus,
  prisma,
} from '@global-wakili/database';

import {
  type AllocatePaymentInput,
  type CreatePaymentReceiptInput,
  type ListPaymentReceiptsInput,
  type PaymentReceiptWithRelations,
  type ReversePaymentReceiptInput,
} from './payment.types';
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

export class PaymentService {
  constructor(
    private readonly receipts: PaymentReceiptService = paymentReceiptService,
    private readonly allocations: PaymentAllocationService = paymentAllocationService,
    private readonly posting: PaymentPostingService = paymentPostingService,
  ) {}

  listReceipts(input: ListPaymentReceiptsInput): Promise<PaymentReceiptWithRelations[]> {
    return this.receipts.listReceipts(input);
  }

  getReceiptById(
    tenantId: string,
    paymentReceiptId: string,
  ): Promise<PaymentReceiptWithRelations> {
    return this.receipts.getReceiptById(tenantId, paymentReceiptId);
  }

  async createPaymentReceipt(input: CreatePaymentReceiptInput): Promise<PaymentReceiptWithRelations> {
    const created = await prisma.$transaction(async (tx) => {
      const receipt = await this.receipts.createReceipt(tx, input);

      if (input.allocations?.length) {
        await this.allocations.allocateWithinTransaction(tx, {
          tenantId: input.tenantId,
          paymentReceiptId: receipt.id,
          allocations: input.allocations,
          allocatedById: input.createdById,
        });
      }

      await this.posting.postReceipt(tx, {
        tenantId: input.tenantId,
        paymentReceiptId: receipt.id,
        postedById: input.createdById,
      });

      return receipt;
    });

    return this.receipts.getReceiptById(input.tenantId, created.id);
  }

  async allocatePayment(input: AllocatePaymentInput) {
    return this.allocations.allocate(input);
  }

  async reversePaymentReceipt(input: ReversePaymentReceiptInput): Promise<PaymentReceiptWithRelations> {
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

      await this.allocations.reverseAllocationsForReceipt(tx, {
        tenantId: input.tenantId,
        paymentReceiptId: input.paymentReceiptId,
        reversedById: input.reversedById,
        reason: input.reason,
      });

      await this.posting.reverseReceiptPosting(tx, {
        tenantId: input.tenantId,
        paymentReceiptId: input.paymentReceiptId,
        reason: input.reason,
        reversedById: input.reversedById,
        reversalDate: new Date(),
      });

      await this.receipts.markReversed(tx, input);
    });

    return this.receipts.getReceiptById(input.tenantId, input.paymentReceiptId);
  }
}

export const paymentService = new PaymentService();

export default PaymentService;