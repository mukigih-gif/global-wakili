// apps/api/src/modules/finance/FinancePostingService.ts

import { Prisma, prisma } from '@global-wakili/database';

import { GeneralLedgerService } from './GeneralLedgerService';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

const ZERO = new Prisma.Decimal(0);

export type FinancePostingSource =
  | 'BILLING_INVOICE'
  | 'PAYMENT_RECEIPT'
  | 'CREDIT_NOTE'
  | 'RETAINER_RECEIPT'
  | 'RETAINER_APPLICATION'
  | 'PAYROLL_BATCH'
  | 'VENDOR_BILL'
  | 'VENDOR_PAYMENT'
  | 'VAT_ADJUSTMENT'
  | 'WHT_CERTIFICATE';

export type FinancePostingInput = {
  tenantId: string;
  actorId: string;
  source: FinancePostingSource;
  sourceId: string;
  force?: boolean;
  req?: any;
  metadata?: Record<string, unknown>;
};

export type PostingLine = {
  accountId: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  description: string;
  clientId?: string | null;
  matterId?: string | null;
  branchId?: string | null;
  reference?: string | null;
};

type AccountPurpose =
  | 'ACCOUNTS_RECEIVABLE'
  | 'OFFICE_BANK'
  | 'LEGAL_FEES_INCOME'
  | 'VAT_OUTPUT'
  | 'VAT_INPUT'
  | 'WHT_RECEIVABLE'
  | 'RETAINER_LIABILITY'
  | 'PAYROLL_EXPENSE'
  | 'PAYROLL_LIABILITY'
  | 'ACCOUNTS_PAYABLE'
  | 'CREDIT_NOTE_CONTRA_REVENUE'
  | 'EXPENSE';

const ACCOUNT_CANDIDATES: Record<AccountPurpose, Array<{
  code?: string;
  name?: string;
  type?: string;
}>> = {
  ACCOUNTS_RECEIVABLE: [
    { code: '1200' },
    { name: 'Accounts Receivable' },
    { name: 'Trade Receivables' },
  ],
  OFFICE_BANK: [
    { code: '1000' },
    { name: 'Office Bank Account' },
    { name: 'Bank Account' },
  ],
  LEGAL_FEES_INCOME: [
    { code: '4000' },
    { name: 'Legal Fees Income' },
    { name: 'Professional Fees Income' },
  ],
  VAT_OUTPUT: [
    { code: '2100' },
    { name: 'VAT Output' },
    { name: 'Output VAT' },
  ],
  VAT_INPUT: [
    { code: '1300' },
    { name: 'VAT Input' },
    { name: 'Input VAT' },
  ],
  WHT_RECEIVABLE: [
    { code: '1350' },
    { name: 'WHT Receivable' },
    { name: 'Withholding Tax Receivable' },
  ],
  RETAINER_LIABILITY: [
    { code: '2200' },
    { name: 'Client Retainer Liability' },
    { name: 'Retainer Liability' },
  ],
  PAYROLL_EXPENSE: [
    { code: '5100' },
    { name: 'Payroll Expense' },
    { name: 'Salaries and Wages' },
  ],
  PAYROLL_LIABILITY: [
    { code: '2300' },
    { name: 'Payroll Liability' },
    { name: 'Payroll Payable' },
  ],
  ACCOUNTS_PAYABLE: [
    { code: '2000' },
    { name: 'Accounts Payable' },
    { name: 'Trade Payables' },
  ],
  CREDIT_NOTE_CONTRA_REVENUE: [
    { code: '4090' },
    { name: 'Credit Note Contra Revenue' },
    { name: 'Sales Returns and Allowances' },
  ],
  EXPENSE: [
    { code: '5000' },
    { name: 'General Expense' },
    { name: 'Operating Expense' },
  ],
};

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply Finance schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'FINANCE_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate;
}

function optionalDelegate(db: DbClient, name: string) {
  return db[name] ?? null;
}

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) return ZERO;

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function journalReference(prefix: string, record: any) {
  const ref =
    record.invoiceNumber ??
    record.receiptNumber ??
    record.creditNoteNumber ??
    record.retainerNumber ??
    record.batchNumber ??
    record.billNumber ??
    record.reference ??
    record.id;

  return `${prefix}-${ref}`;
}

