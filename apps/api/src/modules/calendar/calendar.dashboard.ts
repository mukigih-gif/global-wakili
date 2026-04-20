export class CalendarDashboardService {
  static async getDashboard(
    db: any,
    params: {
      tenantId: string;
      userId: string;
      from?: Date | string | null;
      to?: Date | string | null;
      matterId?: string | null;
    },
  ) {
    const from = params.from ? new Date(params.from) : new Date();
    const to = params.to
      ? new Date(params.to)
      : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);

    const where = {
      tenantId: params.tenantId,
      startTime: { lt: to },
      endTime: { gt: from },
      ...(params.matterId ? { matterId: params.matterId } : {}),
    };

    const [events, countsByType, upcomingEvents, myEvents, courtEvents, deadlineEvents] =
      await Promise.all([
        db.calendarEvent.findMany({
          where,
          include: {
            creator: {
              select: { id: true, name: true, email: true },
            },
            attendees: {
              select: { id: true, name: true, email: true },
            },
            matter: {
              select: { id: true, title: true, matterCode: true },
            },
          },
          orderBy: [{ startTime: 'asc' }],
          take: 200,
        }),

        db.calendarEvent.groupBy({
          by: ['type'],
          where,
          _count: { id: true },
        }),

        db.calendarEvent.findMany({
          where,
          include: {
            matter: {
              select: { id: true, title: true, matterCode: true },
            },
          },
          orderBy: [{ startTime: 'asc' }],
          take: 10,
        }),

        db.calendarEvent.findMany({
          where: {
            ...where,
            OR: [
              { creatorId: params.userId },
              { attendees: { some: { id: params.userId } } },
            ],
          },
          include: {
            matter: {
              select: { id: true, title: true, matterCode: true },
            },
          },
          orderBy: [{ startTime: 'asc' }],
          take: 10,
        }),

        db.calendarEvent.findMany({
          where: {
            ...where,
            type: 'COURT_DATE',
          },
          include: {
            matter: {
              select: { id: true, title: true, matterCode: true },
            },
          },
          orderBy: [{ startTime: 'asc' }],
          take: 10,
        }),

        db.calendarEvent.findMany({
          where: {
            ...where,
            type: 'STATUTORY_DEADLINE',
          },
          include: {
            matter: {
              select: { id: true, title: true, matterCode: true },
            },
          },
          orderBy: [{ startTime: 'asc' }],
          take: 10,
        }),
      ]);

    const typeBreakdown = countsByType.reduce((acc: Record<string, number>, row: any) => {
      acc[row.type] = row._count.id;
      return acc;
    }, {});

    return {
      scope: {
        tenantId: params.tenantId,
        userId: params.userId,
        matterId: params.matterId ?? null,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        totalEvents: events.length,
        typeBreakdown,
      },
      upcomingEvents,
      myEvents,
      courtEvents,
      deadlineEvents,
      generatedAt: new Date(),
    };
  }
}