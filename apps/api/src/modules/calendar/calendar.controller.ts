import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { CalendarService } from './CalendarService';
import { CalendarSyncService } from './CalendarSyncService';
import { CalendarSubscriptionService } from './CalendarSubscriptionService';
import { CalendarDashboardService } from './calendar.dashboard';
import { CalendarAvailabilityService } from './CalendarAvailabilityService';
import { DocumentAuditService } from '../document/DocumentAuditService';
import { NotificationService } from '../notifications/NotificationService';

export const createCalendarEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await CalendarService.createEvent(req.db, {
    tenantId: req.tenantId!,
    creatorId: req.user!.sub,
    title: req.body.title,
    description: req.body.description ?? null,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    type: req.body.type ?? 'GENERAL',
    visibility: req.body.visibility,
    isPrivate: req.body.isPrivate,
    matterId: req.body.matterId ?? null,
    attendeeIds: req.body.attendeeIds ?? [],
    googleEventId: req.body.googleEventId ?? null,
    outlookEventId: req.body.outlookEventId ?? null,
    recurrence: req.body.recurrence ?? null,
    reminders: req.body.reminders ?? null,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    matterId: event.matterId ?? null,
    action: 'UPLOADED',
    requestId: req.id,
    metadata: {
      domain: 'CALENDAR',
      eventId: event.id,
      eventType: event.type,
      visibility: event.visibility,
      isPrivate: event.isPrivate,
      startTime: event.startTime,
      endTime: event.endTime,
    },
  });

  // Send notification to creator + attendees when event is created
  try {
    const creator = await req.db.user.findUnique({
      where: { id: req.user!.sub },
      select: { id: true, email: true, name: true },
    });

    const startFormatted = new Date(event.startTime).toLocaleString('en-KE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    // In-app alert for creator
    if (creator) {
      await NotificationService.dispatch(req.db, {
        tenantId: req.tenantId!,
        recipients: [{ userId: creator.id, email: creator.email, name: creator.name }],
        channels: ['SYSTEM_ALERT'],
        category: 'CALENDAR',
        priority: event.type === 'COURT_HEARING' || event.type === 'DEADLINE' ? 'HIGH' : 'NORMAL',
        entityType: 'CALENDAR_EVENT',
        entityId: event.id,
        debounceKey: `event-created:${event.id}`,
        template: {
          systemTitle: `Event Created: ${event.title}`,
          systemMessage: `Your event "${event.title}" has been scheduled for ${startFormatted}.`,
        },
      });
    }

    // Email reminder if requested (reminderMinutes > 0)
    const reminderMinutes = Number(req.body.reminderMinutes ?? 30);
    if (reminderMinutes > 0 && creator) {
      const reminderTime = new Date(new Date(event.startTime).getTime() - reminderMinutes * 60 * 1000);
      const now = new Date();
      // Only schedule if reminder is in the future
      if (reminderTime > now) {
        await NotificationService.dispatch(req.db, {
          tenantId: req.tenantId!,
          recipients: [{ userId: creator.id, email: creator.email, name: creator.name }],
          channels: ['EMAIL', 'SYSTEM_ALERT'],
          category: 'CALENDAR',
          priority: 'HIGH',
          entityType: 'CALENDAR_EVENT',
          entityId: event.id,
          debounceKey: `event-reminder:${event.id}:${reminderMinutes}`,
          template: {
            systemTitle: `Reminder: ${event.title} in ${reminderMinutes < 60 ? `${reminderMinutes} mins` : `${reminderMinutes / 60}h`}`,
            systemMessage: `Your event "${event.title}" starts at ${startFormatted}.`,
            emailSubject: `[Reminder] ${event.title} — ${startFormatted}`,
            emailBody: `
              <p>Hello ${creator.name ?? ''},</p>
              <p>This is a reminder for your upcoming event:</p>
              <table style="border-collapse:collapse;width:100%;max-width:480px">
                <tr><td style="padding:8px;font-weight:600;color:#6b7280">Event</td><td style="padding:8px">${event.title}</td></tr>
                <tr style="background:#f9fafb"><td style="padding:8px;font-weight:600;color:#6b7280">When</td><td style="padding:8px">${startFormatted}</td></tr>
                ${event.location ? `<tr><td style="padding:8px;font-weight:600;color:#6b7280">Location</td><td style="padding:8px">${event.location}</td></tr>` : ''}
                <tr style="background:#f9fafb"><td style="padding:8px;font-weight:600;color:#6b7280">Type</td><td style="padding:8px">${String(event.type).replace(/_/g,' ')}</td></tr>
              </table>
              <p style="color:#9ca3af;font-size:12px;margin-top:16px">Global Wakili Legal Enterprise</p>
            `,
          },
        });
      }
    }
  } catch (notifErr) {
    console.warn('[CALENDAR] Notification send failed:', notifErr instanceof Error ? notifErr.message : notifErr);
  }

  res.status(201).json(event);
});

