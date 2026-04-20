import { CalendarService } from './CalendarService';

export type CalendarSyncProvider = 'GOOGLE' | 'OUTLOOK';
export type CalendarSyncDirection = 'IMPORT' | 'EXPORT' | 'BIDIRECTIONAL';

export class CalendarSyncService {
  static async markExternalSyncIds(
    db: any,
    params: {
      tenantId: string;
      eventId: string;
      googleEventId?: string | null;
      outlookEventId?: string | null;
    },
  ) {
    const existing = await db.calendarEvent.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.eventId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Calendar event not found'), {
        statusCode: 404,
        code: 'CALENDAR_EVENT_NOT_FOUND',
      });
    }

    return db.calendarEvent.update({
      where: { id: params.eventId },
      data: {
        ...(params.googleEventId !== undefined
          ? { googleEventId: params.googleEventId ?? null }
          : {}),
        ...(params.outlookEventId !== undefined
          ? { outlookEventId: params.outlookEventId ?? null }
          : {}),
      },
    });
  }

  static async exportEvent(
    db: any,
    params: {
      tenantId: string;
      eventId: string;
      provider: CalendarSyncProvider;
    },
  ) {
    const event = await db.calendarEvent.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.eventId,
      },
      include: {
        attendees: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        matter: {
          select: { id: true, title: true, matterCode: true },
        },
      },
    });

    if (!event) {
      throw Object.assign(new Error('Calendar event not found'), {
        statusCode: 404,
        code: 'CALENDAR_EVENT_NOT_FOUND',
      });
    }

    const externalId =
      params.provider === 'GOOGLE'
        ? `gcal_${event.id}_${Date.now()}`
        : `outlook_${event.id}_${Date.now()}`;

    const updated = await this.markExternalSyncIds(db, {
      tenantId: params.tenantId,
      eventId: params.eventId,
      ...(params.provider === 'GOOGLE'
        ? { googleEventId: externalId }
        : { outlookEventId: externalId }),
    });

    return {
      provider: params.provider,
      direction: 'EXPORT' as const,
      externalEventId: externalId,
      event: updated,
      syncedAt: new Date(),
    };
  }

  static async importExternalEvent(
    db: any,
    params: {
      tenantId: string;
      creatorId: string;
      provider: CalendarSyncProvider;
      externalEventId: string;
      title: string;
      description?: string | null;
      startTime: Date | string;
      endTime: Date | string;
      attendeeIds?: string[];
      matterId?: string | null;
      visibility?: string;
      isPrivate?: boolean;
    },
  ) {
    const created = await CalendarService.createEvent(db, {
      tenantId: params.tenantId,
      creatorId: params.creatorId,
      title: params.title,
      description: params.description ?? null,
      startTime: params.startTime,
      endTime: params.endTime,
      type: 'GENERAL',
      visibility: (params.visibility as any) ?? 'PRIVATE',
      isPrivate: params.isPrivate ?? true,
      matterId: params.matterId ?? null,
      attendeeIds: params.attendeeIds ?? [],
      ...(params.provider === 'GOOGLE'
        ? { googleEventId: params.externalEventId }
        : { outlookEventId: params.externalEventId }),
    });

    return {
      provider: params.provider,
      direction: 'IMPORT' as const,
      event: created,
      syncedAt: new Date(),
    };
  }

  static async syncEvent(
    db: any,
    params: {
      tenantId: string;
      provider: CalendarSyncProvider;
      direction: CalendarSyncDirection;
      eventId?: string;
      creatorId?: string;
      externalEvent?: {
        externalEventId: string;
        title: string;
        description?: string | null;
        startTime: Date | string;
        endTime: Date | string;
        attendeeIds?: string[];
        matterId?: string | null;
        visibility?: string;
        isPrivate?: boolean;
      };
    },
  ) {
    if (params.direction === 'EXPORT') {
      if (!params.eventId) {
        throw Object.assign(new Error('eventId is required for export sync'), {
          statusCode: 422,
          code: 'CALENDAR_SYNC_EVENT_ID_REQUIRED',
        });
      }

      return this.exportEvent(db, {
        tenantId: params.tenantId,
        eventId: params.eventId,
        provider: params.provider,
      });
    }

    if (params.direction === 'IMPORT') {
      if (!params.creatorId || !params.externalEvent) {
        throw Object.assign(new Error('creatorId and externalEvent are required for import sync'), {
          statusCode: 422,
          code: 'CALENDAR_SYNC_IMPORT_DATA_REQUIRED',
        });
      }

      return this.importExternalEvent(db, {
        tenantId: params.tenantId,
        creatorId: params.creatorId,
        provider: params.provider,
        ...params.externalEvent,
      });
    }

    return {
      provider: params.provider,
      direction: 'BIDIRECTIONAL' as const,
      syncedAt: new Date(),
      status: 'PENDING_IMPLEMENTATION',
    };
  }
}