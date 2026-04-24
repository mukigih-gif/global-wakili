// apps/api/src/modules/billing/LEDESService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type LEDESFormat = 'LEDES_1998B' | 'LEDES_1998BI' | 'LEDES_2000';

export type GenerateLEDESInput = {
  tenantId: string;
  invoiceId: string;
  format?: LEDESFormat;
};

export type LEDESLine = {
  invoiceDate: string;
  invoiceNumber: string;
  clientId: string;
  lawFirmMatterId: string;
  invoiceTotal: string;
  billingStartDate: string;
  billingEndDate: string;
  invoiceDescription: string;
  lineItemNumber: string;
  expenseCode: string;
  activityCode: string;
  taskCode: string;
  lineItemType: string;
  lineItemDescription: string;
  lawFirmId: string;
  timekeeperId: string;
  lineItemUnits: string;
  lineItemRate: string;
  lineItemAdjustmentAmount: string;
  lineItemTotal: string;
};

const ZERO = new Prisma.Decimal(0);

function delegate(db: DbClient, name: string) {
  const modelDelegate = db[name];

  if (!modelDelegate) {
    throw Object.assign(
      new Error(`Prisma model delegate "${name}" is missing. Apply Billing schema before activating this workflow.`),
      {
        statusCode: 500,
        code: 'BILLING_SCHEMA_DELEGATE_MISSING',
        model: name,
      },
    );
  }

  return modelDelegate;
}