export const updateCalendarEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await CalendarService.updateEvent(req.db, {
    id: req.params.eventId,
    tenantId: req.tenantId!,
    title: req.body.title,
    description: req.body.description,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    type: req.body.type,
    visibility: req.body.visibility,
    isPrivate: req.body.isPrivate,
    matterId: req.body.matterId,
    attendeeIds: req.body.attendeeIds,
    googleEventId: req.body.googleEventId,
    outlookEventId: req.body.outlookEventId,
    excludeConflictEventId: req.params.eventId,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    matterId: event.matterId ?? null,
    action: 'EDITED',
    requestId: req.id,
    metadata: {
      domain: 'CALENDAR',
      eventId: event.id,
      eventType: event.type,
      visibility: event.visibility,
      isPrivate: event.isPrivate,
      startTime: event.startTime,
      endTime: event.endTime,
    },
  });

  res.status(200).json(event);
});

export const deleteCalendarEvent = asyncHandler(async (req: Request, res: Response) => {
  const existing = await req.db.calendarEvent.findFirst({
    where: {
      tenantId: req.tenantId!,
      id: req.params.eventId,
    },
    select: {
      id: true,
      matterId: true,
      type: true,
      visibility: true,
      isPrivate: true,
      startTime: true,
      endTime: true,
    },
  });

  if (!existing) {
    throw Object.assign(new Error('Calendar event not found'), {
      statusCode: 404,
      code: 'CALENDAR_EVENT_NOT_FOUND',
    });
  }

  await req.db.calendarEvent.delete({
    where: {
      id: req.params.eventId,
    },
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    matterId: existing.matterId ?? null,
    action: 'ARCHIVED',
    requestId: req.id,
    metadata: {
      domain: 'CALENDAR',
      eventId: existing.id,
      eventType: existing.type,
      visibility: existing.visibility,
      isPrivate: existing.isPrivate,
      startTime: existing.startTime,
      endTime: existing.endTime,
      deletionMode: 'hard_delete',
    },
  });

  res.status(200).json({
    success: true,
    eventId: req.params.eventId,
  });
});

export const getCalendarEventById = asyncHandler(async (req: Request, res: Response) => {
  const event = await CalendarService.getEventById(req.db, {
    tenantId: req.tenantId!,
    userId: req.user!.sub,
    eventId: req.params.eventId,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    matterId: event.matterId ?? null,
    action: 'VIEWED',
    requestId: req.id,
    metadata: {
      domain: 'CALENDAR',
      eventId: event.id,
      eventType: event.type,
      visibility: event.visibility,
      isPrivate: event.isPrivate,
      isObscured: event.isObscured ?? false,
    },
  });

  res.status(200).json(event);
});

export const listCalendarEvents = asyncHandler(async (req: Request, res: Response) => {
  const result = await CalendarService.getFirmCalendar(req.db, {
    tenantId: req.tenantId!,
    userId: req.user!.sub,
    startDate: String(req.query.startDate),
    endDate: String(req.query.endDate),
    matterId: req.query.matterId ? String(req.query.matterId) : null,
    type: req.query.type ? String(req.query.type) : null,
    creatorId: req.query.creatorId ? String(req.query.creatorId) : null,
    visibility: req.query.visibility ? String(req.query.visibility) : null,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'SEARCHED',
    requestId: req.id,
    metadata: {
      domain: 'CALENDAR',
      resultCount: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      matterId: req.query.matterId ?? null,
      type: req.query.type ?? null,
      visibility: req.query.visibility ?? null,
    },
  });

  res.status(200).json(result);
});

export const getCalendarDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await CalendarDashboardService.getDashboard(req.db, {
    tenantId: req.tenantId!,
    userId: req.user!.sub,
    matterId: req.query.matterId ? String(req.query.matterId) : null,
    from: req.query.from ? String(req.query.from) : null,
    to: req.query.to ? String(req.query.to) : null,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'VIEWED',
    requestId: req.id,
    metadata: {
      domain: 'CALENDAR_DASHBOARD',
      matterId: req.query.matterId ?? null,
      from: req.query.from ?? null,
      to: req.query.to ?? null,
    },
  });

  res.status(200).json(dashboard);
});

