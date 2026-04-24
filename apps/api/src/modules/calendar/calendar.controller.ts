import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { CalendarService } from './CalendarService';
import { CalendarSyncService } from './CalendarSyncService';
import { CalendarSubscriptionService } from './CalendarSubscriptionService';
import { CalendarDashboardService } from './calendar.dashboard';
import { CalendarAvailabilityService } from './CalendarAvailabilityService';
import { DocumentAuditService } from '../document/DocumentAuditService';

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