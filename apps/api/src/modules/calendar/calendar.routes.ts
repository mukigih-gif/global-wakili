import { Router } from 'express';
import { z } from 'zod';
import { requirePermissions } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '../../config/permissions';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventById,
  listCalendarEvents,
  getCalendarDashboard,
  syncExternalCalendar,
  createCalendarSubscription,
  addCalendarAttendees,
  removeCalendarAttendees,
  checkCalendarAvailability,
} from './calendar.controller';

const router = Router();

const recurrenceSchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']),
  interval: z.number().int().min(1).max(365).optional(),
  byWeekDay: z.array(z.string().trim().min(2).max(3)).max(7).optional(),
  byMonthDay: z.array(z.number().int().min(1).max(31)).max(31).optional(),
  count: z.number().int().min(1).max(1000).optional(),
  until: z.string().datetime().optional().nullable(),
  rrule: z.string().trim().max(1000).optional().nullable(),
}).optional().nullable();

const reminderSchema = z.object({
  channel: z.enum(['portal', 'email', 'sms']),
  minutesBefore: z.number().int().min(1).max(60 * 24 * 365),
  enabled: z.boolean(),
});

const calendarEventBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  matterId: z.string().cuid().optional().nullable(),
  type: z.string().trim().min(1).max(100).optional(),
  visibility: z.enum(['PRIVATE', 'TEAM_ONLY', 'PUBLIC']).optional(),
  isPrivate: z.boolean().optional(),
  attendeeIds: z.array(z.string().cuid()).max(100).optional(),
  googleEventId: z.string().trim().max(255).optional().nullable(),
  outlookEventId: z.string().trim().max(255).optional().nullable(),
  recurrence: recurrenceSchema,
  reminders: z.array(reminderSchema).max(20).optional().nullable(),
});

const calendarEventPatchSchema = calendarEventBodySchema.partial();

const calendarListQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  matterId: z.string().trim().optional(),
  creatorId: z.string().trim().optional(),
  type: z.string().trim().optional(),
  visibility: z.enum(['PRIVATE', 'TEAM_ONLY', 'PUBLIC']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const attendeeBodySchema = z.object({
  attendeeIds: z.array(z.string().cuid()).min(1).max(50),
});

const availabilityQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  userIds: z.string().trim().min(1),
});

const subscriptionBodySchema = z.object({
  scope: z.enum(['PERSONAL', 'TEAM', 'BRANCH', 'MATTER']),
  matterId: z.string().cuid().optional().nullable(),
});

const syncBodySchema = z.object({
  provider: z.enum(['GOOGLE', 'OUTLOOK']),
  direction: z.enum(['IMPORT', 'EXPORT', 'BIDIRECTIONAL']),
  eventId: z.string().cuid().optional(),
  externalEvent: z.object({
    externalEventId: z.string().trim().min(1),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(5000).optional().nullable(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    attendeeIds: z.array(z.string().cuid()).optional(),
    matterId: z.string().cuid().optional().nullable(),
    visibility: z.enum(['PRIVATE', 'TEAM_ONLY', 'PUBLIC']).optional(),
    isPrivate: z.boolean().optional(),
  }).optional(),
});

const dashboardQuerySchema = z.object({
  matterId: z.string().cuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

router.post(
  '/',
  requirePermissions(PERMISSIONS.calendar.createEvent),
  validate({ body: calendarEventBodySchema }),
  createCalendarEvent,
);

router.patch(
  '/:eventId',
  requirePermissions(PERMISSIONS.calendar.updateEvent),
  validate({ body: calendarEventPatchSchema }),
  updateCalendarEvent,
);

router.delete(
  '/:eventId',
  requirePermissions(PERMISSIONS.calendar.deleteEvent),
  deleteCalendarEvent,
);

router.get(
  '/',
  requirePermissions(PERMISSIONS.calendar.viewEvent),
  validate({ query: calendarListQuerySchema }),
  listCalendarEvents,
);

router.get(
  '/dashboard',
  requirePermissions(PERMISSIONS.calendar.viewDashboard),
  validate({ query: dashboardQuerySchema }),
  getCalendarDashboard,
);

router.get(
  '/:eventId',
  requirePermissions(PERMISSIONS.calendar.viewEvent),
  getCalendarEventById,
);

router.post(
  '/:eventId/attendees',
  requirePermissions(PERMISSIONS.calendar.manageAttendees),
  validate({ body: attendeeBodySchema }),
  addCalendarAttendees,
);

router.delete(
  '/:eventId/attendees',
  requirePermissions(PERMISSIONS.calendar.manageAttendees),
  validate({ body: attendeeBodySchema }),
  removeCalendarAttendees,
);

router.get(
  '/availability/check',
  requirePermissions(PERMISSIONS.calendar.checkAvailability),
  validate({ query: availabilityQuerySchema }),
  checkCalendarAvailability,
);

router.post(
  '/subscriptions',
  requirePermissions(PERMISSIONS.calendar.manageSubscription),
  validate({ body: subscriptionBodySchema }),
  createCalendarSubscription,
);

router.post(
  '/sync',
  requirePermissions(PERMISSIONS.calendar.syncExternalCalendar),
  validate({ body: syncBodySchema }),
  syncExternalCalendar,
);

export default router;