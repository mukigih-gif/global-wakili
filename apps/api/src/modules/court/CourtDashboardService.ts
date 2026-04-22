// apps/api/src/modules/court/CourtDashboardService.ts

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export class CourtDashboardService {
  static async getDashboard(
    db: any,
    params: {
      tenantId: string;
      matterId?: string | null;
      from?: Date | string | null;
      to?: Date | string | null;
    },
  ) {
    if (!params.tenantId?.trim()) {
      throw Object.assign(new Error('Tenant ID is required for court dashboard'), {
        statusCode: 400,
        code: 'COURT_DASHBOARD_TENANT_REQUIRED',
      });
    }

    const now = new Date();
    const from = normalizeDate(params.from);
    const to = normalizeDate(params.to);

    const andClauses: Record<string, unknown>[] = [];

    if (params.matterId) andClauses.push({ matterId: params.matterId });

    if (from || to) {
      andClauses.push({
        hearingDate: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      });
    }

    const baseWhere = {
      tenantId: params.tenantId,
      ...(andClauses.length ? { AND: andClauses } : {}),
    };

    const [
      totalHearings,
      upcomingHearings,
      overdueHearings,
      recentHearings,
      byStatus,
      byType,
      byCourtStation,
    ] = await Promise.all([
      db.courtHearing.count({ where: baseWhere }),
      db.courtHearing.findMany({
        where: {
          ...baseWhere,
          status: {
            in: ['SCHEDULED', 'ADJOURNED'],
          },
          hearingDate: {
            gte: now,
          },
        },
        orderBy: [{ hearingDate: 'asc' }],
        take: 20,
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          calendarEvent: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      }),
      db.courtHearing.findMany({
        where: {
          ...baseWhere,
          status: {
            in: ['SCHEDULED', 'ADJOURNED'],
          },
          hearingDate: {
            lt: now,
          },
        },
        orderBy: [{ hearingDate: 'asc' }],
        take: 20,
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          calendarEvent: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      }),
      db.courtHearing.findMany({
        where: baseWhere,
        orderBy: [{ updatedAt: 'desc' }, { hearingDate: 'asc' }],
        take: 20,
        include: {
          matter: {
            select: {
              id: true,
              title: true,
              matterCode: true,
            },
          },
          calendarEvent: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      }),
      db.courtHearing.groupBy
        ? db.courtHearing.groupBy({
            by: ['status'],
            where: baseWhere,
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.courtHearing.groupBy
        ? db.courtHearing.groupBy({
            by: ['hearingType'],
            where: baseWhere,
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.courtHearing.groupBy
        ? db.courtHearing.groupBy({
            by: ['courtStation'],
            where: baseWhere,
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
          })
        : Promise.resolve([]),
    ]);

    return {
      tenantId: params.tenantId,
      matterId: params.matterId ?? null,
      generatedAt: new Date(),
      summary: {
        totalHearings,
        upcomingCount: upcomingHearings.length,
        overdueCount: overdueHearings.length,
        byStatus: byStatus.map((item: any) => ({
          status: item.status,
          count: item._count.id,
        })),
        byType: byType.map((item: any) => ({
          hearingType: item.hearingType,
          count: item._count.id,
        })),
        byCourtStation: byCourtStation.map((item: any) => ({
          courtStation: item.courtStation ?? 'UNSPECIFIED',
          count: item._count.id,
        })),
      },
      upcomingHearings,
      overdueHearings,
      recentHearings,
    };
  }
}

export default CourtDashboardService;