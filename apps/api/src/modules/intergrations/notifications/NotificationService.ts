import type { Request } from 'express';
import { getReminderQueue } from '../../queues/queue';
import { EmailService, type EmailRecipient } from './EmailService';
import { SMSService, type SMSRecipient } from './SMSService';
import { NotificationTemplateRegistry } from './NotificationTemplateRegistry';
import { NotificationPreferenceService } from './NotificationPreferenceService';
import { NotificationRecipientResolver } from './NotificationRecipientResolver';
import { NotificationAuditService } from './NotificationAuditService';

export type NotificationChannel = 'email' | 'sms' | 'portal';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationCategory =
  | 'billing'
  | 'trust'
  | 'compliance'
  | 'matter_update'
  | 'calendar'
  | 'document'
  | 'payroll'
  | 'procurement'
  | 'system_alert';

export type NotificationRecipient = {
  recipientId?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
};

export type NotificationTemplatePayload = {
  templateKey: string;
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  smsBody?: string | null;
  variables?: Record<string, unknown>;
};

export type NotificationSendInput = {
  tenantId: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  channels: NotificationChannel[];
  recipients: NotificationRecipient[];
  template: NotificationTemplatePayload;
  entityType?: string | null;
  entityId?: string | null;
  debounceKey?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
};

type TenantBranding = {
  senderEmail?: string | null;
  senderName?: string | null;
  smsSenderId?: string | null;
};

type NotificationDispatchStatus =
  | 'PENDING'
  | 'SENT'
  | 'FAILED'
  | 'DELIVERED'
  | 'SUPPRESSED';

type DispatchResult = {
  channel: NotificationChannel;
  status: NotificationDispatchStatus;
  provider?: string | null;
  providerMessageId?: string | null;
  providerMessageIds?: string[];
  reason?: string | null;
};

type ResolvedRecipient = NotificationRecipient & {
  allowedChannels: NotificationChannel[];
};

const DEBOUNCE_WINDOW_MS = 5 * 60 * 1000;

