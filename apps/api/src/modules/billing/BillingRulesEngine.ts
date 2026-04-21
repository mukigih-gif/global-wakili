// apps/api/src/modules/billing/BillingRulesEngine.ts

import {
  BillingModel,
  MatterStatus,
  Prisma,
  TimeEntryStatus,
  prisma,
} from '@global-wakili/database';

import {
  BILLING_DEFAULTS,
  type BillableTimeEntrySnapshot,
  type BillingLineKind,
  type BillingMatterSnapshot,
  type BillingTaxMode,
  type CalculatedInvoiceLine,
  type DecimalInput,
  type InvoiceComputation,
  type InvoiceLineInput,
  type InvoiceTotals,
} from './billing.types';

export class BillingRulesEngine {
  toDecimal(value: DecimalInput, fieldName = 'amount'): Prisma.Decimal {
    const decimal = new Prisma.Decimal(value);

    if (!decimal.isFinite()) {
      throw new Error(`${fieldName} must be a finite decimal value.`);
    }

    return decimal;
  }

  money(value: DecimalInput, fieldName = 'amount'): Prisma.Decimal {
    const decimal = this.toDecimal(value, fieldName).toDecimalPlaces(6);

    if (decimal.isNegative()) {
      throw new Error(`${fieldName} cannot be negative.`);
    }

    return decimal;
  }

  quantity(value: DecimalInput): Prisma.Decimal {
    const decimal = this.toDecimal(value, 'quantity').toDecimalPlaces(6);

    if (decimal.lte(0)) {
      throw new Error('quantity must be greater than zero.');
    }

    return decimal;
  }

  taxRate(value?: DecimalInput): Prisma.Decimal {
    if (value === undefined || value === null) {
      return new Prisma.Decimal(BILLING_DEFAULTS.vatRate);
    }

    const decimal = this.toDecimal(value, 'taxRate').toDecimalPlaces(6);

    if (decimal.lt(0) || decimal.gt(1)) {
      throw new Error('taxRate must be between 0 and 1.');
    }

    return decimal;
  }

  whtRate(value?: DecimalInput): Prisma.Decimal {
    if (value === undefined || value === null) {
      return new Prisma.Decimal(BILLING_DEFAULTS.whtRate);
    }

    const decimal = this.toDecimal(value, 'whtRate').toDecimalPlaces(6);

    if (decimal.lt(0) || decimal.gt(1)) {
      throw new Error('whtRate must be between 0 and 1.');
    }

    return decimal;
  }

  calculateLine(input: InvoiceLineInput, clientTaxExempt = false): CalculatedInvoiceLine {
    const quantity = this.quantity(input.quantity);
    const unitPrice = this.money(input.unitPrice, 'unitPrice');
    const taxMode = this.resolveTaxMode(input.taxMode, clientTaxExempt);
    const taxInclusive = Boolean(input.taxInclusive);
    const lineGrossBeforeTaxSplit = quantity.mul(unitPrice);
    const rate = taxMode === 'VATABLE' ? this.taxRate(input.taxRate) : new Prisma.Decimal(0);

    const subTotal = taxInclusive && rate.gt(0)
      ? lineGrossBeforeTaxSplit.div(new Prisma.Decimal(1).plus(rate))
      : lineGrossBeforeTaxSplit;

    const taxAmount = taxInclusive && rate.gt(0)
      ? lineGrossBeforeTaxSplit.minus(subTotal)
      : subTotal.mul(rate);

    const total = subTotal.plus(taxAmount);

    const sourceType = input.sourceType ?? 'OTHER';
    const isWhtApplicable =
      input.isWhtApplicable ?? this.isProfessionalFeeLine(sourceType);

    const resolvedWhtRate = isWhtApplicable
      ? this.whtRate(input.whtRate)
      : new Prisma.Decimal(0);

    const whtAmount = isWhtApplicable
      ? subTotal.mul(resolvedWhtRate)
      : new Prisma.Decimal(0);

    return {
      description: input.description.trim(),
      quantity: quantity.toDecimalPlaces(2),
      unitPrice: unitPrice.toDecimalPlaces(2),
      grossUnitPrice: unitPrice.toDecimalPlaces(2),
      subTotal: subTotal.toDecimalPlaces(2),
      taxRate: rate.toDecimalPlaces(4),
      taxAmount: taxAmount.toDecimalPlaces(2),
      total: total.toDecimalPlaces(2),
      taxMode,
      taxInclusive,
      matterId: input.matterId,
      clientId: input.clientId,
      sourceType,
      sourceId: input.sourceId,
      isWhtApplicable,
      whtRate: resolvedWhtRate.toDecimalPlaces(4),
      whtAmount: whtAmount.toDecimalPlaces(2),
    };
  }

