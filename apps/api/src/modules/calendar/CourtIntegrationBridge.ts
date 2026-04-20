import { CalendarEventType, EventVisibility } from '@global-wakili/database';
import { CalendarService } from './CalendarService';
import { ReminderService } from './ReminderService';

function normalizeDate(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid court hearing date'), {
      statusCode: 422,
      code: 'INVALID_COURT_HEARING_DATE',
    });
  }
  return parsed;
}

export class CourtIntegrationBridge {
  static buildCourtEventTitle(params: {
    matterCode?: string | null;
    matterTitle?: string | null;
    courtName: string;
    hearingType?: string | null;
  }) {
    const matterContext = params.matterCode ?? params.matterTitle ?? 'Matter';
    const hearingType = params.hearingType?.trim() ? ` - ${params.hearingType.trim()}` : '';
    return `Court Date - ${matterContext} - ${params.courtName.trim()}${hearingType}`;
  }

  static async createCalendarEventFromCourtHearing(
    db: any,
    params: {
      tenantId: string;
      creatorId: string;
      matterId: string;
      courtName: string;
      hearingDate: Date | string;
      hearingType?: string | null;
      location?: string | null;
      notes?: string | null;
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

    const hearingDate = normalizeDate(params.hearingDate);
    const startTime = new Date(hearingDate);
    const endTime = new Date(hearingDate.getTime() + 60 * 60 * 1000);

    const attendeeIds = [
      ...new Set(
        [matter.partnerId ?? null, matter.assignedLawyerId ?? null].filter(Boolean) as string[],
      ),
    ];

    const event = await CalendarService.createEvent(db, {
      tenantId: params.tenantId,
      creatorId: params.creatorId,
      title: this.buildCourtEventTitle({
        matterCode: matter.matterCode,
        matterTitle: matter.title,
        courtName: params.courtName,
        hearingType: params.hearingType ?? null,
      }),
      description: [
        params.notes?.trim() ?? null,
        params.location?.trim() ? `Location: ${params.location.trim()}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      startTime,
      endTime,
      type: CalendarEventType.COURT_DATE,
      visibility: EventVisibility.PRIVATE,
      isPrivate: true,
      matterId: params.matterId,
      attendeeIds,
    });

    await ReminderService.attachRemindersToEvent(db, {
      tenantId: params.tenantId,
      eventId: event.id,
      eventType: 'COURT_DATE',
    });

    return event;
  }

  static async rescheduleCalendarEventForAdjournment(
    db: any,
    params: {
      tenantId: string;
      eventId: string;
      newHearingDate: Date | string;
      note?: string | null;
    },
  ) {
    const event = await db.calendarEvent.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.eventId,
      },
      include: {
        attendees: {
          select: { id: true },
        },
      },
    });

    if (!event) {
      throw Object.assign(new Error('Calendar court event not found'), {
        statusCode: 404,
        code: 'COURT_CALENDAR_EVENT_NOT_FOUND',
      });
    }

    const newHearingDate = normalizeDate(params.newHearingDate);
    const startTime = new Date(newHearingDate);
    const endTime = new Date(newHearingDate.getTime() + 60 * 60 * 1000);

    const description = [
      event.description ?? null,
      params.note?.trim() ?? 'Adjourned / rescheduled by court.',
    ]
      .filter(Boolean)
      .join('\n');

    return CalendarService.updateEvent(db, {
      id: event.id,
      tenantId: params.tenantId,
      startTime,
      endTime,
      description,
      attendeeIds: event.attendees.map((a: any) => a.id),
      excludeConflictEventId: event.id,
    });
  }
}