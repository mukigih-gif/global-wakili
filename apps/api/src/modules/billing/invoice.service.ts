// apps/api/src/modules/billing/invoice.service.ts

import {
  InvoiceStatus,
  Prisma,
  TimeEntryStatus,
  prisma,
} from '@global-wakili/database';

import { BillingRulesEngine, billingRulesEngine } from './BillingRulesEngine';
import {
  BILLING_DEFAULTS,
  type CreateInvoiceFromTimeEntriesInput,
  type CreateManualInvoiceInput,
  type InvoiceWithRelations,
  type ListInvoicesInput,
} from './billing.types';
import { InvoiceNumberService, invoiceNumberService } from './invoice-number.service';
import { BillingPostingService, billingPostingService } from './billing-posting.service';

export class InvoiceService {
  constructor(
    private readonly rules: BillingRulesEngine = billingRulesEngine,
    private readonly numbers: InvoiceNumberService = invoiceNumberService,
    private readonly posting: BillingPostingService = billingPostingService,
  ) {}

  async listInvoices(input: ListInvoicesInput): Promise<InvoiceWithRelations[]> {
    const take = Math.min(
      input.take ?? BILLING_DEFAULTS.maxBillingPageSize,
      BILLING_DEFAULTS.maxBillingPageSize,
    );

    return prisma.invoice.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.matterId ? { matterId: input.matterId } : {}),
        ...(input.branchId ? { branchId: input.branchId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.search
          ? {
              OR: [
                { invoiceNumber: { contains: input.search, mode: 'insensitive' } },
                { kraControlNumber: { contains: input.search, mode: 'insensitive' } },
                { etimsReference: { contains: input.search, mode: 'insensitive' } },
                { matter: { title: { contains: input.search, mode: 'insensitive' } } },
                { matter: { caseNumber: { contains: input.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
        ...(input.issuedFrom || input.issuedTo
          ? {
              issuedDate: {
                ...(input.issuedFrom ? { gte: input.issuedFrom } : {}),
                ...(input.issuedTo ? { lte: input.issuedTo } : {}),
              },
            }
          : {}),
        ...(input.dueFrom || input.dueTo
          ? {
              dueDate: {
                ...(input.dueFrom ? { gte: input.dueFrom } : {}),
                ...(input.dueTo ? { lte: input.dueTo } : {}),
              },
            }
          : {}),
      },
      include: this.invoiceInclude(),
      orderBy: [{ issuedDate: 'desc' }, { createdAt: 'desc' }],
      take,
      skip: input.skip ?? 0,
    });
  }

  async getInvoiceById(tenantId: string, invoiceId: string): Promise<InvoiceWithRelations> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: this.invoiceInclude(),
    });

    if (!invoice) {
      throw new Error('Invoice not found.');
    }

    return invoice;
  }

  async createManualInvoice(input: CreateManualInvoiceInput): Promise<InvoiceWithRelations> {
    const matter = await this.rules.getMatterSnapshot(input.tenantId, input.matterId);
    const issuedDate = input.issuedDate ?? new Date();
    const dueDate = this.rules.calculateDueDate(issuedDate, input.dueDate);

    const computation = this.rules.calculateInvoice({
      lines: input.lines.map((line) => ({
        ...line,
        matterId: line.matterId ?? matter.id,
        clientId: line.clientId ?? matter.clientId,
      })),
      currency: input.currency ?? matter.client.currency ?? BILLING_DEFAULTS.currency,
      exchangeRate: input.exchangeRate,
      clientTaxExempt: matter.client.taxExempt,
    });

    this.rules.assertInvoiceTotalsSafe(computation);

    return prisma.$transaction(async (tx) => {
      const allocation = await this.numbers.allocateInvoiceNumber(tx, {
        tenantId: input.tenantId,
        issuedDate,
      });

      const created = await tx.invoice.create({
        data: {
          invoiceNumber: allocation.invoiceNumber,
          tenantId: input.tenantId,
          matterId: matter.id,
          clientId: matter.clientId,
          branchId: input.branchId ?? matter.branchId,
          total: computation.total,
          taxAmount: computation.taxAmount,
          vatAmount: computation.vatAmount,
          whtAmount: computation.whtAmount,
          balanceDue: computation.balanceDue,
          subTotal: computation.subTotal,
          paidAmount: new Prisma.Decimal(0),
          currency: computation.currency,
          exchangeRate: computation.exchangeRate,
          netAmount: computation.netAmount,
          status: InvoiceStatus.INVOICED,
          issuedDate,
          dueDate,
          lines: {
            create: computation.lines.map((line) => ({
              tenantId: input.tenantId,
              matterId: line.matterId ?? matter.id,
              clientId: line.clientId ?? matter.clientId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              subTotal: line.subTotal,
              taxRate: line.taxRate,
              taxMode: line.taxMode,
              taxInclusive: line.taxInclusive,
              taxAmount: line.taxAmount,
              isWhtApplicable: line.isWhtApplicable,
              whtRate: line.whtRate,
              whtAmount: line.whtAmount,
              sourceType: line.sourceType,
              sourceId: line.sourceId,
              total: line.total,
            })),
          },
        },
        include: this.invoiceInclude(),
      });

      await this.posting.postInvoiceIssued(tx, {
        tenantId: input.tenantId,
        invoiceId: created.id,
        postedById: input.createdById,
      });

      return created;
    });
  }

