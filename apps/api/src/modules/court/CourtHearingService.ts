// apps/api/src/modules/court/CourtHearingService.ts

import type {
  CourtDbClient,
  CourtHearingCreateInput,
  CourtHearingStatus,
  CourtHearingUpdateInput,
  CourtSearchFilters,
} from './court.types';

function assertTenant(tenantId: string): void {
  if (!tenantId?.trim()) {
    throw Object.assign(new Error('Tenant ID is required'), {
      statusCode: 400,
      code: 'COURT_TENANT_REQUIRED',
    });
  }
}

function assertTitle(title: string): void {
  if (!title?.trim()) {
    throw Object.assign(new Error('Court hearing title is required'), {
      statusCode: 422,
      code: 'COURT_HEARING_TITLE_REQUIRED',
    });
  }
}

function normalizeDate(value?: Date | string | null): Date | null {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid court date'), {
      statusCode: 422,
      code: 'COURT_DATE_INVALID',
    });
  }

  return parsed;
}

function normalizeRequiredDate(value: Date | string): Date {
  const parsed = normalizeDate(value);

  if (!parsed) {
    throw Object.assign(new Error('Court hearing date is required'), {
      statusCode: 422,
      code: 'COURT_HEARING_DATE_REQUIRED',
    });
  }

  return parsed;
}

function assertDateRange(startTime?: Date | null, endTime?: Date | null): void {
  if (startTime && endTime && endTime.getTime() <= startTime.getTime()) {
    throw Object.assign(new Error('Court hearing end time must be after start time'), {
      statusCode: 422,
      code: 'COURT_HEARING_TIME_RANGE_INVALID',
    });
  }
}

const allowedTransitions: Record<string, CourtHearingStatus[]> = {
  SCHEDULED: ['ADJOURNED', 'COMPLETED', 'CANCELLED', 'MISSED'],
  ADJOURNED: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED'],
  COMPLETED: [],
  CANCELLED: [],
  MISSED: ['SCHEDULED'],
};

function assertTransition(current: string, next: CourtHearingStatus): void {
  if (current === next) return;

  const allowed = allowedTransitions[current] ?? [];

  if (!allowed.includes(next)) {
    throw Object.assign(new Error(`Court hearing cannot move from ${current} to ${next}`), {
      statusCode: 409,
      code: 'COURT_HEARING_STATUS_TRANSITION_FORBIDDEN',
      details: {
        current,
        next,
        allowed,
      },
    });
  }
}

