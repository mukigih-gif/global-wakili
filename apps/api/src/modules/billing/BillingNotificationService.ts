// apps/api/src/modules/billing/BillingNotificationService.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type BillingNotificationType =
  | 'PROFORMA_SENT'
  | 'INVOICE_ISSUED'
  | 'INVOICE_OVERDUE'
  | 'PAYMENT_REMINDER'
  | 'CREDIT_NOTE_ISSUED'
  | 'RETAINER_RECEIVED'
  | 'RETAINER_APPLIED'
  | 'LEDES_EXPORT_READY';

export type BillingNotificationChannel = 'EMAIL' | 'SMS' | 'PORTAL' | 'WHATSAPP' | 'MANUAL';

export type CreateBillingNotificationInput = {
  tenantId: string;
  actorId: string;
  type: BillingNotificationType;
  channel?: BillingNotificationChannel;
  clientId?: string | null;
  matterId?: string | null;
  invoiceId?: string | null;
  proformaId?: string | null;
  creditNoteId?: string | null;
  retainerId?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  subject?: string | null;
  message?: string | null;
  scheduledFor?: Date | null;
  metadata?: Record<string, unknown>;
};

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

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function buildSubject(input: CreateBillingNotificationInput): string {
  if (input.subject?.trim()) return input.subject.trim();

  const labels: Record<BillingNotificationType, string> = {
    PROFORMA_SENT: 'Proforma invoice',
    INVOICE_ISSUED: 'Invoice issued',
    INVOICE_OVERDUE: 'Invoice overdue',
    PAYMENT_REMINDER: 'Payment reminder',
    CREDIT_NOTE_ISSUED: 'Credit note issued',
    RETAINER_RECEIVED: 'Retainer received',
    RETAINER_APPLIED: 'Retainer applied',
    LEDES_EXPORT_READY: 'LEDES export ready',
  };

  return labels[input.type] ?? 'Billing notification';
}

function buildMessage(input: CreateBillingNotificationInput): string {
  if (input.message?.trim()) return input.message.trim();

  switch (input.type) {
    case 'PROFORMA_SENT':
      return 'A proforma invoice has been prepared for your review.';
    case 'INVOICE_ISSUED':
      return 'A billing invoice has been issued.';
    case 'INVOICE_OVERDUE':
      return 'An invoice on your account is overdue.';
    case 'PAYMENT_REMINDER':
      return 'This is a reminder regarding an outstanding invoice.';
    case 'CREDIT_NOTE_ISSUED':
      return 'A credit note has been issued on your account.';
    case 'RETAINER_RECEIVED':
      return 'A retainer has been received and recorded.';
    case 'RETAINER_APPLIED':
      return 'A retainer has been applied to an invoice.';
    case 'LEDES_EXPORT_READY':
      return 'A LEDES billing export is ready.';
    default:
      return 'Billing notification generated.';
  }
}

export class BillingNotificationService {
  async createNotification(input: CreateBillingNotificationInput) {
    const billingNotification = delegate(prisma, 'billingNotification');

    return billingNotification.create({
      data: {
        tenantId: input.tenantId,
        type: input.type,
        channel: input.channel ?? 'PORTAL',
        clientId: input.clientId ?? null,
        matterId: input.matterId ?? null,
        invoiceId: input.invoiceId ?? null,
        proformaId: input.proformaId ?? null,
        creditNoteId: input.creditNoteId ?? null,
        retainerId: input.retainerId ?? null,
        recipientName: input.recipientName ?? null,
        recipientEmail: input.recipientEmail ?? null,
        recipientPhone: input.recipientPhone ?? null,
        subject: buildSubject(input),
        message: buildMessage(input),
        status: input.scheduledFor ? 'SCHEDULED' : 'DRAFT',
        scheduledFor: input.scheduledFor ?? null,
        createdById: input.actorId,
        metadata: input.metadata ?? {},
      },
    });
  }

  async markSent(input: {
    tenantId: string;
    notificationId: string;
    actorId: string;
    deliveryReference?: string | null;
    sentAt?: Date | null;
  }) {
    const billingNotification = delegate(prisma, 'billingNotification');

    const existing = await billingNotification.findFirst({
      where: {
        id: input.notificationId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Billing notification not found'), {
        statusCode: 404,
        code: 'BILLING_NOTIFICATION_NOT_FOUND',
      });
    }

    const sentAt = input.sentAt ?? new Date();

    return billingNotification.update({
      where: { id: existing.id },
      data: {
        status: 'SENT',
        sentAt,
        sentById: input.actorId,
        deliveryReference: input.deliveryReference ?? null,
        metadata: {
          ...asRecord(existing.metadata),
          sent: {
            actorId: input.actorId,
            sentAt: sentAt.toISOString(),
            deliveryReference: input.deliveryReference ?? null,
          },
        },
      },
    });
  }

  async markFailed(input: {
    tenantId: string;
    notificationId: string;
    actorId: string;
    error: string;
  }) {
    const billingNotification = delegate(prisma, 'billingNotification');

    const existing = await billingNotification.findFirst({
      where: {
        id: input.notificationId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Billing notification not found'), {
        statusCode: 404,
        code: 'BILLING_NOTIFICATION_NOT_FOUND',
      });
    }

    return billingNotification.update({
      where: { id: existing.id },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: input.error,
        metadata: {
          ...asRecord(existing.metadata),
          failed: {
            actorId: input.actorId,
            error: input.error,
            at: new Date().toISOString(),
          },
        },
      },
    });
  }

  async listNotifications(input: {
    tenantId: string;
    clientId?: string;
    matterId?: string;
    invoiceId?: string;
    type?: string;
    status?: string;
    take?: number;
    skip?: number;
  }) {
    const billingNotification = delegate(prisma, 'billingNotification');

    return billingNotification.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.matterId ? { matterId: input.matterId } : {}),
        ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }
}

export const billingNotificationService = new BillingNotificationService();

export default BillingNotificationService;