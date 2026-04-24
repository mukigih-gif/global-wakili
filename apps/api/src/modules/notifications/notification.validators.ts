// apps/api/src/modules/notifications/notification.validators.ts

import { z } from 'zod';

export const notificationChannelSchema = z.enum([
  'SYSTEM_ALERT',
  'EMAIL',
  'SMS',
]);

export const schemaNotificationChannelSchema = z.enum([
  'SYSTEM_ALERT',
  'EMAIL',
  'SMS',
  'PUSH',
  'IN_APP',
]);

export const notificationStatusSchema = z.enum([
  'PENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'BOUNCED',
]);

export const notificationPrioritySchema = z.enum([
  'low',
  'normal',
  'high',
  'critical',
]);

export const notificationRecipientSchema = z.object({
  userId: z.string().trim().min(1).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phoneNumber: z.string().trim().max(50).nullable().optional(),
  name: z.string().trim().max(255).nullable().optional(),
});

export const notificationTemplateSchema = z.object({
  templateKey: z.string().trim().max(150).nullable().optional(),
  systemTitle: z.string().trim().max(255).nullable().optional(),
  systemMessage: z.string().trim().max(5000).nullable().optional(),
  emailSubject: z.string().trim().max(255).nullable().optional(),
  emailBody: z.string().trim().max(10000).nullable().optional(),
  smsContent: z.string().trim().max(1000).nullable().optional(),
  variables: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const notificationSendSchema = z.object({
  recipients: z.array(notificationRecipientSchema).min(1).max(100),
  channels: z.array(notificationChannelSchema).min(1).max(3).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  priority: notificationPrioritySchema.optional(),
  template: notificationTemplateSchema,
  entityType: z.string().trim().max(100).nullable().optional(),
  entityId: z.string().trim().max(150).nullable().optional(),
  debounceKey: z.string().trim().max(255).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  senderEmail: z.string().trim().email().nullable().optional(),
  smsSenderId: z.string().trim().max(50).nullable().optional(),
});

export const notificationSearchQuerySchema = z.object({
  query: z.string().trim().max(500).optional(),
  userId: z.string().trim().min(1).optional(),
  channel: schemaNotificationChannelSchema.optional(),
  status: notificationStatusSchema.optional(),
  category: z.string().trim().max(100).optional(),
  priority: z.string().trim().max(50).optional(),
  entityType: z.string().trim().max(100).optional(),
  entityId: z.string().trim().max(150).optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const notificationDashboardQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const notificationIdParamSchema = z.object({
  notificationId: z.string().trim().min(1),
});

export const providerWebhookStatusSchema = z.object({
  providerMessageId: z.string().trim().min(1),
  provider: z.string().trim().max(100).nullable().optional(),
  status: notificationStatusSchema,
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type NotificationSendDto = z.infer<typeof notificationSendSchema>;