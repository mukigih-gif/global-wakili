// apps/api/src/modules/finance/ETimsService.ts

import { Prisma, prisma } from '@global-wakili/database';

type PrismaDecimalInput = Prisma.Decimal | number | string;

type DbClient = typeof prisma | Prisma.TransactionClient | Record<string, unknown>;

export type ETimsSubmissionStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'FAILED'
  | 'SKIPPED_ALREADY_FISCALIZED';

export type FiscalizeInvoiceInput = {
  tenantId: string;
  actorId: string;
  invoiceId: string;
  force?: boolean;
};

export type ETimsInvoiceItem = {
  itemCode: string;
  itemDescription: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  taxClass: string;
  totalAmount: string;
  taxAmount: string;
};

export type ETimsPayload = {
  supplierPin: string | null;
  buyerPin: string | null;
  invoiceNumber: string;
  documentDate: string;
  currency: string;
  items: ETimsInvoiceItem[];
  totalTaxAmount: string;
  totalInvoiceAmount: string;
};

type ETimsTenantSnapshot = {
  kraPin?: string | null;
  taxPin?: string | null;
  pin?: string | null;
};

type ETimsClientSnapshot = {
  kraPin?: string | null;
  taxPin?: string | null;
  pin?: string | null;
};

type ETimsInvoiceLineSnapshot = {
  itemCode?: string | null;
  description?: string | null;
  quantity?: PrismaDecimalInput | null;
  unitPrice?: PrismaDecimalInput | null;
  subTotal?: PrismaDecimalInput | null;
  total?: PrismaDecimalInput | null;
  taxRate?: PrismaDecimalInput | null;
  taxAmount?: PrismaDecimalInput | null;
};

type ETimsInvoiceSnapshot = {
  id: string;
  tenantId: string;
  invoiceNumber?: string | null;
  status?: string | null;
  total?: PrismaDecimalInput | null;
  taxAmount?: PrismaDecimalInput | null;
  vatAmount?: PrismaDecimalInput | null;
  currency?: string | null;
  issuedDate?: Date | string | number | null;
  createdAt?: Date | string | number | null;

  kraControlNumber?: string | null;
  etimsReference?: string | null;
  etimsValidated?: boolean | null;
  etimsValidatedAt?: Date | string | number | null;
  etimsStatus?: string | null;
  etimsReceiptNumber?: string | null;
  etimsRejectionReason?: string | null;
  etimsLastSyncedAt?: Date | string | number | null;
  fiscalSignature?: string | null;
  cuSerialNumber?: string | null;
  cuInvoiceNumber?: string | null;
  etimsQrCode?: string | null;

  client?: ETimsClientSnapshot | null;
  tenant?: ETimsTenantSnapshot | null;
  lines?: ETimsInvoiceLineSnapshot[] | null;
};

type InvoiceDelegate = {
  findFirst: (args: unknown) => Promise<ETimsInvoiceSnapshot | null>;
  update: (args: unknown) => Promise<unknown>;
};

type FetchResponseLike = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<FetchResponseLike>;

type ETimsProviderResponse = Record<string, unknown> & {
  ok?: boolean;
  status?: string;
  etimsStatus?: string;
  controlNumber?: string | null;
  kraControlNumber?: string | null;
  reference?: string | null;
  submissionId?: string | null;
  receiptNumber?: string | null;
  etimsReceiptNumber?: string | null;
  fiscalSignature?: string | null;
  signature?: string | null;
  cuSerialNumber?: string | null;
  controlUnitSerial?: string | null;
  cuInvoiceNumber?: string | null;
  controlUnitInvoiceNumber?: string | null;
  rejectionReason?: string | null;
  reason?: string | null;
  qrCodeUrl?: string | null;
  etimsQrCode?: string | null;
  qrCode?: string | null;
};

type ETimsTransmitRequestContext = {
  user?: {
    id?: string | null;
    sub?: string | null;
  } | null;
  headers?: {
    [key: string]: string | string[] | undefined;
  };
};

const ZERO = new Prisma.Decimal(0);