async function assertMatterCalendarAndActor(
  db: CourtDbClient,
  params: {
    tenantId: string;
    matterId: string;
    calendarEventId?: string | null;
    actorId?: string | null;
  },
): Promise<void> {
  const [matter, calendarEvent, actor] = await Promise.all([
    db.matter.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.matterId,
      },
      select: { id: true },
    }),
    params.calendarEventId
      ? db.calendarEvent.findFirst({
          where: {
            tenantId: params.tenantId,
            id: params.calendarEventId,
            matterId: params.matterId,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    params.actorId
      ? db.user.findFirst({
          where: {
            tenantId: params.tenantId,
            id: params.actorId,
            status: 'ACTIVE',
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!matter) {
    throw Object.assign(new Error('Matter not found for tenant'), {
      statusCode: 404,
      code: 'COURT_MATTER_NOT_FOUND',
    });
  }

  if (params.calendarEventId && !calendarEvent) {
    throw Object.assign(new Error('Calendar event not found for tenant and matter'), {
      statusCode: 404,
      code: 'COURT_CALENDAR_EVENT_NOT_FOUND',
    });
  }

  if (params.actorId && !actor) {
    throw Object.assign(new Error('Court actor not found or inactive'), {
      statusCode: 404,
      code: 'COURT_ACTOR_NOT_FOUND',
    });
  }
}

function buildWhere(params: {
  tenantId: string;
  query?: string | null;
  filters?: CourtSearchFilters | null;
}): Record<string, unknown> {
  const filters = params.filters ?? {};
  const andClauses: Record<string, unknown>[] = [];

  if (params.query?.trim()) {
    const query = params.query.trim();

    andClauses.push({
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { caseNumber: { contains: query, mode: 'insensitive' } },
        { courtName: { contains: query, mode: 'insensitive' } },
        { courtStation: { contains: query, mode: 'insensitive' } },
        { courtroom: { contains: query, mode: 'insensitive' } },
        { judge: { contains: query, mode: 'insensitive' } },
        { outcome: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
        {
          matter: {
            is: {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { matterCode: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
        },
      ],
    });
  }

  if (filters.matterId) andClauses.push({ matterId: filters.matterId });
  if (filters.calendarEventId) andClauses.push({ calendarEventId: filters.calendarEventId });
  if (filters.caseNumber) andClauses.push({ caseNumber: filters.caseNumber });
  if (filters.courtName) andClauses.push({ courtName: filters.courtName });
  if (filters.courtStation) andClauses.push({ courtStation: filters.courtStation });
  if (filters.judge) andClauses.push({ judge: filters.judge });
  if (filters.hearingType) andClauses.push({ hearingType: filters.hearingType });
  if (filters.status) andClauses.push({ status: filters.status });

  const hearingFrom = normalizeDate(filters.hearingFrom);
  const hearingTo = normalizeDate(filters.hearingTo);

  if (hearingFrom || hearingTo) {
    andClauses.push({
      hearingDate: {
        ...(hearingFrom ? { gte: hearingFrom } : {}),
        ...(hearingTo ? { lte: hearingTo } : {}),
      },
    });
  }

  if (filters.upcomingOnly === true) {
    andClauses.push({
      hearingDate: {
        gte: new Date(),
      },
    });
    andClauses.push({
      status: {
        in: ['SCHEDULED', 'ADJOURNED'],
      },
    });
  }

  if (filters.overdueOnly === true) {
    andClauses.push({
      hearingDate: {
        lt: new Date(),
      },
    });
    andClauses.push({
      status: {
        in: ['SCHEDULED', 'ADJOURNED'],
      },
    });
  }

  return {
    tenantId: params.tenantId,
    ...(andClauses.length ? { AND: andClauses } : {}),
  };
}

export class CourtHearingService {
  static async createHearing(db: CourtDbClient, input: CourtHearingCreateInput) {
    assertTenant(input.tenantId);
    assertTitle(input.title);

    if (!input.matterId?.trim()) {
      throw Object.assign(new Error('Matter ID is required for court hearing'), {
        statusCode: 422,
        code: 'COURT_HEARING_MATTER_REQUIRED',
      });
    }

    const hearingDate = normalizeRequiredDate(input.hearingDate);
    const startTime = normalizeDate(input.startTime);
    const endTime = normalizeDate(input.endTime);
    assertDateRange(startTime, endTime);

    await assertMatterCalendarAndActor(db, {
      tenantId: input.tenantId,
      matterId: input.matterId,
      calendarEventId: input.calendarEventId ?? null,
      actorId: input.createdById ?? null,
    });

    return db.courtHearing.create({
      data: {
        tenantId: input.tenantId,
        matterId: input.matterId,
        calendarEventId: input.calendarEventId ?? null,
        title: input.title.trim(),
        caseNumber: input.caseNumber?.trim() ?? null,
        courtName: input.courtName?.trim() ?? null,
        courtStation: input.courtStation?.trim() ?? null,
        courtroom: input.courtroom?.trim() ?? null,
        judge: input.judge?.trim() ?? null,
        hearingType: input.hearingType ?? 'OTHER',
        status: input.status ?? 'SCHEDULED',
        hearingDate,
        startTime,
        endTime,
        outcome: input.outcome?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
        createdById: input.createdById ?? null,
        metadata: input.metadata ?? {},
      },
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  static async getHearing(
    db: CourtDbClient,
    params: {
      tenantId: string;
      hearingId: string;
    },
  ) {
    assertTenant(params.tenantId);

    const hearing = await db.courtHearing.findFirst({
      where: {
        tenantId: params.tenantId,
        id: params.hearingId,
      },
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!hearing) {
      throw Object.assign(new Error('Court hearing not found'), {
        statusCode: 404,
        code: 'COURT_HEARING_NOT_FOUND',
      });
    }

    return hearing;
  }

  static async searchHearings(
    db: CourtDbClient,
    params: {
      tenantId: string;
      query?: string | null;
      filters?: CourtSearchFilters | null;
      page?: number;
      limit?: number;
    },
  ) {
    assertTenant(params.tenantId);

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const skip = (page - 1) * limit;

    const where = buildWhere({
      tenantId: params.tenantId,
      query: params.query,
      filters: params.filters,
    });

    const [data, total] = await Promise.all([
      db.courtHearing.findMany({
        where,
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
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ hearingDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.courtHearing.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query: params.query?.trim() ?? '',
      },
    };
  }

  static async updateHearing(db: CourtDbClient, input: CourtHearingUpdateInput) {
    assertTenant(input.tenantId);

    const existing = await db.courtHearing.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.hearingId,
      },
      select: {
        id: true,
        matterId: true,
        status: true,
      },
    });

    if (!existing) {
      throw Object.assign(new Error('Court hearing not found'), {
        statusCode: 404,
        code: 'COURT_HEARING_NOT_FOUND',
      });
    }

    if (input.status) {
      assertTransition(String(existing.status), input.status);
    }

    if (input.calendarEventId !== undefined) {
      await assertMatterCalendarAndActor(db, {
        tenantId: input.tenantId,
        matterId: existing.matterId,
        calendarEventId: input.calendarEventId ?? null,
        actorId: input.actorId,
      });
    }

    const startTime = input.startTime !== undefined ? normalizeDate(input.startTime) : undefined;
    const endTime = input.endTime !== undefined ? normalizeDate(input.endTime) : undefined;

    if (startTime !== undefined || endTime !== undefined) {
      assertDateRange(startTime ?? null, endTime ?? null);
    }

    const data: Record<string, unknown> = {};

    if (input.calendarEventId !== undefined) data.calendarEventId = input.calendarEventId ?? null;
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.caseNumber !== undefined) data.caseNumber = input.caseNumber?.trim() ?? null;
    if (input.courtName !== undefined) data.courtName = input.courtName?.trim() ?? null;
    if (input.courtStation !== undefined) data.courtStation = input.courtStation?.trim() ?? null;
    if (input.courtroom !== undefined) data.courtroom = input.courtroom?.trim() ?? null;
    if (input.judge !== undefined) data.judge = input.judge?.trim() ?? null;
    if (input.hearingType !== undefined) data.hearingType = input.hearingType;
    if (input.status !== undefined) data.status = input.status;
    if (input.hearingDate !== undefined) data.hearingDate = normalizeRequiredDate(input.hearingDate);
    if (input.startTime !== undefined) data.startTime = startTime;
    if (input.endTime !== undefined) data.endTime = endTime;
    if (input.outcome !== undefined) data.outcome = input.outcome?.trim() ?? null;
    if (input.notes !== undefined) data.notes = input.notes?.trim() ?? null;
    if (input.metadata !== undefined) data.metadata = input.metadata ?? {};

    return db.courtHearing.update({
      where: {
        id: input.hearingId,
      },
      data,
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  static async setStatus(
    db: CourtDbClient,
    params: {
      tenantId: string;
      hearingId: string;
      actorId: string;
      status: CourtHearingStatus;
      outcome?: string | null;
      notes?: string | null;
    },
  ) {
    return this.updateHearing(db, {
      tenantId: params.tenantId,
      hearingId: params.hearingId,
      actorId: params.actorId,
      status: params.status,
      outcome: params.outcome ?? undefined,
      notes: params.notes ?? undefined,
    });
  }

  static async recordOutcome(
    db: CourtDbClient,
    params: {
      tenantId: string;
      hearingId: string;
      actorId: string;
      outcome: string;
      notes?: string | null;
    },
  ) {
    return this.updateHearing(db, {
      tenantId: params.tenantId,
      hearingId: params.hearingId,
      actorId: params.actorId,
      outcome: params.outcome,
      notes: params.notes ?? undefined,
    });
  }
}

export default CourtHearingService;