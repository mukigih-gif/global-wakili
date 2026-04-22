export type NotificationTemplateKey =
  | 'TRUST_OVERDRAW_ALERT'
  | 'TRUST_LEDGER_MISMATCH_ALERT'
  | 'TRUST_RECONCILIATION_VARIANCE'
  | 'INVOICE_DUE_REMINDER'
  | 'INVOICE_ISSUED'
  | 'PAYMENT_RECEIVED'
  | 'MATTER_PROGRESS_UPDATE'
  | 'CALENDAR_DEADLINE_REMINDER'
  | 'COMPLIANCE_ALERT'
  | 'SYSTEM_ALERT'
  | 'CUSTOM';

export type NotificationTemplateDefinition = {
  key: NotificationTemplateKey;
  category:
    | 'billing'
    | 'trust'
    | 'compliance'
    | 'matter_update'
    | 'calendar'
    | 'document'
    | 'payroll'
    | 'procurement'
    | 'system_alert';
  defaultPriority: 'low' | 'normal' | 'high' | 'critical';
  channels: Array<'email' | 'sms' | 'portal'>;
  subject?: string;
  textBody?: string;
  htmlBody?: string;
  smsBody?: string;
};

const TEMPLATE_REGISTRY: Record<NotificationTemplateKey, NotificationTemplateDefinition> = {
  TRUST_OVERDRAW_ALERT: {
    key: 'TRUST_OVERDRAW_ALERT',
    category: 'trust',
    defaultPriority: 'critical',
    channels: ['email', 'sms', 'portal'],
    subject: 'Critical trust overdraw detected',
    textBody:
      'Trust alert: Matter {{matterName}} has a trust deficit of {{amount}}.',
    htmlBody:
      '<p><strong>Trust alert</strong>: Matter {{matterName}} has a trust deficit of {{amount}}.</p>',
    smsBody: 'Trust alert: {{matterName}} deficit {{amount}}.',
  },
  TRUST_LEDGER_MISMATCH_ALERT: {
    key: 'TRUST_LEDGER_MISMATCH_ALERT',
    category: 'trust',
    defaultPriority: 'high',
    channels: ['email', 'portal'],
    subject: 'Trust ledger mismatch detected',
    textBody:
      'Trust ledger mismatch detected for account {{accountNumber}}. Variance: {{variance}}.',
    htmlBody:
      '<p>Trust ledger mismatch detected for account <strong>{{accountNumber}}</strong>. Variance: {{variance}}.</p>',
    smsBody: 'Trust mismatch {{accountNumber}} variance {{variance}}.',
  },
  TRUST_RECONCILIATION_VARIANCE: {
    key: 'TRUST_RECONCILIATION_VARIANCE',
    category: 'trust',
    defaultPriority: 'high',
    channels: ['email', 'portal'],
    subject: 'Trust reconciliation variance found',
    textBody:
      'A trust reconciliation variance was found for account {{accountNumber}} on {{statementDate}}.',
    htmlBody:
      '<p>A trust reconciliation variance was found for account <strong>{{accountNumber}}</strong> on {{statementDate}}.</p>',
  },
  INVOICE_DUE_REMINDER: {
    key: 'INVOICE_DUE_REMINDER',
    category: 'billing',
    defaultPriority: 'normal',
    channels: ['email', 'sms', 'portal'],
    subject: 'Invoice payment reminder',
    textBody:
      'Reminder: Invoice {{invoiceNumber}} for {{amount}} is due on {{dueDate}}.',
    htmlBody:
      '<p>Reminder: Invoice <strong>{{invoiceNumber}}</strong> for {{amount}} is due on {{dueDate}}.</p>',
    smsBody: 'Invoice {{invoiceNumber}} due {{dueDate}} amount {{amount}}.',
  },
  INVOICE_ISSUED: {
    key: 'INVOICE_ISSUED',
    category: 'billing',
    defaultPriority: 'normal',
    channels: ['email', 'portal'],
    subject: 'Invoice issued',
    textBody:
      'Invoice {{invoiceNumber}} has been issued for {{amount}}.',
    htmlBody:
      '<p>Invoice <strong>{{invoiceNumber}}</strong> has been issued for {{amount}}.</p>',
  },
  PAYMENT_RECEIVED: {
    key: 'PAYMENT_RECEIVED',
    category: 'billing',
    defaultPriority: 'normal',
    channels: ['email', 'sms', 'portal'],
    subject: 'Payment received',
    textBody:
      'Payment of {{amount}} has been received for {{reference}}.',
    htmlBody:
      '<p>Payment of <strong>{{amount}}</strong> has been received for {{reference}}.</p>',
    smsBody: 'Payment received: {{amount}} for {{reference}}.',
  },
  MATTER_PROGRESS_UPDATE: {
    key: 'MATTER_PROGRESS_UPDATE',
    category: 'matter_update',
    defaultPriority: 'normal',
    channels: ['email', 'portal'],
    subject: 'Matter progress update',
    textBody:
      'Update on matter {{matterName}}: {{updateSummary}}.',
    htmlBody:
      '<p>Update on matter <strong>{{matterName}}</strong>: {{updateSummary}}.</p>',
    smsBody: 'Matter update: {{matterName}} - {{updateSummary}}.',
  },
  CALENDAR_DEADLINE_REMINDER: {
    key: 'CALENDAR_DEADLINE_REMINDER',
    category: 'calendar',
    defaultPriority: 'normal',
    channels: ['email', 'sms', 'portal'],
    subject: 'Upcoming deadline reminder',
    textBody:
      'Reminder: {{title}} is scheduled for {{dateTime}}.',
    htmlBody:
      '<p>Reminder: <strong>{{title}}</strong> is scheduled for {{dateTime}}.</p>',
    smsBody: 'Reminder: {{title}} at {{dateTime}}.',
  },
  COMPLIANCE_ALERT: {
    key: 'COMPLIANCE_ALERT',
    category: 'compliance',
    defaultPriority: 'critical',
    channels: ['email', 'sms', 'portal'],
    subject: 'Compliance alert',
    textBody:
      'Compliance alert: {{message}}.',
    htmlBody:
      '<p><strong>Compliance alert</strong>: {{message}}.</p>',
    smsBody: 'Compliance alert: {{message}}.',
  },
  SYSTEM_ALERT: {
    key: 'SYSTEM_ALERT',
    category: 'system_alert',
    defaultPriority: 'high',
    channels: ['email', 'portal'],
    subject: 'System alert',
    textBody:
      '{{message}}',
    htmlBody:
      '<p>{{message}}</p>',
    smsBody: '{{message}}',
  },
  CUSTOM: {
    key: 'CUSTOM',
    category: 'system_alert',
    defaultPriority: 'normal',
    channels: ['email', 'sms', 'portal'],
  },
};

export class NotificationTemplateRegistry {
  static get(key: NotificationTemplateKey): NotificationTemplateDefinition {
    const template = TEMPLATE_REGISTRY[key];

    if (!template) {
      throw Object.assign(new Error(`Notification template not found: ${key}`), {
        statusCode: 400,
        code: 'NOTIFICATION_TEMPLATE_NOT_FOUND',
      });
    }

    return template;
  }

  static list(): NotificationTemplateDefinition[] {
    return Object.values(TEMPLATE_REGISTRY);
  }
}