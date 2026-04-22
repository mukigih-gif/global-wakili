// apps/api/src/modules/notifications/notification.types.ts

export type NotificationChannel = 'SYSTEM_ALERT' | 'EMAIL' | 'SMS';

export type SchemaNotificationChannel =
  | 'SYSTEM_ALERT'
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'IN_APP';

export type NotificationStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'BOUNCED';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationCategory =
  | 'system_alert'
  | 'trust'
  | 'billing'
  | 'payment'
  | 'procurement'
  | 'payroll'
  | 'hr'
  | 'client'
  | 'matter_update'
  | 'task'
  | 'calendar'
  | 'court'
  | 'reception'
  | 'compliance'
  | 'approval'
  | 'reporting'
  | 'platform';

export const NOTIFICATION_DELIVERY_ORDER: NotificationChannel[] = [
  'SYSTEM_ALERT',
  'EMAIL',
  'SMS',
];

export type NotificationRecipient = {
  userId?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
};

export type NotificationTemplatePayload = {
  templateKey?: string | null;
  systemTitle?: string | null;
  systemMessage?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  smsContent?: string | null;
  variables?: Record<string, unknown> | null;
};

export type NotificationSendInput = {
  tenantId: string;
  recipients: NotificationRecipient[];
  channels?: NotificationChannel[];
  category?: NotificationCategory | string | null;
  priority?: NotificationPriority | string | null;
  template: NotificationTemplatePayload;
  entityType?: string | null;
  entityId?: string | null;
  debounceKey?: string | null;
  metadata?: Record<string, unknown> | null;
  senderEmail?: string | null;
  smsSenderId?: string | null;
};

export type NotificationSearchFilters = {
  userId?: string | null;
  channel?: SchemaNotificationChannel | null;
  status?: NotificationStatus | null;
  category?: string | null;
  priority?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdFrom?: Date | string | null;
  createdTo?: Date | string | null;
};

export type NotificationAuditAction =
  | 'SEND_REQUESTED'
  | 'QUEUE_REQUESTED'
  | 'DELIVERED_SYSTEM'
  | 'DELIVERED_EMAIL'
  | 'DELIVERED_SMS'
  | 'FAILED'
  | 'SEARCHED'
  | 'VIEWED'
  | 'READ'
  | 'CLICKED'
  | 'DASHBOARD_VIEWED'
  | 'REPORT_VIEWED'
  | 'CAPABILITY_VIEWED'
  | 'WEBHOOK_STATUS_UPDATED';

export type NotificationDbClient = {
  tenant: {
    findFirst: Function;
  };
  user: {
    findFirst: Function;
    findMany: Function;
  };
  notification: {
    create: Function;
    update: Function;
    findFirst: Function;
    findMany: Function;
    count: Function;
    groupBy?: Function;
  };
  auditLog: {
    create: Function;
  };
};