import type { Job } from 'bullmq';
import prisma from '../../../../config/database';
import { NotificationService } from '../../../integrations/notifications/NotificationService';

export async function handleReminderJob(
  job: Job<Record<string, unknown>, unknown, 'reminder.dispatch'>,
) {
  const payload = job.data as {
    tenantId: string;
    reminderType: string;
    channel: 'email' | 'sms' | 'in_app';
    recipient: string;
    subject?: string;
    message: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  };

  const metadata = (payload.metadata ?? {}) as Record<string, unknown>;

  return NotificationService.dispatch(prisma, {
    tenantId: payload.tenantId,
    category: (metadata.category as any) ?? 'system_alert',
    priority: (metadata.priority as any) ?? 'normal',
    channels: (metadata.channels as any) ?? [payload.channel === 'in_app' ? 'portal' : payload.channel],
    recipients: (metadata.recipients as any) ?? [
      {
        recipientId: payload.recipient,
      },
    ],
    template: (metadata.template as any) ?? {
      templateKey: payload.reminderType,
      subject: payload.subject,
      textBody: payload.message,
      smsBody: payload.message,
    },
    entityType: (metadata.entityType as string | null) ?? null,
    entityId: (metadata.entityId as string | null) ?? null,
    debounceKey: (metadata.debounceKey as string | null) ?? null,
    requestId: payload.requestId,
    metadata,
  });
}