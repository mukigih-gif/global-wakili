// apps/api/src/modules/finance/WHTService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | Record<string, unknown>;

type JsonObject = Record<string, unknown>;

type WhtDecimalInput = Prisma.Decimal | number | string;

type WhtSourceRecord = {
  id?: string;
  professionalFeesAmount?: WhtDecimalInput | null;
  legalFeesAmount?: WhtDecimalInput | null;
  serviceAmount?: WhtDecimalInput | null;
  subTotal?: WhtDecimalInput | null;
  taxableAmount?: WhtDecimalInput | null;
  totalAmount?: WhtDecimalInput | null;
};

type WhtCertificateRow = {
  amount?: WhtDecimalInput | null;
  withholdingAmount?: WhtDecimalInput | null;
  metadata?: unknown;
};

type WhtReceiptExposureRow = {
  whtAmount?: WhtDecimalInput | null;
  withholdingTaxAmount?: WhtDecimalInput | null;
  whtExposure?: WhtDecimalInput | null;
};

type TaxConfigurationRow = {
  id: string;
  code?: string | null;
  rate?: WhtDecimalInput | null;
};

type NumberSequenceRow = {
  nextValue: number | string | Prisma.Decimal;
};

type PrismaFindManyDelegate<TRow> = {
  findMany: (args: unknown) => Promise<TRow[]>;
};

type PrismaFindFirstDelegate<TRow> = {
  findFirst: (args: unknown) => Promise<TRow | null>;
};

type PrismaCreateDelegate<TRow = unknown> = {
  create: (args: unknown) => Promise<TRow>;
};

type PrismaUpdateDelegate<TRow = unknown> = {
  update: (args: unknown) => Promise<TRow>;
};

type PrismaUpsertDelegate<TRow = unknown> = {
  upsert: (args: unknown) => Promise<TRow>;
};

type WhtInvoiceDelegate = PrismaFindFirstDelegate<WhtSourceRecord>;
type WhtVendorBillDelegate = PrismaFindFirstDelegate<WhtSourceRecord>;

type WhtCertificateDelegate =
  PrismaFindManyDelegate<WhtCertificateRow> &
  PrismaFindFirstDelegate<WhtCertificateRow> &
  PrismaCreateDelegate &
  PrismaUpdateDelegate;

type WhtPaymentReceiptDelegate = PrismaFindManyDelegate<WhtReceiptExposureRow>;
type WhtTaxConfigurationDelegate = PrismaFindFirstDelegate<TaxConfigurationRow>;
type WhtNumberSequenceDelegate = PrismaUpsertDelegate<NumberSequenceRow>;

const ZERO = new Prisma.Decimal(0);

export type WhtRateSource =
  | 'INPUT'
  | 'TAX_CONFIGURATION'
  | 'ENV'
  | 'ZERO_FALLBACK';

export type WhtCalculationInput = {
  tenantId: string;
  actorId?: string;
  invoiceId?: string;
  vendorBillId?: string;
  baseAmount?: string | number | Prisma.Decimal | null;
  rate?: string | number | Prisma.Decimal | null;
  rateCode?: string | null;
  partyResident?: boolean | null;
  category?: string | null;
};

export type WhtCertificateInput = {
  tenantId: string;
  actorId: string;
  invoiceId?: string | null;
  vendorBillId?: string | null;
  paymentReceiptId?: string | null;
  supplierId?: string | null;
  clientId?: string | null;
  certificateNumber?: string | null;
  certificateDate: Date;
  baseAmount: string | number | Prisma.Decimal;
  withholdingRate: string | number | Prisma.Decimal;
  withholdingAmount?: string | number | Prisma.Decimal | null;
  reference?: string | null;
  metadata?: Record<string, unknown>;
};

function optionalDelegate<TDelegate extends object>(db: DbClient, name: string): TDelegate | null {
  const modelDelegate = (db as Record<string, unknown>)[name];

  if (!modelDelegate || typeof modelDelegate !== 'object') {
    return null;
  }

  return modelDelegate as TDelegate;
}

function delegate<TDelegate extends object>(db: DbClient, name: string): TDelegate {
  const modelDelegate = (db as Record<string, unknown>)[name];

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

  return modelDelegate as TDelegate;
}

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as WhtDecimalInput);

  if (!parsed.isFinite()) return ZERO;

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function rate(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as WhtDecimalInput);

  if (!parsed.isFinite() || parsed.lt(0)) return ZERO;

  if (parsed.gt(1)) {
    return parsed.div(100).toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP);
  }

  return parsed.toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP);
}

