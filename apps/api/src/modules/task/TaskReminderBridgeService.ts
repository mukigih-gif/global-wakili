/**
 * TaskReminderBridgeService.ts
 *
 * Wires task reminders to the Notification queue (WIP-002 complete).
 * When a user requests a reminder on a task, a notification job is enqueued
 * via NotificationQueueService to fire at `remindAt`.
 *
 * Previously stub (501) — now active since WIP-002 notifications are live.
 */

import { TaskService } from './TaskService';
import { TaskAuditService } from './TaskAuditService';
import { NotificationQueueService } from '../notifications/NotificationQueueService';

export class TaskReminderBridgeService {
  static async requestReminder(
    db: any,
    params: {
      tenantId: string;
      taskId: string;
      actorId: string;
      remindAt: Date | string;
      channel?: 'IN_APP' | 'EMAIL' | 'SMS';
      message?: string | null;
      requestId?: string | null;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for task reminder'), {
        statusCode: 400, code: 'TASK_REMINDER_TENANT_REQUIRED',
      });
    }

    const task = await TaskService.getTask(db, {
      tenantId: params.tenantId,
      taskId: params.taskId,
      userId: params.actorId,
    });

    const remindAt = params.remindAt instanceof Date
      ? params.remindAt
      : new Date(params.remindAt);

    if (Number.isNaN(remindAt.getTime())) {
      throw Object.assign(new Error('Invalid task reminder date'), {
        statusCode: 422, code: 'TASK_REMINDER_DATE_INVALID',
      });
    }

    if (remindAt <= new Date()) {
      throw Object.assign(new Error('Task reminder date must be in the future'), {
        statusCode: 422, code: 'TASK_REMINDER_DATE_PAST',
      });
    }

    const channel = params.channel ?? 'IN_APP';
    const taskTitle: string = (task as any).title ?? 'Task';
    const matterTitle: string = (task as any).matter?.title ?? '';

    const debounceKey = `task:reminder:${params.taskId}:${params.actorId}:${remindAt.toISOString().slice(0, 16)}`;

    // Enqueue the reminder notification via WIP-002 notification queue
    await NotificationQueueService.enqueue({
      tenantId: params.tenantId,
      category: 'task',
      priority: 'normal',
      entityType: 'TASK',
      entityId: params.taskId,
      debounceKey,
      recipients: [{ userId: params.actorId }],
      channels: [channel === 'IN_APP' ? 'SYSTEM_ALERT' : channel],
      template: {
        systemTitle: `Reminder: ${taskTitle}`,
        systemMessage: params.message?.trim()
          || `You have a reminder for task "${taskTitle}"${matterTitle ? ` on matter "${matterTitle}"` : ''}.`,
        emailSubject: `[Global Wakili] Task Reminder: ${taskTitle}`,
        emailBody: `<strong>Reminder</strong>: Task "<strong>${taskTitle}</strong>"${matterTitle ? ` on matter <strong>${matterTitle}</strong>` : ''} requires your attention.<br><br>${params.message?.trim() ?? ''}`,
        smsContent: `Global Wakili reminder: ${taskTitle}${matterTitle ? ` (${matterTitle})` : ''}.`,
        variables: { taskTitle, matterTitle, remindAt: remindAt.toISOString() },
      },
      metadata: { remindAt: remindAt.toISOString(), channel },
    });

    await TaskAuditService.logAction(db, {
      tenantId: params.tenantId,
      userId: params.actorId,
      taskId: params.taskId,
      matterId: (task as any).matterId,
      action: 'REMINDER_REQUESTED',
      requestId: params.requestId ?? null,
      metadata: {
        remindAt: remindAt.toISOString(),
        channel,
        message: params.message?.trim() ?? null,
        queued: true,
      },
    });

    return {
      queued: true,
      remindAt: remindAt.toISOString(),
      channel,
      taskId: params.taskId,
    };
  }
}

export default TaskReminderBridgeService;
