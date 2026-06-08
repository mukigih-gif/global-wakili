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

// ── Event Notifications (internal staff + client invites) ─────────────────────
router.post(
  '/:eventId/notify',
  requirePermissions(PERMISSIONS.calendar.createEvent),
  async (req, res) => {
    try {
      const { type, attendeeIds = [], clientId } = req.body;
      const eventId = req.params.eventId;

      const event = await req.db.calendarEvent.findFirst({
        where: { id: eventId, tenantId: req.tenantId },
        select: { id: true, title: true, startTime: true, endTime: true, type: true, description: true },
      });
      if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

      const dateStr = new Date(event.startTime).toLocaleString('en-KE', { dateStyle: 'full', timeStyle: 'short' });

      if (type === 'INTERNAL' && attendeeIds.length > 0) {
        const staffUsers = await req.db.user.findMany({
          where: { tenantId: req.tenantId, id: { in: attendeeIds } },
          select: { id: true, name: true, email: true },
        });
        for (const u of staffUsers) {
          await req.db.notification.create({
            data: {
              tenantId:      req.tenantId!,
              userId:        u.id,
              channel:       'SYSTEM_ALERT',
              systemTitle:   `Event Invite: ${event.title}`,
              systemMessage: `You have been added to "${event.title}" on ${dateStr}.`,
              status:        'PENDING',
            },
          });
        }
      }

      if (type === 'CLIENT' && clientId) {
        const client = await req.db.client.findFirst({
          where: { tenantId: req.tenantId, id: clientId },
          select: { id: true, name: true, email: true },
        });
        if (client?.email) {
          await req.db.notification.create({
            data: {
              tenantId:       req.tenantId!,
              recipientEmail: client.email,
              recipientName:  client.name,
              channel:        'EMAIL',
              emailSubject:   `[Global Wakili] Meeting Invitation: ${event.title}`,
              emailBody:      `<p>Dear ${client.name},</p><p>You are invited to the following meeting:</p><table style="border-collapse:collapse;max-width:480px;width:100%"><tr><td style="padding:8px;color:#6b7280;font-weight:600">Event</td><td style="padding:8px">${event.title}</td></tr><tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280;font-weight:600">Date & Time</td><td style="padding:8px">${dateStr}</td></tr>${event.description ? `<tr><td style="padding:8px;color:#6b7280;font-weight:600">Details</td><td style="padding:8px">${event.description}</td></tr>` : ''}</table><p>Please confirm your attendance or contact us if you have any questions.</p><p style="color:#9ca3af;font-size:12px">Global Wakili Legal Enterprise</p>`,
              status:         'PENDING',
            },
          });
        }
      }

      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  }
);

export default router;