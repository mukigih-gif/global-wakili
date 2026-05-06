// apps/api/src/modules/matter/court-hearing.service.ts

type QueryArgs = Record<string, unknown>;
type UnknownRecord = Record<string, unknown>;

type DelegateCreate = {
  create(args: QueryArgs): Promise<unknown>;
};

type DelegateUpdate = {
  update(args: QueryArgs): Promise<unknown>;
};

type DelegateFindFirst = {
  findFirst(args: QueryArgs): Promise<unknown>;
};

type DelegateFindMany = {
  findMany(args: QueryArgs): Promise<unknown[]>;
};

type MatterDelegate = DelegateFindFirst & {
  update?: (args: QueryArgs) => Promise<unknown>;
};

type UserDelegate = DelegateFindFirst;

type CourtHearingDelegate = DelegateCreate &
  DelegateUpdate &
  DelegateFindFirst &
  DelegateFindMany;

type CalendarEventDelegate = DelegateCreate & {
  update?: (args: QueryArgs) => Promise<unknown>;
};

export type MatterCourtDbClient = {
  matter: MatterDelegate;
  user: UserDelegate;
  courtHearing: CourtHearingDelegate;
  calendarEvent?: CalendarEventDelegate;
  $transaction?: <T>(
    callback: (tx: MatterCourtDbClient) => Promise<T>,
  ) => Promise<T>;
};

export type CourtHearingType =
  | 'MENTION'
  | 'DIRECTIONS'
  | 'HEARING'
  | 'JUDGMENT'
  | 'RULING'
  | 'TAXATION'
  | 'APPLICATION'
  | 'OTHER';

export type CourtHearingStatus =
  | 'SCHEDULED'
  | 'ADJOURNED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'MISSED';

export type CourtHearingInput = {
  tenantId: string;
  matterId: string;
  title?: string | null;
  caseNumber?: string | null;
  courtName?: string | null;
  courtStation?: string | null;
  courtroom?: string | null;
  judge?: string | null;
  hearingType?: CourtHearingType | string | null;
  status?: CourtHearingStatus | string | null;
  hearingDate: Date | string;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  outcome?: string | null;
  notes?: string | null;
  createdById?: string | null;
  metadata?: Record<string, unknown> | null;
  createCalendarEvent?: boolean;
  reminderOffsetMinutes?: number | null;
};

export type CourtHearingUpdateInput = Partial<
  Omit<CourtHearingInput, 'tenantId' | 'matterId'>
> & {
  matterId?: string | null;
};

function serviceError(message: string, statusCode: number, code: string): Error {
  return Object.assign(new Error(message), {
    statusCode,
    code,
  });
}

function requiredString(value: unknown, label: string, code: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw serviceError(`${label} is required`, 422, code);
  }

  return value.trim();
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (
    !trimmed ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null'
  ) {
    return null;
  }

  return trimmed;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function getString(record: UnknownRecord, key: string): string | null {
  return toNullableString(record[key]);
}

function getRecord(record: UnknownRecord, key: string): UnknownRecord | null {
  const value = record[key];
  return isRecord(value) ? value : null;
}