function removeZeroLines(lines: PostingLine[]) {
  return lines.filter((line) => !line.debit.eq(0) || !line.credit.eq(0));
}

function validateBalanced(lines: PostingLine[]) {
  const totals = lines.reduce(
    (acc, line) => ({
      debit: acc.debit.plus(line.debit),
      credit: acc.credit.plus(line.credit),
    }),
    {
      debit: ZERO,
      credit: ZERO,
    },
  );

  if (!totals.debit.eq(totals.credit)) {
    throw Object.assign(new Error('Posting journal is not balanced'), {
      statusCode: 422,
      code: 'FINANCE_POSTING_UNBALANCED',
      totalDebit: totals.debit.toString(),
      totalCredit: totals.credit.toString(),
      variance: totals.debit.minus(totals.credit).toString(),
    });
  }

  if (totals.debit.eq(0)) {
    throw Object.assign(new Error('Posting journal has zero value'), {
      statusCode: 422,
      code: 'FINANCE_POSTING_ZERO_VALUE',
    });
  }

  return totals;
}

export class FinancePostingService {
  static async post(input: FinancePostingInput) {
    return new FinancePostingService().post(input);
  }

  async post(input: FinancePostingInput) {
    switch (input.source) {
      case 'BILLING_INVOICE':
        return this.postInvoice(input);
      case 'PAYMENT_RECEIPT':
        return this.postPaymentReceipt(input);
      case 'CREDIT_NOTE':
        return this.postCreditNote(input);
      case 'RETAINER_RECEIPT':
        return this.postRetainerReceipt(input);
      case 'RETAINER_APPLICATION':
        return this.postRetainerApplication(input);
      case 'PAYROLL_BATCH':
        return this.postPayrollBatch(input);
      case 'VENDOR_BILL':
        return this.postVendorBill(input);
      case 'VENDOR_PAYMENT':
        return this.postVendorPayment(input);
      default:
        throw Object.assign(new Error(`Unsupported finance posting source: ${input.source}`), {
          statusCode: 422,
          code: 'UNSUPPORTED_FINANCE_POSTING_SOURCE',
          source: input.source,
        });
    }
  }

  async postInvoice(input: FinancePostingInput) {
    const invoice = delegate(prisma, 'invoice');

    const record = await invoice.findFirst({
      where: {
        id: input.sourceId,
        tenantId: input.tenantId,
      },
    });

    if (!record) {
      throw Object.assign(new Error('Invoice not found for posting'), {
        statusCode: 404,
        code: 'POSTING_INVOICE_NOT_FOUND',
      });
    }

    this.assertNotAlreadyPosted(record, input.force);

    const totalAmount = money(record.totalAmount ?? record.grandTotal ?? 0);
    const taxAmount = money(record.taxAmount ?? record.vatAmount ?? 0);
    const revenueAmount = totalAmount.minus(taxAmount).toDecimalPlaces(2);

    const lines = removeZeroLines([
      await this.line(input.tenantId, 'ACCOUNTS_RECEIVABLE', totalAmount, ZERO, 'Invoice receivable', record),
      await this.line(input.tenantId, 'LEGAL_FEES_INCOME', ZERO, revenueAmount, 'Legal fees income', record),
      await this.line(input.tenantId, 'VAT_OUTPUT', ZERO, taxAmount, 'Output VAT', record),
    ]);

    const journal = await this.postJournal(input, {
      reference: journalReference('INV', record),
      description: `Post billing invoice ${record.invoiceNumber ?? record.id}`,
      date: record.invoiceDate ?? record.createdAt ?? new Date(),
      sourceEntityType: 'Invoice',
      sourceEntityId: record.id,
      sourceModule: 'BILLING',
      lines,
    });

    await invoice.update({
      where: { id: record.id },
      data: {
        journalEntryId: journal.id ?? journal.journalEntryId ?? null,
        postedAt: new Date(),
        postedById: input.actorId,
        metadata: {
          ...asRecord(record.metadata),
          financePosting: {
            journalEntryId: journal.id ?? journal.journalEntryId ?? null,
            postedAt: new Date().toISOString(),
            postedById: input.actorId,
          },
        },
      },
    });

    return journal;
  }

