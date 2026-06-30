// apps/api/src/modules/billing/billing-posting.service.ts

import {
  AccountSubtype,
  AccountType,
  BalanceSide,
  Prisma,
} from '@global-wakili/database';
import { assertPeriodOpen } from '../../utils/period-lock';
import { assertLinesBalanced } from '../../utils/double-entry';

type TransactionClient = Prisma.TransactionClient;

export type BillingPostingInput = {
  tenantId: string;
  invoiceId: string;
  postedById?: string | null;
};

export type BillingReversalInput = BillingPostingInput & {
  reason: string;
  reversalDate?: Date;
};

export type BillingCreditNoteInput = {
  tenantId: string;
  creditNoteId: string;
  postedById?: string | null;
};

export class BillingPostingService {
  async postInvoiceIssued(tx: TransactionClient, input: BillingPostingInput): Promise<void> {
    const existing = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'BILLING',
        sourceEntityType: 'INVOICE',
        sourceEntityId: input.invoiceId,
      },
      select: { id: true },
    });

    if (existing) return;

    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, tenantId: input.tenantId },
      select: {
        id: true,
        invoiceNumber: true,
        clientId: true,
        matterId: true,
        branchId: true,
        balanceDue: true,
        subTotal: true,
        whtAmount: true,
        vatAmount: true,
        total: true,
        issuedDate: true,
        currency: true,
        exchangeRate: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found for billing posting.');
    }

    const arAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '1200',
      name: 'Accounts Receivable - Clients',
      type: AccountType.ASSET,
      subtype: AccountSubtype.ACCOUNTS_RECEIVABLE,
      normalBalance: BalanceSide.DEBIT,
    });

    const whtReceivableAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '1205',
      name: 'Withholding Tax Receivable',
      type: AccountType.ASSET,
      subtype: AccountSubtype.ACCOUNTS_RECEIVABLE,
      normalBalance: BalanceSide.DEBIT,
    });

    const feeIncomeAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '4000',
      name: 'Legal Fees Income',
      type: AccountType.REVENUE,
      subtype: AccountSubtype.LEGAL_FEES_INCOME,
      normalBalance: BalanceSide.CREDIT,
    });

    const vatOutputAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '2100',
      name: 'VAT Output',
      type: AccountType.LIABILITY,
      subtype: AccountSubtype.VAT_OUTPUT,
      normalBalance: BalanceSide.CREDIT,
    });

    const reference = invoice.invoiceNumber;

    await assertPeriodOpen(tx, input.tenantId, invoice.issuedDate);

    assertLinesBalanced([
      { debit: invoice.balanceDue, credit: new Prisma.Decimal(0) },
      { debit: new Prisma.Decimal(0), credit: invoice.subTotal },
      ...(invoice.whtAmount.gt(0)
        ? [{ debit: invoice.whtAmount, credit: new Prisma.Decimal(0) }]
        : []),
      ...(invoice.vatAmount.gt(0)
        ? [{ debit: new Prisma.Decimal(0), credit: invoice.vatAmount }]
        : []),
    ], `BILLING-INVOICE-${invoice.id}`);

    const journal = await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        reference: `BILLING-INVOICE-${invoice.id}`,
        description: `Invoice issued: ${reference}`,
        date: invoice.issuedDate,
        amount: invoice.total,
        postedById: input.postedById ?? null,
        currency: invoice.currency,
        exchangeRate: invoice.exchangeRate,
        sourceModule: 'BILLING',
        sourceEntityType: 'INVOICE',
        sourceEntityId: invoice.id,
        matterId: invoice.matterId,
      },
      select: { id: true },
    });

    const lines: Prisma.JournalLineCreateManyInput[] = [
      {
        tenantId: input.tenantId,
        journalId: journal.id,
        accountId: arAccount.id,
        clientId: invoice.clientId,
        matterId: invoice.matterId,
        branchId: invoice.branchId,
        reference,
        description: `Accounts receivable for invoice ${reference}`,
        debit: invoice.balanceDue,
        credit: new Prisma.Decimal(0),
      },
      {
        tenantId: input.tenantId,
        journalId: journal.id,
        accountId: feeIncomeAccount.id,
        clientId: invoice.clientId,
        matterId: invoice.matterId,
        branchId: invoice.branchId,
        reference,
        description: `Legal fee income for invoice ${reference}`,
        debit: new Prisma.Decimal(0),
        credit: invoice.subTotal,
      },
    ];

    if (invoice.whtAmount.gt(0)) {
      lines.push({
        tenantId: input.tenantId,
        journalId: journal.id,
        accountId: whtReceivableAccount.id,
        clientId: invoice.clientId,
        matterId: invoice.matterId,
        branchId: invoice.branchId,
        reference,
        description: `WHT receivable for invoice ${reference}`,
        debit: invoice.whtAmount,
        credit: new Prisma.Decimal(0),
      });
    }

    if (invoice.vatAmount.gt(0)) {
      lines.push({
        tenantId: input.tenantId,
        journalId: journal.id,
        accountId: vatOutputAccount.id,
        clientId: invoice.clientId,
        matterId: invoice.matterId,
        branchId: invoice.branchId,
        reference,
        description: `VAT output for invoice ${reference}`,
        debit: new Prisma.Decimal(0),
        credit: invoice.vatAmount,
      });
    }

    await tx.journalLine.createMany({ data: lines });
  }

  async reverseInvoiceIssued(tx: TransactionClient, input: BillingReversalInput): Promise<void> {
    const original = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'BILLING',
        sourceEntityType: 'INVOICE',
        sourceEntityId: input.invoiceId,
      },
      include: { lines: true },
    });

    if (!original) return;

    const existingReversal = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'BILLING',
        sourceEntityType: 'INVOICE_REVERSAL',
        sourceEntityId: input.invoiceId,
      },
      select: { id: true },
    });

    if (existingReversal) return;

    const reversalDate = input.reversalDate ?? new Date();
    await assertPeriodOpen(tx, input.tenantId, reversalDate);

    assertLinesBalanced(
      original.lines.map((l) => ({ debit: l.credit, credit: l.debit })),
      `BILLING-INVOICE-REVERSAL-${input.invoiceId}`,
    );

    const reversal = await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        reference: `BILLING-INVOICE-REVERSAL-${input.invoiceId}`,
        description: `Invoice reversal: ${input.reason}`,
        date: reversalDate,
        amount: original.amount,
        postedById: input.postedById ?? null,
        currency: original.currency,
        exchangeRate: original.exchangeRate,
        sourceModule: 'BILLING',
        sourceEntityType: 'INVOICE_REVERSAL',
        sourceEntityId: input.invoiceId,
        reversalOfId: original.id,
        matterId: original.matterId,
      },
      select: { id: true },
    });

    await tx.journalLine.createMany({
      data: original.lines.map((line) => ({
        tenantId: input.tenantId,
        journalId: reversal.id,
        accountId: line.accountId,
        clientId: line.clientId,
        matterId: line.matterId,
        branchId: line.branchId,
        reference: line.reference,
        description: `Reversal: ${line.description ?? ''}`.trim(),
        debit: line.credit,
        credit: line.debit,
      })),
    });
  }

  async postCreditNoteIssued(tx: TransactionClient, input: BillingCreditNoteInput): Promise<void> {
    // Idempotent: skip if a credit-note journal already exists for this source.
    const existing = await tx.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceModule: 'BILLING',
        sourceEntityType: 'CREDIT_NOTE',
        sourceEntityId: input.creditNoteId,
      },
      select: { id: true },
    });
    if (existing) return;

    const cn = await tx.creditNote.findFirst({
      where: { id: input.creditNoteId, tenantId: input.tenantId },
      select: {
        id: true, creditNoteNumber: true, clientId: true, matterId: true,
        subTotal: true, taxAmount: true, totalAmount: true,
        creditDate: true, createdAt: true, currency: true,
      },
    });
    if (!cn) {
      throw new Error('Credit note not found for billing posting.');
    }

    const subTotal = new Prisma.Decimal(cn.subTotal);
    const vatAmount = new Prisma.Decimal(cn.taxAmount);
    const totalAmount = new Prisma.Decimal(cn.totalAmount);

    const arAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '1200',
      name: 'Accounts Receivable - Clients',
      type: AccountType.ASSET,
      subtype: AccountSubtype.ACCOUNTS_RECEIVABLE,
      normalBalance: BalanceSide.DEBIT,
    });

    const feeIncomeAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '4000',
      name: 'Legal Fees Income',
      type: AccountType.REVENUE,
      subtype: AccountSubtype.LEGAL_FEES_INCOME,
      normalBalance: BalanceSide.CREDIT,
    });

    const vatOutputAccount = await this.ensureSystemAccount(tx, {
      tenantId: input.tenantId,
      code: '2100',
      name: 'VAT Output',
      type: AccountType.LIABILITY,
      subtype: AccountSubtype.VAT_OUTPUT,
      normalBalance: BalanceSide.CREDIT,
    });

    const reference = cn.creditNoteNumber ?? cn.id;
    const date = cn.creditDate ?? cn.createdAt ?? new Date();

    await assertPeriodOpen(tx, input.tenantId, date);

    // Reversal of invoice issuance: DR income (contra-revenue) + DR VAT output, CR AR.
    assertLinesBalanced([
      { debit: subTotal, credit: new Prisma.Decimal(0) },
      ...(vatAmount.gt(0)
        ? [{ debit: vatAmount, credit: new Prisma.Decimal(0) }]
        : []),
      { debit: new Prisma.Decimal(0), credit: totalAmount },
    ], `BILLING-CREDIT-NOTE-${cn.id}`);

    const journal = await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        reference: `BILLING-CREDIT-NOTE-${cn.id}`,
        description: `Credit note issued: ${reference}`,
        date,
        amount: totalAmount,
        postedById: input.postedById ?? null,
        currency: cn.currency ?? 'KES',
        sourceModule: 'BILLING',
        sourceEntityType: 'CREDIT_NOTE',
        sourceEntityId: cn.id,
        matterId: cn.matterId,
      },
      select: { id: true },
    });

    const lines: Prisma.JournalLineCreateManyInput[] = [
      {
        tenantId: input.tenantId,
        journalId: journal.id,
        accountId: feeIncomeAccount.id,
        clientId: cn.clientId,
        matterId: cn.matterId,
        reference,
        description: `Revenue reversal for credit note ${reference}`,
        debit: subTotal,
        credit: new Prisma.Decimal(0),
      },
      {
        tenantId: input.tenantId,
        journalId: journal.id,
        accountId: arAccount.id,
        clientId: cn.clientId,
        matterId: cn.matterId,
        reference,
        description: `Reduce receivable via credit note ${reference}`,
        debit: new Prisma.Decimal(0),
        credit: totalAmount,
      },
    ];

    if (vatAmount.gt(0)) {
      lines.push({
        tenantId: input.tenantId,
        journalId: journal.id,
        accountId: vatOutputAccount.id,
        clientId: cn.clientId,
        matterId: cn.matterId,
        reference,
        description: `Output VAT reversal for credit note ${reference}`,
        debit: vatAmount,
        credit: new Prisma.Decimal(0),
      });
    }

    await tx.journalLine.createMany({ data: lines });
    // NOTE: idempotency is enforced by the journal-existence check above
    // (sourceModule BILLING / sourceEntityType CREDIT_NOTE / sourceEntityId).
    // The CreditNote model has no journalEntryId/postedAt columns to stamp.
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

export const billingPostingService = new BillingPostingService();

export default BillingPostingService;