function delegate<TDelegate extends object>(db: DbClient, name: string): TDelegate {
  const modelDelegate = (db as Record<string, unknown>)[name];

  if (!modelDelegate || typeof modelDelegate !== 'object') {
    throw Object.assign(
      new Error(
        `Prisma model delegate "${name}" is missing. Apply Finance/Billing schema before activating this workflow.`,
      ),
      {
        statusCode: 500,
        code: 'ETIMS_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate as TDelegate;
}

function decimalInput(value: unknown): PrismaDecimalInput | null {
  if (value instanceof Prisma.Decimal) return value;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  return null;
}

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const normalized = decimalInput(value);
  if (normalized === null) return ZERO;

  const parsed = new Prisma.Decimal(normalized);

  if (!parsed.isFinite()) return ZERO;

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function qty(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return new Prisma.Decimal(1);

  const normalized = decimalInput(value);
  if (normalized === null) return new Prisma.Decimal(1);

  const parsed = new Prisma.Decimal(normalized);

  if (!parsed.isFinite() || parsed.lte(0)) return new Prisma.Decimal(1);

  return parsed.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

function isoDate(value: unknown): string {
  const date =
    value instanceof Date
      ? value
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function nullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return null;
  }

  return trimmed;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = firstString(...value);
      if (nested) return nested;
      continue;
    }

    const normalized = nullableString(value);
    if (normalized) return normalized;
  }

  return null;
}

function buyerPinFrom(client: ETimsClientSnapshot | null | undefined): string | null {
  return (
    nullableString(client?.kraPin) ??
    nullableString(client?.taxPin) ??
    nullableString(client?.pin) ??
    null
  );
}

function supplierPinFrom(invoice: ETimsInvoiceSnapshot): string | null {
  return (
    nullableString(invoice.tenant?.kraPin) ??
    nullableString(invoice.tenant?.taxPin) ??
    nullableString(invoice.tenant?.pin) ??
    null
  );
}

function normalizeProviderStatus(response: ETimsProviderResponse): ETimsSubmissionStatus {
  const rawStatus = String(response.status ?? response.etimsStatus ?? '').toUpperCase();

  if (response.ok === true) return 'ACCEPTED';
  if (['ACCEPTED', 'SUCCESS', 'SUBMITTED'].includes(rawStatus)) return 'ACCEPTED';
  if (rawStatus === 'REJECTED') return 'REJECTED';

  return 'FAILED';
}

function providerAccepted(response: ETimsProviderResponse): boolean {
  return normalizeProviderStatus(response) === 'ACCEPTED';
}

function etimsStatusForInvoice(response: ETimsProviderResponse): string {
  const status = normalizeProviderStatus(response);

  if (status === 'ACCEPTED') return 'ACCEPTED';
  if (status === 'REJECTED') return 'REJECTED';

  return 'FAILED';
}

function responseQrCode(response: ETimsProviderResponse, fallback?: string | null): string | null {
  return (
    nullableString(response.qrCodeUrl) ??
    nullableString(response.etimsQrCode) ??
    nullableString(response.qrCode) ??
    fallback ??
    null
  );
}

function asProviderResponse(value: unknown): ETimsProviderResponse {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as ETimsProviderResponse;
  }

  return {};
}

export class ETimsService {
  static async transmit(
    context: { tenantId: string; req?: ETimsTransmitRequestContext; userId?: string },
    invoiceId: string,
  ) {
    return new ETimsService().fiscalizeInvoice({
      tenantId: context.tenantId,
      actorId:
        firstString(
          context.userId,
          context.req?.user?.id,
          context.req?.user?.sub,
          context.req?.headers?.['x-user-id'],
        ) ?? 'system',
      invoiceId,
    });
  }

  async fiscalizeInvoice(input: FiscalizeInvoiceInput) {
    const invoice = delegate<InvoiceDelegate>(prisma, 'invoice');

    const existing = await invoice.findFirst({
      where: {
        id: input.invoiceId,
        tenantId: input.tenantId,
      },
      include: {
        client: true,
        tenant: true,
        lines: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Invoice not found for eTIMS fiscalization'), {
        statusCode: 404,
        code: 'ETIMS_INVOICE_NOT_FOUND',
      });
    }

    if (existing.kraControlNumber && existing.etimsValidated === true && !input.force) {
      return {
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        status: 'SKIPPED_ALREADY_FISCALIZED' as ETimsSubmissionStatus,
        kraControlNumber: existing.kraControlNumber,
        payload: null,
        response: null,
      };
    }

    const invoiceStatus = String(existing.status ?? '').toUpperCase();

    if (invoiceStatus === 'CANCELLED') {
      throw Object.assign(new Error('Cancelled invoices cannot be fiscalized through eTIMS'), {
        statusCode: 409,
        code: 'ETIMS_INVOICE_CANCELLED',
        status: existing.status,
      });
    }

    if (!['INVOICED', 'PARTIALLY_PAID', 'PAID'].includes(invoiceStatus)) {
      throw Object.assign(new Error('Invoice status is not eligible for eTIMS fiscalization'), {
        statusCode: 409,
        code: 'ETIMS_INVOICE_STATUS_NOT_ELIGIBLE',
        status: existing.status,
      });
    }

    const payload = this.buildKraPayload(existing);
    const response = await this.submitPayload(payload);
    const accepted = providerAccepted(response);
    const normalizedStatus = normalizeProviderStatus(response);

    const updated = await invoice.update({
      where: {
        id: existing.id,
      },
      data: {
        kraControlNumber:
          response.controlNumber ?? response.kraControlNumber ?? existing.kraControlNumber ?? null,
        etimsReference: response.reference ?? response.submissionId ?? existing.etimsReference ?? null,
        etimsValidated: accepted,
        etimsValidatedAt: accepted ? new Date() : existing.etimsValidatedAt ?? null,
        etimsStatus: etimsStatusForInvoice(response),
        etimsReceiptNumber:
          response.receiptNumber ?? response.etimsReceiptNumber ?? existing.etimsReceiptNumber ?? null,
        etimsRejectionReason: accepted
          ? null
          : response.rejectionReason ?? response.reason ?? 'eTIMS fiscalization failed',
        etimsLastSyncedAt: new Date(),
        fiscalSignature: response.fiscalSignature ?? response.signature ?? existing.fiscalSignature ?? null,
        cuSerialNumber:
          response.cuSerialNumber ?? response.controlUnitSerial ?? existing.cuSerialNumber ?? null,
        cuInvoiceNumber:
          response.cuInvoiceNumber ??
          response.controlUnitInvoiceNumber ??
          existing.cuInvoiceNumber ??
          null,
        etimsQrCode: responseQrCode(response, existing.etimsQrCode),
      },
    });

    return {
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      status: normalizedStatus,
      payload,
      response,
      invoice: updated,
    };
  }

