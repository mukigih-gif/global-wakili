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

const ZERO = new Prisma.Decimal(0);

export class BillingRulesEngine {
  toDecimal(
    value: DecimalInput | null | undefined,
    fieldName = 'amount',
  ): Prisma.Decimal {
    if (value === null || value === undefined || value === '') {
      throw new Error(`${fieldName} is required.`);
    }

    const decimal = new Prisma.Decimal(value as Prisma.Decimal.Value);

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

  taxRate(value?: DecimalInput | null): Prisma.Decimal {
    if (value === undefined || value === null) {
      return new Prisma.Decimal(BILLING_DEFAULTS.vatRate);
    }

    const decimal = this.toDecimal(value, 'taxRate').toDecimalPlaces(6);

    if (decimal.lt(0) || decimal.gt(1)) {
      throw new Error('taxRate must be between 0 and 1.');
    }

    return decimal;
  }

  whtRate(value?: DecimalInput | null): Prisma.Decimal {
    if (value === undefined || value === null) {
      return new Prisma.Decimal(BILLING_DEFAULTS.whtRate);
    }

    const decimal = this.toDecimal(value, 'whtRate').toDecimalPlaces(6);

    if (decimal.lt(0) || decimal.gt(1)) {
      throw new Error('whtRate must be between 0 and 1.');
    }

    return decimal;
  }

  calculateLine(
    input: InvoiceLineInput,
    clientTaxExempt = false,
  ): CalculatedInvoiceLine {
    const quantity = this.quantity(input.quantity);
    const unitPrice = this.money(input.unitPrice, 'unitPrice');
    const taxMode = this.resolveTaxMode(input.taxMode, clientTaxExempt);
    const taxInclusive = Boolean(input.taxInclusive);

    const lineGross = quantity.mul(unitPrice);
    const rate = taxMode === 'VATABLE' ? this.taxRate(input.taxRate) : ZERO;

    const subTotal = taxInclusive && rate.gt(0)
      ? lineGross.div(new Prisma.Decimal(1).plus(rate))
      : lineGross;

    const taxAmount = taxInclusive && rate.gt(0)
      ? lineGross.minus(subTotal)
      : subTotal.mul(rate);

    const total = subTotal.plus(taxAmount);
    const sourceType: BillingLineKind = input.sourceType ?? 'OTHER';

    const isWhtApplicable =
      input.isWhtApplicable ?? this.isProfessionalFeeLine(sourceType);

    const resolvedWhtRate = isWhtApplicable
      ? this.whtRate(input.whtRate)
      : ZERO;

    const whtAmount = isWhtApplicable
      ? subTotal.mul(resolvedWhtRate)
      : ZERO;

    return {
      description: input.description.trim(),
      quantity: quantity.toDecimalPlaces(2),
      unitPrice: unitPrice.toDecimalPlaces(2),
      grossUnitPrice: unitPrice.toDecimalPlaces(2),
      subTotal: subTotal.toDecimalPlaces(2),
      taxRate: rate.toDecimalPlaces(4),
      taxAmount: taxAmount.toDecimalPlaces(2),
      vatAmount: taxAmount.toDecimalPlaces(2),
      total: total.toDecimalPlaces(2),
      taxMode,
      taxInclusive,
      matterId: input.matterId ?? null,
      clientId: input.clientId ?? null,
      sourceType,
      sourceId: input.sourceId ?? null,
      isWhtApplicable,
      whtRate: resolvedWhtRate.toDecimalPlaces(4),
      whtAmount: whtAmount.toDecimalPlaces(2),
    };
  }

  calculateTotals(lines: CalculatedInvoiceLine[]): InvoiceTotals {
    if (lines.length === 0) {
      throw new Error('Invoice must have at least one line.');
    }

    const subTotal = lines
      .reduce((sum, line) => sum.plus(line.subTotal), ZERO)
      .toDecimalPlaces(2);

    const vatAmount = lines
      .reduce((sum, line) => sum.plus(line.vatAmount), ZERO)
      .toDecimalPlaces(2);

    const whtAmount = lines
      .reduce((sum, line) => sum.plus(line.whtAmount), ZERO)
      .toDecimalPlaces(2);

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
    exchangeRate?: DecimalInput | null;
    clientTaxExempt?: boolean;
  }): InvoiceComputation {
    if (input.lines.length === 0) {
      throw new Error('Invoice must have at least one line.');
    }

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
      exchangeRate:
        input.exchangeRate === undefined || input.exchangeRate === null
          ? new Prisma.Decimal(BILLING_DEFAULTS.exchangeRate)
          : this.toDecimal(input.exchangeRate, 'exchangeRate').toDecimalPlaces(6),
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

  async getMatterSnapshot(
    tenantId: string,
    matterId: string,
  ): Promise<BillingMatterSnapshot> {
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
        status: true,
      },
    });

    if (!matter) {
      throw new Error('Matter not found or not accessible for billing.');
    }

    if (
      matter.status !== MatterStatus.ACTIVE &&
      matter.status !== MatterStatus.ON_HOLD
    ) {
      throw new Error(`Matter status ${matter.status} does not allow billing.`);
    }

    const client = await prisma.client.findFirst({
      where: {
        id: matter.clientId,
        tenantId,
      },
      select: {
        id: true,
        currency: true,
        taxExempt: true,
      },
    });

    if (!client) {
      throw new Error('Matter client not found or not accessible for billing.');
    }

    return {
      id: matter.id,
      tenantId: matter.tenantId,
      branchId: matter.branchId,
      clientId: matter.clientId,
      status: matter.status,
      client: {
        id: client.id,
        currency: client.currency,
        taxExempt: Boolean(client.taxExempt),
      },
    };
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
        id: { in: uniqueIds },
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
        billingModel: true,
        status: true,
        isBillable: true,
        isInvoiced: true,
      },
      orderBy: { entryDate: 'asc' },
    });

    if (entries.length !== uniqueIds.length) {
      throw new Error('One or more time entries were not found for this tenant/matter.');
    }

    for (const entry of entries) {
      this.assertTimeEntryBillable(entry as BillableTimeEntrySnapshot);
    }

    return entries as BillableTimeEntrySnapshot[];
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
          ? (entry.appliedRate ?? entry.billableAmount)
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
    taxMode: BillingTaxMode | null | undefined,
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

    if (this.toDecimal(entry.billableAmount, 'billableAmount').lt(0)) {
      throw new Error(`Time entry ${entry.id} has an invalid billable amount.`);
    }
  }
}

export const billingRulesEngine = new BillingRulesEngine();

export default BillingRulesEngine;