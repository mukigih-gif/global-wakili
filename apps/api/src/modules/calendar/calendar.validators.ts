// apps/api/src/modules/calendar/calendar.validators.ts

import { z } from 'zod';
import { CalendarEventType, EventVisibility } from '@global-wakili/database';

const recurrenceSchema = z
  .object({
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']),
    interval: z.number().int().min(1).max(365).optional(),
    byWeekDay: z.array(z.string().trim().min(2).max(3)).max(7).optional(),
    byMonthDay: z.array(z.number().int().min(1).max(31)).max(31).optional(),
    count: z.number().int().min(1).max(1000).optional(),
    until: z.coerce.date().optional().nullable(),
    rrule: z.string().trim().max(1000).optional().nullable(),
  })
  .optional()
  .nullable();

const reminderSchema = z.object({
  channel: z.enum(['portal', 'email', 'sms']),
  minutesBefore: z.number().int().min(1).max(60 * 24 * 365),
  enabled: z.boolean().default(true),
});

export const calendarEventBaseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  description: z.string().trim().max(5000).optional().nullable(),

  startTime: z.coerce.date(),
  endTime: z.coerce.date(),

  type: z.nativeEnum(CalendarEventType).default(CalendarEventType.GENERAL),
  visibility: z.nativeEnum(EventVisibility).default(EventVisibility.PRIVATE),
  isPrivate: z.boolean().default(false),

  matterId: z.string().cuid().optional().nullable(),
  attendeeIds: z.array(z.string().cuid()).max(100).optional(),

  googleEventId: z.string().trim().max(255).optional().nullable(),
  outlookEventId: z.string().trim().max(255).optional().nullable(),

  recurrence: recurrenceSchema,
  reminders: z.array(reminderSchema).max(20).optional().nullable(),
});

export const calendarEventSchema = calendarEventBaseSchema.refine(
  (data) => data.endTime > data.startTime,
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  },
);

export const calendarEventUpdateSchema = calendarEventBaseSchema.partial().refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return data.endTime > data.startTime;
    }

    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  },
);

export const eventQuerySchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    matterId: z.string().cuid().optional(),
    creatorId: z.string().cuid().optional(),
    type: z.nativeEnum(CalendarEventType).optional(),
    visibility: z.nativeEnum(EventVisibility).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });

export const calendarEventIdParamSchema = z.object({
  eventId: z.string().cuid(),
});

export const calendarAttendeeSchema = z.object({
  attendeeIds: z.array(z.string().cuid()).min(1).max(100),
});

export const calendarSyncSchema = z.object({
  provider: z.enum(['google', 'outlook']).optional(),
  force: z.boolean().optional().default(false),
});

export const calendarAvailabilitySchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    attendeeIds: z.array(z.string().cuid()).min(1).max(100),
    durationMinutes: z.coerce.number().int().min(5).max(24 * 60).optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });

export function normalizePrivacy(input: {
  isPrivate?: boolean;
  visibility?: EventVisibility | string | null;
}) {
  const visibility = input.visibility ?? EventVisibility.PRIVATE;
  const isPrivate = input.isPrivate ?? false;

  if (isPrivate) {
    return {
      isPrivate: true,
      visibility: EventVisibility.PRIVATE,
    };
  }

  if (visibility !== EventVisibility.PRIVATE) {
    return {
      isPrivate: false,
      visibility,
    };
  }

  return {
    isPrivate: true,
    visibility: EventVisibility.PRIVATE,
  };
}

export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
export type CalendarEventUpdateInput = z.infer<typeof calendarEventUpdateSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type CalendarAvailabilityInput = z.infer<typeof calendarAvailabilitySchema>;