  buildKraPayload(invoice: ETimsInvoiceSnapshot): ETimsPayload {
    const lines = Array.isArray(invoice.lines) && invoice.lines.length ? invoice.lines : [];

    const items: ETimsInvoiceItem[] = lines.map((line: ETimsInvoiceLineSnapshot, index: number) => {
      const quantity = qty(line.quantity);
      const unitPrice = money(line.unitPrice ?? line.subTotal ?? line.total);
      const taxRate = money(line.taxRate ?? 0);
      const totalAmount = money(line.total ?? line.subTotal ?? quantity.mul(unitPrice));
      const taxAmount = money(line.taxAmount ?? 0);

      return {
        itemCode: String(line.itemCode ?? `LEGAL-${String(index + 1).padStart(3, '0')}`),
        itemDescription: String(line.description ?? 'Legal services'),
        quantity: quantity.toString(),
        unitPrice: unitPrice.toString(),
        taxRate: taxRate.toString(),
        taxClass: taxAmount.gt(0) || taxRate.gt(0) ? 'A' : 'E',
        totalAmount: totalAmount.toString(),
        taxAmount: taxAmount.toString(),
      };
    });

    if (!items.length) {
      const totalAmount = money(invoice.total ?? 0);
      const taxAmount = money(invoice.taxAmount ?? invoice.vatAmount ?? 0);
      const exclusiveAmount = totalAmount.minus(taxAmount);

      items.push({
        itemCode: 'LEGAL-FEE-001',
        itemDescription: 'Legal services',
        quantity: '1',
        unitPrice: exclusiveAmount.gte(0) ? exclusiveAmount.toString() : totalAmount.toString(),
        taxRate: taxAmount.gt(0) ? '0.16' : '0',
        taxClass: taxAmount.gt(0) ? 'A' : 'E',
        totalAmount: totalAmount.toString(),
        taxAmount: taxAmount.toString(),
      });
    }

    return {
      supplierPin: supplierPinFrom(invoice),
      buyerPin: buyerPinFrom(invoice.client),
      invoiceNumber: String(invoice.invoiceNumber ?? invoice.id),
      documentDate: isoDate(invoice.issuedDate ?? invoice.createdAt),
      currency: invoice.currency ?? 'KES',
      items,
      totalTaxAmount: money(invoice.taxAmount ?? invoice.vatAmount ?? 0).toString(),
      totalInvoiceAmount: money(invoice.total ?? 0).toString(),
    };
  }

  private async submitPayload(payload: ETimsPayload): Promise<ETimsProviderResponse> {
    const url = process.env.KRA_ETIMS_URL;
    const token = process.env.KRA_ETIMS_TOKEN;

    if (!url || !token) {
      return {
        ok: false,
        status: 'FAILED',
        reason: 'KRA_ETIMS_URL or KRA_ETIMS_TOKEN is not configured',
        simulated: true,
      };
    }

    const fetchFn = (globalThis as { fetch?: FetchLike }).fetch;

    if (typeof fetchFn !== 'function') {
      return {
        ok: false,
        status: 'FAILED',
        reason: 'Fetch API is unavailable in this runtime',
      };
    }

    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        invoiceDate: payload.documentDate,
      }),
    });

    const text = await response.text();
    let body: ETimsProviderResponse = {};

    try {
      body = text ? asProviderResponse(JSON.parse(text)) : {};
    } catch {
      body = { raw: text };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: 'FAILED',
        httpStatus: response.status,
        ...body,
      };
    }

    return {
      ok: true,
      status: typeof body.status === 'string' ? body.status : 'SUBMITTED',
      controlNumber: body.controlNumber ?? body.kraControlNumber ?? null,
      qrCodeUrl: responseQrCode(body),
      reference: body.reference ?? body.submissionId ?? null,
      receiptNumber: body.receiptNumber ?? body.etimsReceiptNumber ?? null,
      fiscalSignature: body.fiscalSignature ?? body.signature ?? null,
      cuSerialNumber: body.cuSerialNumber ?? body.controlUnitSerial ?? null,
      cuInvoiceNumber: body.cuInvoiceNumber ?? body.controlUnitInvoiceNumber ?? null,
      rejectionReason: body.rejectionReason ?? body.reason ?? null,
      ...body,
    };
  }
}

export const etimsService = new ETimsService();

export { ETimsService as EtimsService };

export default ETimsService;