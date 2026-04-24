export class CalendarAvailabilityService {
  /**
   * Checks for overlapping events for creators and/or attendees.
   * Supports excluding a current event during updates.
   */
  static async checkConflicts(
    db: any,
    params: {
      tenantId: string;
      startTime: Date;
      endTime: Date;
      userIds: string[];
      excludeEventId?: string | null;
    },
  ) {
    const uniqueUserIds = [...new Set(params.userIds.filter(Boolean))];

    if (uniqueUserIds.length === 0) {
      return { hasConflict: false, conflicts: [] };
    }

    const conflicts = await db.calendarEvent.findMany({
      where: {
        tenantId: params.tenantId,
        ...(params.excludeEventId ? { id: { not: params.excludeEventId } } : {}),
        startTime: { lt: params.endTime },
        endTime: { gt: params.startTime },
        OR: [
          {
            creatorId: {
              in: uniqueUserIds,
            },
          },
          {
            attendees: {
              some: {
                id: {
                  in: uniqueUserIds,
                },
              },
            },
          },
        ],
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
          },
        },
        matter: {
          select: {
            id: true,
            title: true,
            matterCode: true,
          },
        },
      },
      orderBy: [{ startTime: 'asc' }],
    });

    if (conflicts.length === 0) {
      return {
        hasConflict: false,
        conflicts: [],
      };
    }

    return {
      hasConflict: true,
      conflicts: conflicts.map((c: any) => ({
        eventId: c.id,
        title: c.title,
        creator: c.creator?.name ?? null,
        creatorId: c.creatorId,
        matterId: c.matterId ?? null,
        matterTitle: c.matter?.title ?? null,
        matterCode: c.matter?.matterCode ?? null,
        time: `${new Date(c.startTime).toISOString()} - ${new Date(c.endTime).toISOString()}`,
      })),
    };
  }
}