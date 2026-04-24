// apps/api/src/modules/payments/refund.service.ts

import {
  AccountSubtype,
  AccountType,
  BalanceSide,
  PaymentReceiptStatus,
  Prisma,
  prisma,
} from '@global-wakili/database';

type TransactionClient = Prisma.TransactionClient;

export class RefundService {
  async createRefund(input: {
    tenantId: string;
    paymentReceiptId: string;
    amount: string | Prisma.Decimal;
    reason: string;
    requestedById?: string | null;
  }) {
    const amount = this.money(input.amount);

    const receipt = await prisma.paymentReceipt.findFirst({
      where: {
        id: input.paymentReceiptId,
        tenantId: input.tenantId,
      },
    });

    if (!receipt) {
      throw new Error('Payment receipt not found for refund.');
    }

    if (receipt.status === PaymentReceiptStatus.REVERSED) {
      throw new Error('Cannot refund a reversed receipt.');
    }

    if (amount.gt(receipt.unallocatedAmount)) {
      throw new Error('Refund amount cannot exceed unallocated receipt amount.');
    }

    return prisma.paymentRefund.create({
      data: {
        tenantId: input.tenantId,
        paymentReceiptId: receipt.id,
        clientId: receipt.clientId,
        matterId: receipt.matterId,
        amount,
        currency: receipt.currency,
        exchangeRate: receipt.exchangeRate,
        reason: input.reason,
        status: 'PENDING_APPROVAL',
        requestedById: input.requestedById ?? null,
      },
    });
  }

  async approveRefund(input: {
    tenantId: string;
    refundId: string;
    approvedById: string;
  }) {
    const refund = await prisma.paymentRefund.findFirst({
      where: {
        id: input.refundId,
        tenantId: input.tenantId,
      },
    });

    if (!refund) {
      throw new Error('Payment refund not found.');
    }

    if (refund.status !== 'PENDING_APPROVAL') {
      throw new Error('Only pending refunds can be approved.');
    }

    return prisma.paymentRefund.update({
      where: {
        id: refund.id,
      },
      data: {
        status: 'APPROVED',
        approvedById: input.approvedById,
        approvedAt: new Date(),
      },
    });
  }