  async createInvoiceFromApprovedTimeEntries(
    input: CreateInvoiceFromTimeEntriesInput,
  ): Promise<InvoiceWithRelations> {
    const matter = await this.rules.getMatterSnapshot(input.tenantId, input.matterId);

    const timeEntries = await this.rules.getApprovedBillableTimeEntries({
      tenantId: input.tenantId,
      matterId: input.matterId,
      timeEntryIds: input.timeEntryIds,
    });

    const issuedDate = input.issuedDate ?? new Date();
    const dueDate = this.rules.calculateDueDate(issuedDate, input.dueDate);

    const invoiceLineInputs = this.rules.linesFromTimeEntries(timeEntries).map((line) => ({
      ...line,
      clientId: matter.clientId,
    }));

    const computation = this.rules.calculateInvoice({
      lines: invoiceLineInputs,
      currency: input.currency ?? matter.client.currency ?? BILLING_DEFAULTS.currency,
      exchangeRate: input.exchangeRate,
      clientTaxExempt: matter.client.taxExempt,
    });

    this.rules.assertInvoiceTotalsSafe(computation);

    return prisma.$transaction(async (tx) => {
      const allocation = await this.numbers.allocateInvoiceNumber(tx, {
        tenantId: input.tenantId,
        issuedDate,
      });

      const created = await tx.invoice.create({
        data: {
          invoiceNumber: allocation.invoiceNumber,
          tenantId: input.tenantId,
          matterId: matter.id,
          clientId: matter.clientId,
          branchId: input.branchId ?? matter.branchId,
          total: computation.total,
          taxAmount: computation.taxAmount,
          vatAmount: computation.vatAmount,
          whtAmount: computation.whtAmount,
          balanceDue: computation.balanceDue,
          subTotal: computation.subTotal,
          paidAmount: new Prisma.Decimal(0),
          currency: computation.currency,
          exchangeRate: computation.exchangeRate,
          netAmount: computation.netAmount,
          status: InvoiceStatus.INVOICED,
          issuedDate,
          dueDate,
          lines: {
            create: computation.lines.map((line) => ({
              tenantId: input.tenantId,
              matterId: matter.id,
              clientId: matter.clientId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              subTotal: line.subTotal,
              taxRate: line.taxRate,
              taxMode: line.taxMode,
              taxInclusive: line.taxInclusive,
              taxAmount: line.taxAmount,
              isWhtApplicable: line.isWhtApplicable,
              whtRate: line.whtRate,
              whtAmount: line.whtAmount,
              sourceType: line.sourceType,
              sourceId: line.sourceId,
              total: line.total,
            })),
          },
        },
        include: this.invoiceInclude(),
      });

      await tx.timeEntry.updateMany({
        where: {
          tenantId: input.tenantId,
          matterId: matter.id,
          id: { in: timeEntries.map((entry) => entry.id) },
          status: TimeEntryStatus.APPROVED,
          isBillable: true,
          isInvoiced: false,
        },
        data: {
          invoiceId: created.id,
          isInvoiced: true,
          status: TimeEntryStatus.BILLED,
        },
      });

      await tx.unbilledWip.upsert({
        where: { matterId: matter.id },
        update: {
          timeEntryCount: { decrement: timeEntries.length },
          totalUnbilledAmount: { decrement: computation.subTotal },
          lastUpdatedAt: new Date(),
        },
        create: {
          tenantId: input.tenantId,
          matterId: matter.id,
          timeEntryCount: 0,
          totalHours: new Prisma.Decimal(0),
          totalUnbilledAmount: new Prisma.Decimal(0),
        },
      });

      await this.posting.postInvoiceIssued(tx, {
        tenantId: input.tenantId,
        invoiceId: created.id,
        postedById: input.createdById,
      });

      return created;
    });
  }