function getDateValue(record: UnknownRecord, key: string): Date | null {
  const value = record[key];

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function normalizeDate(
  value: Date | string | null | undefined,
  label: string,
): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw serviceError(
      `Invalid court hearing ${label}`,
      422,
      `INVALID_COURT_HEARING_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    );
  }

  return parsed;
}

function normalizeRequiredDate(value: Date | string, label: string): Date {
  const parsed = normalizeDate(value, label);

  if (!parsed) {
    throw serviceError(
      `Court hearing ${label} is required`,
      422,
      `COURT_HEARING_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_REQUIRED`,
    );
  }

  return parsed;
}

function assertTimeRange(startTime: Date | null, endTime: Date | null): void {
  if (startTime && endTime && startTime >= endTime) {
    throw serviceError(
      'Court hearing startTime must be before endTime',
      422,
      'INVALID_COURT_HEARING_TIME_RANGE',
    );
  }
}

function normalizeHearingType(value: unknown): CourtHearingType {
  const normalized = toNullableString(value)?.toUpperCase();

  const validTypes: CourtHearingType[] = [
    'MENTION',
    'DIRECTIONS',
    'HEARING',
    'JUDGMENT',
    'RULING',
    'TAXATION',
    'APPLICATION',
    'OTHER',
  ];

  return validTypes.includes(normalized as CourtHearingType)
    ? (normalized as CourtHearingType)
    : 'OTHER';
}

function normalizeHearingStatus(
  value: unknown,
  fallback: CourtHearingStatus = 'SCHEDULED',
): CourtHearingStatus {
  const normalized = toNullableString(value)?.toUpperCase();

  const validStatuses: CourtHearingStatus[] = [
    'SCHEDULED',
    'ADJOURNED',
    'COMPLETED',
    'CANCELLED',
    'MISSED',
  ];

  return validStatuses.includes(normalized as CourtHearingStatus)
    ? (normalized as CourtHearingStatus)
    : fallback;
}

function defaultEndTime(start: Date): Date {
  return new Date(start.getTime() + 60 * 60 * 1000);
}

function hearingInclude() {
  return {
    matter: {
      select: {
        id: true,
        title: true,
        category: true,
        clientId: true,
        leadAdvocateId: true,
        status: true,
        deletedAt: true,
        client: {
          select: {
            id: true,
            name: true,
            clientCode: true,
            email: true,
          },
        },
      },
    },
    calendarEvent: {
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        type: true,
        visibility: true,
        isPrivate: true,
      },
    },
    createdBy: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  };
}

function compactHearing(hearing: unknown) {
  if (!hearing) {
    return null;
  }

  const row = asRecord(hearing);

  return {
    id: row.id,
    tenantId: row.tenantId,
    matterId: row.matterId,
    calendarEventId: row.calendarEventId ?? null,
    title: row.title,
    caseNumber: row.caseNumber ?? null,
    courtName: row.courtName ?? null,
    courtStation: row.courtStation ?? null,
    courtroom: row.courtroom ?? null,
    judge: row.judge ?? null,
    hearingType: row.hearingType,
    status: row.status,
    hearingDate: row.hearingDate,
    startTime: row.startTime ?? null,
    endTime: row.endTime ?? null,
    outcome: row.outcome ?? null,
    notes: row.notes ?? null,
    createdById: row.createdById ?? null,
    metadata: row.metadata ?? null,
    matter: row.matter ?? null,
    calendarEvent: row.calendarEvent ?? null,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertTenantMatter(
  db: MatterCourtDbClient,
  params: { tenantId: string; matterId: string },
): Promise<UnknownRecord> {
  const matter = await db.matter.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.matterId,
      deletedAt: null,
    },
    select: {
      id: true,
      tenantId: true,
      title: true,
      category: true,
      clientId: true,
      leadAdvocateId: true,
      branchId: true,
      status: true,
      deletedAt: true,
      client: {
        select: {
          id: true,
          name: true,
          clientCode: true,
        },
      },
    },
  });

  if (!matter) {
    throw serviceError(
      'Matter not found for court hearing',
      404,
      'COURT_HEARING_MATTER_NOT_FOUND',
    );
  }

  return asRecord(matter);
}

async function assertTenantUser(
  db: MatterCourtDbClient,
  params: { tenantId: string; userId?: string | null },
): Promise<UnknownRecord | null> {
  const userId = toNullableString(params.userId);

  if (!userId) {
    return null;
  }

  const user = await db.user.findFirst({
    where: {
      tenantId: params.tenantId,
      id: userId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw serviceError(
      'Court hearing creator not found or inactive',
      404,
      'COURT_HEARING_CREATOR_NOT_FOUND',
    );
  }

  return asRecord(user);
}

async function getHearingOrThrow(
  db: MatterCourtDbClient,
  params: { tenantId: string; courtHearingId: string },
): Promise<UnknownRecord> {
  const hearing = await db.courtHearing.findFirst({
    where: {
      tenantId: params.tenantId,
      id: params.courtHearingId,
    },
    include: hearingInclude(),
  });

  if (!hearing) {
    throw serviceError('Court hearing not found', 404, 'COURT_HEARING_NOT_FOUND');
  }

  return asRecord(hearing);
}

async function runInTransaction<T>(
  db: MatterCourtDbClient,
  callback: (tx: MatterCourtDbClient) => Promise<T>,
): Promise<T> {
  if (typeof db.$transaction === 'function') {
    return db.$transaction(callback);
  }

  return callback(db);
}

async function maybeCreateCalendarEvent(
  db: MatterCourtDbClient,
  params: {
    tenantId: string;
    matterId: string;
    creatorId?: string | null;
    title: string;
    description?: string | null;
    startTime: Date;
    endTime: Date;
    hearingType: CourtHearingType;
    courtName?: string | null;
    courtStation?: string | null;
    courtroom?: string | null;
    createCalendarEvent?: boolean;
    reminderOffsetMinutes?: number | null;
  },
): Promise<UnknownRecord | null> {
  if (params.createCalendarEvent !== true) {
    return null;
  }

  if (!db.calendarEvent?.create) {
    throw serviceError(
      'Calendar event service is unavailable for court hearing creation',
      500,
      'COURT_HEARING_CALENDAR_SERVICE_UNAVAILABLE',
    );
  }

  const creatorId = toNullableString(params.creatorId);

  if (!creatorId) {
    throw serviceError(
      'createdById is required when creating a calendar event for a court hearing',
      422,
      'COURT_HEARING_CALENDAR_CREATOR_REQUIRED',
    );
  }

  const location = [
    toNullableString(params.courtName),
    toNullableString(params.courtStation),
    toNullableString(params.courtroom),
  ]
    .filter(Boolean)
    .join(' - ');

  const reminderOffsetMinutes =
    typeof params.reminderOffsetMinutes === 'number' &&
    Number.isInteger(params.reminderOffsetMinutes) &&
    params.reminderOffsetMinutes >= 0
      ? params.reminderOffsetMinutes
      : null;

  const remindAt =
    reminderOffsetMinutes !== null
      ? new Date(params.startTime.getTime() - reminderOffsetMinutes * 60 * 1000)
      : null;

  const created = await db.calendarEvent.create({
    data: {
      tenantId: params.tenantId,
      matterId: params.matterId,
      creatorId,
      title: params.title,
      description: (params.description ?? location) || null,
      startTime: params.startTime,
      endTime: params.endTime,
      type: 'COURT',
      visibility: 'PRIVATE',
      isPrivate: true,
      ...(remindAt
        ? {
            reminders: {
              create: [
                {
                  tenantId: params.tenantId,
                  recipientId: creatorId,
                  createdById: creatorId,
                  channel: 'IN_APP',
                  status: 'SCHEDULED',
                  remindAt,
                  offsetMinutes: reminderOffsetMinutes,
                  title: `Court reminder: ${params.title}`,
                  message: params.description ?? null,
                  metadata: {
                    source: 'court-hearing',
                    hearingType: params.hearingType,
                  },
                },
              ],
            },
          }
        : {}),
    },
    select: { id: true },
  });

  return asRecord(created);
}

function buildHearingTitle(params: {
  title?: string | null;
  hearingType: CourtHearingType;
  matterTitle: string;
  caseNumber?: string | null;
}): string {
  const explicit = toNullableString(params.title);

  if (explicit) {
    return explicit;
  }

  const caseNumber = toNullableString(params.caseNumber);

  return caseNumber
    ? `${params.hearingType} - ${params.matterTitle} (${caseNumber})`
    : `${params.hearingType} - ${params.matterTitle}`;
}

export class CourtHearingService {
  static async create(db: MatterCourtDbClient, input: CourtHearingInput) {
    const tenantId = requiredString(
      input.tenantId,
      'Tenant ID',
      'COURT_HEARING_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      input.matterId,
      'Matter ID',
      'COURT_HEARING_MATTER_REQUIRED',
    );

    const hearingDate = normalizeRequiredDate(input.hearingDate, 'hearing date');
    const startTime = normalizeDate(input.startTime, 'start time') ?? hearingDate;
    const endTime =
      normalizeDate(input.endTime, 'end time') ?? defaultEndTime(startTime);

    assertTimeRange(startTime, endTime);

    const hearingType = normalizeHearingType(input.hearingType);
    const status = normalizeHearingStatus(input.status, 'SCHEDULED');

    const matter = await assertTenantMatter(db, { tenantId, matterId });
    const matterTitle = requiredString(
      getString(matter, 'title'),
      'Matter title',
      'COURT_HEARING_MATTER_TITLE_REQUIRED',
    );
    const creatorId =
      toNullableString(input.createdById) ??
      getString(matter, 'leadAdvocateId') ??
      null;

    await assertTenantUser(db, { tenantId, userId: creatorId });

    const title = buildHearingTitle({
      title: input.title,
      hearingType,
      matterTitle,
      caseNumber: input.caseNumber,
    });

    return runInTransaction(db, async (tx) => {
      const calendarEvent = await maybeCreateCalendarEvent(tx, {
        tenantId,
        matterId,
        creatorId,
        title,
        description: input.notes ?? null,
        startTime,
        endTime,
        hearingType,
        courtName: input.courtName,
        courtStation: input.courtStation,
        courtroom: input.courtroom,
        createCalendarEvent: input.createCalendarEvent,
        reminderOffsetMinutes: input.reminderOffsetMinutes ?? null,
      });

      const created = await tx.courtHearing.create({
        data: {
          tenantId,
          matterId,
          calendarEventId: getString(calendarEvent ?? {}, 'id'),
          title,
          caseNumber: toNullableString(input.caseNumber),
          courtName: toNullableString(input.courtName),
          courtStation: toNullableString(input.courtStation),
          courtroom: toNullableString(input.courtroom),
          judge: toNullableString(input.judge),
          hearingType,
          status,
          hearingDate,
          startTime,
          endTime,
          outcome: toNullableString(input.outcome),
          notes: toNullableString(input.notes),
          createdById: creatorId,
          metadata: {
            ...asRecord(input.metadata),
            source: 'matter-court-hearing-service',
          },
        },
        include: hearingInclude(),
      });

      return compactHearing(created);
    });
  }

  static async update(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      courtHearingId: string;
      input: CourtHearingUpdateInput;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'COURT_HEARING_TENANT_REQUIRED',
    );
    const courtHearingId = requiredString(
      params.courtHearingId,
      'Court hearing ID',
      'COURT_HEARING_ID_REQUIRED',
    );

    const existing = await getHearingOrThrow(db, { tenantId, courtHearingId });

    const existingMatterId = requiredString(
      getString(existing, 'matterId'),
      'Existing court hearing matter ID',
      'COURT_HEARING_MATTER_REQUIRED',
    );
    const matterId = toNullableString(params.input.matterId) ?? existingMatterId;
    const matter = await assertTenantMatter(db, { tenantId, matterId });
    const matterTitle = requiredString(
      getString(matter, 'title'),
      'Matter title',
      'COURT_HEARING_MATTER_TITLE_REQUIRED',
    );

    const hearingType =
      params.input.hearingType !== undefined
        ? normalizeHearingType(params.input.hearingType)
        : normalizeHearingType(getString(existing, 'hearingType'));

    const existingHearingDate =
      getDateValue(existing, 'hearingDate') ??
      normalizeRequiredDate(new Date().toISOString(), 'hearing date');

    const hearingDate =
      params.input.hearingDate !== undefined && params.input.hearingDate !== null
        ? normalizeRequiredDate(params.input.hearingDate, 'hearing date')
        : existingHearingDate;

    const existingStartTime = getDateValue(existing, 'startTime');
    const existingEndTime = getDateValue(existing, 'endTime');

    const startTime =
      params.input.startTime !== undefined
        ? normalizeDate(params.input.startTime, 'start time') ?? hearingDate
        : existingStartTime ?? hearingDate;

    const endTime =
      params.input.endTime !== undefined
        ? normalizeDate(params.input.endTime, 'end time') ?? defaultEndTime(startTime)
        : existingEndTime ?? defaultEndTime(startTime);

    assertTimeRange(startTime, endTime);

    const title =
      params.input.title !== undefined ||
      params.input.hearingType !== undefined ||
      params.input.caseNumber !== undefined ||
      params.input.matterId !== undefined
        ? buildHearingTitle({
            title: params.input.title ?? getString(existing, 'title'),
            hearingType,
            matterTitle,
            caseNumber:
              params.input.caseNumber ?? getString(existing, 'caseNumber'),
          })
        : requiredString(
            getString(existing, 'title'),
            'Court hearing title',
            'COURT_HEARING_TITLE_REQUIRED',
          );

    const updated = await db.courtHearing.update({
      where: { id: courtHearingId },
      data: {
        matterId,
        title,
        ...(params.input.caseNumber !== undefined
          ? { caseNumber: toNullableString(params.input.caseNumber) }
          : {}),
        ...(params.input.courtName !== undefined
          ? { courtName: toNullableString(params.input.courtName) }
          : {}),
        ...(params.input.courtStation !== undefined
          ? { courtStation: toNullableString(params.input.courtStation) }
          : {}),
        ...(params.input.courtroom !== undefined
          ? { courtroom: toNullableString(params.input.courtroom) }
          : {}),
        ...(params.input.judge !== undefined
          ? { judge: toNullableString(params.input.judge) }
          : {}),
        hearingType,
        ...(params.input.status !== undefined
          ? { status: normalizeHearingStatus(params.input.status) }
          : {}),
        hearingDate,
        startTime,
        endTime,
        ...(params.input.outcome !== undefined
          ? { outcome: toNullableString(params.input.outcome) }
          : {}),
        ...(params.input.notes !== undefined
          ? { notes: toNullableString(params.input.notes) }
          : {}),
        ...(params.input.metadata !== undefined
          ? {
              metadata: {
                ...asRecord(existing.metadata),
                ...asRecord(params.input.metadata),
                updatedBy: 'matter-court-hearing-service',
                updatedAt: new Date().toISOString(),
              },
            }
          : {}),
      },
      include: hearingInclude(),
    });

    const updatedRecord = asRecord(updated);
    const calendarEventId = getString(updatedRecord, 'calendarEventId');

    if (calendarEventId && db.calendarEvent?.update) {
      const updatedStartTime = getDateValue(updatedRecord, 'startTime') ?? hearingDate;
      const updatedEndTime =
        getDateValue(updatedRecord, 'endTime') ?? defaultEndTime(updatedStartTime);

      await db.calendarEvent.update({
        where: { id: calendarEventId },
        data: {
          title: getString(updatedRecord, 'title') ?? title,
          description: getString(updatedRecord, 'notes'),
          matterId: getString(updatedRecord, 'matterId') ?? matterId,
          startTime: updatedStartTime,
          endTime: updatedEndTime,
        },
      });
    }

    return compactHearing(updated);
  }

  static async markOutcome(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      courtHearingId: string;
      outcome: string;
      notes?: string | null;
      nextActionDate?: Date | string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'COURT_HEARING_TENANT_REQUIRED',
    );
    const courtHearingId = requiredString(
      params.courtHearingId,
      'Court hearing ID',
      'COURT_HEARING_ID_REQUIRED',
    );
    const outcome = requiredString(
      params.outcome,
      'Court hearing outcome',
      'COURT_HEARING_OUTCOME_REQUIRED',
    );

    const existing = await getHearingOrThrow(db, { tenantId, courtHearingId });
    const nextActionDate = normalizeDate(params.nextActionDate, 'next action date');

    const updated = await db.courtHearing.update({
      where: { id: courtHearingId },
      data: {
        status: 'COMPLETED',
        outcome,
        notes: toNullableString(params.notes) ?? getString(existing, 'notes'),
        metadata: {
          ...asRecord(existing.metadata),
          ...asRecord(params.metadata),
          nextActionDate: nextActionDate?.toISOString() ?? null,
          outcomeRecordedAt: new Date().toISOString(),
        },
      },
      include: hearingInclude(),
    });

    return compactHearing(updated);
  }

  static async cancel(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      courtHearingId: string;
      reason?: string | null;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'COURT_HEARING_TENANT_REQUIRED',
    );
    const courtHearingId = requiredString(
      params.courtHearingId,
      'Court hearing ID',
      'COURT_HEARING_ID_REQUIRED',
    );

    const existing = await getHearingOrThrow(db, { tenantId, courtHearingId });

    const updated = await db.courtHearing.update({
      where: { id: courtHearingId },
      data: {
        status: 'CANCELLED',
        metadata: {
          ...asRecord(existing.metadata),
          cancelledAt: new Date().toISOString(),
          cancelReason: toNullableString(params.reason),
        },
      },
      include: hearingInclude(),
    });

    return compactHearing(updated);
  }

  static async adjourn(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      courtHearingId: string;
      reason?: string | null;
      nextDate?: Date | string | null;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'COURT_HEARING_TENANT_REQUIRED',
    );
    const courtHearingId = requiredString(
      params.courtHearingId,
      'Court hearing ID',
      'COURT_HEARING_ID_REQUIRED',
    );

    const existing = await getHearingOrThrow(db, { tenantId, courtHearingId });
    const nextDate = normalizeDate(params.nextDate, 'next date');

    const updated = await db.courtHearing.update({
      where: { id: courtHearingId },
      data: {
        status: 'ADJOURNED',
        metadata: {
          ...asRecord(existing.metadata),
          adjournedAt: new Date().toISOString(),
          adjournmentReason: toNullableString(params.reason),
          nextDate: nextDate?.toISOString() ?? null,
        },
      },
      include: hearingInclude(),
    });

    return compactHearing(updated);
  }

  static async getById(
    db: MatterCourtDbClient,
    params: { tenantId: string; courtHearingId: string },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'COURT_HEARING_TENANT_REQUIRED',
    );
    const courtHearingId = requiredString(
      params.courtHearingId,
      'Court hearing ID',
      'COURT_HEARING_ID_REQUIRED',
    );

    return compactHearing(await getHearingOrThrow(db, { tenantId, courtHearingId }));
  }

  static async listMatterHearings(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      matterId: string;
      status?: string | null;
      from?: Date | string | null;
      to?: Date | string | null;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'COURT_HEARING_TENANT_REQUIRED',
    );
    const matterId = requiredString(
      params.matterId,
      'Matter ID',
      'COURT_HEARING_MATTER_REQUIRED',
    );

    await assertTenantMatter(db, { tenantId, matterId });

    const from = normalizeDate(params.from, 'from');
    const to = normalizeDate(params.to, 'to');

    const rows = await db.courtHearing.findMany({
      where: {
        tenantId,
        matterId,
        ...(params.status ? { status: normalizeHearingStatus(params.status) } : {}),
        ...(from || to
          ? {
              hearingDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: hearingInclude(),
      orderBy: [{ hearingDate: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
    });

    return rows.map(compactHearing);
  }

  static async upcoming(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      from?: Date | string | null;
      to?: Date | string | null;
      matterId?: string | null;
      limit?: number;
    },
  ) {
    const tenantId = requiredString(
      params.tenantId,
      'Tenant ID',
      'COURT_HEARING_TENANT_REQUIRED',
    );
    const from = normalizeDate(params.from, 'from') ?? new Date();
    const to =
      normalizeDate(params.to, 'to') ??
      new Date(from.getTime() + 1000 * 60 * 60 * 24 * 30);
    const matterId = toNullableString(params.matterId);
    const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), 100);

    const rows = await db.courtHearing.findMany({
      where: {
        tenantId,
        ...(matterId ? { matterId } : {}),
        status: {
          in: ['SCHEDULED', 'ADJOURNED'],
        },
        hearingDate: {
          gte: from,
          lte: to,
        },
      },
      include: hearingInclude(),
      orderBy: [{ hearingDate: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      take: limit,
    });

    return rows.map(compactHearing);
  }
}

export default CourtHearingService;