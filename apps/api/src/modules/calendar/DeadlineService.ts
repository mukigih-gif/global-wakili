import { EventVisibility, CalendarEventType } from '@global-wakili/database';
import { CalendarService } from './CalendarService';
import { ReminderService } from './ReminderService';

function normalizeDate(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid deadline date'), {
      statusCode: 422,
      code: 'INVALID_DEADLINE_DATE',
    });
  }
  return parsed;
}

export class DeadlineService {
  static buildStatutoryDeadlineTitle(params: {
    matterCode?: string | null;
    matterTitle?: string | null;
    label?: string | null;
  }) {
    const context = params.matterCode ?? params.matterTitle ?? 'Matter';
    const label = params.label?.trim() || 'Statutory Deadline';
    return `${label} - ${context}`;
  }

  static async createStatutoryDeadlineEvent(
    db: any,
    params: {
      tenantId: string;
      creatorId: string;
      matterId: string;
      deadlineDate: Date | string;
      label?: string | null;
      description?: string | null;
      attendeeIds?: string[];
    },
  ) {
    const matter = await db.matter.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.matterId,
      },
      select: {
        id: true,
        title: true,
        matterCode: true,
        partnerId: true,
        assignedLawyerId: true,
      },
    });

    if (!matter) {
      throw Object.assign(new Error('Matter not found'), {
        statusCode: 404,
        code: 'MISSING_MATTER',
      });
    }

    const deadlineDate = normalizeDate(params.deadlineDate);
    const startTime = new Date(deadlineDate);
    startTime.setHours(8, 0, 0, 0);

    const endTime = new Date(deadlineDate);
    endTime.setHours(17, 0, 0, 0);

    const attendeeIds = [
      ...new Set(
        [
          ...(params.attendeeIds ?? []),
          matter.partnerId ?? null,
          matter.assignedLawyerId ?? null,
        ].filter(Boolean) as string[],
      ),
    ];

    const event = await CalendarService.createEvent(db, {
      tenantId: params.tenantId,
      creatorId: params.creatorId,
      title: this.buildStatutoryDeadlineTitle({
        matterCode: matter.matterCode,
        matterTitle: matter.title,
        label: params.label ?? 'Statutory Deadline',
      }),
      description:
        params.description?.trim() ??
        'High-priority statutory deadline. This event should not be dismissed without legal review.',
      startTime,
      endTime,
      type: CalendarEventType.STATUTORY_DEADLINE,
      visibility: EventVisibility.PRIVATE,
      isPrivate: true,
      matterId: params.matterId,
      attendeeIds,
    });

    await ReminderService.attachRemindersToEvent(db, {
      tenantId: params.tenantId,
      eventId: event.id,
      eventType: 'STATUTORY_DEADLINE',
    });

    return event;
  }

  static async createLimitationAlarmSeries(
    db: any,
    params: {
      tenantId: string;
      creatorId: string;
      matterId: string;
      finalDeadline: Date | string;
      attendeeIds?: string[];
    },
  ) {
    const finalDeadline = normalizeDate(params.finalDeadline);

    const checkpoints = [
      { label: 'Limitation expires in 30 days', daysBefore: 30 },
      { label: 'Limitation expires in 7 days', daysBefore: 7 },
      { label: 'Limitation expires in 1 day', daysBefore: 1 },
    ];

    const createdEvents = [];

    for (const checkpoint of checkpoints) {
      const targetDate = new Date(finalDeadline);
      targetDate.setDate(targetDate.getDate() - checkpoint.daysBefore);

      const event = await this.createStatutoryDeadlineEvent(db, {
        tenantId: params.tenantId,
        creatorId: params.creatorId,
        matterId: params.matterId,
        deadlineDate: targetDate,
        label: checkpoint.label,
        description: `${checkpoint.label}. Final statutory limitation date is ${finalDeadline.toISOString()}.`,
        attendeeIds: params.attendeeIds ?? [],
      });

      createdEvents.push(event);
    }

    return {
      finalDeadline,
      count: createdEvents.length,
      events: createdEvents,
    };
  }
}