  async cancelInvoice(input: {
    tenantId: string;
    invoiceId: string;
    reason: string;
    cancelledById: string;
    voidFiscalRecord?: boolean;
  }): Promise<InvoiceWithRelations> {
    const invoice = await this.getInvoiceById(input.tenantId, input.invoiceId);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Invoice is already cancelled.');
    }

    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.PARTIALLY_PAID) {
      throw new Error('Paid or partially paid invoices require credit note or reversal workflow.');
    }

    if (invoice.paymentAllocations.length > 0 || invoice.paidAmount.gt(0)) {
      throw new Error('Invoice with payment allocations cannot be cancelled directly.');
    }

    if (invoice.etimsValidated || invoice.kraControlNumber || invoice.etimsReference) {
      throw new Error('Fiscalized invoices require controlled credit note workflow.');
    }

    const timeLines = invoice.lines.filter((line) => line.sourceType === 'TIME' && line.sourceId);
    const timeEntryIds = timeLines.map((line) => String(line.sourceId));
    const wipRecoveryAmount = timeLines.reduce(
      (sum, line) => sum.plus(line.subTotal),
      new Prisma.Decimal(0),
    );

    return prisma.$transaction(async (tx) => {
      if (timeEntryIds.length > 0) {
        await tx.timeEntry.updateMany({
          where: {
            tenantId: input.tenantId,
            invoiceId: invoice.id,
            id: { in: timeEntryIds },
          },
          data: {
            invoiceId: null,
            isInvoiced: false,
            status: TimeEntryStatus.APPROVED,
          },
        });

        await tx.unbilledWip.upsert({
          where: { matterId: invoice.matterId },
          update: {
            timeEntryCount: { increment: timeEntryIds.length },
            totalUnbilledAmount: { increment: wipRecoveryAmount },
            lastUpdatedAt: new Date(),
          },
          create: {
            tenantId: input.tenantId,
            matterId: invoice.matterId,
            timeEntryCount: timeEntryIds.length,
            totalHours: new Prisma.Decimal(0),
            totalUnbilledAmount: wipRecoveryAmount,
          },
        });
      }

      const cancelledAt = new Date();

      await this.posting.reverseInvoiceIssued(tx, {
        tenantId: input.tenantId,
        invoiceId: invoice.id,
        postedById: input.cancelledById,
        reason: input.reason,
        reversalDate: cancelledAt,
      });

      return tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.CANCELLED,
          cancelledAt,
          cancelledById: input.cancelledById,
          cancellationReason: input.reason,
          voidFiscalRecord: Boolean(input.voidFiscalRecord),
        },
        include: this.invoiceInclude(),
      });
    });
  }

  async recomputeInvoicePaymentStatus(
    tenantId: string,
    invoiceId: string,
  ): Promise<InvoiceWithRelations> {
    const invoice = await this.getInvoiceById(tenantId, invoiceId);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      return invoice;
    }

    const paidAmount = invoice.paymentAllocations
      .reduce((sum, allocation) => sum.plus(allocation.amountApplied), new Prisma.Decimal(0))
      .toDecimalPlaces(2);

    const nextStatus =
      paidAmount.gte(invoice.balanceDue) && invoice.balanceDue.gt(0)
        ? InvoiceStatus.PAID
        : paidAmount.gt(0)
          ? InvoiceStatus.PARTIALLY_PAID
          : InvoiceStatus.INVOICED;

    return prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount,
        status: nextStatus,
        paidDate: nextStatus === InvoiceStatus.PAID ? new Date() : null,
      },
      include: this.invoiceInclude(),
    });
  }

  private invoiceInclude() {
    return {
      matter: {
        select: {
          id: true,
          title: true,
          caseNumber: true,
          clientId: true,
        },
      },
      lines: true,
      paymentAllocations: true,
      creditNotes: true,
    } satisfies Prisma.InvoiceInclude;
  }
}

export const invoiceService = new InvoiceService();

export default InvoiceService;