  async payRefund(input: {
    tenantId: string;
    refundId: string;
    paidById: string;
    bankReference?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const refund = await tx.paymentRefund.findFirst({
        where: {
          id: input.refundId,
          tenantId: input.tenantId,
        },
        include: {
          paymentReceipt: true,
        },
      });

      if (!refund) {
        throw new Error('Payment refund not found.');
      }

      if (refund.status !== 'APPROVED') {
        throw new Error('Only approved refunds can be paid.');
      }

      if (refund.amount.gt(refund.paymentReceipt.unallocatedAmount)) {
        throw new Error('Refund amount exceeds current unallocated amount.');
      }

      await this.assertReceiptHasUnallocatedLiabilityPosting(tx, {
        tenantId: input.tenantId,
        paymentReceiptId: refund.paymentReceiptId,
        amount: refund.amount,
      });

      await this.postRefundPayment(tx, {
        tenantId: input.tenantId,
        refundId: refund.id,
        paymentReceiptId: refund.paymentReceiptId,
        amount: refund.amount,
        currency: refund.currency,
        exchangeRate: refund.exchangeRate,
        clientId: refund.clientId,
        matterId: refund.matterId,
        paidById: input.paidById,
        bankReference: input.bankReference,
      });

      await tx.paymentReceipt.update({
        where: {
          id: refund.paymentReceiptId,
        },
        data: {
          unallocatedAmount: {
            decrement: refund.amount,
          },
        },
      });

      return tx.paymentRefund.update({
        where: {
          id: refund.id,
        },
        data: {
          status: 'PAID',
          paidById: input.paidById,
          paidAt: new Date(),
          bankReference: input.bankReference ?? null,
        },
      });
    });
  }

  async rejectRefund(input: {
    tenantId: string;
    refundId: string;
    rejectedById: string;
    reason: string;
  }) {
    const refund = await prisma.paymentRefund.findFirst({
      where: {
        id: input.refundId,
        tenantId: input.tenantId,
      },
    });

    if (!refund) {
      throw new Error('Payment refund not found.');
    }

    if (refund.status !== 'PENDING_APPROVAL') {
      throw new Error('Only pending refunds can be rejected.');
    }

    return prisma.paymentRefund.update({
      where: {
        id: refund.id,
      },
      data: {
        status: 'REJECTED',
        rejectedById: input.rejectedById,
        rejectedAt: new Date(),
        rejectionReason: input.reason,
      },
    });
  }

  async listRefunds(input: {
    tenantId: string;
    paymentReceiptId?: string;
    clientId?: string;
    matterId?: string;
    status?: string;
    take?: number;
    skip?: number;
  }) {
    return prisma.paymentRefund.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.paymentReceiptId ? { paymentReceiptId: input.paymentReceiptId } : {}),
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.matterId ? { matterId: input.matterId } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  private async assertReceiptHasUnallocatedLiabilityPosting(
    tx: TransactionClient,
    input: {
      tenantId: string;
      paymentReceiptId: string;
      amount: Prisma.Decimal;
    },
  ): Promise<void> {
    const clientDepositAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '2300',
      name: 'Client Deposits and Unallocated Receipts',
      type: AccountType.LIABILITY,
      subtype: AccountSubtype.CLIENT_DEPOSITS,
      normalBalance: BalanceSide.CREDIT,
    });

    const originalReceiptJournal = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_RECEIPT',
        sourceEntityId: input.paymentReceiptId,
      },
      include: {
        lines: true,
      },
    });

    if (!originalReceiptJournal) {
      throw new Error('Original payment receipt journal entry was not found.');
    }

    const unallocatedCredit = originalReceiptJournal.lines
      .filter((line) => line.accountId === clientDepositAccount.id)
      .reduce((sum, line) => sum.plus(line.credit), new Prisma.Decimal(0));

    if (unallocatedCredit.lt(input.amount)) {
      throw new Error(
        'Refund cannot proceed because the original receipt does not have sufficient unallocated liability posting.',
      );
    }
  }

  private async postRefundPayment(
    tx: TransactionClient,
    input: {
      tenantId: string;
      refundId: string;
      paymentReceiptId: string;
      amount: Prisma.Decimal;
      currency: string;
      exchangeRate: Prisma.Decimal;
      clientId?: string | null;
      matterId?: string | null;
      paidById: string;
      bankReference?: string | null;
    },
  ) {
    const existing = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_REFUND',
        sourceEntityId: input.refundId,
      },
      select: {
        id: true,
      },
    });

    if (existing) return;

    const clientDepositAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '2300',
      name: 'Client Deposits and Unallocated Receipts',
      type: AccountType.LIABILITY,
      subtype: AccountSubtype.CLIENT_DEPOSITS,
      normalBalance: BalanceSide.CREDIT,
    });

    const officeBankAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '1000',
      name: 'Office Bank Account',
      type: AccountType.ASSET,
      subtype: AccountSubtype.OFFICE_BANK,
      normalBalance: BalanceSide.DEBIT,
    });

    await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        reference: `PAYMENT-REFUND-${input.refundId}`,
        description: `Refund of unallocated receipt ${input.paymentReceiptId}`,
        date: new Date(),
        amount: input.amount,
        postedById: input.paidById,
        currency: input.currency,
        exchangeRate: input.exchangeRate,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_REFUND',
        sourceEntityId: input.refundId,
        matterId: input.matterId,
        lines: {
          create: [
            {
              tenantId: input.tenantId,
              accountId: clientDepositAccount.id,
              clientId: input.clientId,
              matterId: input.matterId,
              reference: input.bankReference ?? input.refundId,
              description: 'Reduce client deposit liability for refund',
              debit: input.amount,
              credit: new Prisma.Decimal(0),
            },
            {
              tenantId: input.tenantId,
              accountId: officeBankAccount.id,
              clientId: input.clientId,
              matterId: input.matterId,
              reference: input.bankReference ?? input.refundId,
              description: 'Refund paid from office bank',
              debit: new Prisma.Decimal(0),
              credit: input.amount,
            },
          ],
        },
      },
    });
  }

  private async ensureSystemAccount(
    tx: TransactionClient,
    input: {
      tenantId: string;
      code: string;
      name: string;
      type: AccountType;
      subtype: AccountSubtype;
      normalBalance: BalanceSide;
    },
  ) {
    const existing = await tx.chartOfAccount.findUnique({
      where: {
        tenantId_code: {
          tenantId: input.tenantId,
          code: input.code,
        },
      },
      select: {
        id: true,
        isSystem: true,
      },
    });

    if (existing) {
      if (!existing.isSystem) return existing;

      return tx.chartOfAccount.update({
        where: { id: existing.id },
        data: {
          type: input.type,
          subtype: input.subtype,
          normalBalance: input.normalBalance,
          isActive: true,
          isSystem: true,
          allowManualPosting: false,
        },
        select: { id: true },
      });
    }

    return tx.chartOfAccount.create({
      data: {
        tenantId: input.tenantId,
        code: input.code,
        name: input.name,
        type: input.type,
        subtype: input.subtype,
        normalBalance: input.normalBalance,
        isActive: true,
        isSystem: true,
        allowManualPosting: false,
      },
      select: { id: true },
    });
  }

  private money(value: string | Prisma.Decimal): Prisma.Decimal {
    const amount = new Prisma.Decimal(value).toDecimalPlaces(2);

    if (!amount.isFinite() || amount.lte(0)) {
      throw new Error('Refund amount must be greater than zero.');
    }

    return amount;
  }
}

export const refundService = new RefundService();

export default RefundService;