import { Prisma } from '@global-wakili/database';

export type ReminderChannel = 'portal' | 'email' | 'sms';

export interface ReminderSchedule {
  channel: ReminderChannel;
  minutesBefore: number;
  enabled: boolean;
}

function uniqueSchedules(reminders: ReminderSchedule[]): ReminderSchedule[] {
  const seen = new Set<string>();
  const output: ReminderSchedule[] = [];

  for (const reminder of reminders) {
    const key = `${reminder.channel}:${reminder.minutesBefore}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(reminder);
  }

  return output.sort((a, b) => b.minutesBefore - a.minutesBefore);
}

export class ReminderService {
  static getDefaultSchedules(params: {
    eventType: string;
  }): ReminderSchedule[] {
    const type = String(params.eventType).toUpperCase();

    if (type === 'COURT_DATE') {
      return uniqueSchedules([
        { channel: 'portal', minutesBefore: 7 * 24 * 60, enabled: true },
        { channel: 'email', minutesBefore: 24 * 60, enabled: true },
        { channel: 'sms', minutesBefore: 60, enabled: true },
      ]);
    }

    if (type === 'STATUTORY_DEADLINE') {
      return uniqueSchedules([
        { channel: 'portal', minutesBefore: 30 * 24 * 60, enabled: true },
        { channel: 'email', minutesBefore: 7 * 24 * 60, enabled: true },
        { channel: 'email', minutesBefore: 24 * 60, enabled: true },
        { channel: 'sms', minutesBefore: 60, enabled: true },
      ]);
    }

    if (type === 'MEETING') {
      return uniqueSchedules([
        { channel: 'portal', minutesBefore: 24 * 60, enabled: true },
        { channel: 'portal', minutesBefore: 60, enabled: true },
      ]);
    }

    return uniqueSchedules([
      { channel: 'portal', minutesBefore: 24 * 60, enabled: true },
      { channel: 'portal', minutesBefore: 60, enabled: true },
    ]);
  }

  static buildReminderMetadata(params: {
    eventId: string;
    eventType: string;
    customSchedules?: ReminderSchedule[] | null;
  }) {
    const schedules = uniqueSchedules(
      params.customSchedules?.length
        ? params.customSchedules.filter((item) => item.enabled)
        : this.getDefaultSchedules({ eventType: params.eventType }),
    );

    return {
      reminders: schedules.map((item) => ({
        channel: item.channel,
        minutesBefore: item.minutesBefore,
        enabled: item.enabled,
      })),
      reminderPolicy: {
        eventId: params.eventId,
        eventType: params.eventType,
        configuredAt: new Date().toISOString(),
      },
    };
  }

  static async attachRemindersToEvent(
    db: any,
    params: {
      tenantId: string;
      eventId: string;
      eventType: string;
      customSchedules?: ReminderSchedule[] | null;
    },
  ) {
    const event = await db.calendarEvent.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.eventId,
      },
      select: {
        id: true,
        description: true,
      },
    });

    if (!event) {
      throw Object.assign(new Error('Calendar event not found'), {
        statusCode: 404,
        code: 'CALENDAR_EVENT_NOT_FOUND',
      });
    }

    const reminderBlock = this.buildReminderMetadata({
      eventId: params.eventId,
      eventType: params.eventType,
      customSchedules: params.customSchedules ?? null,
    });

    const descriptionPrefix = `[REMINDERS_CONFIGURED:${JSON.stringify(reminderBlock)}]`;
    const mergedDescription = event.description
      ? `${descriptionPrefix}\n${event.description}`
      : descriptionPrefix;

    return db.calendarEvent.update({
      where: { id: params.eventId },
      data: {
        description: mergedDescription,
      },
    });
  }

  static getReminderTriggerTimes(params: {
    eventStartTime: Date;
    schedules: ReminderSchedule[];
  }) {
    return uniqueSchedules(params.schedules)
      .filter((item) => item.enabled)
      .map((item) => ({
        channel: item.channel,
        minutesBefore: item.minutesBefore,
        triggerAt: new Date(params.eventStartTime.getTime() - item.minutesBefore * 60 * 1000),
      }));
  }
}