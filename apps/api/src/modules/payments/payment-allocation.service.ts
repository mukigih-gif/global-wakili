// apps/api/src/modules/payments/payment-allocation.service.ts

import {
  InvoiceStatus,
  PaymentReceiptStatus,
  Prisma,
  prisma,
} from '@global-wakili/database';

import {
  PAYMENT_DEFAULTS,
  type AllocatePaymentInput,
  type PaymentAllocationInput,
  type PaymentAllocationResult,
} from './payment.types';
import {
  PaymentPostingService,
  paymentPostingService,
} from './payment-posting.service';

type TransactionClient = Prisma.TransactionClient;

export class PaymentAllocationService {
  constructor(
    private readonly posting: PaymentPostingService = paymentPostingService,
  ) {}

  async allocate(input: AllocatePaymentInput): Promise<PaymentAllocationResult> {
    return prisma.$transaction(async (tx) => {
      return this.allocateWithinTransaction(tx, input);
    });
  }

  async allocateWithinTransaction(
    tx: TransactionClient,
    input: AllocatePaymentInput,
  ): Promise<PaymentAllocationResult> {
    if (input.allocations.length === 0) {
      throw new Error('At least one allocation is required.');
    }

    if (input.allocations.length > PAYMENT_DEFAULTS.maxAllocationsPerReceipt) {
      throw new Error(
        `A payment receipt cannot exceed ${PAYMENT_DEFAULTS.maxAllocationsPerReceipt} allocations.`,
      );
    }

    for (const allocation of input.allocations) {
      if ((allocation.allocationType ?? 'CASH') === 'WHT_CERTIFICATE') {
        throw new Error(
          'WHT certificate clearing must use WithholdingTaxCertificateService, not cash payment allocation.',
        );
      }
    }

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
      throw new Error('Reversed payment receipts cannot be allocated.');
    }

    const existingAllocated = receipt.allocations.reduce(
      (sum, allocation) => sum.plus(allocation.amountApplied),
      new Prisma.Decimal(0),
    );

    const requestedAllocated = this.totalRequestedAllocation(input.allocations);
    const totalAfterAllocation = existingAllocated.plus(requestedAllocated);

    if (totalAfterAllocation.gt(receipt.amount)) {
      throw new Error('Payment allocations cannot exceed receipt amount.');
    }

    const invoiceIds = Array.from(new Set(input.allocations.map((allocation) => allocation.invoiceId)));

    const invoices = await tx.invoice.findMany({
      where: {
        tenantId: input.tenantId,
        id: {
          in: invoiceIds,
        },
      },
      include: {
        paymentAllocations: true,
      },
    });

    if (invoices.length !== invoiceIds.length) {
      throw new Error('One or more invoices were not found for this tenant.');
    }

    for (const allocation of input.allocations) {
      const invoice = invoices.find((item) => item.id === allocation.invoiceId);

      if (!invoice) {
        throw new Error(`Invoice ${allocation.invoiceId} was not found.`);
      }

      this.assertInvoiceCanReceivePayment(invoice);

      const amount = this.toMoney(allocation.amountApplied);
      const existingInvoicePaid = invoice.paymentAllocations.reduce(
        (sum, item) => sum.plus(item.amountApplied),
        new Prisma.Decimal(0),
      );

      const invoiceRemaining = invoice.balanceDue.minus(existingInvoicePaid);

      if (amount.gt(invoiceRemaining)) {
        throw new Error(
          `Allocation for invoice ${invoice.invoiceNumber} exceeds invoice balance due.`,
        );
      }
    }

    for (const allocation of input.allocations) {
      const amount = this.toMoney(allocation.amountApplied);

      await tx.paymentReceiptAllocation.create({
        data: {
          tenantId: input.tenantId,
          paymentReceiptId: input.paymentReceiptId,
          invoiceId: allocation.invoiceId,
          amountApplied: amount,
          allocationType: allocation.allocationType ?? 'CASH',
          withholdingTaxCertificateId: allocation.withholdingTaxCertificateId ?? null,
        },
      });

      await this.posting.postAllocationReclassification(tx, {
        tenantId: input.tenantId,
        paymentReceiptId: input.paymentReceiptId,
        invoiceId: allocation.invoiceId,
        amount,
        allocatedById: input.allocatedById,
      });

      await this.recomputeInvoicePaymentStatus(tx, input.tenantId, allocation.invoiceId);
    }

