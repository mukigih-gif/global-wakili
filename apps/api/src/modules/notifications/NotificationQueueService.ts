// apps/api/src/modules/notifications/NotificationQueueService.ts

import { getIntegrationQueue } from '../queues/queue';
import type { NotificationSendInput } from './notification.types';

export class NotificationQueueService {
  static async enqueue(input: NotificationSendInput) {
    if (!input.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for notification queue'), {
        statusCode: 400,
        code: 'NOTIFICATION_QUEUE_TENANT_REQUIRED',
      });
    }

    const queue = getIntegrationQueue();

    const job = await queue.add('notification.dispatch', {
      tenantId: input.tenantId,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      category: input.category ?? 'system_alert',
      priority: input.priority ?? 'normal',
      channels: input.channels ?? ['SYSTEM_ALERT', 'EMAIL', 'SMS'],
      deliveryOrder: ['SYSTEM_ALERT', 'EMAIL', 'SMS'],
      recipients: input.recipients,
      template: input.template,
      metadata: input.metadata ?? {},
      requestedAt: new Date().toISOString(),
    });

    return {
      queued: true,
      queue: 'integrations',
      jobName: 'notification.dispatch',
      jobId: job.id,
      deliveryOrder: ['SYSTEM_ALERT', 'EMAIL', 'SMS'],
    };
  }
}

export default NotificationQueueService;