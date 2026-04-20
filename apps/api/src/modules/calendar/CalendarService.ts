import { CalendarAvailabilityService } from './CalendarAvailabilityService';
import { EventVisibilityService } from './event-visibility.service';
import { normalizePrivacy } from './calendar.validators';
import type {
  CalendarEventFilters,
  CreateCalendarEventPayload,
  TenantCalendarDbClient,
  UpdateCalendarEventPayload,
} from './calendar.types';

function normalizeDate(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid calendar date'), {
      statusCode: 422,
      code: 'INVALID_CALENDAR_DATE',
    });
  }
  return parsed;
}

export class CalendarService {
  static async createEvent(
    db: TenantCalendarDbClient,
    payload: CreateCalendarEventPayload,
  ) {
    const startTime = normalizeDate(payload.startTime);
    const endTime = normalizeDate(payload.endTime);

    if (endTime <= startTime) {
      throw Object.assign(new Error('End time must be after start time'), {
        statusCode: 422,
        code: 'INVALID_CALENDAR_TIME_RANGE',
      });
    }

    const normalizedPrivacy = normalizePrivacy({
      isPrivate: payload.isPrivate,
      visibility: payload.visibility,
    });

    const [matter, creator, attendees] = await Promise.all([
      payload.matterId
        ? db.matter.findFirst({
            where: {
              tenantId: payload.tenantId,
              id: payload.matterId,
            },
            select: {
              id: true,
              title: true,
              matterCode: true,
              partnerId: true,
              assignedLawyerId: true,
              metadata: true,
            },
          })
        : Promise.resolve(null),
      db.user.findFirst({
        where: {
          tenantId: payload.tenantId,
          id: payload.creatorId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      }),
      payload.attendeeIds?.length
        ? db.user.findMany({
            where: {
              tenantId: payload.tenantId,
              id: { in: payload.attendeeIds },
              status: 'ACTIVE',
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve([]),
    ]);

    if (!creator) {
      throw Object.assign(new Error('Event creator not found or inactive'), {
        statusCode: 404,
        code: 'CALENDAR_CREATOR_NOT_FOUND',
      });
    }

    if (payload.matterId && !matter) {
      throw Object.assign(new Error('Matter not found for tenant'), {
        statusCode: 404,
        code: 'CALENDAR_MATTER_NOT_FOUND',
      });
    }

    if ((payload.attendeeIds?.length ?? 0) !== attendees.length) {
      throw Object.assign(new Error('One or more attendees were not found or inactive'), {
        statusCode: 404,
        code: 'CALENDAR_ATTENDEE_NOT_FOUND',
      });
    }

    const userIdsForConflict = [
      payload.creatorId,
      ...(payload.attendeeIds ?? []),
    ];

    const clash = await CalendarAvailabilityService.checkConflicts(db, {
      tenantId: payload.tenantId,
      startTime,
      endTime,
      userIds: userIdsForConflict,
    });

    if (clash.hasConflict) {
      throw Object.assign(
        new Error(`Schedule conflict detected: ${clash.conflicts[0]?.title ?? 'conflict found'}`),
        {
          statusCode: 409,
          code: 'CALENDAR_CONFLICT_DETECTED',
          details: clash,
        },
      );
    }

    return db.calendarEvent.create({
      data: {
        tenantId: payload.tenantId,
        creatorId: payload.creatorId,
        title: payload.title.trim(),
        description: payload.description?.trim() ?? null,
        startTime,
        endTime,
        type: payload.type,
        visibility: normalizedPrivacy.visibility,
        isPrivate: normalizedPrivacy.isPrivate,
        matterId: payload.matterId ?? null,
        googleEventId: payload.googleEventId ?? null,
        outlookEventId: payload.outlookEventId ?? null,
        attendees: {
          connect: (payload.attendeeIds ?? []).map((id) => ({ id })),
        },
      },
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
            partnerId: true,
            assignedLawyerId: true,
            metadata: true,
          },
        },
      },
    });
  }

  static async updateEvent(
    db: TenantCalendarDbClient,
    payload: UpdateCalendarEventPayload,
  ) {
    const existing = await db.calendarEvent.findFirst({
      where: {
        tenantId: payload.tenantId,
        id: payload.id,
      },
      include: {
        attendees: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Calendar event not found'), {
        statusCode: 404,
        code: 'CALENDAR_EVENT_NOT_FOUND',
      });
    }

    const startTime =
      payload.startTime !== undefined
        ? normalizeDate(payload.startTime)
        : existing.startTime;

    const endTime =
      payload.endTime !== undefined
        ? normalizeDate(payload.endTime)
        : existing.endTime;

    if (endTime <= startTime) {
      throw Object.assign(new Error('End time must be after start time'), {
        statusCode: 422,
        code: 'INVALID_CALENDAR_TIME_RANGE',
      });
    }

    const normalizedPrivacy = normalizePrivacy({
      isPrivate: payload.isPrivate ?? existing.isPrivate,
      visibility: payload.visibility ?? existing.visibility,
    });

    const finalMatterId =
      payload.matterId !== undefined ? payload.matterId : existing.matterId;

    const finalAttendeeIds =
      payload.attendeeIds !== undefined
        ? payload.attendeeIds
        : existing.attendees.map((a: any) => a.id);

    const [matter, attendees] = await Promise.all([
      finalMatterId
        ? db.matter.findFirst({
            where: {
              tenantId: payload.tenantId,
              id: finalMatterId,
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
      finalAttendeeIds.length
        ? db.user.findMany({
            where: {
              tenantId: payload.tenantId,
              id: { in: finalAttendeeIds },
              status: 'ACTIVE',
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve([]),
    ]);

    if (finalMatterId && !matter) {
      throw Object.assign(new Error('Matter not found for tenant'), {
        statusCode: 404,
        code: 'CALENDAR_MATTER_NOT_FOUND',
      });
    }

    if (finalAttendeeIds.length !== attendees.length) {
      throw Object.assign(new Error('One or more attendees were not found or inactive'), {
        statusCode: 404,
        code: 'CALENDAR_ATTENDEE_NOT_FOUND',
      });
    }

    const conflictUsers = [existing.creatorId, ...finalAttendeeIds];

    const clash = await CalendarAvailabilityService.checkConflicts(db, {
      tenantId: payload.tenantId,
      startTime,
      endTime,
      userIds: conflictUsers,
      excludeEventId: payload.excludeConflictEventId ?? payload.id,
    });

    if (clash.hasConflict) {
      throw Object.assign(
        new Error(`Schedule conflict detected: ${clash.conflicts[0]?.title ?? 'conflict found'}`),
        {
          statusCode: 409,
          code: 'CALENDAR_CONFLICT_DETECTED',
          details: clash,
        },
      );
    }

    return db.calendarEvent.update({
      where: {
        id: payload.id,
      },
      data: {
        ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
        ...(payload.description !== undefined
          ? { description: payload.description?.trim() ?? null }
          : {}),
        ...(payload.startTime !== undefined ? { startTime } : {}),
        ...(payload.endTime !== undefined ? { endTime } : {}),
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        visibility: normalizedPrivacy.visibility,
        isPrivate: normalizedPrivacy.isPrivate,
        ...(payload.matterId !== undefined ? { matterId: finalMatterId ?? null } : {}),
        ...(payload.googleEventId !== undefined
          ? { googleEventId: payload.googleEventId ?? null }
          : {}),
        ...(payload.outlookEventId !== undefined
          ? { outlookEventId: payload.outlookEventId ?? null }
          : {}),
        ...(payload.attendeeIds !== undefined
          ? {
              attendees: {
                set: [],
                connect: finalAttendeeIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
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
            partnerId: true,
            assignedLawyerId: true,
            metadata: true,
          },
        },
      },
    });
  }

  static async getFirmCalendar(
    db: TenantCalendarDbClient,
    filters: CalendarEventFilters,
  ) {
    const startDate = normalizeDate(filters.startDate);
    const endDate = normalizeDate(filters.endDate);

    if (endDate <= startDate) {
      throw Object.assign(new Error('endDate must be after startDate'), {
        statusCode: 422,
        code: 'INVALID_CALENDAR_QUERY_RANGE',
      });
    }

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId: filters.tenantId,
      startTime: { lt: endDate },
      endTime: { gt: startDate },
      ...(filters.matterId ? { matterId: filters.matterId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.creatorId ? { creatorId: filters.creatorId } : {}),
      ...(filters.visibility ? { visibility: filters.visibility } : {}),
    };

    const [events, total] = await Promise.all([
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
              partnerId: true,
              assignedLawyerId: true,
              metadata: true,
            },
          },
        },
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      db.calendarEvent.count
        ? db.calendarEvent.count({ where })
        : Promise.resolve(0),
    ]);

    const visibleEvents = await EventVisibilityService.filterVisibleEvents(
      events,
      filters.userId,
    );

    return {
      data: visibleEvents,
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  static async getEventById(
    db: TenantCalendarDbClient,
    params: {
      tenantId: string;
      userId: string;
      eventId: string;
    },
  ) {
    const event = await db.calendarEvent.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.eventId,
      },
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
            partnerId: true,
            assignedLawyerId: true,
            metadata: true,
          },
        },
      },
    });

    if (!event) {
      throw Object.assign(new Error('Calendar event not found'), {
        statusCode: 404,
        code: 'CALENDAR_EVENT_NOT_FOUND',
      });
    }

    const [visible] = await EventVisibilityService.filterVisibleEvents(
      [event],
      params.userId,
    );

    return visible;
  }
}