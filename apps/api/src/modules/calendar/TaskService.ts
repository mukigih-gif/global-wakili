import { CalendarEventType, EventVisibility } from '@global-wakili/database';
import { CalendarService } from './CalendarService';
import { ReminderService } from './ReminderService';

function normalizeDate(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid task date'), {
      statusCode: 422,
      code: 'INVALID_TASK_DATE',
    });
  }
  return parsed;
}

export class TaskService {
  static async createTaskEvent(
    db: any,
    params: {
      tenantId: string;
      creatorId: string;
      title: string;
      description?: string | null;
      dueDate: Date | string;
      matterId?: string | null;
      attendeeIds?: string[];
      isPrivate?: boolean;
    },
  ) {
    const dueDate = normalizeDate(params.dueDate);

    const startTime = new Date(dueDate);
    const endTime = new Date(dueDate.getTime() + 30 * 60 * 1000);

    const event = await CalendarService.createEvent(db, {
      tenantId: params.tenantId,
      creatorId: params.creatorId,
      title: params.title.trim(),
      description: params.description?.trim() ?? null,
      startTime,
      endTime,
      type: CalendarEventType.TASK,
      visibility: params.isPrivate ? EventVisibility.PRIVATE : EventVisibility.TEAM_ONLY,
      isPrivate: params.isPrivate ?? false,
      matterId: params.matterId ?? null,
      attendeeIds: params.attendeeIds ?? [],
    });

    await ReminderService.attachRemindersToEvent(db, {
      tenantId: params.tenantId,
      eventId: event.id,
      eventType: 'TASK',
    });

    return event;
  }

  static async completeTaskEvent(
    db: any,
    params: {
      tenantId: string;
      eventId: string;
      completedBy: string;
      note?: string | null;
    },
  ) {
    const event = await db.calendarEvent.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.eventId,
        type: CalendarEventType.TASK,
      },
    });

    if (!event) {
      throw Object.assign(new Error('Task event not found'), {
        statusCode: 404,
        code: 'TASK_EVENT_NOT_FOUND',
      });
    }

    const completionStamp =
      `[TASK_COMPLETED by ${params.completedBy} at ${new Date().toISOString()}]` +
      (params.note?.trim() ? ` ${params.note.trim()}` : '');

    const description = [event.description ?? null, completionStamp]
      .filter(Boolean)
      .join('\n');

    return db.calendarEvent.update({
      where: {
        id: params.eventId,
      },
      data: {
        description,
      },
    });
  }

  static async listTaskEvents(
    db: any,
    params: {
      tenantId: string;
      matterId?: string | null;
      creatorId?: string | null;
      page?: number;
      limit?: number;
    },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const where = {
      tenantId: params.tenantId,
      type: CalendarEventType.TASK,
      ...(params.matterId ? { matterId: params.matterId } : {}),
      ...(params.creatorId ? { creatorId: params.creatorId } : {}),
    };

    const [data, total] = await Promise.all([
      db.calendarEvent.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          attendees: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
        },
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      db.calendarEvent.count ? db.calendarEvent.count({ where }) : Promise.resolve(0),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }
}