    const finalAllocated = totalAfterAllocation.toDecimalPlaces(2);
    const unallocatedAmount = receipt.amount.minus(finalAllocated).toDecimalPlaces(2);

    const nextStatus =
      finalAllocated.eq(0)
        ? PaymentReceiptStatus.RECEIVED
        : finalAllocated.lt(receipt.amount)
          ? PaymentReceiptStatus.PARTIALLY_ALLOCATED
          : PaymentReceiptStatus.ALLOCATED;

    await tx.paymentReceipt.update({
      where: {
        id: receipt.id,
      },
      data: {
        status: nextStatus,
        unallocatedAmount,
      },
    });

    return {
      paymentReceiptId: receipt.id,
      totalReceiptAmount: receipt.amount,
      totalAllocatedAmount: finalAllocated,
      unallocatedAmount,
      allocationCount: receipt.allocations.length + input.allocations.length,
      status: nextStatus,
    };
  }

  async reverseAllocationsForReceipt(
    tx: TransactionClient,
    input: {
      tenantId: string;
      paymentReceiptId: string;
      reversedById?: string | null;
      reason?: string;
    },
  ): Promise<void> {
    const allocations = await tx.paymentReceiptAllocation.findMany({
      where: {
        tenantId: input.tenantId,
        paymentReceiptId: input.paymentReceiptId,
      },
      select: {
        id: true,
        invoiceId: true,
        amountApplied: true,
      },
    });

    if (allocations.length === 0) return;

    await tx.paymentReceiptAllocation.deleteMany({
      where: {
        tenantId: input.tenantId,
        paymentReceiptId: input.paymentReceiptId,
      },
    });

    const invoiceIds = Array.from(new Set(allocations.map((allocation) => allocation.invoiceId)));

    for (const allocation of allocations) {
      await this.posting.reverseAllocationReclassification(tx, {
        tenantId: input.tenantId,
        paymentReceiptId: input.paymentReceiptId,
        invoiceId: allocation.invoiceId,
        amount: allocation.amountApplied,
        reversedById: input.reversedById,
        reason: input.reason ?? 'Payment receipt reversed',
      });
    }

    for (const invoiceId of invoiceIds) {
      await this.recomputeInvoicePaymentStatus(tx, input.tenantId, invoiceId);
    }
  }

  async recomputeInvoicePaymentStatus(
    tx: TransactionClient,
    tenantId: string,
    invoiceId: string,
  ): Promise<void> {
    const invoice = await tx.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        paymentAllocations: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found while recomputing payment status.');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      return;
    }

    const paidAmount = invoice.paymentAllocations
      .reduce((sum, allocation) => sum.plus(allocation.amountApplied), new Prisma.Decimal(0))
      .toDecimalPlaces(2);

    const nextStatus =
      paidAmount.gte(invoice.balanceDue) && invoice.balanceDue.gt(0)
        ? InvoiceStatus.PAID
        : paidAmount.gt(0)
          ? InvoiceStatus.PARTIALLY_PAID
          : InvoiceStatus.INVOICED;

    await tx.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        paidAmount,
        status: nextStatus,
        paidDate: nextStatus === InvoiceStatus.PAID ? new Date() : null,
      },
    });
  }

  private assertInvoiceCanReceivePayment(invoice: {
    status: InvoiceStatus;
    invoiceNumber: string;
    balanceDue: Prisma.Decimal;
  }): void {
    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error(`Invoice ${invoice.invoiceNumber} is cancelled.`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error(`Invoice ${invoice.invoiceNumber} is already paid.`);
    }

    if (invoice.balanceDue.lte(0)) {
      throw new Error(`Invoice ${invoice.invoiceNumber} has no payable balance.`);
    }
  }

  private totalRequestedAllocation(allocations: PaymentAllocationInput[]): Prisma.Decimal {
    return allocations
      .reduce(
        (sum, allocation) => sum.plus(this.toMoney(allocation.amountApplied)),
        new Prisma.Decimal(0),
      )
      .toDecimalPlaces(2);
  }

  private toMoney(value: string | Prisma.Decimal): Prisma.Decimal {
    const amount = new Prisma.Decimal(value).toDecimalPlaces(2);

    if (!amount.isFinite() || amount.lte(0)) {
      throw new Error('Payment allocation amount must be greater than zero.');
    }

    return amount;
  }
}

export const paymentAllocationService = new PaymentAllocationService();

export default PaymentAllocationService;