function money(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return ZERO;

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) {
    throw Object.assign(new Error('Invalid decimal value'), {
      statusCode: 422,
      code: 'INVALID_DECIMAL_VALUE',
    });
  }

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function qty(value: unknown): Prisma.Decimal {
  if (value === null || value === undefined || value === '') return new Prisma.Decimal(1);

  const parsed = new Prisma.Decimal(value as any);

  if (!parsed.isFinite()) return new Prisma.Decimal(1);

  return parsed.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

function yyyymmdd(value: unknown): string {
  const date = value ? new Date(value as any) : new Date();

  if (Number.isNaN(date.getTime())) {
    return yyyymmdd(new Date());
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yyyy}${mm}${dd}`;
}

function sanitize(value: unknown): string {
  return String(value ?? '')
    .replace(/\|/g, ' ')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

export class LEDESService {
  async generateInvoiceLEDES(input: GenerateLEDESInput) {
    const invoice = delegate(prisma, 'invoice');

    const existing = await invoice.findFirst({
      where: {
        id: input.invoiceId,
        tenantId: input.tenantId,
      },
      include: {
        client: true,
        matter: true,
        lines: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Invoice not found'), {
        statusCode: 404,
        code: 'LEDES_INVOICE_NOT_FOUND',
      });
    }

    const lines = this.buildLines(existing, input.format ?? 'LEDES_1998B');

    return {
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      invoiceNumber: existing.invoiceNumber ?? null,
      format: input.format ?? 'LEDES_1998B',
      fileName: `${sanitize(existing.invoiceNumber ?? existing.id)}.ledes`,
      content: this.render1998B(lines),
      lines,
      generatedAt: new Date(),
    };
  }

  async persistLEDESExport(input: GenerateLEDESInput & {
    actorId: string;
  }) {
    const exportResult = await this.generateInvoiceLEDES(input);
    const billingExport = delegate(prisma, 'billingExport');

    return billingExport.create({
      data: {
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        exportType: 'LEDES',
        format: exportResult.format,
        fileName: exportResult.fileName,
        content: exportResult.content,
        status: 'GENERATED',
        generatedById: input.actorId,
        generatedAt: new Date(),
        metadata: {
          lineCount: exportResult.lines.length,
        },
      },
    });
  }

  private buildLines(invoice: any, format: LEDESFormat): LEDESLine[] {
    const invoiceDate = yyyymmdd(invoice.invoiceDate ?? invoice.issueDate ?? invoice.createdAt);
    const billingStartDate = yyyymmdd(invoice.periodStart ?? invoice.invoiceDate ?? invoice.createdAt);
    const billingEndDate = yyyymmdd(invoice.periodEnd ?? invoice.invoiceDate ?? invoice.createdAt);

    const clientCode =
      invoice.client?.clientCode ??
      invoice.client?.id ??
      invoice.clientId ??
      'CLIENT';

    const matterCode =
      invoice.matter?.matterNumber ??
      invoice.matter?.id ??
      invoice.matterId ??
      'GENERAL';

    const lawFirmId =
      invoice.tenantId ??
      'GLOBAL-WAKILI';

    const invoiceTotal = money(invoice.totalAmount ?? invoice.grandTotal ?? 0).toFixed(2);

    const invoiceLines = Array.isArray(invoice.lines) && invoice.lines.length
      ? invoice.lines
      : [{
          id: invoice.id,
          description: invoice.description ?? `Invoice ${invoice.invoiceNumber ?? invoice.id}`,
          quantity: 1,
          unitPrice: invoice.totalAmount ?? 0,
          totalAmount: invoice.totalAmount ?? 0,
          metadata: {},
        }];

    return invoiceLines.map((line: any, index: number) => {
      const metadata = asRecord(line.metadata);
      const quantity = qty(line.quantity);
      const unitPrice = money(line.unitPrice ?? line.rate ?? line.totalAmount);
      const lineTotal = money(line.totalAmount ?? quantity.mul(unitPrice));

      return {
        invoiceDate,
        invoiceNumber: sanitize(invoice.invoiceNumber ?? invoice.id),
        clientId: sanitize(clientCode),
        lawFirmMatterId: sanitize(matterCode),
        invoiceTotal,
        billingStartDate,
        billingEndDate,
        invoiceDescription: sanitize(invoice.description ?? invoice.notes ?? 'Legal services'),
        lineItemNumber: String(index + 1),
        expenseCode: sanitize(metadata.expenseCode ?? ''),
        activityCode: sanitize(metadata.activityCode ?? ''),
        taskCode: sanitize(metadata.taskCode ?? ''),
        lineItemType: sanitize(metadata.lineItemType ?? metadata.type ?? 'F'),
        lineItemDescription: sanitize(line.description ?? 'Legal services'),
        lawFirmId: sanitize(lawFirmId),
        timekeeperId: sanitize(metadata.timekeeperId ?? line.timekeeperId ?? 'FIRM'),
        lineItemUnits: quantity.toFixed(4),
        lineItemRate: unitPrice.toFixed(2),
        lineItemAdjustmentAmount: money(line.adjustmentAmount ?? 0).toFixed(2),
        lineItemTotal: lineTotal.toFixed(2),
      };
    });
  }

  private render1998B(lines: LEDESLine[]): string {
    const header = [
      'LEDES1998B[]',
      'INVOICE_DATE|INVOICE_NUMBER|CLIENT_ID|LAW_FIRM_MATTER_ID|INVOICE_TOTAL|BILLING_START_DATE|BILLING_END_DATE|INVOICE_DESCRIPTION|LINE_ITEM_NUMBER|EXP/FEE/INV_ADJ_TYPE|LINE_ITEM_NUMBER_OF_UNITS|LINE_ITEM_ADJUSTMENT_AMOUNT|LINE_ITEM_TOTAL|LINE_ITEM_DATE|LINE_ITEM_TASK_CODE|LINE_ITEM_EXPENSE_CODE|LINE_ITEM_ACTIVITY_CODE|TIMEKEEPER_ID|LINE_ITEM_DESCRIPTION|LAW_FIRM_ID|LINE_ITEM_UNIT_COST',
    ];

    const body = lines.map((line) => [
      line.invoiceDate,
      line.invoiceNumber,
      line.clientId,
      line.lawFirmMatterId,
      line.invoiceTotal,
      line.billingStartDate,
      line.billingEndDate,
      line.invoiceDescription,
      line.lineItemNumber,
      line.lineItemType,
      line.lineItemUnits,
      line.lineItemAdjustmentAmount,
      line.lineItemTotal,
      line.invoiceDate,
      line.taskCode,
      line.expenseCode,
      line.activityCode,
      line.timekeeperId,
      line.lineItemDescription,
      line.lawFirmId,
      line.lineItemRate,
    ].map(sanitize).join('|'));

    return [...header, ...body].join('\n');
  }
}

export const ledesService = new LEDESService();

export default LEDESService;