  async postPaymentReceipt(input: FinancePostingInput) {
    const paymentReceipt = delegate(prisma, 'paymentReceipt');

    const record = await paymentReceipt.findFirst({
      where: {
        id: input.sourceId,
        tenantId: input.tenantId,
      },
    });

    if (!record) {
      throw Object.assign(new Error('Payment receipt not found for posting'), {
        statusCode: 404,
        code: 'POSTING_PAYMENT_RECEIPT_NOT_FOUND',
      });
    }

    this.assertNotAlreadyPosted(record, input.force);

    const grossAmount = money(record.grossAmount ?? record.amount ?? record.totalAmount ?? 0);
    const whtAmount = money(record.whtAmount ?? record.withholdingTaxAmount ?? record.whtExposure ?? 0);
    const bankAmount = grossAmount.minus(whtAmount).toDecimalPlaces(2);

    const lines = removeZeroLines([
      await this.line(input.tenantId, 'OFFICE_BANK', bankAmount, ZERO, 'Payment received into office bank', record),
      await this.line(input.tenantId, 'WHT_RECEIVABLE', whtAmount, ZERO, 'Withholding tax receivable', record),
      await this.line(input.tenantId, 'ACCOUNTS_RECEIVABLE', ZERO, grossAmount, 'Reduce accounts receivable', record),
    ]);

    const journal = await this.postJournal(input, {
      reference: journalReference('RCPT', record),
      description: `Post payment receipt ${record.receiptNumber ?? record.id}`,
      date: record.receiptDate ?? record.paymentDate ?? record.createdAt ?? new Date(),
      sourceEntityType: 'PaymentReceipt',
      sourceEntityId: record.id,
      sourceModule: 'PAYMENTS',
      lines,
    });

    await paymentReceipt.update({
      where: { id: record.id },
      data: {
        journalEntryId: journal.id ?? journal.journalEntryId ?? null,
        postedAt: new Date(),
        postedById: input.actorId,
        metadata: {
          ...asRecord(record.metadata),
          financePosting: {
            journalEntryId: journal.id ?? journal.journalEntryId ?? null,
            postedAt: new Date().toISOString(),
            postedById: input.actorId,
          },
        },
      },
    });

    return journal;
  }

  async postCreditNote(input: FinancePostingInput) {
    const creditNote = delegate(prisma, 'creditNote');

    const record = await creditNote.findFirst({
      where: {
        id: input.sourceId,
        tenantId: input.tenantId,
      },
    });

    if (!record) {
      throw Object.assign(new Error('Credit note not found for posting'), {
        statusCode: 404,
        code: 'POSTING_CREDIT_NOTE_NOT_FOUND',
      });
    }

    this.assertNotAlreadyPosted(record, input.force);

    const totalAmount = money(record.totalAmount ?? record.amount ?? 0);
    const taxAmount = money(record.taxAmount ?? record.vatAmount ?? 0);
    const revenueAmount = totalAmount.minus(taxAmount).toDecimalPlaces(2);

    const lines = removeZeroLines([
      await this.line(input.tenantId, 'CREDIT_NOTE_CONTRA_REVENUE', revenueAmount, ZERO, 'Credit note revenue reversal', record),
      await this.line(input.tenantId, 'VAT_OUTPUT', taxAmount, ZERO, 'Output VAT reversal', record),
      await this.line(input.tenantId, 'ACCOUNTS_RECEIVABLE', ZERO, totalAmount, 'Reduce receivable through credit note', record),
    ]);

    const journal = await this.postJournal(input, {
      reference: journalReference('CN', record),
      description: `Post credit note ${record.creditNoteNumber ?? record.id}`,
      date: record.creditDate ?? record.createdAt ?? new Date(),
      sourceEntityType: 'CreditNote',
      sourceEntityId: record.id,
      sourceModule: 'BILLING',
      lines,
    });

    await creditNote.update({
      where: { id: record.id },
      data: {
        journalEntryId: journal.id ?? journal.journalEntryId ?? null,
        postedAt: new Date(),
        postedById: input.actorId,
      },
    });

    return journal;
  }

