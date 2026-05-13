// apps/api/src/modules/payments/payment.dashboard.ts

import {
  InvoiceStatus,
  PaymentReceiptStatus,
  Prisma,
  prisma,
} from '@global-wakili/database';

const ZERO = new Prisma.Decimal(0);

type WhtCertificateRow = {
  id: string;
  invoiceId: string | null;
  certificateNumber: string | null;
  amount: Prisma.Decimal;
  certificateDate: Date | null;
  status: string | null;
};

function money(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value);

  return parsed.isFinite()
    ? parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    : ZERO;
}

function takeLimit(value: number | undefined, fallback = 50, max = 100): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;

  return Math.min(Math.trunc(parsed), max);
}

function skipOffset(value: number | undefined): number {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed) || parsed < 0) return 0;

  return Math.trunc(parsed);
}

function dateWindow(field: string, from?: Date, to?: Date) {
  return from || to
    ? {
        [field]: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      }
    : {};
}

export class PaymentDashboardService {
  async getDashboard(input: {
    tenantId: string;
    from?: Date;
    to?: Date;
    branchId?: string;
  }) {
    const receiptWhere = {
      tenantId: input.tenantId,
      ...dateWindow('receivedAt', input.from, input.to),
      ...(input.branchId
        ? {
            matter: {
              branchId: input.branchId,
            },
          }
        : {}),
    };

    const invoiceWhere = {
      tenantId: input.tenantId,
      ...dateWindow('issuedDate', input.from, input.to),
      ...(input.branchId ? { branchId: input.branchId } : {}),
    };

    const [
      receiptCount,
      received,
      allocated,
      partiallyAllocated,
      reversed,
      receiptTotals,
      allocationTotals,
      refundsPending,
      refundsApproved,
      refundsPaid,
      refundTotals,
      invoiceTotals,
      whtCertificateTotals,
      overdueInvoiceTotals,
      unallocatedReceiptCount,
    ] = await Promise.all([
      prisma.paymentReceipt.count({ where: receiptWhere }),

      prisma.paymentReceipt.count({
        where: { ...receiptWhere, status: PaymentReceiptStatus.RECEIVED },
      }),

      prisma.paymentReceipt.count({
        where: { ...receiptWhere, status: PaymentReceiptStatus.ALLOCATED },
      }),

      prisma.paymentReceipt.count({
        where: {
          ...receiptWhere,
          status: PaymentReceiptStatus.PARTIALLY_ALLOCATED,
        },
      }),

      prisma.paymentReceipt.count({
        where: { ...receiptWhere, status: PaymentReceiptStatus.REVERSED },
      }),

      prisma.paymentReceipt.aggregate({
        where: receiptWhere,
        _sum: {
          amount: true,
          unallocatedAmount: true,
        },
      }),

      prisma.paymentReceiptAllocation.aggregate({
        where: {
          tenantId: input.tenantId,
          allocationType: 'CASH',
          ...dateWindow('createdAt', input.from, input.to),
        },
        _sum: {
          amountApplied: true,
        },
      }),

      prisma.paymentRefund.count({
        where: {
          tenantId: input.tenantId,
          status: 'PENDING_APPROVAL',
        },
      }),

      prisma.paymentRefund.count({
        where: {
          tenantId: input.tenantId,
          status: 'APPROVED',
        },
      }),

      prisma.paymentRefund.count({
        where: {
          tenantId: input.tenantId,
          status: 'PAID',
        },
      }),

      prisma.paymentRefund.aggregate({
        where: {
          tenantId: input.tenantId,
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.invoice.aggregate({
        where: invoiceWhere,
        _sum: {
          whtAmount: true,
          balanceDue: true,
          paidAmount: true,
          total: true,
        },
      }),

      prisma.withholdingTaxCertificate.aggregate({
        where: {
          tenantId: input.tenantId,
          status: {
            not: 'CANCELLED',
          },
          ...dateWindow('certificateDate', input.from, input.to),
        },
        _sum: {
          amount: true,
        },
      }),

      prisma.invoice.aggregate({
        where: {
          tenantId: input.tenantId,
          dueDate: {
            lt: new Date(),
          },
          status: {
            in: [InvoiceStatus.INVOICED, InvoiceStatus.PARTIALLY_PAID],
          },
          balanceDue: {
            gt: 0,
          },
          ...(input.branchId ? { branchId: input.branchId } : {}),
        },
        _sum: {
          balanceDue: true,
        },
        _count: {
          id: true,
        },
      }),

      prisma.paymentReceipt.count({
        where: {
          ...receiptWhere,
          status: {
            not: PaymentReceiptStatus.REVERSED,
          },
          unallocatedAmount: {
            gt: 0,
          },
        },
      }),
    ]);

    const totalWhtExpected = money(invoiceTotals._sum.whtAmount);
    const totalWhtCertificatesReceived = money(whtCertificateTotals._sum.amount);

    const whtOutstanding = Prisma.Decimal.max(
      totalWhtExpected.minus(totalWhtCertificatesReceived),
      ZERO,
    ).toDecimalPlaces(2);

    return {
      receiptCount,
      statuses: {
        received,
        allocated,
        partiallyAllocated,
        reversed,
      },
      totals: {
        receivedAmount: money(receiptTotals._sum.amount),
        allocatedAmount: money(allocationTotals._sum.amountApplied),
        unallocatedAmount: money(receiptTotals._sum.unallocatedAmount),
        refundedAmount: money(refundTotals._sum.amount),
        invoiceTotal: money(invoiceTotals._sum.total),
        invoiceCashBalanceDue: money(invoiceTotals._sum.balanceDue),
        invoiceCashPaidAmount: money(invoiceTotals._sum.paidAmount),
      },
      wht: {
        expectedAmount: totalWhtExpected,
        certificatesReceivedAmount: totalWhtCertificatesReceived,
        outstandingAmount: whtOutstanding,
      },
      overdueCollections: {
        count: overdueInvoiceTotals._count.id,
        balanceDue: money(overdueInvoiceTotals._sum.balanceDue),
      },
      unallocatedReceipts: {
        count: unallocatedReceiptCount,
        amount: money(receiptTotals._sum.unallocatedAmount),
      },
      refunds: {
        pendingApproval: refundsPending,
        approved: refundsApproved,
        paid: refundsPaid,
      },
    };
  }

  async getUnallocatedReceipts(input: {
    tenantId: string;
    take?: number;
    skip?: number;
  }) {
    return prisma.paymentReceipt.findMany({
      where: {
        tenantId: input.tenantId,
        status: {
          not: PaymentReceiptStatus.REVERSED,
        },
        unallocatedAmount: {
          gt: 0,
        },
      },
      select: {
        id: true,
        receiptNumber: true,
        clientId: true,
        matterId: true,
        amount: true,
        unallocatedAmount: true,
        currency: true,
        method: true,
        receivedAt: true,
        client: {
          select: {
            id: true,
            name: true,
            kraPin: true,
          },
        },
        matter: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        receivedAt: 'desc',
      },
      take: takeLimit(input.take),
      skip: skipOffset(input.skip),
    });
  }

  async getWhtCertificateExposure(input: {
    tenantId: string;
    take?: number;
    skip?: number;
  }) {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId: input.tenantId,
        whtAmount: {
          gt: 0,
        },
        status: {
          not: InvoiceStatus.CANCELLED,
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        matterId: true,
        clientId: true,
        total: true,
        whtAmount: true,
        balanceDue: true,
        issuedDate: true,
        dueDate: true,
        client: {
          select: {
            id: true,
            name: true,
            kraPin: true,
          },
        },
        matter: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        issuedDate: 'desc',
      },
      take: takeLimit(input.take),
      skip: skipOffset(input.skip),
    });

    const invoiceIds = invoices.map((invoice) => invoice.id);

    const certificates: WhtCertificateRow[] = invoiceIds.length
      ? await prisma.withholdingTaxCertificate.findMany({
          where: {
            tenantId: input.tenantId,
            invoiceId: {
              in: invoiceIds,
            },
            status: {
              not: 'CANCELLED',
            },
          },
          select: {
            id: true,
            invoiceId: true,
            certificateNumber: true,
            amount: true,
            certificateDate: true,
            status: true,
          },
          orderBy: {
            certificateDate: 'desc',
          },
        })
      : [];

    const certificatesByInvoice = new Map<string, WhtCertificateRow[]>();

    for (const certificate of certificates) {
      if (!certificate.invoiceId) continue;

      const rows = certificatesByInvoice.get(certificate.invoiceId) ?? [];
      rows.push(certificate);
      certificatesByInvoice.set(certificate.invoiceId, rows);
    }

    return invoices.map((invoice) => {
      const invoiceCertificates = certificatesByInvoice.get(invoice.id) ?? [];

      const certificateAmount = invoiceCertificates.reduce(
        (sum: Prisma.Decimal, certificate: WhtCertificateRow) =>
          sum.plus(money(certificate.amount)),
        ZERO,
      );

      return {
        ...invoice,
        withholdingTaxCertificates: invoiceCertificates,
        certificateAmount: certificateAmount.toDecimalPlaces(2),
        outstandingWhtAmount: Prisma.Decimal.max(
          money(invoice.whtAmount).minus(certificateAmount),
          ZERO,
        ).toDecimalPlaces(2),
      };
    });
  }

  async getOverdueInvoiceCollectionSnapshot(input: {
    tenantId: string;
    asOf?: Date;
    take?: number;
  }) {
    const asOf = input.asOf ?? new Date();

    return prisma.invoice.findMany({
      where: {
        tenantId: input.tenantId,
        dueDate: {
          lt: asOf,
        },
        status: {
          in: [InvoiceStatus.INVOICED, InvoiceStatus.PARTIALLY_PAID],
        },
        balanceDue: {
          gt: 0,
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        matterId: true,
        clientId: true,
        dueDate: true,
        total: true,
        balanceDue: true,
        paidAmount: true,
        whtAmount: true,
        matter: {
          select: {
            id: true,
            title: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            kraPin: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
      take: takeLimit(input.take),
    });
  }
}

export const paymentDashboardService = new PaymentDashboardService();

export default PaymentDashboardService;