function asRecord(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonObject;
}

export class WHTService {
  static async calculate(input: WhtCalculationInput) {
    return new WHTService().calculate(input);
  }

  async calculate(input: WhtCalculationInput) {
    const resolvedRate = await this.resolveRate(input);

    let sourceRecord: WhtSourceRecord | null = null;
    let baseAmount = money(input.baseAmount);

    if (input.invoiceId) {
      sourceRecord = await this.getInvoice(input.tenantId, input.invoiceId);
      baseAmount = baseAmount.gt(0)
        ? baseAmount
        : money(
            sourceRecord.professionalFeesAmount ??
            sourceRecord.legalFeesAmount ??
            sourceRecord.subTotal ??
            sourceRecord.taxableAmount ??
            sourceRecord.totalAmount ??
            0,
          );
    }

    if (input.vendorBillId) {
      sourceRecord = await this.getVendorBill(input.tenantId, input.vendorBillId);
      baseAmount = baseAmount.gt(0)
        ? baseAmount
        : money(
            sourceRecord.professionalFeesAmount ??
            sourceRecord.serviceAmount ??
            sourceRecord.subTotal ??
            sourceRecord.taxableAmount ??
            sourceRecord.totalAmount ??
            0,
          );
    }

    const withholdingAmount = baseAmount.mul(resolvedRate.rate).toDecimalPlaces(2);

    return {
      tenantId: input.tenantId,
      invoiceId: input.invoiceId ?? null,
      vendorBillId: input.vendorBillId ?? null,
      category: input.category ?? null,
      rateCode: input.rateCode ?? null,
      partyResident: input.partyResident ?? null,
      baseAmount,
      withholdingRate: resolvedRate.rate,
      withholdingAmount,
      rateSource: resolvedRate.source,
      rateSourceMeta: resolvedRate.meta,
      generatedAt: new Date(),
    };
  }

  async recordCertificate(input: WhtCertificateInput) {
    const baseAmount = money(input.baseAmount);
    const withholdingRate = rate(input.withholdingRate);
    const withholdingAmount = input.withholdingAmount !== null && input.withholdingAmount !== undefined
      ? money(input.withholdingAmount)
      : baseAmount.mul(withholdingRate).toDecimalPlaces(2);

    if (baseAmount.lte(0)) {
      throw Object.assign(new Error('WHT base amount must be greater than zero'), {
        statusCode: 422,
        code: 'WHT_BASE_AMOUNT_INVALID',
      });
    }

    if (withholdingRate.lte(0)) {
      throw Object.assign(new Error('WHT rate must be greater than zero'), {
        statusCode: 422,
        code: 'WHT_RATE_INVALID',
      });
    }

    const whtCertificate = optionalDelegate<WhtCertificateDelegate>(prisma, 'withholdingTaxCertificate');
    const certificateNumber =
      input.certificateNumber ?? await this.allocateCertificateNumber(input.tenantId);

    if (!whtCertificate) {
      return {
        tenantId: input.tenantId,
        persisted: false,
        certificateNumber,
        certificateDate: input.certificateDate,
        baseAmount,
        withholdingRate,
        withholdingAmount,
        reference: input.reference ?? null,
        metadata: {
          ...(input.metadata ?? {}),
          warning: 'withholdingTaxCertificate delegate not available; returned derived certificate only.',
        },
      };
    }

    return whtCertificate.create({
      data: {
        tenantId: input.tenantId,
        certificateNumber,
        certificateDate: input.certificateDate,
        invoiceId: input.invoiceId ?? null,
        vendorBillId: input.vendorBillId ?? null,
        paymentReceiptId: input.paymentReceiptId ?? null,
        supplierId: input.supplierId ?? null,
        clientId: input.clientId ?? null,
        baseAmount,
        withholdingRate,
        withholdingAmount,
        reference: input.reference ?? null,
        createdById: input.actorId,
        metadata: input.metadata ?? {},
      },
    });
  }

  async getWhtReport(input: {
    tenantId: string;
    from: Date;
    to: Date;
    take?: number;
    skip?: number;
  }) {
    const whtCertificate = optionalDelegate<WhtCertificateDelegate>(prisma, 'withholdingTaxCertificate');

    const certificates = whtCertificate
      ? await whtCertificate.findMany({
          where: {
            tenantId: input.tenantId,
            certificateDate: {
              gte: input.from,
              lt: input.to,
            },
          },
          orderBy: {
            certificateDate: 'desc',
          },
          take: Math.min(input.take ?? 500, 500),
          skip: input.skip ?? 0,
        })
      : [];

    const certificateWht = certificates.reduce(
      (sum: Prisma.Decimal, row: WhtCertificateRow) => sum.plus(money(row.amount)),
      ZERO,
    );

    return {
      tenantId: input.tenantId,
      from: input.from,
      to: input.to,
      certificateCount: certificates.length,
      certificateWht: certificateWht.toDecimalPlaces(2),
      totalWht: certificateWht.toDecimalPlaces(2),
      certificates,
      generatedAt: new Date(),
    };
  }

