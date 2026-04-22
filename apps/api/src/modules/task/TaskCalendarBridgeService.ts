// apps/api/src/modules/task/TaskCalendarBridgeService.ts

import { TaskService } from './TaskService';
import { TaskAuditService } from './TaskAuditService';

export class TaskCalendarBridgeService {
  static async requestCalendarLink(
    db: any,
    params: {
      tenantId: string;
      taskId: string;
      actorId: string;
      title?: string | null;
      startTime: Date | string;
      endTime: Date | string;
      description?: string | null;
      requestId?: string | null;
    },
  ) {
    const task = await TaskService.getTask(db, {
      tenantId: params.tenantId,
      taskId: params.taskId,
      userId: params.actorId,
    });

    const startTime =
      params.startTime instanceof Date ? params.startTime : new Date(params.startTime);
    const endTime = params.endTime instanceof Date ? params.endTime : new Date(params.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw Object.assign(new Error('Invalid task calendar date range'), {
        statusCode: 422,
        code: 'TASK_CALENDAR_DATE_INVALID',
      });
    }

    if (endTime.getTime() <= startTime.getTime()) {
      throw Object.assign(new Error('Calendar end time must be after start time'), {
        statusCode: 422,
        code: 'TASK_CALENDAR_RANGE_INVALID',
      });
    }

    await TaskAuditService.logAction(db, {
      tenantId: params.tenantId,
      userId: params.actorId,
      taskId: params.taskId,
      matterId: task.matterId,
      action: 'CALENDAR_LINK_REQUESTED',
      requestId: params.requestId ?? null,
      metadata: {
        title: params.title?.trim() || task.title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        description: params.description?.trim() ?? null,
      },
    });

    throw Object.assign(
      new Error('Task-calendar linking requires a formal task-calendar schema bridge before activation'),
      {
        statusCode: 501,
        code: 'TASK_CALENDAR_BRIDGE_REQUIRED',
      },
    );
  }
}

export default TaskCalendarBridgeService;