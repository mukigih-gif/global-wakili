// apps/api/src/modules/payments/payment-status.service.ts

import {
  InvoiceStatus,
  PaymentReceiptStatus,
  Prisma,
  prisma,
} from '@global-wakili/database';

export class PaymentStatusService {
  async recomputeReceiptStatus(input: {
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
      throw new Error('Payment receipt not found.');
    }

    if (receipt.status === PaymentReceiptStatus.REVERSED) {
      return receipt;
    }

    const allocatedAmount = receipt.allocations
      .reduce((sum, allocation) => sum.plus(allocation.amountApplied), new Prisma.Decimal(0))
      .toDecimalPlaces(2);

    const unallocatedAmount = Prisma.Decimal.max(
      receipt.amount.minus(allocatedAmount),
      new Prisma.Decimal(0),
    ).toDecimalPlaces(2);

    const nextStatus =
      allocatedAmount.eq(0)
        ? PaymentReceiptStatus.RECEIVED
        : allocatedAmount.lt(receipt.amount)
          ? PaymentReceiptStatus.PARTIALLY_ALLOCATED
          : PaymentReceiptStatus.ALLOCATED;

    return prisma.paymentReceipt.update({
      where: {
        id: receipt.id,
      },
      data: {
        status: nextStatus,
        unallocatedAmount,
      },
    });
  }

  async recomputeInvoiceStatus(input: {
    tenantId: string;
    invoiceId: string;
  }) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: input.invoiceId,
        tenantId: input.tenantId,
      },
      include: {
        paymentAllocations: true,
        withholdingCertificates: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found.');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      return invoice;
    }

    const cashPaidAmount = invoice.paymentAllocations
      .filter((allocation) => allocation.allocationType === 'CASH')
      .reduce((sum, allocation) => sum.plus(allocation.amountApplied), new Prisma.Decimal(0))
      .toDecimalPlaces(2);

    const nextStatus =
      cashPaidAmount.gte(invoice.balanceDue) && invoice.balanceDue.gt(0)
        ? InvoiceStatus.PAID
        : cashPaidAmount.gt(0)
          ? InvoiceStatus.PARTIALLY_PAID
          : InvoiceStatus.INVOICED;

    return prisma.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        paidAmount: cashPaidAmount,
        status: nextStatus,
        paidDate: nextStatus === InvoiceStatus.PAID ? new Date() : null,
      },
    });
  }

  async getReceiptAllocationSummary(input: {
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
      throw new Error('Payment receipt not found.');
    }

    const allocatedAmount = receipt.allocations
      .reduce((sum, allocation) => sum.plus(allocation.amountApplied), new Prisma.Decimal(0))
      .toDecimalPlaces(2);

    const unallocatedAmount = Prisma.Decimal.max(
      receipt.amount.minus(allocatedAmount),
      new Prisma.Decimal(0),
    ).toDecimalPlaces(2);

    return {
      paymentReceiptId: receipt.id,
      receiptNumber: receipt.receiptNumber,
      status: receipt.status,
      amount: receipt.amount,
      allocatedAmount,
      unallocatedAmount,
      allocationCount: receipt.allocations.length,
    };
  }

  async getInvoicePaymentSummary(input: {
    tenantId: string;
    invoiceId: string;
  }) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: input.invoiceId,
        tenantId: input.tenantId,
      },
      include: {
        paymentAllocations: true,
        withholdingCertificates: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found.');
    }

    const cashPaidAmount = invoice.paymentAllocations
      .filter((allocation) => allocation.allocationType === 'CASH')
      .reduce((sum, allocation) => sum.plus(allocation.amountApplied), new Prisma.Decimal(0))
      .toDecimalPlaces(2);

    const whtCertificateAmount = invoice.withholdingCertificates
      .filter((certificate) => certificate.status !== 'CANCELLED')
      .reduce((sum, certificate) => sum.plus(certificate.amount), new Prisma.Decimal(0))
      .toDecimalPlaces(2);

    const unpaidCashBalance = Prisma.Decimal.max(
      invoice.balanceDue.minus(cashPaidAmount),
      new Prisma.Decimal(0),
    ).toDecimalPlaces(2);

    const whtOutstanding = Prisma.Decimal.max(
      invoice.whtAmount.minus(whtCertificateAmount),
      new Prisma.Decimal(0),
    ).toDecimalPlaces(2);

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      total: invoice.total,
      balanceDue: invoice.balanceDue,
      whtAmount: invoice.whtAmount,
      cashPaidAmount,
      unpaidCashBalance,
      whtCertificateAmount,
      whtOutstanding,
      isCashSettled: unpaidCashBalance.eq(0),
      isWhtSettled: whtOutstanding.eq(0),
      isCommerciallySettled: unpaidCashBalance.eq(0) && whtOutstanding.eq(0),
    };
  }
}

export const paymentStatusService = new PaymentStatusService();

export default PaymentStatusService;