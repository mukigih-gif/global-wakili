import type { CalendarEventType, EventVisibility } from '@global-wakili/database';

export type CalendarRecurrenceFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'CUSTOM';

export interface CalendarRecurrenceConfig {
  frequency: CalendarRecurrenceFrequency;
  interval?: number;
  byWeekDay?: string[];
  byMonthDay?: number[];
  count?: number;
  until?: Date | string | null;
  rrule?: string | null;
}

export interface CalendarReminderConfig {
  channel: 'portal' | 'email' | 'sms';
  minutesBefore: number;
  enabled: boolean;
}

export interface CreateCalendarEventPayload {
  tenantId: string;
  creatorId: string;
  title: string;
  description?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  type: CalendarEventType | string;
  visibility?: EventVisibility | string;
  isPrivate?: boolean;
  matterId?: string | null;
  attendeeIds?: string[];
  googleEventId?: string | null;
  outlookEventId?: string | null;
  recurrence?: CalendarRecurrenceConfig | null;
  reminders?: CalendarReminderConfig[] | null;
}

export interface UpdateCalendarEventPayload extends Partial<CreateCalendarEventPayload> {
  id: string;
  excludeConflictEventId?: string | null;
}

export interface CalendarEventFilters {
  tenantId: string;
  userId: string;
  startDate: Date | string;
  endDate: Date | string;
  matterId?: string | null;
  type?: CalendarEventType | string | null;
  creatorId?: string | null;
  visibility?: EventVisibility | string | null;
  page?: number;
  limit?: number;
}

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  available: boolean;
  conflictCount: number;
}

export type TenantCalendarDbClient = {
  calendarEvent: {
    create: Function;
    update: Function;
    findFirst: Function;
    findMany: Function;
    count?: Function;
  };
  matter: {
    findFirst: Function;
  };
  user: {
    findFirst: Function;
    findMany: Function;
  };
};