// apps/api/src/modules/billing/payment-reminder.service.ts

import { Prisma, prisma } from '@global-wakili/database';

type DbClient = typeof prisma | Prisma.TransactionClient | any;

export type ReminderChannel = 'EMAIL' | 'SMS' | 'PORTAL' | 'WHATSAPP' | 'MANUAL';
export type ReminderTone = 'GENTLE' | 'STANDARD' | 'FIRM' | 'FINAL_NOTICE';

export type CreatePaymentReminderInput = {
  tenantId: string;
  actorId: string;
  invoiceId: string;
  channel?: ReminderChannel;
  tone?: ReminderTone;
  scheduledFor?: Date | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
};

export type SendPaymentReminderInput = {
  tenantId: string;
  actorId: string;
  reminderId: string;
  sentAt?: Date | null;
  deliveryReference?: string | null;
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

  if (!parsed.isFinite()) return ZERO;

  return parsed.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export class PaymentReminderService {
  async createReminder(input: CreatePaymentReminderInput) {
    return prisma.$transaction(async (tx) => {
      const invoice = delegate(tx, 'invoice');
      const paymentReminder = delegate(tx, 'paymentReminder');

      const existingInvoice = await invoice.findFirst({
        where: {
          id: input.invoiceId,
          tenantId: input.tenantId,
        },
        include: {
          client: true,
          matter: true,
        },
      });

      if (!existingInvoice) {
        throw Object.assign(new Error('Invoice not found'), {
          statusCode: 404,
          code: 'PAYMENT_REMINDER_INVOICE_NOT_FOUND',
        });
      }

      if (['PAID', 'CANCELLED', 'VOID'].includes(String(existingInvoice.status ?? '').toUpperCase())) {
        throw Object.assign(new Error('Reminder cannot be created for paid or cancelled invoice'), {
          statusCode: 409,
          code: 'PAYMENT_REMINDER_INVOICE_LOCKED',
        });
      }

      const reminderNumber = await this.allocateReminderNumber(tx, input.tenantId);
      const message = input.message ?? this.buildDefaultMessage(existingInvoice, input.tone ?? 'STANDARD');

      return paymentReminder.create({
        data: {
          tenantId: input.tenantId,
          invoiceId: existingInvoice.id,
          clientId: existingInvoice.clientId ?? null,
          matterId: existingInvoice.matterId ?? null,
          reminderNumber,
          channel: input.channel ?? 'EMAIL',
          tone: input.tone ?? 'STANDARD',
          status: input.scheduledFor ? 'SCHEDULED' : 'DRAFT',
          scheduledFor: input.scheduledFor ?? null,
          message,
          outstandingAmount: money(existingInvoice.balanceDue ?? existingInvoice.totalAmount),
          dueDate: existingInvoice.dueDate ?? null,
          createdById: input.actorId,
          metadata: {
            ...(input.metadata ?? {}),
            invoiceNumber: existingInvoice.invoiceNumber ?? null,
            clientName:
              existingInvoice.client?.displayName ??
              existingInvoice.client?.name ??
              existingInvoice.client?.email ??
              null,
            matterTitle:
              existingInvoice.matter?.title ??
              existingInvoice.matter?.matterNumber ??
              null,
          },
        },
      });
    });
  }

  async sendReminder(input: SendPaymentReminderInput) {
    return prisma.$transaction(async (tx) => {
      const paymentReminder = delegate(tx, 'paymentReminder');
      const invoice = delegate(tx, 'invoice');

      const reminder = await paymentReminder.findFirst({
        where: {
          id: input.reminderId,
          tenantId: input.tenantId,
        },
      });

      if (!reminder) {
        throw Object.assign(new Error('Payment reminder not found'), {
          statusCode: 404,
          code: 'PAYMENT_REMINDER_NOT_FOUND',
        });
      }

      if (['SENT', 'CANCELLED'].includes(String(reminder.status))) {
        throw Object.assign(new Error('Payment reminder cannot be sent in current status'), {
          statusCode: 409,
          code: 'PAYMENT_REMINDER_LOCKED',
        });
      }

      const sentAt = input.sentAt ?? new Date();

      const updated = await paymentReminder.update({
        where: { id: reminder.id },
        data: {
          status: 'SENT',
          sentAt,
          sentById: input.actorId,
          deliveryReference: input.deliveryReference ?? null,
          metadata: {
            ...asRecord(reminder.metadata),
            sent: {
              actorId: input.actorId,
              sentAt: sentAt.toISOString(),
              deliveryReference: input.deliveryReference ?? null,
            },
          },
        },
      });

      if (reminder.invoiceId) {
        const existingInvoice = await invoice.findFirst({
          where: {
            id: reminder.invoiceId,
            tenantId: input.tenantId,
          },
        });

        if (existingInvoice) {
          await invoice.update({
            where: { id: existingInvoice.id },
            data: {
              lastReminderAt: sentAt,
              reminderCount: Number(existingInvoice.reminderCount ?? 0) + 1,
              metadata: {
                ...asRecord(existingInvoice.metadata),
                lastPaymentReminderId: reminder.id,
                lastPaymentReminderAt: sentAt.toISOString(),
              },
            },
          });
        }
      }

      return updated;
    });
  }

  async cancelReminder(input: {
    tenantId: string;
    reminderId: string;
    actorId: string;
    reason: string;
  }) {
    if (!input.reason?.trim()) {
      throw Object.assign(new Error('Cancellation reason is required'), {
        statusCode: 400,
        code: 'PAYMENT_REMINDER_CANCEL_REASON_REQUIRED',
      });
    }

    const paymentReminder = delegate(prisma, 'paymentReminder');

    const existing = await paymentReminder.findFirst({
      where: {
        id: input.reminderId,
        tenantId: input.tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Payment reminder not found'), {
        statusCode: 404,
        code: 'PAYMENT_REMINDER_NOT_FOUND',
      });
    }

    if (String(existing.status) === 'SENT') {
      throw Object.assign(new Error('Sent payment reminder cannot be cancelled'), {
        statusCode: 409,
        code: 'PAYMENT_REMINDER_ALREADY_SENT',
      });
    }

    return paymentReminder.update({
      where: { id: input.reminderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: input.actorId,
        cancellationReason: input.reason,
      },
    });
  }

  async generateOverdueReminders(input: {
    tenantId: string;
    actorId: string;
    asOf?: Date;
    minimumDaysOverdue?: number;
    channel?: ReminderChannel;
    tone?: ReminderTone;
  }) {
    const invoice = delegate(prisma, 'invoice');
    const asOf = input.asOf ?? new Date();
    const minimumDaysOverdue = input.minimumDaysOverdue ?? 1;

    const overdueInvoices = await invoice.findMany({
      where: {
        tenantId: input.tenantId,
        dueDate: {
          lt: asOf,
        },
        status: {
          notIn: ['PAID', 'CANCELLED', 'VOID'],
        },
        balanceDue: {
          gt: ZERO,
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 500,
    });

    const created = [];
    const skipped = [];

    for (const item of overdueInvoices) {
      const dueDate = item.dueDate ? new Date(item.dueDate) : null;
      const daysOverdue = dueDate ? daysBetween(dueDate, asOf) : 0;

      if (daysOverdue < minimumDaysOverdue) {
        skipped.push({
          invoiceId: item.id,
          reason: 'Below minimum overdue days',
        });
        continue;
      }

      try {
        created.push(
          await this.createReminder({
            tenantId: input.tenantId,
            actorId: input.actorId,
            invoiceId: item.id,
            channel: input.channel ?? 'EMAIL',
            tone: input.tone ?? this.toneForDaysOverdue(daysOverdue),
            metadata: {
              generatedBy: 'OVERDUE_REMINDER_BATCH',
              daysOverdue,
            },
          }),
        );
      } catch (error) {
        skipped.push({
          invoiceId: item.id,
          reason: error instanceof Error ? error.message : 'Reminder generation failed',
        });
      }
    }

    return {
      tenantId: input.tenantId,
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped,
      generatedAt: new Date(),
    };
  }

  async listReminders(input: {
    tenantId: string;
    invoiceId?: string;
    clientId?: string;
    matterId?: string;
    status?: string;
    take?: number;
    skip?: number;
  }) {
    const paymentReminder = delegate(prisma, 'paymentReminder');

    return paymentReminder.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
        ...(input.clientId ? { clientId: input.clientId } : {}),
        ...(input.matterId ? { matterId: input.matterId } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(input.take ?? 100, 100),
      skip: input.skip ?? 0,
    });
  }

  async getReminderById(tenantId: string, reminderId: string) {
    const paymentReminder = delegate(prisma, 'paymentReminder');

    const existing = await paymentReminder.findFirst({
      where: {
        id: reminderId,
        tenantId,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Payment reminder not found'), {
        statusCode: 404,
        code: 'PAYMENT_REMINDER_NOT_FOUND',
      });
    }

    return existing;
  }

  private buildDefaultMessage(invoice: any, tone: ReminderTone) {
    const invoiceNumber = invoice.invoiceNumber ?? 'your invoice';
    const balance = money(invoice.balanceDue ?? invoice.totalAmount).toString();
    const dueDate = invoice.dueDate
      ? new Date(invoice.dueDate).toISOString().slice(0, 10)
      : 'the due date';

    const base = `This is a ${tone.toLowerCase().replace('_', ' ')} reminder that invoice ${invoiceNumber} has an outstanding balance of ${invoice.currency ?? 'KES'} ${balance}, due on ${dueDate}.`;

    if (tone === 'FINAL_NOTICE') {
      return `${base} Kindly settle this amount immediately or contact us to resolve any issue with the account.`;
    }

    if (tone === 'FIRM') {
      return `${base} Kindly arrange settlement as soon as possible.`;
    }

    if (tone === 'GENTLE') {
      return `${base} Please disregard this message if payment has already been made.`;
    }

    return base;
  }

  private toneForDaysOverdue(daysOverdue: number): ReminderTone {
    if (daysOverdue >= 60) return 'FINAL_NOTICE';
    if (daysOverdue >= 30) return 'FIRM';
    if (daysOverdue >= 7) return 'STANDARD';
    return 'GENTLE';
  }

  private async allocateReminderNumber(tx: Prisma.TransactionClient, tenantId: string) {
    const year = new Date().getFullYear();
    const sequence = delegate(tx, 'numberSequence');

    const row = await sequence.upsert({
      where: {
        tenantId_key_year: {
          tenantId,
          key: 'PAYMENT_REMINDER',
          year,
        },
      },
      update: {
        nextValue: { increment: 1 },
      },
      create: {
        tenantId,
        key: 'PAYMENT_REMINDER',
        year,
        nextValue: 2,
      },
    });

    const current = Number(row.nextValue) - 1;

    return `REM-${year}-${String(current).padStart(6, '0')}`;
  }
}

export const paymentReminderService = new PaymentReminderService();

export default PaymentReminderService;