  async postRetainerReceipt(input: FinancePostingInput) {
    const retainer = delegate(prisma, 'retainer');

    const record = await retainer.findFirst({
      where: {
        id: input.sourceId,
        tenantId: input.tenantId,
      },
    });

    if (!record) {
      throw Object.assign(new Error('Retainer not found for posting'), {
        statusCode: 404,
        code: 'POSTING_RETAINER_NOT_FOUND',
      });
    }

    this.assertNotAlreadyPosted(record, input.force);

    const amount = money(record.amount ?? record.totalAmount ?? 0);

    const lines = removeZeroLines([
      await this.line(input.tenantId, 'OFFICE_BANK', amount, ZERO, 'Retainer received', record),
      await this.line(input.tenantId, 'RETAINER_LIABILITY', ZERO, amount, 'Client retainer liability', record),
    ]);

    const journal = await this.postJournal(input, {
      reference: journalReference('RET', record),
      description: `Post retainer receipt ${record.retainerNumber ?? record.id}`,
      date: record.receivedAt ?? record.createdAt ?? new Date(),
      sourceEntityType: 'Retainer',
      sourceEntityId: record.id,
      sourceModule: 'BILLING',
      lines,
    });

    await retainer.update({
      where: { id: record.id },
      data: {
        journalEntryId: journal.id ?? journal.journalEntryId ?? null,
        postedAt: new Date(),
        postedById: input.actorId,
      },
    });

    return journal;
  }

  async postRetainerApplication(input: FinancePostingInput) {
    const retainerApplication = delegate(prisma, 'retainerApplication');

    const record = await retainerApplication.findFirst({
      where: {
        id: input.sourceId,
        tenantId: input.tenantId,
      },
    });

    if (!record) {
      throw Object.assign(new Error('Retainer application not found for posting'), {
        statusCode: 404,
        code: 'POSTING_RETAINER_APPLICATION_NOT_FOUND',
      });
    }

    this.assertNotAlreadyPosted(record, input.force);

    const amount = money(record.amount ?? 0);

    const lines = removeZeroLines([
      await this.line(input.tenantId, 'RETAINER_LIABILITY', amount, ZERO, 'Apply retainer liability', record),
      await this.line(input.tenantId, 'ACCOUNTS_RECEIVABLE', ZERO, amount, 'Reduce receivable by retainer application', record),
    ]);

    const journal = await this.postJournal(input, {
      reference: journalReference('RET-APP', record),
      description: `Post retainer application ${record.id}`,
      date: record.appliedAt ?? record.createdAt ?? new Date(),
      sourceEntityType: 'RetainerApplication',
      sourceEntityId: record.id,
      sourceModule: 'BILLING',
      lines,
    });

    await retainerApplication.update({
      where: { id: record.id },
      data: {
        journalEntryId: journal.id ?? journal.journalEntryId ?? null,
        postedAt: new Date(),
        postedById: input.actorId,
      },
    });

    return journal;
  }

  async postPayrollBatch(input: FinancePostingInput) {
    const payrollBatch = delegate(prisma, 'payrollBatch');

    const record = await payrollBatch.findFirst({
      where: {
        id: input.sourceId,
        tenantId: input.tenantId,
      },
    });

    if (!record) {
      throw Object.assign(new Error('Payroll batch not found for posting'), {
        statusCode: 404,
        code: 'POSTING_PAYROLL_BATCH_NOT_FOUND',
      });
    }

    this.assertNotAlreadyPosted(record, input.force);

    const grossPay = money(record.grossPay ?? record.totalGrossPay ?? record.totalEarnings ?? 0);
    const employerCost = money(record.employerCost ?? record.totalEmployerCost ?? 0);
    const totalExpense = grossPay.plus(employerCost).toDecimalPlaces(2);

    const netPay = money(record.netPay ?? record.totalNetPay ?? 0);
    const statutory = totalExpense.minus(netPay).toDecimalPlaces(2);

    const lines = removeZeroLines([
      await this.line(input.tenantId, 'PAYROLL_EXPENSE', totalExpense, ZERO, 'Payroll expense', record),
      await this.line(input.tenantId, 'PAYROLL_LIABILITY', ZERO, netPay.plus(statutory), 'Payroll payable and statutory liabilities', record),
    ]);

    const journal = await this.postJournal(input, {
      reference: journalReference('PAYROLL', record),
      description: `Post payroll batch ${record.batchNumber ?? record.id}`,
      date: record.postingDate ?? record.periodEnd ?? record.createdAt ?? new Date(),
      sourceEntityType: 'PayrollBatch',
      sourceEntityId: record.id,
      sourceModule: 'PAYROLL',
      lines,
    });

    await payrollBatch.update({
      where: { id: record.id },
      data: {
        journalEntryId: journal.id ?? journal.journalEntryId ?? null,
        postedAt: new Date(),
        postedById: input.actorId,
      },
    });

    return journal;
  }

