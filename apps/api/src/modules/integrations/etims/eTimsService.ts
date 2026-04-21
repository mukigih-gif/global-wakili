import type { Request } from 'express';
import { Prisma } from '@global-wakili/database';
import { ETimsClient, type ETimsInvoicePayload } from './eTimsClient';
import { logAdminAction } from '../../../utils/audit-logger';
import { AuditSeverity } from '../../../types/audit';
import { NotificationService } from '../notifications/NotificationService';

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

type TenantEtimsConfig = {
  baseUrl?: string | null;
  deviceId?: string | null;
  taxpayerPin?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
};

export class ETimsService {
  static async getTenantConfig(db: any, tenantId: string): Promise<TenantEtimsConfig> {
    const tenant = await db.tenant.findFirst({
      where: { id: tenantId },
      select: {
        settings: true,
      },
    });

    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
    const etims = (settings.etims ?? {}) as Record<string, unknown>;

    return {
      baseUrl: typeof etims.baseUrl === 'string' ? etims.baseUrl : null,
      deviceId: typeof etims.deviceId === 'string' ? etims.deviceId : null,
      taxpayerPin: typeof etims.taxpayerPin === 'string' ? etims.taxpayerPin : null,
      apiKey: typeof etims.apiKey === 'string' ? etims.apiKey : null,
      apiSecret: typeof etims.apiSecret === 'string' ? etims.apiSecret : null,
    };
  }

  static async buildInvoicePayload(db: any, tenantId: string, invoiceId: string): Promise<ETimsInvoicePayload> {
    const invoice = await db.invoice.findFirst({
      where: {
        tenantId,
        id: invoiceId,
      },
      include: {
        matter: {
          include: {
            client: {
              select: {
                name: true,
                kraPin: true,
              },
            },
          },
        },
        lines: true,
      },
    });

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), {
        statusCode: 404,
        code: 'INVOICE_NOT_FOUND',
      });
    }

    return {
      tenantId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issuedDate.toISOString(),
      currency: invoice.currency,
      customerName: invoice.matter?.client?.name ?? 'Unknown Customer',
      customerPin: invoice.matter?.client?.kraPin ?? null,
      subTotal: toNumber(invoice.subTotal),
      taxAmount: toNumber(invoice.vatAmount ?? invoice.taxAmount),
      total: toNumber(invoice.total),
      lines: (invoice.lines ?? []).map((line: any) => ({
        itemCode: line.itemCode ?? line.id,
        description: line.description,
        quantity: Number(line.quantity),
        unitPrice: toNumber(line.unitPrice),
        taxRate: Number(line.taxRate ?? 0),
        taxAmount: toNumber(line.taxAmount ?? 0),
        lineTotal: toNumber(line.total ?? line.lineTotal ?? 0),
      })),
    };
  }

  static async submitInvoice(
    db: any,
    params: {
      tenantId: string;
      invoiceId: string;
      requestId?: string | null;
    },
  ) {
    const config = await this.getTenantConfig(db, params.tenantId);
    const payload = await this.buildInvoicePayload(db, params.tenantId, params.invoiceId);

    const result = await ETimsClient.submitInvoice(config, payload);

    await db.invoice.update({
      where: { id: params.invoiceId },
      data: {
        etimsReference: result.submissionId,
        etimsStatus: result.status,
        etimsReceiptNumber: result.receiptNumber,
        etimsLastSyncedAt: new Date(),
        etimsRejectionReason: result.status === 'REJECTED' ? 'Submission rejected' : null,
        etimsValidated: result.status === 'ACCEPTED',
        etimsValidatedAt: result.status === 'ACCEPTED' ? new Date() : null,
      },
    });

    return result;
  }

  static async syncInvoiceStatus(
    db: any,
    params: {
      tenantId: string;
      invoiceId: string;
    },
  ) {
    const config = await this.getTenantConfig(db, params.tenantId);

    const invoice = await db.invoice.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.invoiceId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        etimsReference: true,
      },
    });

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), {
        statusCode: 404,
        code: 'INVOICE_NOT_FOUND',
      });
    }

    if (!invoice.etimsReference) {
      throw Object.assign(new Error('Invoice has no eTIMS reference'), {
        statusCode: 409,
        code: 'ETIMS_REFERENCE_MISSING',
      });
    }

    const result = await ETimsClient.getSubmissionStatus(config, invoice.etimsReference);

    const accepted = result.status === 'ACCEPTED';

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        etimsStatus: result.status,
        etimsReceiptNumber: result.receiptNumber ?? null,
        etimsLastSyncedAt: new Date(),
        etimsRejectionReason: result.rejectionReason ?? null,
        etimsValidated: accepted,
        etimsValidatedAt: accepted ? new Date() : null,
      },
    });

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      ...result,
    };
  }

  static async submitInvoiceFromRequest(req: Request, invoiceId: string) {
    const tenantId = req.tenantId!;

    const result = await this.submitInvoice(req.db, {
      tenantId,
      invoiceId,
      requestId: req.id,
    });

    await logAdminAction({
      req,
      tenantId,
      action: 'ETIMS_INVOICE_SUBMITTED',
      severity: result.success ? AuditSeverity.INFO : AuditSeverity.HIGH,
      entityId: invoiceId,
      payload: {
        invoiceId,
        etimsReference: result.submissionId,
        status: result.status,
      },
    });

    return result;
  }

  static async syncInvoiceStatusFromRequest(req: Request, invoiceId: string) {
    const tenantId = req.tenantId!;

    const result = await this.syncInvoiceStatus(req.db, {
      tenantId,
      invoiceId,
    });

    await logAdminAction({
      req,
      tenantId,
      action: 'ETIMS_STATUS_SYNCED',
      severity:
        result.status === 'REJECTED' || result.status === 'FAILED'
          ? AuditSeverity.HIGH
          : AuditSeverity.INFO,
      entityId: invoiceId,
      payload: {
        invoiceId,
        etimsReference: result.submissionId,
        status: result.status,
        receiptNumber: result.receiptNumber ?? null,
        rejectionReason: result.rejectionReason ?? null,
      },
    });

    if (result.status === 'REJECTED' || result.status === 'FAILED') {
      try {
        const financeUsers = await req.db.user.findMany({
          where: {
            tenantId,
            status: 'ACTIVE',
            roles: {
              some: {
                name: { in: ['Finance', 'Partner', 'Managing Partner'] },
              },
            },
          },
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            name: true,
          },
        });

        if (financeUsers.length) {
          await NotificationService.dispatch(req.db, {
            tenantId,
            category: 'compliance',
            priority: 'high',
            channels: ['email', 'portal'],
            recipients: financeUsers.map((user: any) => ({
              recipientId: user.id,
              email: user.email ?? null,
              phoneNumber: user.phoneNumber ?? null,
              name: user.name ?? null,
            })),
            template: {
              templateKey: 'COMPLIANCE_ALERT',
              subject: 'eTIMS submission issue',
              textBody: `Invoice ${result.invoiceNumber} has eTIMS status ${result.status}.`,
              htmlBody: `<p>Invoice <strong>${result.invoiceNumber}</strong> has eTIMS status <strong>${result.status}</strong>.</p>`,
              variables: {},
            },
            entityType: 'Invoice',
            entityId: invoiceId,
            requestId: req.id,
            metadata: {
              etimsStatus: result.status,
              etimsReference: result.submissionId,
              rejectionReason: result.rejectionReason ?? null,
            },
          });
        }
      } catch (notificationError) {
        console.error('[ETIMS_NOTIFICATION_FAIL]', notificationError);
      }
    }

    return result;
  }
}