  async voidCertificate(input: {
    tenantId: string;
    certificateId: string;
    actorId: string;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Void reason is required'), {
        statusCode: 400,
        code: 'WHT_CERTIFICATE_VOID_REASON_REQUIRED',
      });
    }

    const whtCertificate = delegate<WhtCertificateDelegate>(prisma, 'withholdingTaxCertificate');

    const existing = await whtCertificate.findFirst({
      where: {
        id: input.certificateId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('WHT certificate not found'), {
        statusCode: 404,
        code: 'WHT_CERTIFICATE_NOT_FOUND',
      });
    }

    return whtCertificate.update({
      where: {
        id: input.certificateId,
      },
      data: {
        status: 'VOID',
        voidedAt: new Date(),
        voidedById: input.actorId,
        voidReason: input.reason,
        metadata: {
          ...asRecord(existing.metadata),
          voided: {
            actorId: input.actorId,
            reason: input.reason,
            at: new Date().toISOString(),
          },
        },
      },
    });
  }

  private async getInvoice(tenantId: string, invoiceId: string) {
    const invoice = delegate<WhtInvoiceDelegate>(prisma, 'invoice');

    const existing = await invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Invoice not found for WHT calculation'), {
        statusCode: 404,
        code: 'WHT_INVOICE_NOT_FOUND',
      });
    }

    return existing;
  }

  private async getVendorBill(tenantId: string, vendorBillId: string) {
    const vendorBill = delegate<WhtVendorBillDelegate>(prisma, 'vendorBill');

    const existing = await vendorBill.findFirst({
      where: {
        id: vendorBillId,
        tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Vendor bill not found for WHT calculation'), {
        statusCode: 404,
        code: 'WHT_VENDOR_BILL_NOT_FOUND',
      });
    }

    return existing;
  }

  private async resolveRate(input: WhtCalculationInput): Promise<{
    rate: Prisma.Decimal;
    source: WhtRateSource;
    meta?: Record<string, unknown>;
  }> {
    if (input.rate !== null && input.rate !== undefined && input.rate !== '') {
      return {
        rate: rate(input.rate),
        source: 'INPUT',
      };
    }

    const taxConfiguration = optionalDelegate<WhtTaxConfigurationDelegate>(prisma, 'taxConfiguration');

    if (taxConfiguration) {
      const config = await taxConfiguration.findFirst({
        where: {
          tenantId: input.tenantId,
          taxType: 'WHT',
          ...(input.rateCode ? { code: input.rateCode } : {}),
          isActive: true,
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
      });

      if (config?.rate !== undefined && config?.rate !== null) {
        return {
          rate: rate(config.rate),
          source: 'TAX_CONFIGURATION',
          meta: {
            taxConfigurationId: config.id,
            code: config.code ?? null,
          },
        };
      }
    }

    const envRate = process.env.DEFAULT_WHT_RATE;

    if (envRate !== undefined && envRate !== '') {
      return {
        rate: rate(envRate),
        source: 'ENV',
      };
    }

    return {
      rate: ZERO,
      source: 'ZERO_FALLBACK',
      meta: {
        warning: 'No WHT rate supplied, configured, or available in DEFAULT_WHT_RATE.',
      },
    };
  }

  private async allocateCertificateNumber(tenantId: string) {
    const numberSequence = optionalDelegate<WhtNumberSequenceDelegate>(prisma, 'numberSequence');

    if (!numberSequence) {
      return `WHT-${new Date().getFullYear()}-${Date.now()}`;
    }

    const year = new Date().getFullYear();

    const row = await numberSequence.upsert({
      where: {
        tenantId_key_year: {
          tenantId,
          key: 'WHT_CERTIFICATE',
          year,
        },
      },
      update: {
        nextValue: { increment: 1 },
      },
      create: {
        tenantId,
        key: 'WHT_CERTIFICATE',
        year,
        nextValue: 2,
      },
    });

    const current = Number(row.nextValue) - 1;

    return `WHT-${year}-${String(current).padStart(6, '0')}`;
  }
}

export const whtService = new WHTService();

export default WHTService;
