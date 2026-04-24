// apps/api/src/modules/payments/payment-receipt.service.ts

import {
  PaymentReceiptStatus,
  Prisma,
  type PrismaClient,
  prisma,
} from '@global-wakili/database';

import {
  PAYMENT_DEFAULTS,
  type CreatePaymentReceiptInput,
  type ListPaymentReceiptsInput,
  type PaymentReceiptNumberAllocation,
  type PaymentReceiptNumberContext,
  type PaymentReceiptWithRelations,
} from './payment.types';

type TransactionClient = Prisma.TransactionClient;

export class PaymentReceiptService {
  async listReceipts(input: ListPaymentReceiptsInput): Promise<PaymentReceiptWithRelations[]> {
    const take = Math.min(
      input.take ?? PAYMENT_DEFAULTS.maxPaymentPageSize,
      PAYMENT_DEFAULTS.maxPaymentPageSize,
    );

    return prisma.paymentReceipt.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.matterId ? { matterId: input.matterId } : {}),
        ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.method ? { method: input.method } : {}),
        ...(input.search
          ? {
              OR: [
                { receiptNumber: { contains: input.search, mode: 'insensitive' } },
                { reference: { contains: input.search, mode: 'insensitive' } },
                { description: { contains: input.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(input.receivedFrom || input.receivedTo
          ? {
              receivedAt: {
                ...(input.receivedFrom ? { gte: input.receivedFrom } : {}),
                ...(input.receivedTo ? { lte: input.receivedTo } : {}),
              },
            }
          : {}),
      },
      include: this.receiptInclude(),
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      take,
      skip: input.skip ?? 0,
    });
  }

  async getReceiptById(
    tenantId: string,
    paymentReceiptId: string,
  ): Promise<PaymentReceiptWithRelations> {
    const receipt = await prisma.paymentReceipt.findFirst({
      where: {
        id: paymentReceiptId,
        tenantId,
      },
      include: this.receiptInclude(),
    });

    if (!receipt) {
      throw new Error('Payment receipt not found.');
    }

    return receipt;
  }

  async createReceipt(
    tx: TransactionClient,
    input: CreatePaymentReceiptInput,
  ) {
    const amount = this.money(input.amount);
    const receivedAt = input.receivedAt ?? new Date();

    const receiptNumber = await this.allocateReceiptNumber(tx, {
      tenantId: input.tenantId,
      receivedAt,
    });

    const normalized = await this.normalizeReceiptParties(tx, input);

    return tx.paymentReceipt.create({
      data: {
        tenantId: input.tenantId,
        receiptNumber: receiptNumber.receiptNumber,
        clientId: normalized.clientId,
        matterId: normalized.matterId,
        invoiceId: normalized.invoiceId,
        amount,
        unallocatedAmount: amount,
        currency: input.currency ?? PAYMENT_DEFAULTS.currency,
        exchangeRate: input.exchangeRate
          ? new Prisma.Decimal(input.exchangeRate).toDecimalPlaces(6)
          : new Prisma.Decimal(PAYMENT_DEFAULTS.exchangeRate),
        method: input.method,
        reference: input.reference ?? null,
        description: input.description ?? null,
        status: PaymentReceiptStatus.RECEIVED,
        receivedAt,
        createdById: input.createdById ?? null,
      },
    });
  }

  async markReversed(
    tx: TransactionClient,
    input: {
      tenantId: string;
      paymentReceiptId: string;
      reversedById: string;
      reason: string;
    },
  ) {
    return tx.paymentReceipt.update({
      where: {
        id: input.paymentReceiptId,
      },
      data: {
        status: PaymentReceiptStatus.REVERSED,
        reversedAt: new Date(),
        reversedById: input.reversedById,
        reversalReason: input.reason,
        unallocatedAmount: new Prisma.Decimal(0),
      },
    });
  }

  async previewReceiptNumber(context: PaymentReceiptNumberContext) {
    const receivedAt = context.receivedAt ?? new Date();
    const year = receivedAt.getFullYear();
    const tenantToken = await this.getTenantToken(prisma, context.tenantId);
    const prefix = this.buildPrefix(context.prefix ?? PAYMENT_DEFAULTS.receiptPrefix, tenantToken);

    const sequence = await prisma.paymentReceiptSequence.findUnique({
      where: {
        tenantId_prefix_year: {
          tenantId: context.tenantId,
          prefix,
          year,
        },
      },
      select: {
        nextValue: true,
      },
    });

    const sequenceValue = sequence?.nextValue ?? 1;

    return {
      receiptNumber: `${prefix}-${year}-${String(sequenceValue).padStart(6, '0')}`,
      prefix,
      year,
      sequenceValue,
    };
  }

  async allocateReceiptNumber(
    client: PrismaClient | TransactionClient,
    context: PaymentReceiptNumberContext,
  ): Promise<PaymentReceiptNumberAllocation> {
    const receivedAt = context.receivedAt ?? new Date();
    const year = receivedAt.getFullYear();
    const tenantToken = await this.getTenantToken(client, context.tenantId);
    const prefix = this.buildPrefix(context.prefix ?? PAYMENT_DEFAULTS.receiptPrefix, tenantToken);

    const sequence = await client.paymentReceiptSequence.upsert({
      where: {
        tenantId_prefix_year: {
          tenantId: context.tenantId,
          prefix,
          year,
        },
      },
      create: {
        tenantId: context.tenantId,
        prefix,
        year,
        nextValue: 2,
      },
      update: {
        nextValue: {
          increment: 1,
        },
      },
      select: {
        nextValue: true,
      },
    });

    const sequenceValue = sequence.nextValue - 1;

    return {
      receiptNumber: `${prefix}-${year}-${String(sequenceValue).padStart(6, '0')}`,
      prefix,
      year,
      sequenceValue,
    };
  }

  private async normalizeReceiptParties(
    tx: TransactionClient,
    input: CreatePaymentReceiptInput,
  ): Promise<{
    clientId: string | null;
    matterId: string | null;
    invoiceId: string | null;
  }> {
    if (input.invoiceId) {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
        },
        select: {
          id: true,
          matterId: true,
          clientId: true,
          status: true,
          balanceDue: true,
          matter: {
            select: {
              clientId: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found for payment receipt.');
      }

      if (invoice.balanceDue.lte(0)) {
        throw new Error('Invoice has no payable balance.');
      }

      return {
        invoiceId: invoice.id,
        matterId: input.matterId ?? invoice.matterId,
        clientId: input.clientId ?? invoice.clientId ?? invoice.matter.clientId,
      };
    }

    if (input.matterId) {
      const matter = await tx.matter.findFirst({
        where: {
          id: input.matterId,
          tenantId: input.tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          clientId: true,
        },
      });

      if (!matter) {
        throw new Error('Matter not found for payment receipt.');
      }

      return {
        invoiceId: null,
        matterId: matter.id,
        clientId: input.clientId ?? matter.clientId,
      };
    }

    if (input.clientId) {
      const client = await tx.client.findFirst({
        where: {
          id: input.clientId,
          tenantId: input.tenantId,
        },
        select: {
          id: true,
        },
      });

      if (!client) {
        throw new Error('Client not found for payment receipt.');
      }

      return {
        invoiceId: null,
        matterId: null,
        clientId: client.id,
      };
    }

    throw new Error('Payment receipt must be linked to an invoice, matter, or client.');
  }

  private async getTenantToken(
    client: PrismaClient | TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const tenant = await client.tenant.findUnique({
      where: {
        id: tenantId,
      },
      select: {
        slug: true,
        kraPin: true,
        name: true,
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found while generating payment receipt number.');
    }

    return this.clean(tenant.slug || tenant.kraPin || tenant.name || tenantId).slice(0, 18);
  }

  private buildPrefix(prefix: string, tenantToken: string): string {
    return `${this.clean(prefix)}-${tenantToken}`;
  }

  private clean(value: string): string {
    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
  }

  private money(value: string | Prisma.Decimal): Prisma.Decimal {
    const amount = new Prisma.Decimal(value).toDecimalPlaces(2);

    if (!amount.isFinite() || amount.lte(0)) {
      throw new Error('Payment receipt amount must be greater than zero.');
    }

    return amount;
  }

  private receiptInclude() {
    return {
      client: {
        select: {
          id: true,
          name: true,
          kraPin: true,
          email: true,
        },
      },
      matter: {
        select: {
          id: true,
          title: true,
          caseNumber: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          balanceDue: true,
          paidAmount: true,
          status: true,
          currency: true,
          exchangeRate: true,
        },
      },
      allocations: {
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
              balanceDue: true,
              paidAmount: true,
              status: true,
              currency: true,
              exchangeRate: true,
            },
          },
        },
      },
    } satisfies Prisma.PaymentReceiptInclude;
  }
}

export const paymentReceiptService = new PaymentReceiptService();

export default PaymentReceiptService;