  async postVendorBill(input: FinancePostingInput) {
    const vendorBill = delegate(prisma, 'vendorBill');

    const record = await vendorBill.findFirst({
      where: {
        id: input.sourceId,
        tenantId: input.tenantId,
      },
    });

    if (!record) {
      throw Object.assign(new Error('Vendor bill not found for posting'), {
        statusCode: 404,
        code: 'POSTING_VENDOR_BILL_NOT_FOUND',
      });
    }

    this.assertNotAlreadyPosted(record, input.force);

    const totalAmount = money(record.totalAmount ?? record.amount ?? 0);
    const inputVat = money(record.taxAmount ?? record.vatAmount ?? 0);
    const expenseAmount = totalAmount.minus(inputVat).toDecimalPlaces(2);

    const lines = removeZeroLines([
      await this.line(input.tenantId, 'EXPENSE', expenseAmount, ZERO, 'Vendor bill expense', record),
      await this.line(input.tenantId, 'VAT_INPUT', inputVat, ZERO, 'Input VAT', record),
      await this.line(input.tenantId, 'ACCOUNTS_PAYABLE', ZERO, totalAmount, 'Vendor payable', record),
    ]);

    const journal = await this.postJournal(input, {
      reference: journalReference('VB', record),
      description: `Post vendor bill ${record.billNumber ?? record.id}`,
      date: record.billDate ?? record.createdAt ?? new Date(),
      sourceEntityType: 'VendorBill',
      sourceEntityId: record.id,
      sourceModule: 'PROCUREMENT',
      lines,
    });

    await vendorBill.update({
      where: { id: record.id },
      data: {
        journalEntryId: journal.id ?? journal.journalEntryId ?? null,
        postedAt: new Date(),
        postedById: input.actorId,
      },
    });

    return journal;
  }

  async postVendorPayment(input: FinancePostingInput) {
    const vendorPayment = delegate(prisma, 'vendorPayment');

    const record = await vendorPayment.findFirst({
      where: {
        id: input.sourceId,
        tenantId: input.tenantId,
      },
    });

    if (!record) {
      throw Object.assign(new Error('Vendor payment not found for posting'), {
        statusCode: 404,
        code: 'POSTING_VENDOR_PAYMENT_NOT_FOUND',
      });
    }

    this.assertNotAlreadyPosted(record, input.force);

    const amount = money(record.amount ?? record.totalAmount ?? 0);

    const lines = removeZeroLines([
      await this.line(input.tenantId, 'ACCOUNTS_PAYABLE', amount, ZERO, 'Reduce vendor payable', record),
      await this.line(input.tenantId, 'OFFICE_BANK', ZERO, amount, 'Vendor payment from office bank', record),
    ]);

    const journal = await this.postJournal(input, {
      reference: journalReference('VPAY', record),
      description: `Post vendor payment ${record.reference ?? record.id}`,
      date: record.paymentDate ?? record.createdAt ?? new Date(),
      sourceEntityType: 'VendorPayment',
      sourceEntityId: record.id,
      sourceModule: 'PROCUREMENT',
      lines,
    });

    await vendorPayment.update({
      where: { id: record.id },
      data: {
        journalEntryId: journal.id ?? journal.journalEntryId ?? null,
        postedAt: new Date(),
        postedById: input.actorId,
      },
    });

    return journal;
  }

  private async line(
    tenantId: string,
    purpose: AccountPurpose,
    debit: Prisma.Decimal,
    credit: Prisma.Decimal,
    description: string,
    sourceRecord: any,
  ): Promise<PostingLine> {
    const account = await this.resolveAccount(tenantId, purpose);

    return {
      accountId: account.id,
      debit: debit.toDecimalPlaces(2),
      credit: credit.toDecimalPlaces(2),
      description,
      clientId: sourceRecord.clientId ?? null,
      matterId: sourceRecord.matterId ?? null,
      branchId: sourceRecord.branchId ?? null,
      reference:
        sourceRecord.invoiceNumber ??
        sourceRecord.receiptNumber ??
        sourceRecord.creditNoteNumber ??
        sourceRecord.retainerNumber ??
        sourceRecord.batchNumber ??
        sourceRecord.reference ??
        null,
    };
  }

