// apps/api/src/modules/payments/payment-posting.service.ts

import {
  AccountSubtype,
  AccountType,
  BalanceSide,
  Prisma,
} from '@global-wakili/database';

import {
  type PaymentPostingInput,
  type PaymentReclassificationInput,
  type PaymentReversalPostingInput,
} from './payment.types';

type TransactionClient = Prisma.TransactionClient;

export class PaymentPostingService {
  async postReceipt(
    tx: TransactionClient,
    input: PaymentPostingInput,
  ): Promise<void> {
    const existing = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_RECEIPT',
        sourceEntityId: input.paymentReceiptId,
      },
      select: { id: true },
    });

    if (existing) return;

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
      throw new Error('Payment receipt not found for posting.');
    }

    const allocatedAmount = receipt.allocations.reduce(
      (sum, allocation) => sum.plus(allocation.amountApplied),
      new Prisma.Decimal(0),
    );

    const unallocatedAmount = receipt.amount.minus(allocatedAmount).toDecimalPlaces(2);

    const bankAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '1000',
      name: 'Office Bank Account',
      type: AccountType.ASSET,
      subtype: AccountSubtype.OFFICE_BANK,
      normalBalance: BalanceSide.DEBIT,
    });

    const arAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '1200',
      name: 'Accounts Receivable - Clients',
      type: AccountType.ASSET,
      subtype: AccountSubtype.ACCOUNTS_RECEIVABLE,
      normalBalance: BalanceSide.DEBIT,
    });

    const clientDepositAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '2300',
      name: 'Client Deposits and Unallocated Receipts',
      type: AccountType.LIABILITY,
      subtype: AccountSubtype.CLIENT_DEPOSITS,
      normalBalance: BalanceSide.CREDIT,
    });

    const creditLines: Prisma.JournalLineCreateWithoutJournalInput[] = [];

    if (allocatedAmount.gt(0)) {
      creditLines.push({
        tenantId: input.tenantId,
        accountId: arAccount.id,
        clientId: receipt.clientId,
        matterId: receipt.matterId,
        reference: receipt.receiptNumber,
        description: `Accounts receivable cleared ${receipt.receiptNumber}`,
        debit: new Prisma.Decimal(0),
        credit: allocatedAmount.toDecimalPlaces(2),
      });
    }

    if (unallocatedAmount.gt(0)) {
      creditLines.push({
        tenantId: input.tenantId,
        accountId: clientDepositAccount.id,
        clientId: receipt.clientId,
        matterId: receipt.matterId,
        reference: receipt.receiptNumber,
        description: `Unallocated client receipt ${receipt.receiptNumber}`,
        debit: new Prisma.Decimal(0),
        credit: unallocatedAmount,
      });
    }

    if (creditLines.length === 0) {
      throw new Error('Payment receipt posting has no credit leg.');
    }

    await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        reference: `PAYMENT-RECEIPT-${receipt.id}`,
        description: `Payment receipt ${receipt.receiptNumber}`,
        date: receipt.receivedAt,
        amount: receipt.amount,
        postedById: input.postedById ?? null,
        currency: receipt.currency,
        exchangeRate: receipt.exchangeRate,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_RECEIPT',
        sourceEntityId: receipt.id,
        matterId: receipt.matterId,
        lines: {
          create: [
            {
              tenantId: input.tenantId,
              accountId: bankAccount.id,
              clientId: receipt.clientId,
              matterId: receipt.matterId,
              reference: receipt.receiptNumber,
              description: `Office bank receipt ${receipt.receiptNumber}`,
              debit: receipt.amount,
              credit: new Prisma.Decimal(0),
            },
            ...creditLines,
          ],
        },
      },
    });

    if (!receipt.unallocatedAmount.eq(unallocatedAmount)) {
      await tx.paymentReceipt.update({
        where: { id: receipt.id },
        data: { unallocatedAmount },
      });
    }
  }

  async postAllocationReclassification(
    tx: TransactionClient,
    input: PaymentReclassificationInput,
  ): Promise<void> {
    const receipt = await tx.paymentReceipt.findFirst({
      where: {
        id: input.paymentReceiptId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        receiptNumber: true,
        clientId: true,
        matterId: true,
        currency: true,
        exchangeRate: true,
      },
    });

    if (!receipt) {
      throw new Error('Payment receipt not found for allocation reclassification.');
    }

    const existing = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_ALLOCATION',
        sourceEntityId: `${input.paymentReceiptId}:${input.invoiceId}:${input.amount.toFixed(2)}`,
      },
      select: { id: true },
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

    const arAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '1200',
      name: 'Accounts Receivable - Clients',
      type: AccountType.ASSET,
      subtype: AccountSubtype.ACCOUNTS_RECEIVABLE,
      normalBalance: BalanceSide.DEBIT,
    });

    await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        reference: `PAYMENT-ALLOCATION-${receipt.id}-${input.invoiceId}`,
        description: `Receipt allocation reclassification ${receipt.receiptNumber}`,
        date: new Date(),
        amount: input.amount,
        postedById: input.allocatedById ?? null,
        currency: receipt.currency,
        exchangeRate: receipt.exchangeRate,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_ALLOCATION',
        sourceEntityId: `${input.paymentReceiptId}:${input.invoiceId}:${input.amount.toFixed(2)}`,
        matterId: receipt.matterId,
        lines: {
          create: [
            {
              tenantId: input.tenantId,
              accountId: clientDepositAccount.id,
              clientId: receipt.clientId,
              matterId: receipt.matterId,
              reference: receipt.receiptNumber,
              description: `Reduce unallocated receipt ${receipt.receiptNumber}`,
              debit: input.amount,
              credit: new Prisma.Decimal(0),
            },
            {
              tenantId: input.tenantId,
              accountId: arAccount.id,
              clientId: receipt.clientId,
              matterId: receipt.matterId,
              reference: receipt.receiptNumber,
              description: `Clear accounts receivable ${receipt.receiptNumber}`,
              debit: new Prisma.Decimal(0),
              credit: input.amount,
            },
          ],
        },
      },
    });

    await tx.paymentReceipt.update({
      where: { id: receipt.id },
      data: {
        unallocatedAmount: {
          decrement: input.amount,
        },
      },
    });
  }

  async reverseAllocationReclassification(
    tx: TransactionClient,
    input: {
      tenantId: string;
      paymentReceiptId: string;
      invoiceId: string;
      amount: Prisma.Decimal;
      reversedById?: string | null;
      reason: string;
    },
  ): Promise<void> {
    const original = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_ALLOCATION',
        sourceEntityId: `${input.paymentReceiptId}:${input.invoiceId}:${input.amount.toFixed(2)}`,
      },
      include: { lines: true },
    });

    if (!original) return;

    const existing = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_ALLOCATION_REVERSAL',
        sourceEntityId: original.id,
      },
      select: { id: true },
    });

    if (existing) return;

    await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        reference: `PAYMENT-ALLOCATION-REVERSAL-${original.id}`,
        description: `Allocation reversal: ${input.reason}`,
        date: new Date(),
        amount: original.amount,
        postedById: input.reversedById ?? null,
        currency: original.currency,
        exchangeRate: original.exchangeRate,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_ALLOCATION_REVERSAL',
        sourceEntityId: original.id,
        reversalOfId: original.id,
        matterId: original.matterId,
        lines: {
          create: original.lines.map((line) => ({
            tenantId: input.tenantId,
            accountId: line.accountId,
            clientId: line.clientId,
            matterId: line.matterId,
            branchId: line.branchId,
            reference: line.reference,
            description: `Reversal: ${line.description ?? ''}`.trim(),
            debit: line.credit,
            credit: line.debit,
          })),
        },
      },
    });
  }

  async reverseReceiptPosting(
    tx: TransactionClient,
    input: PaymentReversalPostingInput,
  ): Promise<void> {
    const original = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_RECEIPT',
        sourceEntityId: input.paymentReceiptId,
      },
      include: { lines: true },
    });

    if (!original) return;

    const existingReversal = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_RECEIPT_REVERSAL',
        sourceEntityId: input.paymentReceiptId,
      },
      select: { id: true },
    });

    if (existingReversal) return;

    await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        reference: `PAYMENT-RECEIPT-REVERSAL-${input.paymentReceiptId}`,
        description: `Payment receipt reversal: ${input.reason}`,
        date: input.reversalDate ?? new Date(),
        amount: original.amount,
        postedById: input.reversedById ?? null,
        currency: original.currency,
        exchangeRate: original.exchangeRate,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_RECEIPT_REVERSAL',
        sourceEntityId: input.paymentReceiptId,
        reversalOfId: original.id,
        matterId: original.matterId,
        lines: {
          create: original.lines.map((line) => ({
            tenantId: input.tenantId,
            accountId: line.accountId,
            clientId: line.clientId,
            matterId: line.matterId,
            branchId: line.branchId,
            reference: line.reference,
            description: `Reversal: ${line.description ?? ''}`.trim(),
            debit: line.credit,
            credit: line.debit,
          })),
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
      if (!existing.isSystem) {
        return existing;
      }

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
}

export const paymentPostingService = new PaymentPostingService();

export default PaymentPostingService;