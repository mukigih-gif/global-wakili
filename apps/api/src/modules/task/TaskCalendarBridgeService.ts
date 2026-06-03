/**
 * TaskCalendarBridgeService.ts
 *
 * Wires task-to-calendar link via CalendarService (WIP-006 calendar integration complete).
 * Creates a CalendarEvent linked to the task's matter and tenant.
 *
 * Previously stub (501) — now active since WIP-006 calendar sync is live.
 */

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
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for task calendar link'), {
        statusCode: 400, code: 'TASK_CALENDAR_TENANT_REQUIRED',
      });
    }

    const task = await TaskService.getTask(db, {
      tenantId: params.tenantId,
      taskId: params.taskId,
      userId: params.actorId,
    });

    const startTime = params.startTime instanceof Date
      ? params.startTime
      : new Date(params.startTime);
    const endTime = params.endTime instanceof Date
      ? params.endTime
      : new Date(params.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw Object.assign(new Error('Invalid task calendar date range'), {
        statusCode: 422, code: 'TASK_CALENDAR_DATE_INVALID',
      });
    }

    if (endTime.getTime() <= startTime.getTime()) {
      throw Object.assign(new Error('Calendar end time must be after start time'), {
        statusCode: 422, code: 'TASK_CALENDAR_RANGE_INVALID',
      });
    }

    const taskTitle: string = (task as any).title ?? 'Task';
    const matterId: string | null = (task as any).matterId ?? null;
    const eventTitle = params.title?.trim() || `Task: ${taskTitle}`;

    // Create a CalendarEvent linked to the task's matter
    const calendarEvent = await db.calendarEvent.create({
      data: {
        tenantId: params.tenantId,
        title: eventTitle,
        description: params.description?.trim()
          ?? `Linked task: ${taskTitle}`,
        startTime,
        endTime,
        matterId: matterId ?? undefined,
        createdById: params.actorId,
        status: 'SCHEDULED',
        metadata: {
          linkedTaskId: params.taskId,
          linkedTaskTitle: taskTitle,
          createdFromTask: true,
        },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
      },
    });

    await TaskAuditService.logAction(db, {
      tenantId: params.tenantId,
      userId: params.actorId,
      taskId: params.taskId,
      matterId,
      action: 'CALENDAR_LINK_REQUESTED',
      requestId: params.requestId ?? null,
      metadata: {
        calendarEventId: calendarEvent.id,
        title: eventTitle,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        description: params.description?.trim() ?? null,
      },
    });

    return {
      calendarEvent,
      taskId: params.taskId,
      linked: true,
    };
  }
}

export default TaskCalendarBridgeService;