  private async resolveAccount(tenantId: string, purpose: AccountPurpose) {
    const chartOfAccount = delegate(prisma, 'chartOfAccount');
    const candidates = ACCOUNT_CANDIDATES[purpose];

    for (const candidate of candidates) {
      const found = await chartOfAccount.findFirst({
        where: {
          tenantId,
          isActive: true,
          ...(candidate.code ? { code: candidate.code } : {}),
          ...(candidate.name
            ? { name: { contains: candidate.name, mode: 'insensitive' } }
            : {}),
          ...(candidate.type ? { type: candidate.type } : {}),
        },
      });

      if (found) return found;
    }

    throw Object.assign(new Error(`Finance posting account not configured for ${purpose}`), {
      statusCode: 422,
      code: 'FINANCE_POSTING_ACCOUNT_MISSING',
      purpose,
      candidates,
    });
  }

  private assertNotAlreadyPosted(record: any, force?: boolean) {
    if (!force && (record.journalEntryId || record.postedAt)) {
      throw Object.assign(new Error('Source record has already been posted to finance'), {
        statusCode: 409,
        code: 'FINANCE_SOURCE_ALREADY_POSTED',
        journalEntryId: record.journalEntryId ?? null,
        postedAt: record.postedAt ?? null,
      });
    }
  }

  private async postJournal(
    input: FinancePostingInput,
    journal: {
      reference: string;
      description: string;
      date: Date;
      sourceModule: string;
      sourceEntityType: string;
      sourceEntityId: string;
      lines: PostingLine[];
    },
  ) {
    const lines = removeZeroLines(journal.lines);
    const totals = validateBalanced(lines);

    const requestLike = {
      ...(input.req ?? {}),
      db: input.req?.db ?? prisma,
      tenantId: input.tenantId,
      user: {
        ...(input.req?.user ?? {}),
        id: input.actorId,
      },
      headers: input.req?.headers ?? {},
    };

    const payload = {
      tenantId: input.tenantId,
      actorId: input.actorId,
      reference: journal.reference,
      description: journal.description,
      date: journal.date,
      currency: 'KES',
      sourceModule: journal.sourceModule,
      sourceEntityType: journal.sourceEntityType,
      sourceEntityId: journal.sourceEntityId,
      lines: lines.map((line) => ({
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
        clientId: line.clientId ?? null,
        matterId: line.matterId ?? null,
        branchId: line.branchId ?? null,
        reference: line.reference ?? journal.reference,
      })),
      metadata: {
        ...(input.metadata ?? {}),
        generatedBy: 'FinancePostingService',
        sourceModule: journal.sourceModule,
        sourceEntityType: journal.sourceEntityType,
        sourceEntityId: journal.sourceEntityId,
        totalDebit: totals.debit.toString(),
        totalCredit: totals.credit.toString(),
      },
    };

    const gl = GeneralLedgerService as any;

    if (typeof gl.postJournal === 'function') {
      return gl.postJournal(requestLike, payload);
    }

    const journalEntry = optionalDelegate(prisma, 'journalEntry');

    if (!journalEntry) {
      return {
        persisted: false,
        ...payload,
        id: null,
        warning: 'GeneralLedgerService.postJournal and journalEntry delegate are unavailable.',
      };
    }

    return journalEntry.create({
      data: {
        tenantId: input.tenantId,
        reference: journal.reference,
        description: journal.description,
        date: journal.date,
        currency: 'KES',
        sourceModule: journal.sourceModule,
        sourceEntityType: journal.sourceEntityType,
        sourceEntityId: journal.sourceEntityId,
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        status: 'POSTED',
        postedAt: new Date(),
        postedById: input.actorId,
        metadata: payload.metadata,
        lines: {
          create: payload.lines.map((line) => ({
            tenantId: input.tenantId,
            ...line,
          })),
        },
      },
    });
  }
}

export const financePostingService = new FinancePostingService();

export default FinancePostingService;