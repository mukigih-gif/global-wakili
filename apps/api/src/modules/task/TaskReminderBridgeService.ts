// apps/api/src/modules/task/TaskReminderBridgeService.ts

import { TaskService } from './TaskService';
import { TaskAuditService } from './TaskAuditService';

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
    const task = await TaskService.getTask(db, {
      tenantId: params.tenantId,
      taskId: params.taskId,
      userId: params.actorId,
    });

    const remindAt =
      params.remindAt instanceof Date ? params.remindAt : new Date(params.remindAt);

    if (Number.isNaN(remindAt.getTime())) {
      throw Object.assign(new Error('Invalid task reminder date'), {
        statusCode: 422,
        code: 'TASK_REMINDER_DATE_INVALID',
      });
    }

    await TaskAuditService.logAction(db, {
      tenantId: params.tenantId,
      userId: params.actorId,
      taskId: params.taskId,
      matterId: task.matterId,
      action: 'REMINDER_REQUESTED',
      requestId: params.requestId ?? null,
      metadata: {
        remindAt: remindAt.toISOString(),
        channel: params.channel ?? 'IN_APP',
        message: params.message?.trim() ?? null,
      },
    });

    throw Object.assign(
      new Error('Task reminders require the Notifications/Queues reminder integration before activation'),
      {
        statusCode: 501,
        code: 'TASK_REMINDER_INTEGRATION_REQUIRED',
      },
    );
  }
}

export default TaskReminderBridgeService;