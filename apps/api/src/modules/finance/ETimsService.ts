// apps/api/src/modules/finance/ETimsService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

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
  invoiceDate: string;
  currency: string;
  items: ETimsInvoiceItem[];
  totalTaxAmount: string;
  totalInvoiceAmount: string;
};

const ZERO = new Prisma.Decimal(0);

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply Finance/Billing schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'ETIMS_SCHEMA_DELEGATE_MISSING',
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

function qty(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return new Prisma.Decimal(1);

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite() || parsed.lte(0)) return new Prisma.Decimal(1);

  return parsed.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function isoDate(value: unknown): string {
  const date = value ? new Date(value as any) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function buyerPinFrom(client: any): string | null {
  return client?.kraPin ?? client?.taxPin ?? null;
}

function supplierPinFrom(invoice: any): string | null {
  return invoice.tenant?.kraPin ?? invoice.tenant?.taxPin ?? null;
}

export class ETimsService {
  static async transmit(context: { tenantId: string; req?: any; userId?: string }, invoiceId: string) {
    return new ETimsService().fiscalizeInvoice({
      tenantId: context.tenantId,
      actorId: context.userId ?? context.req?.user?.id ?? context.req?.headers?.['x-user-id'] ?? 'system',
      invoiceId,
    });
  }

  async fiscalizeInvoice(input: FiscalizeInvoiceInput) {
    const invoice = delegate(prisma, 'invoice');

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

    if (existing.kraControlNumber && !input.force) {
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

    if (!['FINAL', 'APPROVED', 'READY_FOR_ETIMS', 'ISSUED'].includes(invoiceStatus)) {
      throw Object.assign(new Error('Only final/approved invoices can be fiscalized through eTIMS'), {
        statusCode: 409,
        code: 'ETIMS_INVOICE_STATUS_NOT_ELIGIBLE',
        status: existing.status,
      });
    }

    const payload = this.buildKraPayload(existing);
    const response = await this.submitPayload(payload);

    const accepted =
      response.ok === true ||
      ['ACCEPTED', 'SUCCESS', 'SUBMITTED'].includes(String(response.status ?? '').toUpperCase());

    const updated = await invoice.update({
      where: {
        id: existing.id,
      },
      data: {
        kraControlNumber: response.controlNumber ?? existing.kraControlNumber ?? null,
        kraQrCodeUrl: response.qrCodeUrl ?? existing.kraQrCodeUrl ?? null,
        etimsReference: response.reference ?? response.submissionId ?? null,
        etimsStatus: accepted ? 'ACCEPTED' : 'FAILED',
        etimsSubmittedAt: new Date(),
        etimsSubmittedById: input.actorId,
        status: accepted ? 'ISSUED' : existing.status,
        metadata: {
          ...asRecord(existing.metadata),
          etims: {
            status: accepted ? 'ACCEPTED' : 'FAILED',
            submittedAt: new Date().toISOString(),
            submittedById: input.actorId,
            response,
          },
        },
      },
    });

    return {
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      status: accepted ? 'ACCEPTED' : 'FAILED',
      payload,
      response,
      invoice: updated,
    };
  }

  buildKraPayload(invoice: any): ETimsPayload {
    const lines = Array.isArray(invoice.lines) && invoice.lines.length
      ? invoice.lines
      : [];

    const items: ETimsInvoiceItem[] = lines.map((line: any, index: number) => {
      const quantity = qty(line.quantity);
      const unitPrice = money(line.unitPrice ?? line.rate ?? line.totalAmount);
      const taxRate = money(line.taxRate ?? 0);
      const totalAmount = money(line.totalAmount ?? quantity.mul(unitPrice));
      const taxAmount = money(line.taxAmount ?? totalAmount.mul(taxRate));

      return {
        itemCode: String(line.itemCode ?? `LEGAL-${String(index + 1).padStart(3, '0')}`),
        itemDescription: String(line.description ?? 'Legal services'),
        quantity: quantity.toString(),
        unitPrice: unitPrice.toString(),
        taxRate: taxRate.toString(),
        taxClass: taxRate.gt(0) ? 'A' : 'E',
        totalAmount: totalAmount.toString(),
        taxAmount: taxAmount.toString(),
      };
    });

    if (!items.length) {
      const totalAmount = money(invoice.totalAmount ?? invoice.grandTotal ?? 0);
      const taxAmount = money(invoice.taxAmount ?? invoice.vatAmount ?? 0);

      items.push({
        itemCode: 'LEGAL-FEE-001',
        itemDescription: String(invoice.description ?? invoice.notes ?? 'Legal services'),
        quantity: '1',
        unitPrice: totalAmount.minus(taxAmount).toString(),
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
      invoiceDate: isoDate(invoice.finalizedAt ?? invoice.invoiceDate ?? invoice.createdAt),
      currency: invoice.currency ?? 'KES',
      items,
      totalTaxAmount: money(invoice.taxAmount ?? invoice.vatAmount ?? 0).toString(),
      totalInvoiceAmount: money(invoice.totalAmount ?? invoice.grandTotal ?? 0).toString(),
    };
  }

  private async submitPayload(payload: ETimsPayload): Promise<Record<string, any>> {
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

    const fetchFn = (globalThis as any).fetch;

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
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let body: any = {};

    try {
      body = text ? JSON.parse(text) : {};
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
      status: body.status ?? 'SUBMITTED',
      controlNumber: body.controlNumber ?? body.kraControlNumber ?? null,
      qrCodeUrl: body.qrCodeUrl ?? body.kraQrCodeUrl ?? null,
      reference: body.reference ?? body.submissionId ?? null,
      ...body,
    };
  }
}

export const etimsService = new ETimsService();

export { ETimsService as EtimsService };

export default ETimsService;