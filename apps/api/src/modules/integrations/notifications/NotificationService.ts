// apps/api/src/modules/integrations/notifications/NotificationService.ts

import type { Request } from 'express';

import { getReminderQueue } from '../../queues/queue';
import { EmailService } from './EmailService';
import { SMSService } from './SMSService';
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
  channels?: NotificationChannel[];
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

const DB_NOTIFICATION_CHANNEL = {
  email: 'EMAIL',
  sms: 'SMS',
  portal: 'SYSTEM',
} as const;

const DEFAULT_FALLBACK_TEMPLATE = {
  category: 'system_alert' as NotificationCategory,
  priority: 'normal' as NotificationPriority,
  channels: ['portal'] as NotificationChannel[],
};

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

function ensureTenantId(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for notification dispatch'), {
      statusCode: 400,
      code: 'NOTIFICATION_TENANT_REQUIRED',
    });
  }
}

function ensureTemplate(template: NotificationTemplatePayload): void {
  if (!template?.templateKey?.trim()) {
    throw Object.assign(new Error('Notification template key is required'), {
      statusCode: 400,
      code: 'NOTIFICATION_TEMPLATE_REQUIRED',
    });
  }
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

function uniqueChannels(channels: NotificationChannel[]): NotificationChannel[] {
  const allowed = new Set<NotificationChannel>(['email', 'sms', 'portal']);
  const normalized: NotificationChannel[] = [];

  for (const channel of channels) {
    if (allowed.has(channel) && !normalized.includes(channel)) {
      normalized.push(channel);
    }
  }

  return normalized;
}

function getSmsLengthWarning(message: string | null | undefined): string | null {
  if (!message) return null;

  return message.length > 160
    ? `SMS content exceeds 160 characters (${message.length}) and may incur multi-segment billing.`
    : null;
}

function safeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | null {
  if (!metadata) return null;

  return JSON.parse(
    JSON.stringify(metadata, (_key, value) => {
      if (typeof value === 'bigint') return value.toString();
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'function') return undefined;
      return value;
    }),
  );
}

function mergeTemplateWithRegistry(inputTemplate: NotificationTemplatePayload) {
  ensureTemplate(inputTemplate);

  try {
    const registryTemplate = NotificationTemplateRegistry.get(inputTemplate.templateKey as any);

    if (!registryTemplate) {
      throw new Error(`Template ${inputTemplate.templateKey} not found`);
    }

    const registryChannels = uniqueChannels(registryTemplate.channels ?? []);

    return {
      category: registryTemplate.category ?? DEFAULT_FALLBACK_TEMPLATE.category,
      priority: registryTemplate.defaultPriority ?? DEFAULT_FALLBACK_TEMPLATE.priority,
      channels: registryChannels.length ? registryChannels : DEFAULT_FALLBACK_TEMPLATE.channels,
      template: {
        templateKey: inputTemplate.templateKey,
        subject: inputTemplate.subject ?? registryTemplate.subject ?? null,
        textBody: inputTemplate.textBody ?? registryTemplate.textBody ?? null,
        htmlBody: inputTemplate.htmlBody ?? registryTemplate.htmlBody ?? null,
        smsBody: inputTemplate.smsBody ?? registryTemplate.smsBody ?? null,
        variables: inputTemplate.variables ?? {},
      },
    };
  } catch {
    return {
      category: DEFAULT_FALLBACK_TEMPLATE.category,
      priority: DEFAULT_FALLBACK_TEMPLATE.priority,
      channels: DEFAULT_FALLBACK_TEMPLATE.channels,
      template: {
        templateKey: inputTemplate.templateKey,
        subject: inputTemplate.subject ?? 'Global Wakili Notification',
        textBody:
          inputTemplate.textBody ??
          inputTemplate.smsBody ??
          'You have a new Global Wakili notification.',
        htmlBody:
          inputTemplate.htmlBody ??
          inputTemplate.textBody ??
          inputTemplate.smsBody ??
          'You have a new Global Wakili notification.',
        smsBody:
          inputTemplate.smsBody ??
          inputTemplate.textBody ??
          'You have a new Global Wakili notification.',
        variables: inputTemplate.variables ?? {},
      },
    };
  }
}

function buildDebounceKey(input: {
  templateKey: string;
  entityType?: string | null;
  entityId?: string | null;
  recipients: ResolvedRecipient[];
}): string {
  return `${input.templateKey}:${input.entityType ?? 'general'}:${input.entityId ?? 'none'}:${input.recipients
    .map((recipient) => recipient.recipientId || recipient.email || recipient.phoneNumber || 'unknown')
    .sort()
    .join('|')}`;
}

function getRequestId(req?: Request, fallback?: string | null): string | null {
  return fallback ?? req?.id ?? null;
}

