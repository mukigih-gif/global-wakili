// apps/api/src/modules/payments/payment.dashboard.ts

import {
  InvoiceStatus,
  PaymentReceiptStatus,
  Prisma,
  prisma,
} from '@global-wakili/database';

export class PaymentDashboardService {
  async getDashboard(input: {
    tenantId: string;
    from?: Date;
    to?: Date;
    branchId?: string;
  }) {
    const receiptDateWhere =
      input.from || input.to
        ? {
            receivedAt: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {};

    const invoiceDateWhere =
      input.from || input.to
        ? {
            issuedDate: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {};

    const receiptWhere = {
      tenantId: input.tenantId,
      ...receiptDateWhere,
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
      ...invoiceDateWhere,
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
        where: { ...receiptWhere, status: PaymentReceiptStatus.PARTIALLY_ALLOCATED },
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
          ...(input.from || input.to
            ? {
                createdAt: {
                  ...(input.from ? { gte: input.from } : {}),
                  ...(input.to ? { lte: input.to } : {}),
                },
              }
            : {}),
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
          ...(input.from || input.to
            ? {
                certificateDate: {
                  ...(input.from ? { gte: input.from } : {}),
                  ...(input.to ? { lte: input.to } : {}),
                },
              }
            : {}),
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
          tenantId: input.tenantId,
          status: {
            not: PaymentReceiptStatus.REVERSED,
          },
          unallocatedAmount: {
            gt: 0,
          },
        },
      }),
    ]);

    const totalWhtExpected = invoiceTotals._sum.whtAmount ?? new Prisma.Decimal(0);
    const totalWhtCertificatesReceived =
      whtCertificateTotals._sum.amount ?? new Prisma.Decimal(0);

    const whtOutstanding = Prisma.Decimal.max(
      totalWhtExpected.minus(totalWhtCertificatesReceived),
      new Prisma.Decimal(0),
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
        receivedAmount: receiptTotals._sum.amount ?? new Prisma.Decimal(0),
        allocatedAmount: allocationTotals._sum.amountApplied ?? new Prisma.Decimal(0),
        unallocatedAmount: receiptTotals._sum.unallocatedAmount ?? new Prisma.Decimal(0),
        refundedAmount: refundTotals._sum.amount ?? new Prisma.Decimal(0),
        invoiceTotal: invoiceTotals._sum.total ?? new Prisma.Decimal(0),
        invoiceCashBalanceDue: invoiceTotals._sum.balanceDue ?? new Prisma.Decimal(0),
        invoiceCashPaidAmount: invoiceTotals._sum.paidAmount ?? new Prisma.Decimal(0),
      },
      wht: {
        expectedAmount: totalWhtExpected,
        certificatesReceivedAmount: totalWhtCertificatesReceived,
        outstandingAmount: whtOutstanding,
      },
      overdueCollections: {
        count: overdueInvoiceTotals._count.id,
        balanceDue: overdueInvoiceTotals._sum.balanceDue ?? new Prisma.Decimal(0),
      },
      unallocatedReceipts: {
        count: unallocatedReceiptCount,
        amount: receiptTotals._sum.unallocatedAmount ?? new Prisma.Decimal(0),
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
            caseNumber: true,
          },
        },
      },
      orderBy: {
        receivedAt: 'desc',
      },
      take: Math.min(input.take ?? 50, 100),
      skip: input.skip ?? 0,
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
        withholdingCertificates: {
          where: {
            status: {
              not: 'CANCELLED',
            },
          },
          select: {
            id: true,
            certificateNumber: true,
            amount: true,
            certificateDate: true,
            status: true,
          },
        },
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
            caseNumber: true,
          },
        },
      },
      orderBy: {
        issuedDate: 'desc',
      },
      take: Math.min(input.take ?? 50, 100),
      skip: input.skip ?? 0,
    });

    return invoices.map((invoice) => {
      const certificateAmount = invoice.withholdingCertificates.reduce(
        (sum, certificate) => sum.plus(certificate.amount),
        new Prisma.Decimal(0),
      );

      return {
        ...invoice,
        certificateAmount: certificateAmount.toDecimalPlaces(2),
        outstandingWhtAmount: Prisma.Decimal.max(
          invoice.whtAmount.minus(certificateAmount),
          new Prisma.Decimal(0),
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
            caseNumber: true,
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
      take: Math.min(input.take ?? 50, 100),
    });
  }
}

export const paymentDashboardService = new PaymentDashboardService();

export default PaymentDashboardService;