// apps/api/src/modules/billing/billing-posting.service.ts

import {
  AccountSubtype,
  AccountType,
  BalanceSide,
  Prisma,
} from '@global-wakili/database';

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
      include: { matter: true },
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

    const lines: Prisma.JournalLineCreateWithoutJournalInput[] = [
      {
        tenantId: input.tenantId,
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

    await tx.journalEntry.create({
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
        lines: { create: lines },
      },
    });
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

    await tx.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        reference: `BILLING-INVOICE-REVERSAL-${input.invoiceId}`,
        description: `Invoice reversal: ${input.reason}`,
        date: input.reversalDate ?? new Date(),
        amount: original.amount,
        postedById: input.postedById ?? null,
        currency: original.currency,
        exchangeRate: original.exchangeRate,
        sourceModule: 'BILLING',
        sourceEntityType: 'INVOICE_REVERSAL',
        sourceEntityId: input.invoiceId,
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

export const billingPostingService = new BillingPostingService();

export default BillingPostingService;