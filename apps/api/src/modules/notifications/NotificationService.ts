// apps/api/src/modules/notifications/NotificationService.ts

import type { Request } from 'express';
import { NotificationDeliveryService } from './NotificationDeliveryService';
import { NotificationQueueService } from './NotificationQueueService';
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationRecipient,
  NotificationSendInput,
} from './notification.types';

type LegacyNotificationChannel =
  | NotificationChannel
  | 'portal'
  | 'system'
  | 'system_alert'
  | 'email'
  | 'sms'
  | 'in_app';

type LegacyNotificationTemplate = {
  templateKey?: string | null;
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  smsBody?: string | null;
  systemTitle?: string | null;
  systemMessage?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  smsContent?: string | null;
  variables?: Record<string, unknown> | null;
};

type LegacyNotificationInput = {
  tenantId: string;
  recipients: NotificationRecipient[];
  channels?: LegacyNotificationChannel[];
  category?: NotificationCategory | string | null;
  priority?: NotificationPriority | string | null;
  template: LegacyNotificationTemplate;
  entityType?: string | null;
  entityId?: string | null;
  debounceKey?: string | null;
  metadata?: Record<string, unknown> | null;
  senderEmail?: string | null;
  smsSenderId?: string | null;
};

const DELIVERY_ORDER: NotificationChannel[] = ['SYSTEM_ALERT', 'EMAIL', 'SMS'];

function normalizeChannel(channel: LegacyNotificationChannel): NotificationChannel {
  const normalized = String(channel).trim().toUpperCase();

  if (
    normalized === 'PORTAL' ||
    normalized === 'SYSTEM' ||
    normalized === 'SYSTEM_ALERT' ||
    normalized === 'IN_APP'
  ) {
    return 'SYSTEM_ALERT';
  }

  if (normalized === 'EMAIL') return 'EMAIL';
  if (normalized === 'SMS') return 'SMS';

  throw Object.assign(new Error(`Unsupported notification channel: ${channel}`), {
    statusCode: 422,
    code: 'NOTIFICATION_CHANNEL_UNSUPPORTED',
  });
}

function normalizeChannels(channels?: LegacyNotificationChannel[]): NotificationChannel[] {
  const requested = channels?.length ? channels.map(normalizeChannel) : DELIVERY_ORDER;
  const unique = Array.from(new Set(requested));

  return DELIVERY_ORDER.filter((channel) => unique.includes(channel));
}

function normalizeTemplate(template: LegacyNotificationTemplate): NotificationSendInput['template'] {
  const systemTitle =
    template.systemTitle ??
    template.emailSubject ??
    template.subject ??
    'Global Wakili Notification';

  const systemMessage =
    template.systemMessage ??
    template.textBody ??
    template.htmlBody ??
    template.emailBody ??
    template.smsBody ??
    template.smsContent ??
    'You have a new Global Wakili notification.';

  return {
    templateKey: template.templateKey ?? null,
    systemTitle,
    systemMessage,
    emailSubject: template.emailSubject ?? template.subject ?? systemTitle,
    emailBody: template.emailBody ?? template.htmlBody ?? template.textBody ?? systemMessage,
    smsContent: template.smsContent ?? template.smsBody ?? template.textBody ?? systemMessage,
    variables: template.variables ?? {},
  };
}

function normalizeInput(input: LegacyNotificationInput): NotificationSendInput {
  if (!input.tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required for notification dispatch'), {
      statusCode: 400,
      code: 'NOTIFICATION_TENANT_REQUIRED',
    });
  }

  if (!input.recipients?.length) {
    throw Object.assign(new Error('At least one notification recipient is required'), {
      statusCode: 422,
      code: 'NOTIFICATION_RECIPIENT_REQUIRED',
    });
  }

  return {
    tenantId: input.tenantId,
    recipients: input.recipients,
    channels: normalizeChannels(input.channels),
    category: input.category ?? 'system_alert',
    priority: input.priority ?? 'normal',
    template: normalizeTemplate(input.template),
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    debounceKey: input.debounceKey ?? null,
    metadata: {
      ...(input.metadata ?? {}),
      deliveryOrder: DELIVERY_ORDER,
      canonicalNotificationService: true,
    },
    senderEmail: input.senderEmail ?? null,
    smsSenderId: input.smsSenderId ?? null,
  };
}

export class NotificationService {
  static getDeliveryOrder(): NotificationChannel[] {
    return [...DELIVERY_ORDER];
  }

  static async dispatch(db: any, input: LegacyNotificationInput, _req?: Request) {
    return NotificationDeliveryService.sendNow(db, normalizeInput(input));
  }

  static async send(db: any, input: LegacyNotificationInput, req?: Request) {
    return this.dispatch(db, input, req);
  }

  static async enqueue(_reqOrDb: Request | any, input: LegacyNotificationInput) {
    return NotificationQueueService.enqueue(normalizeInput(input));
  }

  static async sendEmail(
    db: any,
    input: Omit<LegacyNotificationInput, 'channels'>,
    req?: Request,
  ) {
    return this.dispatch(
      db,
      {
        ...input,
        channels: ['EMAIL'],
      },
      req,
    );
  }

  static async sendSms(
    db: any,
    input: Omit<LegacyNotificationInput, 'channels'>,
    req?: Request,
  ) {
    return this.dispatch(
      db,
      {
        ...input,
        channels: ['SMS'],
      },
      req,
    );
  }

  static async sendSystemAlert(
    db: any,
    input: Omit<LegacyNotificationInput, 'channels'>,
    req?: Request,
  ) {
    return this.dispatch(
      db,
      {
        ...input,
        channels: ['SYSTEM_ALERT'],
      },
      req,
    );
  }

  static async sendCritical(
    db: any,
    input: Omit<LegacyNotificationInput, 'channels' | 'priority'>,
    req?: Request,
  ) {
    return this.dispatch(
      db,
      {
        ...input,
        priority: 'critical',
        channels: ['SYSTEM_ALERT', 'EMAIL', 'SMS'],
      },
      req,
    );
  }
}

export const notificationService = NotificationService;

export default NotificationService;