export const syncExternalCalendar = asyncHandler(async (req: Request, res: Response) => {
  const result = await CalendarSyncService.syncEvent(req.db, {
    tenantId: req.tenantId!,
    provider: req.body.provider,
    direction: req.body.direction,
    eventId: req.body.eventId,
    creatorId: req.user?.sub,
    externalEvent: req.body.externalEvent,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'EDITED',
    requestId: req.id,
    metadata: {
      domain: 'CALENDAR_SYNC',
      provider: req.body.provider,
      direction: req.body.direction,
      eventId: req.body.eventId ?? null,
      externalEventId: req.body.externalEvent?.externalEventId ?? null,
    },
  });

  res.status(200).json(result);
});

export const createCalendarSubscription = asyncHandler(async (req: Request, res: Response) => {
  const baseUrl =
    process.env.APP_BASE_URL ||
    `${req.protocol}://${req.get('host')}`;

  const subscription = CalendarSubscriptionService.createSubscription({
    baseUrl,
    tenantId: req.tenantId!,
    userId: req.user!.sub,
    scope: req.body.scope,
    matterId: req.body.matterId ?? null,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'EDITED',
    requestId: req.id,
    metadata: {
      domain: 'CALENDAR_SUBSCRIPTION',
      scope: req.body.scope,
      matterId: req.body.matterId ?? null,
      token: subscription.token,
    },
  });

  res.status(201).json(subscription);
});

export const addCalendarAttendees = asyncHandler(async (req: Request, res: Response) => {
  const event = await req.db.calendarEvent.findFirst({
    where: {
      tenantId: req.tenantId!,
      id: req.params.eventId,
    },
    include: {
      attendees: {
        select: { id: true },
      },
    },
  });

  if (!event) {
    throw Object.assign(new Error('Calendar event not found'), {
      statusCode: 404,
      code: 'CALENDAR_EVENT_NOT_FOUND',
    });
  }

  const currentIds = event.attendees.map((a: any) => a.id);
  const nextIds = [...new Set([...currentIds, ...req.body.attendeeIds])];

  const updated = await CalendarService.updateEvent(req.db, {
    id: req.params.eventId,
    tenantId: req.tenantId!,
    attendeeIds: nextIds,
    excludeConflictEventId: req.params.eventId,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    matterId: updated.matterId ?? null,
    action: 'EDITED',
    requestId: req.id,
    metadata: {
      domain: 'CALENDAR_ATTENDEES',
      eventId: updated.id,
      operation: 'add',
      attendeeIds: req.body.attendeeIds,
    },
  });

  res.status(200).json(updated);
});

export const removeCalendarAttendees = asyncHandler(async (req: Request, res: Response) => {
  const event = await req.db.calendarEvent.findFirst({
    where: {
      tenantId: req.tenantId!,
      id: req.params.eventId,
    },
    include: {
      attendees: {
        select: { id: true },
      },
    },
  });

  if (!event) {
    throw Object.assign(new Error('Calendar event not found'), {
      statusCode: 404,
      code: 'CALENDAR_EVENT_NOT_FOUND',
    });
  }

  const removeSet = new Set<string>(req.body.attendeeIds);
  const nextIds = event.attendees
    .map((a: any) => a.id)
    .filter((id: string) => !removeSet.has(id));

  const updated = await CalendarService.updateEvent(req.db, {
    id: req.params.eventId,
    tenantId: req.tenantId!,
    attendeeIds: nextIds,
    excludeConflictEventId: req.params.eventId,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    matterId: updated.matterId ?? null,
    action: 'EDITED',
    requestId: req.id,
    metadata: {
      domain: 'CALENDAR_ATTENDEES',
      eventId: updated.id,
      operation: 'remove',
      attendeeIds: req.body.attendeeIds,
    },
  });

  res.status(200).json(updated);
});

export const checkCalendarAvailability = asyncHandler(async (req: Request, res: Response) => {
  const userIds = String(req.query.userIds)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  const result = await CalendarAvailabilityService.checkConflicts(req.db, {
    tenantId: req.tenantId!,
    startTime: new Date(String(req.query.from)),
    endTime: new Date(String(req.query.to)),
    userIds,
  });

  await DocumentAuditService.logAction(req.db, {
    tenantId: req.tenantId!,
    userId: req.user?.sub ?? null,
    action: 'SEARCHED',
    requestId: req.id,
    metadata: {
      domain: 'CALENDAR_AVAILABILITY',
      from: req.query.from,
      to: req.query.to,
      userIds,
      hasConflict: result.hasConflict,
      conflictCount: result.conflicts?.length ?? 0,
    },
  });

  res.status(200).json(result);
});