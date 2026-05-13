// apps/api/src/modules/payments/payment-status.service.ts

import {
  InvoiceStatus,
  PaymentReceiptStatus,
  Prisma,
} from '@global-wakili/database';

type TransactionClient = Prisma.TransactionClient;

const ZERO = new Prisma.Decimal(0);

function money(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value);

  return parsed.isFinite()
    ? parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    : ZERO;
}

function assertTenant(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(new Error('Tenant ID is required for payment status update.'), {
      statusCode: 422,
      code: 'PAYMENT_STATUS_TENANT_REQUIRED',
    });
  }

  return value.trim();
}

export type InvoiceSettlementStatus = {
  invoiceId: string;
  total: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  cashAllocatedAmount: Prisma.Decimal;
  whtExpectedAmount: Prisma.Decimal;
  whtCertificateAmount: Prisma.Decimal;
  whtOutstandingAmount: Prisma.Decimal;
  cashBalanceDue: Prisma.Decimal;
  commercialBalanceDue: Prisma.Decimal;
  isCashSettled: boolean;
  isCommerciallySettled: boolean;
  invoiceStatus: InvoiceStatus;
};

export class PaymentStatusService {
  async refreshReceiptStatus(
    tx: TransactionClient,
    input: {
      tenantId: string;
      paymentReceiptId: string;
    },
  ) {
    const tenantId = assertTenant(input.tenantId);

    const receipt = await tx.paymentReceipt.findFirst({
      where: {
        tenantId,
        id: input.paymentReceiptId,
      },
      include: {
        allocations: true,
      },
    });

    if (!receipt) {
      throw Object.assign(new Error('Payment receipt not found for status refresh.'), {
        statusCode: 404,
        code: 'PAYMENT_RECEIPT_NOT_FOUND_FOR_STATUS_REFRESH',
      });
    }

    if (receipt.status === PaymentReceiptStatus.REVERSED) {
      return receipt;
    }

    const totalAllocated = receipt.allocations.reduce(
      (sum: Prisma.Decimal, allocation: { amountApplied: Prisma.Decimal }) =>
        sum.plus(money(allocation.amountApplied)),
      ZERO,
    );

    const receiptAmount = money(receipt.amount);
    const unallocatedAmount = Prisma.Decimal.max(
      receiptAmount.minus(totalAllocated),
      ZERO,
    ).toDecimalPlaces(2);

    const status =
      totalAllocated.equals(0)
        ? PaymentReceiptStatus.RECEIVED
        : totalAllocated.lt(receiptAmount)
          ? PaymentReceiptStatus.PARTIALLY_ALLOCATED
          : PaymentReceiptStatus.ALLOCATED;

    return tx.paymentReceipt.update({
      where: {
        id: receipt.id,
      },
      data: {
        status,
        unallocatedAmount,
      },
    });
  }

  async refreshInvoiceStatus(
    tx: TransactionClient,
    input: {
      tenantId: string;
      invoiceId: string;
    },
  ): Promise<InvoiceSettlementStatus> {
    const tenantId = assertTenant(input.tenantId);

    const invoice = await tx.invoice.findFirst({
      where: {
        tenantId,
        id: input.invoiceId,
      },
      select: {
        id: true,
        total: true,
        paidAmount: true,
        balanceDue: true,
        whtAmount: true,
        status: true,
      },
    });

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found for payment status refresh.'), {
        statusCode: 404,
        code: 'PAYMENT_INVOICE_NOT_FOUND_FOR_STATUS_REFRESH',
      });
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      return {
        invoiceId: invoice.id,
        total: money(invoice.total),
        paidAmount: money(invoice.paidAmount),
        cashAllocatedAmount: money(invoice.paidAmount),
        whtExpectedAmount: money(invoice.whtAmount),
        whtCertificateAmount: ZERO,
        whtOutstandingAmount: money(invoice.whtAmount),
        cashBalanceDue: money(invoice.balanceDue),
        commercialBalanceDue: money(invoice.balanceDue),
        isCashSettled: false,
        isCommerciallySettled: false,
        invoiceStatus: InvoiceStatus.CANCELLED,
      };
    }

    const [cashAllocationAggregate, whtCertificateAggregate] = await Promise.all([
      tx.paymentReceiptAllocation.aggregate({
        where: {
          tenantId,
          invoiceId: invoice.id,
          allocationType: 'CASH',
        },
        _sum: {
          amountApplied: true,
        },
      }),

      tx.withholdingTaxCertificate.aggregate({
        where: {
          tenantId,
          invoiceId: invoice.id,
          status: {
            not: 'CANCELLED',
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const total = money(invoice.total);
    const cashAllocatedAmount = money(cashAllocationAggregate._sum.amountApplied);
    const whtExpectedAmount = money(invoice.whtAmount);
    const whtCertificateAmount = money(whtCertificateAggregate._sum.amount);

    const cashBalanceDue = Prisma.Decimal.max(
      total.minus(cashAllocatedAmount),
      ZERO,
    ).toDecimalPlaces(2);

    const whtOutstandingAmount = Prisma.Decimal.max(
      whtExpectedAmount.minus(whtCertificateAmount),
      ZERO,
    ).toDecimalPlaces(2);

    const commercialBalanceDue = Prisma.Decimal.max(
      cashBalanceDue.minus(whtCertificateAmount),
      ZERO,
    ).toDecimalPlaces(2);

    const invoiceStatus =
      commercialBalanceDue.equals(0)
        ? InvoiceStatus.PAID
        : cashAllocatedAmount.gt(0) || whtCertificateAmount.gt(0)
          ? InvoiceStatus.PARTIALLY_PAID
          : InvoiceStatus.INVOICED;

    await tx.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        paidAmount: cashAllocatedAmount,
        balanceDue: cashBalanceDue,
        status: invoiceStatus,
      },
    });

    return {
      invoiceId: invoice.id,
      total,
      paidAmount: cashAllocatedAmount,
      cashAllocatedAmount,
      whtExpectedAmount,
      whtCertificateAmount,
      whtOutstandingAmount,
      cashBalanceDue,
      commercialBalanceDue,
      isCashSettled: cashBalanceDue.equals(0),
      isCommerciallySettled: commercialBalanceDue.equals(0) && whtOutstandingAmount.equals(0),
      invoiceStatus,
    };
  }

  async refreshReceiptAndInvoices(
    tx: TransactionClient,
    input: {
      tenantId: string;
      paymentReceiptId: string;
      invoiceIds: string[];
    },
  ) {
    const receipt = await this.refreshReceiptStatus(tx, {
      tenantId: input.tenantId,
      paymentReceiptId: input.paymentReceiptId,
    });

    const uniqueInvoiceIds = Array.from(
      new Set(
        input.invoiceIds.filter(
          (invoiceId): invoiceId is string =>
            typeof invoiceId === 'string' && invoiceId.length > 0,
        ),
      ),
    );

    const invoices = [];

    for (const invoiceId of uniqueInvoiceIds) {
      invoices.push(
        await this.refreshInvoiceStatus(tx, {
          tenantId: input.tenantId,
          invoiceId,
        }),
      );
    }

    return {
      receipt,
      invoices,
    };
  }
}

export const paymentStatusService = new PaymentStatusService();

export default PaymentStatusService;