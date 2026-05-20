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

type ReceiptNumberCandidate = PaymentReceiptNumberAllocation & {
  receiptNumber: string;
};

const MAX_RECEIPT_NUMBER_ATTEMPTS = 10;

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
      throw Object.assign(new Error('Payment receipt not found.'), {
        statusCode: 404,
        code: 'PAYMENT_RECEIPT_NOT_FOUND',
      });
    }

    return receipt;
  }

  async createReceipt(
    tx: TransactionClient,
    input: CreatePaymentReceiptInput,
  ) {
    const amount = this.money(input.amount);
    const receivedAt = input.receivedAt ?? new Date();
    const normalized = await this.normalizeReceiptParties(tx, input);

    for (let attempt = 0; attempt < MAX_RECEIPT_NUMBER_ATTEMPTS; attempt += 1) {
      const allocation = await this.allocateReceiptNumber(tx, {
        tenantId: input.tenantId,
        receivedAt,
        prefix: PAYMENT_DEFAULTS.receiptPrefix,
      });

      try {
        return await tx.paymentReceipt.create({
          data: {
            tenantId: input.tenantId,
            receiptNumber: allocation.receiptNumber,
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
      } catch (error) {
        if (this.isUniqueConstraintFailure(error) && attempt < MAX_RECEIPT_NUMBER_ATTEMPTS - 1) {
          continue;
        }

        throw error;
      }
    }

    throw Object.assign(new Error('Unable to allocate a unique payment receipt number.'), {
      statusCode: 409,
      code: 'PAYMENT_RECEIPT_NUMBER_ALLOCATION_FAILED',
      details: {
        tenantId: input.tenantId,
        receivedAt: receivedAt.toISOString(),
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
    const receipt = await tx.paymentReceipt.findFirst({
      where: {
        id: input.paymentReceiptId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!receipt) {
      throw Object.assign(new Error('Payment receipt not found for reversal.'), {
        statusCode: 404,
        code: 'PAYMENT_RECEIPT_NOT_FOUND_FOR_REVERSAL',
      });
    }

    if (receipt.status === PaymentReceiptStatus.REVERSED) {
      throw Object.assign(new Error('Payment receipt is already reversed.'), {
        statusCode: 409,
        code: 'PAYMENT_RECEIPT_ALREADY_REVERSED',
      });
    }

    return tx.paymentReceipt.update({
      where: {
        id: input.paymentReceiptId,
      },
      data: {
        status: PaymentReceiptStatus.REVERSED,
        unallocatedAmount: new Prisma.Decimal(0),
      },
    });
  }

  async previewReceiptNumber(context: PaymentReceiptNumberContext) {
    const receivedAt = context.receivedAt ?? new Date();
    const year = receivedAt.getFullYear();
    const tenantToken = await this.getTenantToken(prisma, context.tenantId);
    const prefix = this.buildPrefix(context.prefix ?? PAYMENT_DEFAULTS.receiptPrefix, tenantToken);
    const sequenceValue = await this.nextReceiptSequenceValue(prisma, {
      tenantId: context.tenantId,
      prefix,
      year,
    });

    return {
      receiptNumber: this.formatReceiptNumber(prefix, year, sequenceValue),
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
    const sequenceValue = await this.nextReceiptSequenceValue(client, {
      tenantId: context.tenantId,
      prefix,
      year,
    });

    return {
      receiptNumber: this.formatReceiptNumber(prefix, year, sequenceValue),
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
        throw Object.assign(new Error('Invoice not found for payment receipt.'), {
          statusCode: 404,
          code: 'PAYMENT_RECEIPT_INVOICE_NOT_FOUND',
        });
      }

      if (new Prisma.Decimal(invoice.balanceDue).lte(0)) {
        throw Object.assign(new Error('Invoice has no payable balance.'), {
          statusCode: 422,
          code: 'PAYMENT_RECEIPT_INVOICE_NO_PAYABLE_BALANCE',
        });
      }

      return {
        invoiceId: invoice.id,
        matterId: input.matterId ?? invoice.matterId,
        clientId: input.clientId ?? invoice.clientId ?? invoice.matter?.clientId ?? null,
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
        throw Object.assign(new Error('Matter not found for payment receipt.'), {
          statusCode: 404,
          code: 'PAYMENT_RECEIPT_MATTER_NOT_FOUND',
        });
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
        throw Object.assign(new Error('Client not found for payment receipt.'), {
          statusCode: 404,
          code: 'PAYMENT_RECEIPT_CLIENT_NOT_FOUND',
        });
      }

      return {
        invoiceId: null,
        matterId: null,
        clientId: client.id,
      };
    }

    throw Object.assign(
      new Error('Payment receipt must be linked to an invoice, matter, or client.'),
      {
        statusCode: 422,
        code: 'PAYMENT_RECEIPT_PARTY_REQUIRED',
      },
    );
  }

  private async nextReceiptSequenceValue(
    client: PrismaClient | TransactionClient,
    input: {
      tenantId: string;
      prefix: string;
      year: number;
    },
  ): Promise<number> {
    const yearToken = `${input.prefix}-${input.year}-`;

    const latest = await client.paymentReceipt.findFirst({
      where: {
        tenantId: input.tenantId,
        receiptNumber: {
          startsWith: yearToken,
        },
      },
      orderBy: {
        receiptNumber: 'desc',
      },
      select: {
        receiptNumber: true,
      },
    });

    if (!latest?.receiptNumber) {
      return 1;
    }

    const lastSegment = latest.receiptNumber.slice(yearToken.length);
    const parsed = Number.parseInt(lastSegment, 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return 1;
    }

    return parsed + 1;
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
      throw Object.assign(
        new Error('Tenant not found while generating payment receipt number.'),
        {
          statusCode: 404,
          code: 'PAYMENT_RECEIPT_TENANT_NOT_FOUND',
        },
      );
    }

    return this.clean(tenant.slug || tenant.kraPin || tenant.name || tenantId).slice(0, 18);
  }

  private buildPrefix(prefix: string, tenantToken: string): string {
    return `${this.clean(prefix)}-${tenantToken}`;
  }

  private formatReceiptNumber(prefix: string, year: number, sequenceValue: number): string {
    return `${prefix}-${year}-${String(sequenceValue).padStart(6, '0')}`;
  }

  private clean(value: string): string {
    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
  }

  private money(value: string | number | Prisma.Decimal): Prisma.Decimal {
    const amount = new Prisma.Decimal(value).toDecimalPlaces(2);

    if (!amount.isFinite() || amount.lte(0)) {
      throw Object.assign(new Error('Payment receipt amount must be greater than zero.'), {
        statusCode: 422,
        code: 'PAYMENT_RECEIPT_AMOUNT_INVALID',
      });
    }

    return amount;
  }

  private isUniqueConstraintFailure(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  async getClientPortalReceipt(
    tenantId: string,
    clientId: string,
    paymentReceiptId: string,
  ): Promise<PaymentReceiptWithRelations> {
    const receipt = await prisma.paymentReceipt.findFirst({
      where: {
        id: paymentReceiptId,
        tenantId,
        clientId,
      },
      include: this.receiptInclude(),
    });

    if (!receipt) {
      throw Object.assign(new Error('Payment receipt not found for client portal.'), {
        statusCode: 404,
        code: 'CLIENT_PORTAL_PAYMENT_RECEIPT_NOT_FOUND',
      });
    }

    return receipt;
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