  calculateTotals(lines: CalculatedInvoiceLine[]): InvoiceTotals {
    if (lines.length === 0) {
      throw new Error('Invoice must have at least one line.');
    }

    const subTotalRaw = lines.reduce(
      (sum, line) => sum.plus(line.subTotal),
      new Prisma.Decimal(0),
    );

    const taxAmountRaw = lines.reduce(
      (sum, line) => sum.plus(line.taxAmount),
      new Prisma.Decimal(0),
    );

    const whtAmountRaw = lines.reduce(
      (sum, line) => sum.plus(line.whtAmount),
      new Prisma.Decimal(0),
    );

    const subTotal = subTotalRaw.toDecimalPlaces(2);
    const vatAmount = taxAmountRaw.toDecimalPlaces(2);
    const whtAmount = whtAmountRaw.toDecimalPlaces(2);
    const netAmount = subTotal.plus(vatAmount).toDecimalPlaces(2);
    const total = netAmount;
    const balanceDue = total.minus(whtAmount).toDecimalPlaces(2);

    if (balanceDue.lt(0)) {
      throw new Error('Invoice balance due cannot be negative.');
    }

    return {
      subTotal,
      taxAmount: vatAmount,
      vatAmount,
      whtAmount,
      netAmount,
      total,
      balanceDue,
    };
  }

  calculateInvoice(input: {
    lines: InvoiceLineInput[];
    currency?: string;
    exchangeRate?: DecimalInput;
    clientTaxExempt?: boolean;
  }): InvoiceComputation {
    if (input.lines.length > BILLING_DEFAULTS.maxInvoiceLines) {
      throw new Error(`Invoice cannot exceed ${BILLING_DEFAULTS.maxInvoiceLines} lines.`);
    }

    const lines = input.lines.map((line) =>
      this.calculateLine(line, Boolean(input.clientTaxExempt)),
    );

    const totals = this.calculateTotals(lines);

    return {
      ...totals,
      currency: input.currency ?? BILLING_DEFAULTS.currency,
      exchangeRate: input.exchangeRate
        ? this.toDecimal(input.exchangeRate, 'exchangeRate').toDecimalPlaces(6)
        : new Prisma.Decimal(BILLING_DEFAULTS.exchangeRate),
      lines,
    };
  }

  calculateDueDate(issuedDate: Date, dueDate?: Date | null): Date | null {
    if (dueDate !== undefined) {
      return dueDate;
    }

    const computed = new Date(issuedDate);
    computed.setDate(computed.getDate() + BILLING_DEFAULTS.dueDays);
    return computed;
  }

  async getMatterSnapshot(tenantId: string, matterId: string): Promise<BillingMatterSnapshot> {
    const matter = await prisma.matter.findFirst({
      where: {
        id: matterId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        clientId: true,
        title: true,
        caseNumber: true,
        status: true,
        client: {
          select: {
            id: true,
            tenantId: true,
            name: true,
            email: true,
            kraPin: true,
            currency: true,
            taxExempt: true,
          },
        },
      },
    });

    if (!matter) {
      throw new Error('Matter not found or not accessible for billing.');
    }

    if (matter.status !== MatterStatus.ACTIVE && matter.status !== MatterStatus.ON_HOLD) {
      throw new Error(`Matter status ${matter.status} does not allow billing.`);
    }

    if (matter.client.tenantId !== tenantId) {
      throw new Error('Matter client tenant mismatch detected.');
    }

    return matter;
  }