function interpolateTemplate(
  template: string | null | undefined,
  variables?: Record<string, unknown>,
): string | null {
  if (!template) return null;

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = variables?.[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function ensureChannels(channels: NotificationChannel[]): void {
  if (!channels.length) {
    throw Object.assign(new Error('At least one notification channel is required'), {
      statusCode: 400,
      code: 'NOTIFICATION_CHANNEL_REQUIRED',
    });
  }
}

function ensureRecipients(recipients: NotificationRecipient[]): void {
  if (!recipients.length) {
    throw Object.assign(new Error('At least one notification recipient is required'), {
      statusCode: 400,
      code: 'NOTIFICATION_RECIPIENT_REQUIRED',
    });
  }
}

function getSmsLengthWarning(message: string | null | undefined): string | null {
  if (!message) return null;
  return message.length > 160
    ? `SMS content exceeds 160 characters (${message.length}) and may incur multi-segment billing.`
    : null;
}

function mergeTemplateWithRegistry(inputTemplate: NotificationTemplatePayload) {
  const registryTemplate = NotificationTemplateRegistry.get(inputTemplate.templateKey as any);

  return {
    category: registryTemplate.category,
    priority: registryTemplate.defaultPriority,
    channels: registryTemplate.channels,
    template: {
      templateKey: inputTemplate.templateKey,
      subject: inputTemplate.subject ?? registryTemplate.subject ?? null,
      textBody: inputTemplate.textBody ?? registryTemplate.textBody ?? null,
      htmlBody: inputTemplate.htmlBody ?? registryTemplate.htmlBody ?? null,
      smsBody: inputTemplate.smsBody ?? registryTemplate.smsBody ?? null,
      variables: inputTemplate.variables ?? {},
    },
  };
}

export class NotificationService {
  static async getTenantBranding(db: any, tenantId: string): Promise<TenantBranding> {
    const tenant = await db.tenant.findFirst({
      where: { id: tenantId },
      select: {
        name: true,
        settings: true,
      },
    });

    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;

    return {
      senderEmail: typeof settings.senderEmail === 'string' ? settings.senderEmail : null,
      senderName:
        typeof settings.senderName === 'string'
          ? settings.senderName
          : tenant?.name ?? 'Global Wakili',
      smsSenderId: typeof settings.smsSenderId === 'string' ? settings.smsSenderId : null,
    };
  }

  static async shouldSuppressDuplicate(
    db: any,
    tenantId: string,
    params: {
      templateKey: string;
      debounceKey: string;
    },
  ): Promise<boolean> {
    const since = new Date(Date.now() - DEBOUNCE_WINDOW_MS);

    const existing = await db.notification.findFirst({
      where: {
        tenantId,
        templateKey: params.templateKey,
        debounceKey: params.debounceKey,
        createdAt: { gte: since },
        status: {
          in: ['PENDING', 'SENT', 'DELIVERED'],
        },
      },
      select: { id: true },
    });

    return Boolean(existing);
  }

  static async enqueue(
    req: Request,
    input: NotificationSendInput,
  ) {
    ensureChannels(input.channels);
    ensureRecipients(input.recipients);

    const queue = getReminderQueue();

    const job = await queue.add('reminder.dispatch', {
      tenantId: input.tenantId,
      reminderType: input.template.templateKey,
      channel: input.channels[0],
      recipient:
        input.recipients[0]?.recipientId ||
        input.recipients[0]?.email ||
        input.recipients[0]?.phoneNumber ||
        'unknown',
      subject: input.template.subject ?? undefined,
      message:
        input.template.textBody ||
        input.template.smsBody ||
        input.template.htmlBody ||
        '',
      requestId: input.requestId ?? req.id,
      metadata: {
        category: input.category,
        priority: input.priority,
        channels: input.channels,
        recipients: input.recipients,
        template: input.template,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        debounceKey: input.debounceKey ?? null,
        metadata: input.metadata ?? null,
      },
    });

    await NotificationAuditService.logQueued(req, {
      templateKey: input.template.templateKey,
      channels: input.channels,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      queueJobId: job.id,
    });

    return {
      queued: true,
      queueJobId: job.id,
    };
  }

  static async dispatch(
    db: any,
    input: NotificationSendInput,
    req?: Request,
  ) {
    ensureChannels(input.channels);
    ensureRecipients(input.recipients);

    const merged = mergeTemplateWithRegistry(input.template);

    const effectiveCategory: NotificationCategory =
      input.category ?? merged.category;

    const effectivePriority: NotificationPriority =
      input.priority ?? merged.priority;

    const requestedChannels: NotificationChannel[] =
      input.channels.length ? input.channels : merged.channels;

    const resolvedRecipientsBase: NotificationRecipient[] = [];

    for (const recipient of input.recipients) {
      if (recipient.recipientId && (!recipient.email || !recipient.phoneNumber || !recipient.name)) {
        try {
          const resolved = await NotificationRecipientResolver.resolveUser(db, recipient.recipientId);
          resolvedRecipientsBase.push({
            recipientId: recipient.recipientId,
            email: recipient.email ?? resolved.email,
            phoneNumber: recipient.phoneNumber ?? resolved.phoneNumber,
            name: recipient.name ?? resolved.name,
          });
        } catch {
          resolvedRecipientsBase.push(recipient);
        }
      } else {
        resolvedRecipientsBase.push(recipient);
      }
    }

    const filteredRecipients: ResolvedRecipient[] = [];

    for (const recipient of resolvedRecipientsBase) {
      const allowedChannels = await NotificationPreferenceService.filterAllowedChannels(db, {
        userId: recipient.recipientId ?? null,
        channels: requestedChannels,
        category: effectiveCategory,
        priority: effectivePriority,
      });

      if (allowedChannels.length) {
        filteredRecipients.push({
          ...recipient,
          allowedChannels,
        });
      }
    }

    if (!filteredRecipients.length) {
      return {
        suppressed: true,
        results: [] as DispatchResult[],
      };
    }

    const debounceKey =
      input.debounceKey ||
      `${input.template.templateKey}:${input.entityType ?? 'general'}:${input.entityId ?? 'none'}:${filteredRecipients
        .map((r) => r.recipientId || r.email || r.phoneNumber || 'unknown')
        .sort()
        .join('|')}`;

    const shouldSuppress = await this.shouldSuppressDuplicate(db, input.tenantId, {
      templateKey: input.template.templateKey,
      debounceKey,
    });

    if (shouldSuppress) {
      for (const recipient of filteredRecipients) {
        await db.notification.create({
          data: {
            tenantId: input.tenantId,
            userId: recipient.recipientId ?? undefined,
            channel: 'portal',
            systemTitle: interpolateTemplate(merged.template.subject, merged.template.variables),
            systemMessage:
              interpolateTemplate(merged.template.textBody, merged.template.variables) ??
              interpolateTemplate(merged.template.htmlBody, merged.template.variables),
            emailSubject: interpolateTemplate(merged.template.subject, merged.template.variables),
            emailBody: interpolateTemplate(merged.template.htmlBody, merged.template.variables),
            smsContent: interpolateTemplate(merged.template.smsBody, merged.template.variables),
            status: 'SUPPRESSED',
            sentAt: null,
            deliveredAt: null,
            failedAt: null,
            templateKey: input.template.templateKey,
            category: effectiveCategory,
            priority: effectivePriority,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            debounceKey,
            provider: null,
            providerMessageId: null,
            metadata: input.metadata ?? null,
          },
        });
      }

      if (req) {
        await NotificationAuditService.logSuppressed(req, {
          templateKey: input.template.templateKey,
          debounceKey,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
        });
      }

      return {
        suppressed: true,
        results: [] as DispatchResult[],
      };
    }

    const branding = await this.getTenantBranding(db, input.tenantId);
    const results: DispatchResult[] = [];

    const smsWarning = getSmsLengthWarning(
      interpolateTemplate(merged.template.smsBody, merged.template.variables),
    );

    if (smsWarning) {
      console.warn('[SMS_LENGTH_WARNING]', {
        tenantId: input.tenantId,
        templateKey: input.template.templateKey,
        warning: smsWarning,
      });
    }

    for (const recipient of filteredRecipients) {
      if (recipient.allowedChannels.includes('email') && recipient.email) {
        const sender = EmailService.resolveDefaultSender(branding);

        const emailResult = await EmailService.send({
          tenantId: input.tenantId,
          fromEmail: sender.fromEmail,
          fromName: sender.fromName,
          to: [
            {
              email: recipient.email,
              name: recipient.name ?? null,
            },
          ],
          subject: interpolateTemplate(merged.template.subject, merged.template.variables) ?? '',
          textBody: interpolateTemplate(merged.template.textBody, merged.template.variables),
          htmlBody: interpolateTemplate(merged.template.htmlBody, merged.template.variables),
          metadata: input.metadata,
        });

        await db.notification.create({
          data: {
            tenantId: input.tenantId,
            userId: recipient.recipientId ?? undefined,
            channel: 'EMAIL',
            systemTitle: interpolateTemplate(merged.template.subject, merged.template.variables),
            systemMessage: interpolateTemplate(merged.template.textBody, merged.template.variables),
            emailSubject: interpolateTemplate(merged.template.subject, merged.template.variables),
            emailBody: interpolateTemplate(merged.template.htmlBody, merged.template.variables),
            smsContent: null,
            status: emailResult.accepted ? 'SENT' : 'FAILED',
            sentAt: emailResult.accepted ? new Date() : null,
            failedAt: emailResult.accepted ? null : new Date(),
            templateKey: input.template.templateKey,
            category: effectiveCategory,
            priority: effectivePriority,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            debounceKey,
            provider: emailResult.provider,
            providerMessageId: emailResult.providerMessageId,
            metadata: input.metadata ?? null,
          },
        });

        results.push({
          channel: 'email',
          status: emailResult.accepted ? 'SENT' : 'FAILED',
          provider: emailResult.provider,
          providerMessageId: emailResult.providerMessageId,
        });
      }

      if (recipient.allowedChannels.includes('sms') && recipient.phoneNumber) {
        const smsResult = await SMSService.send({
          tenantId: input.tenantId,
          senderId: SMSService.resolveDefaultSender(branding),
          recipients: [
            {
              phoneNumber: recipient.phoneNumber,
              name: recipient.name ?? null,
            },
          ],
          message: interpolateTemplate(merged.template.smsBody, merged.template.variables) ?? '',
          metadata: input.metadata,
        });

        await db.notification.create({
          data: {
            tenantId: input.tenantId,
            userId: recipient.recipientId ?? undefined,
            channel: 'SMS',
            systemTitle: interpolateTemplate(merged.template.subject, merged.template.variables),
            systemMessage: interpolateTemplate(merged.template.textBody, merged.template.variables),
            emailSubject: null,
            emailBody: null,
            smsContent: interpolateTemplate(merged.template.smsBody, merged.template.variables),
            status: smsResult.accepted ? 'SENT' : 'FAILED',
            sentAt: smsResult.accepted ? new Date() : null,
            failedAt: smsResult.accepted ? null : new Date(),
            templateKey: input.template.templateKey,
            category: effectiveCategory,
            priority: effectivePriority,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            debounceKey,
            provider: smsResult.provider,
            providerMessageId: smsResult.providerMessageIds.join(','),
            metadata: input.metadata ?? null,
          },
        });

        results.push({
          channel: 'sms',
          status: smsResult.accepted ? 'SENT' : 'FAILED',
          provider: smsResult.provider,
          providerMessageIds: smsResult.providerMessageIds,
        });
      }

      if (recipient.allowedChannels.includes('portal') && recipient.recipientId) {
        await db.notification.create({
          data: {
            tenantId: input.tenantId,
            userId: recipient.recipientId,
            channel: 'SYSTEM',
            systemTitle: interpolateTemplate(merged.template.subject, merged.template.variables),
            systemMessage:
              interpolateTemplate(merged.template.textBody, merged.template.variables) ??
              interpolateTemplate(merged.template.htmlBody, merged.template.variables),
            emailSubject: null,
            emailBody: null,
            smsContent: null,
            status: 'SENT',
            sentAt: new Date(),
            templateKey: input.template.templateKey,
            category: effectiveCategory,
            priority: effectivePriority,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            debounceKey,
            provider: null,
            providerMessageId: null,
            metadata: {
              ...(input.metadata ?? {}),
              portal: {
                htmlBody: interpolateTemplate(merged.template.htmlBody, merged.template.variables),
              },
            },
          },
        });

        results.push({
          channel: 'portal',
          status: 'SENT',
          provider: null,
          providerMessageId: null,
        });
      }
    }

    if (req) {
      await NotificationAuditService.logDispatched(req, {
        templateKey: input.template.templateKey,
        channels: requestedChannels,
        recipientRef: filteredRecipients.map(
          (r) => r.recipientId || r.email || r.phoneNumber || 'unknown',
        ),
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      });
    }

    return {
      suppressed: false,
      results,
    };
  }
}