export class NotificationService {
  static async getTenantBranding(db: any, tenantId: string): Promise<TenantBranding> {
    ensureTenantId(tenantId);

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
    ensureTenantId(tenantId);

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

  static async enqueue(req: Request, input: NotificationSendInput) {
    ensureTenantId(input.tenantId);
    ensureRecipients(input.recipients);

    const merged = mergeTemplateWithRegistry(input.template);
    const channels = uniqueChannels(input.channels?.length ? input.channels : merged.channels);

    ensureChannels(channels);

    const queue = getReminderQueue();

    const firstRecipient = input.recipients[0];
    const message =
      interpolateTemplate(merged.template.textBody, merged.template.variables) ||
      interpolateTemplate(merged.template.smsBody, merged.template.variables) ||
      interpolateTemplate(merged.template.htmlBody, merged.template.variables) ||
      '';

    const job = await queue.add('reminder.dispatch', {
      tenantId: input.tenantId,
      reminderType: input.template.templateKey,
      channel: channels[0],
      recipient:
        firstRecipient?.recipientId ||
        firstRecipient?.email ||
        firstRecipient?.phoneNumber ||
        'unknown',
      subject: interpolateTemplate(merged.template.subject, merged.template.variables) ?? undefined,
      message,
      requestId: getRequestId(req, input.requestId),
      metadata: {
        category: input.category ?? merged.category,
        priority: input.priority ?? merged.priority,
        channels,
        recipients: input.recipients,
        template: merged.template,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        debounceKey: input.debounceKey ?? null,
        metadata: safeMetadata(input.metadata),
      },
    });

    await NotificationAuditService.logQueued(req, {
      templateKey: input.template.templateKey,
      channels,
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
    ensureTenantId(input.tenantId);
    ensureRecipients(input.recipients);

    const merged = mergeTemplateWithRegistry(input.template);

    const effectiveCategory: NotificationCategory = input.category ?? merged.category;
    const effectivePriority: NotificationPriority = input.priority ?? merged.priority;

    const requestedChannels = uniqueChannels(
      input.channels?.length ? input.channels : merged.channels,
    );

    ensureChannels(requestedChannels);

    const resolvedRecipientsBase: NotificationRecipient[] = [];

    for (const recipient of input.recipients) {
      if (recipient.recipientId && (!recipient.email || !recipient.phoneNumber || !recipient.name)) {
        try {
          const resolved = await NotificationRecipientResolver.resolveUser(
            db,
            recipient.recipientId,
          );

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
          allowedChannels: uniqueChannels(allowedChannels),
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
      buildDebounceKey({
        templateKey: input.template.templateKey,
        entityType: input.entityType,
        entityId: input.entityId,
        recipients: filteredRecipients,
      });

    const shouldSuppress = await this.shouldSuppressDuplicate(db, input.tenantId, {
      templateKey: input.template.templateKey,
      debounceKey,
    });

    const interpolatedSubject = interpolateTemplate(
      merged.template.subject,
      merged.template.variables,
    );

    const interpolatedTextBody = interpolateTemplate(
      merged.template.textBody,
      merged.template.variables,
    );

    const interpolatedHtmlBody = interpolateTemplate(
      merged.template.htmlBody,
      merged.template.variables,
    );

    const interpolatedSmsBody = interpolateTemplate(
      merged.template.smsBody,
      merged.template.variables,
    );

    if (shouldSuppress) {
      for (const recipient of filteredRecipients) {
        await db.notification.create({
          data: {
            tenantId: input.tenantId,
            userId: recipient.recipientId ?? undefined,
            channel: DB_NOTIFICATION_CHANNEL.portal,
            systemTitle: interpolatedSubject,
            systemMessage: interpolatedTextBody ?? interpolatedHtmlBody,
            emailSubject: interpolatedSubject,
            emailBody: interpolatedHtmlBody,
            smsContent: interpolatedSmsBody,
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
            metadata: safeMetadata(input.metadata),
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

    const smsWarning = getSmsLengthWarning(interpolatedSmsBody);

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
          subject: interpolatedSubject ?? '',
          textBody: interpolatedTextBody,
          htmlBody: interpolatedHtmlBody,
          metadata: safeMetadata(input.metadata) ?? undefined,
        });

        await db.notification.create({
          data: {
            tenantId: input.tenantId,
            userId: recipient.recipientId ?? undefined,
            channel: DB_NOTIFICATION_CHANNEL.email,
            systemTitle: interpolatedSubject,
            systemMessage: interpolatedTextBody,
            emailSubject: interpolatedSubject,
            emailBody: interpolatedHtmlBody,
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
            metadata: safeMetadata(input.metadata),
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
          message: interpolatedSmsBody ?? '',
          metadata: safeMetadata(input.metadata) ?? undefined,
        });

        await db.notification.create({
          data: {
            tenantId: input.tenantId,
            userId: recipient.recipientId ?? undefined,
            channel: DB_NOTIFICATION_CHANNEL.sms,
            systemTitle: interpolatedSubject,
            systemMessage: interpolatedTextBody,
            emailSubject: null,
            emailBody: null,
            smsContent: interpolatedSmsBody,
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
            metadata: safeMetadata(input.metadata),
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
            channel: DB_NOTIFICATION_CHANNEL.portal,
            systemTitle: interpolatedSubject,
            systemMessage: interpolatedTextBody ?? interpolatedHtmlBody,
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
              ...(safeMetadata(input.metadata) ?? {}),
              portal: {
                htmlBody: interpolatedHtmlBody,
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
          (recipient) =>
            recipient.recipientId || recipient.email || recipient.phoneNumber || 'unknown',
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

  static async send(db: any, input: NotificationSendInput, req?: Request) {
    return this.dispatch(db, input, req);
  }

  static async sendPortal(
    db: any,
    input: Omit<NotificationSendInput, 'channels'>,
    req?: Request,
  ) {
    return this.dispatch(
      db,
      {
        ...input,
        channels: ['portal'],
      },
      req,
    );
  }

  static async sendEmail(
    db: any,
    input: Omit<NotificationSendInput, 'channels'>,
    req?: Request,
  ) {
    return this.dispatch(
      db,
      {
        ...input,
        channels: ['email'],
      },
      req,
    );
  }

  static async sendCritical(
    db: any,
    input: Omit<NotificationSendInput, 'channels' | 'priority'>,
    req?: Request,
  ) {
    return this.dispatch(
      db,
      {
        ...input,
        priority: 'critical',
        channels: ['email', 'portal'],
      },
      req,
    );
  }
}

export const notificationService = NotificationService;

export default NotificationService;