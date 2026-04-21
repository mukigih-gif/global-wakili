// apps/api/src/modules/billing/withholding-tax-certificate.service.ts

import { Prisma, prisma } from '@global-wakili/database';

export class WithholdingTaxCertificateService {
  async recordCertificate(input: {
    tenantId: string;
    invoiceId: string;
    certificateNumber: string;
    certificateDate: Date;
    amount: string | Prisma.Decimal;
    payerName?: string | null;
    payerPin?: string | null;
    receivedById?: string | null;
    documentId?: string | null;
    notes?: string | null;
  }) {
    const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);

    if (amount.lte(0)) {
      throw new Error('WHT certificate amount must be greater than zero.');
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: input.invoiceId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        invoiceNumber: true,
        whtAmount: true,
        matterId: true,
        clientId: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found for WHT certificate.');
    }

    if (invoice.whtAmount.lte(0)) {
      throw new Error('Invoice does not have WHT receivable amount.');
    }

    const existingTotal = await prisma.withholdingTaxCertificate.aggregate({
      where: {
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        status: {
          not: 'CANCELLED',
        },
      },
      _sum: {
        amount: true,
      },
    });

    const alreadyRecorded = existingTotal._sum.amount ?? new Prisma.Decimal(0);

    if (alreadyRecorded.plus(amount).gt(invoice.whtAmount)) {
      throw new Error('WHT certificates cannot exceed invoice WHT amount.');
    }

    return prisma.$transaction(async (tx) => {
      const certificate = await tx.withholdingTaxCertificate.create({
        data: {
          tenantId: input.tenantId,
          invoiceId: input.invoiceId,
          matterId: invoice.matterId,
          clientId: invoice.clientId,
          certificateNumber: input.certificateNumber,
          certificateDate: input.certificateDate,
          amount,
          payerName: input.payerName ?? null,
          payerPin: input.payerPin ?? null,
          receivedById: input.receivedById ?? null,
          documentId: input.documentId ?? null,
          notes: input.notes ?? null,
          status: 'RECEIVED',
        },
      });

      await this.postCertificateClearing(tx, {
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        certificateId: certificate.id,
        amount,
        receivedById: input.receivedById,
      });

      return certificate;
    });
  }

  async listCertificates(input: {
    tenantId: string;
    invoiceId?: string;
    matterId?: string;
    clientId?: string;
    status?: string;
    take?: number;
    skip?: number;
  }) {
    return prisma.withholdingTaxCertificate.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
        ...(input.matterId ? { matterId: input.matterId } : {}),
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      orderBy: { certificateDate: 'desc' },
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  async cancelCertificate(input: {
    tenantId: string;
    certificateId: string;
    reason: string;
    cancelledById?: string | null;
  }) {
    const certificate = await prisma.withholdingTaxCertificate.findFirst({
      where: {
        id: input.certificateId,
        tenantId: input.tenantId,
      },
    });

    if (!certificate) {
      throw new Error('WHT certificate not found.');
    }

    if (certificate.status === 'CANCELLED') {
      return certificate;
    }

    return prisma.withholdingTaxCertificate.update({
      where: { id: certificate.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: input.cancelledById ?? null,
        cancellationReason: input.reason,
      },
    });
  }

  private async postCertificateClearing(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      invoiceId: string;
      invoiceNumber: string;
      certificateId: string;
      amount: Prisma.Decimal;
      receivedById?: string | null;
    },
  ) {
    const whtReceivable = await tx.chartOfAccount.findFirst({
      where: {
        tenantId: input.tenantId,
        code: '1205',
      },
      select: { id: true },
    });

    if (!whtReceivable) {
      return;
    }

    const taxCreditAccount = await tx.chartOfAccount.upsert({
      where: {
        tenantId_code: {
          tenantId: input.tenantId,
          code: '1210',
        },
      },
      update: {
        type: 'ASSET',
        subtype: 'ACCOUNTS_RECEIVABLE',
        normalBalance: 'DEBIT',
        isActive: true,
        isSystem: true,
      },
      create: {
        tenantId: input.tenantId,
        code: '1210',
        name: 'Withholding Tax Certificates Receivable',
        type: 'ASSET',
        subtype: 'ACCOUNTS_RECEIVABLE',
        normalBalance: 'DEBIT',
        isActive: true,
        isSystem: true,
        allowManualPosting: false,
      },
      select: { id: true },
    });

    await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        reference: `WHT-CERT-${input.certificateId}`,
        description: `WHT certificate received for invoice ${input.invoiceNumber}`,
        date: new Date(),
        amount: input.amount,
        postedById: input.receivedById ?? null,
        sourceModule: 'BILLING',
        sourceEntityType: 'WHT_CERTIFICATE',
        sourceEntityId: input.certificateId,
        lines: {
          create: [
            {
              tenantId: input.tenantId,
              accountId: taxCreditAccount.id,
              reference: input.invoiceNumber,
              description: `WHT certificate receivable ${input.invoiceNumber}`,
              debit: input.amount,
              credit: new Prisma.Decimal(0),
            },
            {
              tenantId: input.tenantId,
              accountId: whtReceivable.id,
              reference: input.invoiceNumber,
              description: `Clear WHT receivable ${input.invoiceNumber}`,
              debit: new Prisma.Decimal(0),
              credit: input.amount,
            },
          ],
        },
      },
    });
  }
}

export const withholdingTaxCertificateService = new WithholdingTaxCertificateService();

export default WithholdingTaxCertificateService;