  async getApprovedBillableTimeEntries(input: {
    tenantId: string;
    matterId: string;
    timeEntryIds: string[];
  }): Promise<BillableTimeEntrySnapshot[]> {
    const uniqueIds = Array.from(new Set(input.timeEntryIds));

    if (uniqueIds.length === 0) {
      throw new Error('At least one time entry is required.');
    }

    const entries = await prisma.timeEntry.findMany({
      where: {
        tenantId: input.tenantId,
        matterId: input.matterId,
        id: {
          in: uniqueIds,
        },
      },
      select: {
        id: true,
        tenantId: true,
        matterId: true,
        advocateId: true,
        description: true,
        entryDate: true,
        durationHours: true,
        appliedRate: true,
        billableAmount: true,
        isBillable: true,
        isInvoiced: true,
        status: true,
        billingModel: true,
      },
      orderBy: {
        entryDate: 'asc',
      },
    });

    if (entries.length !== uniqueIds.length) {
      throw new Error('One or more time entries were not found for this tenant/matter.');
    }

    for (const entry of entries) {
      this.assertTimeEntryBillable(entry);
    }

    return entries;
  }

  linesFromTimeEntries(entries: BillableTimeEntrySnapshot[]): InvoiceLineInput[] {
    return entries.map((entry) => ({
      description:
        entry.description?.trim() ||
        `Professional fees for time entry ${entry.id} dated ${entry.entryDate
          .toISOString()
          .slice(0, 10)}`,
      quantity: entry.billingModel === BillingModel.HOURLY ? entry.durationHours : '1',
      unitPrice:
        entry.billingModel === BillingModel.HOURLY
          ? entry.appliedRate
          : entry.billableAmount,
      taxMode: 'VATABLE',
      taxInclusive: false,
      matterId: entry.matterId,
      sourceType: entry.billingModel === BillingModel.HOURLY ? 'TIME' : 'FIXED_FEE',
      sourceId: entry.id,
      isWhtApplicable: true,
    }));
  }

  assertInvoiceTotalsSafe(totals: InvoiceTotals): void {
    if (totals.subTotal.lt(0)) throw new Error('Invoice subtotal cannot be negative.');
    if (totals.taxAmount.lt(0)) throw new Error('Invoice tax amount cannot be negative.');
    if (totals.whtAmount.lt(0)) throw new Error('Invoice WHT amount cannot be negative.');
    if (totals.netAmount.lt(0)) throw new Error('Invoice net amount cannot be negative.');
    if (totals.total.lt(0)) throw new Error('Invoice total cannot be negative.');
    if (totals.balanceDue.lt(0)) throw new Error('Invoice balance due cannot be negative.');

    if (totals.total.lt(totals.netAmount)) {
      throw new Error('Invoice total cannot be less than net amount.');
    }

    if (totals.balanceDue.gt(totals.total)) {
      throw new Error('Invoice balance due cannot exceed total.');
    }
  }

  private resolveTaxMode(
    taxMode: BillingTaxMode | undefined,
    clientTaxExempt: boolean,
  ): BillingTaxMode {
    if (clientTaxExempt) {
      return 'EXEMPT';
    }

    return taxMode ?? 'VATABLE';
  }

  private isProfessionalFeeLine(sourceType: BillingLineKind): boolean {
    return sourceType === 'TIME' || sourceType === 'FIXED_FEE' || sourceType === 'RETAINER';
  }

  private assertTimeEntryBillable(entry: BillableTimeEntrySnapshot): void {
    if (!entry.isBillable) {
      throw new Error(`Time entry ${entry.id} is not billable.`);
    }

    if (entry.isInvoiced) {
      throw new Error(`Time entry ${entry.id} has already been invoiced.`);
    }

    if (entry.status !== TimeEntryStatus.APPROVED) {
      throw new Error(`Time entry ${entry.id} must be APPROVED before billing.`);
    }

    if (entry.billableAmount.lt(0)) {
      throw new Error(`Time entry ${entry.id} has an invalid negative billable amount.`);
    }
  }
}

export const billingRulesEngine = new BillingRulesEngine();

export default BillingRulesEngine;