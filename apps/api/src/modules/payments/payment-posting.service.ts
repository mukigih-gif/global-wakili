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

type FindFirstDelegate = {
  findFirst: (args?: never) => Promise<unknown>;
};

function asFindFirstDelegate(delegate: unknown): FindFirstDelegate | null {
  if (
    delegate &&
    typeof delegate === 'object' &&
    'findFirst' in delegate &&
    typeof (delegate as { findFirst?: unknown }).findFirst === 'function'
  ) {
    return delegate as FindFirstDelegate;
  }

  return null;
}

type BranchRef = {
  id: string;
};

type MatterBranchRef = {
  branchId: string | null;
};

type SystemAccountRef = {
  id: string;
};

type PaymentJournalLine = {
  tenantId: string;
  journalId: string;
  accountId: string;
  clientId?: string | null;
  matterId?: string | null;
  branchId?: string | null;
  reference?: string | null;
  description?: string | null;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
};

type DraftPaymentJournalLine = Omit<PaymentJournalLine, 'journalId'>;

const ZERO = new Prisma.Decimal(0);

function money(value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const amount = new Prisma.Decimal(value);

  if (!amount.isFinite()) return ZERO;

  return amount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function assertPositive(amount: Prisma.Decimal, message: string): void {
  if (!amount.isFinite() || amount.lte(0)) {
    throw Object.assign(new Error(message), {
      statusCode: 422,
      code: 'PAYMENT_POSTING_AMOUNT_INVALID',
    });
  }
}

function sumDebits(lines: DraftPaymentJournalLine[]): Prisma.Decimal {
  return lines.reduce((sum, line) => sum.plus(money(line.debit)), ZERO);
}

function sumCredits(lines: DraftPaymentJournalLine[]): Prisma.Decimal {
  return lines.reduce((sum, line) => sum.plus(money(line.credit)), ZERO);
}

function assertBalanced(lines: DraftPaymentJournalLine[], context: string): void {
  if (lines.length < 2) {
    throw Object.assign(new Error(`${context} requires at least two journal lines.`), {
      statusCode: 422,
      code: 'PAYMENT_POSTING_INCOMPLETE_JOURNAL',
    });
  }

  const debitTotal = sumDebits(lines);
  const creditTotal = sumCredits(lines);

  if (!debitTotal.equals(creditTotal)) {
    throw Object.assign(new Error(`${context} journal is not balanced.`), {
      statusCode: 422,
      code: 'PAYMENT_POSTING_UNBALANCED_JOURNAL',
      details: {
        debitTotal: debitTotal.toString(),
        creditTotal: creditTotal.toString(),
      },
    });
  }

  if (debitTotal.lte(0)) {
    throw Object.assign(new Error(`${context} journal total must be greater than zero.`), {
      statusCode: 422,
      code: 'PAYMENT_POSTING_ZERO_JOURNAL',
    });
  }
}

function normalizeLine(line: DraftPaymentJournalLine, journalId: string): PaymentJournalLine {
  const debit = money(line.debit);
  const credit = money(line.credit);

  if (debit.gt(0) && credit.gt(0)) {
    throw Object.assign(new Error('A journal line cannot have both debit and credit amounts.'), {
      statusCode: 422,
      code: 'PAYMENT_POSTING_DOUBLE_SIDED_LINE',
      details: {
        accountId: line.accountId,
      },
    });
  }

  if (debit.lt(0) || credit.lt(0)) {
    throw Object.assign(new Error('Journal line debit/credit amounts cannot be negative.'), {
      statusCode: 422,
      code: 'PAYMENT_POSTING_NEGATIVE_LINE',
      details: {
        accountId: line.accountId,
      },
    });
  }

  if (debit.equals(0) && credit.equals(0)) {
    throw Object.assign(new Error('Journal line cannot be zero-valued.'), {
      statusCode: 422,
      code: 'PAYMENT_POSTING_ZERO_LINE',
      details: {
        accountId: line.accountId,
      },
    });
  }

  return {
    tenantId: line.tenantId,
    journalId,
    accountId: line.accountId,
    clientId: line.clientId ?? null,
    matterId: line.matterId ?? null,
    branchId: line.branchId ?? null,
    reference: line.reference ?? null,
    description: line.description ?? null,
    debit,
    credit,
  };
}

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
      throw Object.assign(new Error('Payment receipt not found for posting.'), {
        statusCode: 404,
        code: 'PAYMENT_RECEIPT_NOT_FOUND_FOR_POSTING',
      });
    }

    const receiptAmount = money(receipt.amount);
    assertPositive(receiptAmount, 'Payment receipt amount must be greater than zero.');

    const allocatedAmount = receipt.allocations.reduce(
      (sum: Prisma.Decimal, allocation: any) => sum.plus(money(allocation.amountApplied)),
      ZERO,
    );

    if (allocatedAmount.gt(receiptAmount)) {
      throw Object.assign(new Error('Payment receipt allocations exceed receipt amount.'), {
        statusCode: 422,
        code: 'PAYMENT_ALLOCATIONS_EXCEED_RECEIPT',
        details: {
          receiptAmount: receiptAmount.toString(),
          allocatedAmount: allocatedAmount.toString(),
        },
      });
    }

    const unallocatedAmount = receiptAmount.minus(allocatedAmount).toDecimalPlaces(2);

    const branchId = await this.resolveReceiptBranchId(tx, {
      tenantId: input.tenantId,
      matterId: receipt.matterId,
      allocations: receipt.allocations,
    });
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

    const lines: DraftPaymentJournalLine[] = [
      {
        tenantId: input.tenantId,
        accountId: bankAccount.id,
        clientId: receipt.clientId,
        matterId: receipt.matterId,
        branchId: null,
        reference: receipt.receiptNumber,
        description: `Office bank receipt ${receipt.receiptNumber}`,
        debit: receiptAmount,
        credit: ZERO,
      },
    ];

    if (allocatedAmount.gt(0)) {
      lines.push({
        tenantId: input.tenantId,
        accountId: arAccount.id,
        clientId: receipt.clientId,
        matterId: receipt.matterId,
        branchId: null,
        reference: receipt.receiptNumber,
        description: `Accounts receivable cleared ${receipt.receiptNumber}`,
        debit: ZERO,
        credit: allocatedAmount.toDecimalPlaces(2),
      });
    }

    if (unallocatedAmount.gt(0)) {
      lines.push({
        tenantId: input.tenantId,
        accountId: clientDepositAccount.id,
        clientId: receipt.clientId,
        matterId: receipt.matterId,
        branchId: null,
        reference: receipt.receiptNumber,
        description: `Unallocated client receipt ${receipt.receiptNumber}`,
        debit: ZERO,
        credit: unallocatedAmount,
      });
    }

    await this.createJournalWithLines(tx, {
      tenantId: input.tenantId,
      reference: `PAYMENT-RECEIPT-${receipt.id}`,
      description: `Payment receipt ${receipt.receiptNumber}`,
      date: receipt.receivedAt,
      amount: receiptAmount,
      postedById: input.postedById ?? null,
      currency: receipt.currency,
      exchangeRate: receipt.exchangeRate,
      sourceEntityType: 'PAYMENT_RECEIPT',
      sourceEntityId: receipt.id,
      reversalOfId: null,
      matterId: receipt.matterId,
      lines,
    });

    if (!money(receipt.unallocatedAmount).equals(unallocatedAmount)) {
      await tx.paymentReceipt.update({
        where: { id: receipt.id, tenantId: input.tenantId },
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
        unallocatedAmount: true,
      },
    });

    if (!receipt) {
      throw Object.assign(new Error('Payment receipt not found for allocation reclassification.'), {
        statusCode: 404,
        code: 'PAYMENT_RECEIPT_NOT_FOUND_FOR_ALLOCATION_POSTING',
      });
    }

    const amount = money(input.amount);
    assertPositive(amount, 'Payment allocation amount must be greater than zero.');

    const sourceEntityId = this.allocationSourceEntityId(input.paymentReceiptId, input.invoiceId, amount);

    const existing = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_ALLOCATION',
        sourceEntityId,
      },
      select: { id: true },
    });

    if (existing) return;

    if (money(receipt.unallocatedAmount).lt(amount)) {
      throw Object.assign(new Error('Payment receipt has insufficient unallocated amount.'), {
        statusCode: 422,
        code: 'PAYMENT_INSUFFICIENT_UNALLOCATED_AMOUNT',
        details: {
          paymentReceiptId: receipt.id,
          available: money(receipt.unallocatedAmount).toString(),
          requested: amount.toString(),
        },
      });
    }

    const branchId = await this.resolveReceiptBranchId(tx, {
      tenantId: input.tenantId,
      matterId: receipt.matterId,
      allocations: [{ invoiceId: input.invoiceId }],
    });
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

    await this.createJournalWithLines(tx, {
      tenantId: input.tenantId,
      reference: `PAYMENT-ALLOCATION-${receipt.id}-${input.invoiceId}`,
      description: `Receipt allocation reclassification ${receipt.receiptNumber}`,
      date: new Date(),
      amount,
      postedById: input.allocatedById ?? null,
      currency: receipt.currency,
      exchangeRate: receipt.exchangeRate,
      sourceEntityType: 'PAYMENT_ALLOCATION',
      sourceEntityId,
      reversalOfId: null,
      matterId: receipt.matterId,
      lines: [
        {
          tenantId: input.tenantId,
          accountId: clientDepositAccount.id,
          clientId: receipt.clientId,
          matterId: receipt.matterId,
          branchId: null,
          reference: receipt.receiptNumber,
          description: `Reduce unallocated receipt ${receipt.receiptNumber}`,
          debit: amount,
          credit: ZERO,
        },
        {
          tenantId: input.tenantId,
          accountId: arAccount.id,
          clientId: receipt.clientId,
          matterId: receipt.matterId,
          branchId: null,
          reference: receipt.receiptNumber,
          description: `Clear accounts receivable ${receipt.receiptNumber}`,
          debit: ZERO,
          credit: amount,
        },
      ],
    });

    await tx.paymentReceipt.update({
      where: { id: receipt.id, tenantId: input.tenantId },
      data: {
        unallocatedAmount: {
          decrement: amount,
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
    const amount = money(input.amount);
    const sourceEntityId = this.allocationSourceEntityId(input.paymentReceiptId, input.invoiceId, amount);

    const original = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'PAYMENTS',
        sourceEntityType: 'PAYMENT_ALLOCATION',
        sourceEntityId,
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

    await this.createJournalWithLines(tx, {
      tenantId: input.tenantId,
      reference: `PAYMENT-ALLOCATION-REVERSAL-${original.id}`,
      description: `Allocation reversal: ${input.reason}`,
      date: new Date(),
      amount: money(original.amount),
      postedById: input.reversedById ?? null,
      currency: original.currency,
      exchangeRate: original.exchangeRate,
      sourceEntityType: 'PAYMENT_ALLOCATION_REVERSAL',
      sourceEntityId: original.id,
      reversalOfId: original.id,
      matterId: original.matterId,
      lines: original.lines.map((line: any) => ({
        tenantId: input.tenantId,
        accountId: line.accountId,
        clientId: line.clientId ?? null,
        matterId: line.matterId ?? null,
        branchId: line.branchId ?? null,
        reference: line.reference ?? null,
        description: `Reversal: ${line.description ?? ''}`.trim(),
        debit: money(line.credit),
        credit: money(line.debit),
      })),
    });

    await tx.paymentReceipt.update({
      where: { id: input.paymentReceiptId, tenantId: input.tenantId },
      data: {
        unallocatedAmount: {
          increment: amount,
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

    await this.createJournalWithLines(tx, {
      tenantId: input.tenantId,
      reference: `PAYMENT-RECEIPT-REVERSAL-${input.paymentReceiptId}`,
      description: `Payment receipt reversal: ${input.reason}`,
      date: input.reversalDate ?? new Date(),
      amount: money(original.amount),
      postedById: input.reversedById ?? null,
      currency: original.currency,
      exchangeRate: original.exchangeRate,
      sourceEntityType: 'PAYMENT_RECEIPT_REVERSAL',
      sourceEntityId: input.paymentReceiptId,
      reversalOfId: original.id,
      matterId: original.matterId,
      lines: original.lines.map((line: any) => ({
        tenantId: input.tenantId,
        accountId: line.accountId,
        clientId: line.clientId ?? null,
        matterId: line.matterId ?? null,
        branchId: line.branchId ?? null,
        reference: line.reference ?? null,
        description: `Reversal: ${line.description ?? ''}`.trim(),
        debit: money(line.credit),
        credit: money(line.debit),
      })),
    });
  }

  private async createJournalWithLines(
    tx: TransactionClient,
    input: {
      tenantId: string;
      reference: string;
      description: string;
      date: Date;
      amount: Prisma.Decimal;
      postedById?: string | null;
      currency: string;
      exchangeRate: Prisma.Decimal | number | string;
      sourceEntityType: string;
      sourceEntityId: string;
      reversalOfId?: string | null;
      matterId?: string | null;
      lines: DraftPaymentJournalLine[];
    },
  ) {
    const journalAmount = money(input.amount);
    assertPositive(journalAmount, 'Payment journal amount must be greater than zero.');
    assertBalanced(input.lines, input.reference);

    const journal = await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        reference: input.reference,
        description: input.description,
        date: input.date,
        amount: journalAmount,
        postedById: input.postedById ?? null,
        currency: input.currency,
        exchangeRate: new Prisma.Decimal(input.exchangeRate ?? 1).toDecimalPlaces(6),
        sourceModule: 'PAYMENTS',
        sourceEntityType: input.sourceEntityType,
        sourceEntityId: input.sourceEntityId,
        reversalOfId: input.reversalOfId ?? null,
        matterId: input.matterId ?? null,
      },
      select: { id: true },
    });

    const normalizedLines = input.lines.map((line) => normalizeLine(line, journal.id));

    await tx.journalLine.createMany({
      data: normalizedLines,
    });

    return journal;
  }

  private allocationSourceEntityId(
    paymentReceiptId: string,
    invoiceId: string,
    amount: Prisma.Decimal,
  ): string {
    return `${paymentReceiptId}:${invoiceId}:${money(amount).toFixed(2)}`;
  }

  private async resolveReceiptBranchId(
    tx: TransactionClient,
    receipt: {
      tenantId: string;
      matterId?: string | null;
      allocations?: Array<{ invoiceId: string }>;
    },
  ): Promise<string | null> {
    const invoiceIds = Array.from(
      new Set(
        (receipt.allocations ?? [])
          .map((allocation) => allocation.invoiceId)
          .filter(
            (invoiceId): invoiceId is string =>
              typeof invoiceId === 'string' && invoiceId.length > 0,
          ),
      ),
    );

    if (invoiceIds.length > 0) {
      const invoices = await tx.invoice.findMany({
        where: {
          tenantId: receipt.tenantId,
          id: {
            in: invoiceIds,
          },
        },
        select: {
          branchId: true,
        },
      });

      const invoiceBranchIds = Array.from(
        new Set(
          invoices
            .map((invoice: { branchId: string | null }) => invoice.branchId)
            .filter(
              (branchId): branchId is string =>
                typeof branchId === 'string' && branchId.length > 0,
            ),
        ),
      );

      if (invoiceBranchIds.length === 1) {
        return invoiceBranchIds[0];
      }

      if (invoiceBranchIds.length > 1) {
        throw Object.assign(
          new Error(
            'Payment receipt allocations span multiple invoice branches. Split receipt posting by branch before GL posting.',
          ),
          {
            statusCode: 422,
            code: 'PAYMENT_RECEIPT_MULTIPLE_BRANCH_ALLOCATIONS',
            details: {
              invoiceBranchIds,
            },
          },
        );
      }
    }

    const matterDelegate = asFindFirstDelegate((tx as unknown as { matter?: unknown }).matter);

    if (receipt.matterId && matterDelegate) {
      const matter = (await matterDelegate.findFirst({
        where: {
          tenantId: receipt.tenantId,
          id: receipt.matterId,
        },
        select: {
          branchId: true,
        },
      } as never)) as MatterBranchRef | null;

      if (matter?.branchId) {
        return matter.branchId;
      }
    }

    const branchDelegate = asFindFirstDelegate((tx as unknown as { branch?: unknown }).branch);

    if (!branchDelegate) {
      return null;
    }

    const mainBranch =
      ((await branchDelegate.findFirst({
        where: {
          tenantId: receipt.tenantId,
          isMain: true,
        },
        select: {
          id: true,
        },
      } as never)) as BranchRef | null) ??
      ((await branchDelegate.findFirst({
        where: {
          tenantId: receipt.tenantId,
          isDefault: true,
        },
        select: {
          id: true,
        },
      } as never)) as BranchRef | null) ??
      ((await branchDelegate.findFirst({
        where: {
          tenantId: receipt.tenantId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
        },
      } as never)) as BranchRef | null);

    return typeof mainBranch?.id === 'string' ? mainBranch.id : null;
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
  ): Promise<SystemAccountRef> {
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
        return { id: existing.id };
      }

      return tx.chartOfAccount.update({
        where: { id: existing.id, tenantId: input.tenantId },
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
