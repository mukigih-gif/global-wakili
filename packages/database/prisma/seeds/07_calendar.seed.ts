import {
  CalendarEventType,
  CourtHearingStatus,
  CourtHearingType,
  EventVisibility,
  PrismaClient,
  TenantRole,
} from '@prisma/client';

/*
 * 07_calendar.seed.ts — Per-tenant calendar + court-hearing layer (CLAUDE.md §12).
 *
 * Seeds CalendarEvents (court dates / deadlines / meetings / firm-wide) and
 * CourtHearings linked to the seeded litigation/probate/JR matters. Each hearing
 * also gets a COURT_DATE CalendarEvent and is linked to it via calendarEventId.
 * Dates are a deliberate past/future mix around the seed epoch (2026-06-28).
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Schema reality (verified):
 * - CalendarEvent req: tenantId, title, startTime, endTime, creatorId.
 *   type CalendarEventType; visibility EventVisibility; matterId optional;
 *   attendees m2m (EventAttendees).
 * - CourtHearing req: tenantId, matterId, title, hearingDate. Optional:
 *   calendarEventId, caseNumber, courtName, courtStation, judge, startTime,
 *   endTime, outcome, notes, createdById. hearingType CourtHearingType;
 *   status CourtHearingStatus.
 *
 * Policy:
 * - Idempotent: neither model is @@unique. CalendarEvent → findFirst
 *   (tenantId, creatorId, title, startTime); CourtHearing → findFirst
 *   (tenantId, matterId, title, hearingDate). Deterministic → reruns converge.
 * - Matter-linked rows resolve matterId by matterCode within the tenant; a
 *   missing matter skips that row (defensive — 06_matters must run first).
 * - Tenant-scoped. No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type HearingSeed = {
  matterCode: string;
  title: string;
  hearingType: CourtHearingType;
  status: CourtHearingStatus;
  courtName: string;
  courtStation: string;
  judge: string;
  caseNumber: string;
  startTime: string; // ISO, deterministic
  durationMinutes: number;
  outcome?: string; // for COMPLETED hearings
  notes?: string;
};

type EventSeed = {
  matterCode?: string;
  title: string;
  type: CalendarEventType;
  visibility: EventVisibility;
  startTime: string; // ISO
  durationMinutes: number;
  description: string;
};

export type CalendarSeedResult = {
  status: 'calendar_seed_complete';
  tenantId: string;
  calendarEvents: number;
  courtHearings: number;
};

/* Court hearings (each also produces a linked COURT_DATE calendar event).
 * Past = COMPLETED, future = SCHEDULED. Courts: Milimani Commercial, Mombasa
 * High Court, Milimani Judicial Review. */
const HEARING_SEEDS: HearingSeed[] = [
  {
    matterCode: 'MAT-0002',
    title: 'Mention — Acme v Coastline (HCCC E045 of 2026)',
    hearingType: CourtHearingType.MENTION,
    status: CourtHearingStatus.COMPLETED,
    courtName: 'High Court Commercial & Tax Division',
    courtStation: 'Milimani Law Courts, Nairobi',
    judge: 'Hon. Lady Justice M. Otieno',
    caseNumber: 'HCCC E045 of 2026',
    startTime: '2026-05-14T09:00:00.000Z',
    durationMinutes: 60,
    outcome: 'Defence directed within 14 days; mention for compliance.',
    notes: 'Both parties present.',
  },
  {
    matterCode: 'MAT-0002',
    title: 'Hearing — Acme v Coastline (HCCC E045 of 2026)',
    hearingType: CourtHearingType.HEARING,
    status: CourtHearingStatus.SCHEDULED,
    courtName: 'High Court Commercial & Tax Division',
    courtStation: 'Milimani Law Courts, Nairobi',
    judge: 'Hon. Lady Justice M. Otieno',
    caseNumber: 'HCCC E045 of 2026',
    startTime: '2026-07-09T09:00:00.000Z',
    durationMinutes: 120,
    notes: 'Line up two witnesses; prepare bundle.',
  },
  {
    matterCode: 'MAT-0005',
    title: 'Directions — Estate of Joseph Mwangi (P&A E210)',
    hearingType: CourtHearingType.DIRECTIONS,
    status: CourtHearingStatus.COMPLETED,
    courtName: 'High Court Family Division',
    courtStation: 'Mombasa Law Courts',
    judge: 'Hon. Justice S. Chitembwe',
    caseNumber: 'P&A E210 of 2026',
    startTime: '2026-06-10T10:00:00.000Z',
    durationMinutes: 45,
    outcome: 'Petition admitted; hearing date taken.',
  },
  {
    matterCode: 'MAT-0005',
    title: 'Hearing — Estate of Joseph Mwangi (P&A E210)',
    hearingType: CourtHearingType.HEARING,
    status: CourtHearingStatus.SCHEDULED,
    courtName: 'High Court Family Division',
    courtStation: 'Mombasa Law Courts',
    judge: 'Hon. Justice S. Chitembwe',
    caseNumber: 'P&A E210 of 2026',
    startTime: '2026-07-15T10:30:00.000Z',
    durationMinutes: 90,
  },
  {
    matterCode: 'MAT-0007',
    title: 'Hearing — County of Nairobi JR (JR E012 of 2026)',
    hearingType: CourtHearingType.HEARING,
    status: CourtHearingStatus.SCHEDULED,
    courtName: 'High Court Judicial Review Division',
    courtStation: 'Milimani Law Courts, Nairobi',
    judge: 'Hon. Justice J. Mwita',
    caseNumber: 'JR E012 of 2026',
    startTime: '2026-07-21T09:00:00.000Z',
    durationMinutes: 120,
  },
];

/* Standalone calendar events (no hearing). */
const EVENT_SEEDS: EventSeed[] = [
  {
    matterCode: 'MAT-0001',
    title: 'Due diligence kickoff — Acme / Tarama Logistics',
    type: CalendarEventType.MEETING,
    visibility: EventVisibility.PRIVATE,
    startTime: '2026-07-06T14:00:00.000Z',
    durationMinutes: 60,
    description: 'Internal kickoff for the acquisition due diligence.',
  },
  {
    matterCode: 'MAT-0002',
    title: 'Filing deadline — Statement of Defence (HCCC E045)',
    type: CalendarEventType.STATUTORY_DEADLINE,
    visibility: EventVisibility.TEAM_ONLY,
    startTime: '2026-05-28T17:00:00.000Z',
    durationMinutes: 30,
    description: 'Last day to file and serve the statement of defence.',
  },
  {
    title: "Weekly partners' meeting",
    type: CalendarEventType.GENERAL,
    visibility: EventVisibility.TEAM_ONLY,
    startTime: '2026-07-06T08:00:00.000Z',
    durationMinutes: 60,
    description: 'Standing weekly partners and practice-leads meeting.',
  },
];

type CalendarContext = {
  tenantId: string;
  creatorId: string;
  attendeeIds: string[];
};

async function resolveMatterId(
  prisma: SeedPrisma,
  tenantId: string,
  matterCode: string,
): Promise<string | null> {
  const matter = await prisma.matter.findFirst({
    where: { tenantId, matterCode },
    select: { id: true },
  });

  return matter?.id ?? null;
}

async function upsertCalendarEvent(
  prisma: SeedPrisma,
  ctx: CalendarContext,
  input: {
    title: string;
    type: CalendarEventType;
    visibility: EventVisibility;
    startTime: Date;
    durationMinutes: number;
    description: string;
    matterId: string | null;
  },
): Promise<string> {
  const endTime = new Date(input.startTime.getTime() + input.durationMinutes * 60_000);

  const data = {
    description: input.description,
    startTime: input.startTime,
    endTime,
    matterId: input.matterId,
    type: input.type,
    visibility: input.visibility,
  };

  const existing = await prisma.calendarEvent.findFirst({
    where: {
      tenantId: ctx.tenantId,
      creatorId: ctx.creatorId,
      title: input.title,
      startTime: input.startTime,
    },
    select: { id: true },
  });

  const record = existing
    ? await prisma.calendarEvent.update({
        where: { id: existing.id },
        data: { ...data, attendees: { set: ctx.attendeeIds.map((id) => ({ id })) } },
        select: { id: true },
      })
    : await prisma.calendarEvent.create({
        data: {
          tenantId: ctx.tenantId,
          creatorId: ctx.creatorId,
          title: input.title,
          ...data,
          attendees: { connect: ctx.attendeeIds.map((id) => ({ id })) },
        },
        select: { id: true },
      });

  return record.id;
}

async function upsertCourtHearing(
  prisma: SeedPrisma,
  ctx: CalendarContext,
  def: HearingSeed,
  matterId: string,
  calendarEventId: string,
): Promise<void> {
  const hearingDate = new Date(def.startTime);
  const endTime = new Date(hearingDate.getTime() + def.durationMinutes * 60_000);

  const data = {
    calendarEventId,
    caseNumber: def.caseNumber,
    courtName: def.courtName,
    courtStation: def.courtStation,
    judge: def.judge,
    hearingType: def.hearingType,
    status: def.status,
    hearingDate,
    startTime: hearingDate,
    endTime,
    outcome: def.outcome ?? null,
    notes: def.notes ?? null,
    createdById: ctx.creatorId,
  };

  const existing = await prisma.courtHearing.findFirst({
    where: { tenantId: ctx.tenantId, matterId, title: def.title, hearingDate },
    select: { id: true },
  });

  if (existing) {
    await prisma.courtHearing.update({ where: { id: existing.id }, data });
    return;
  }

  await prisma.courtHearing.create({
    data: { tenantId: ctx.tenantId, matterId, title: def.title, ...data },
  });
}

export async function seedCalendar(
  prisma: PrismaClient,
  tenantId: string,
): Promise<CalendarSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedCalendar requires a tenantId.');
  }

  const creator =
    (await prisma.user.findFirst({
      where: { tenantId, tenantRole: TenantRole.ADVOCATE },
      select: { id: true },
    })) ??
    (await prisma.user.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true },
    }));

  if (!creator) {
    throw new Error(`seedCalendar: no user for tenant ${tenantId}. Run 02_users first.`);
  }

  const associate = await prisma.user.findFirst({
    where: { tenantId, tenantRole: TenantRole.ASSOCIATE },
    select: { id: true },
  });

  const attendeeIds = Array.from(
    new Set([creator.id, ...(associate ? [associate.id] : [])]),
  );

  const ctx: CalendarContext = { tenantId, creatorId: creator.id, attendeeIds };

  let calendarEvents = 0;
  let courtHearings = 0;

  // Hearings (+ their linked COURT_DATE calendar events).
  for (const def of HEARING_SEEDS) {
    const matterId = await resolveMatterId(prisma, tenantId, def.matterCode);
    if (!matterId) {
      continue;
    }

    const eventId = await upsertCalendarEvent(prisma, ctx, {
      title: def.title,
      type: CalendarEventType.COURT_DATE,
      visibility: EventVisibility.TEAM_ONLY,
      startTime: new Date(def.startTime),
      durationMinutes: def.durationMinutes,
      description: `${def.courtName} — ${def.courtStation}. ${def.judge}.`,
      matterId,
    });
    calendarEvents += 1;

    await upsertCourtHearing(prisma, ctx, def, matterId, eventId);
    courtHearings += 1;
  }

  // Standalone calendar events.
  for (const def of EVENT_SEEDS) {
    let matterId: string | null = null;
    if (def.matterCode) {
      matterId = await resolveMatterId(prisma, tenantId, def.matterCode);
      if (!matterId) {
        continue;
      }
    }

    await upsertCalendarEvent(prisma, ctx, {
      title: def.title,
      type: def.type,
      visibility: def.visibility,
      startTime: new Date(def.startTime),
      durationMinutes: def.durationMinutes,
      description: def.description,
      matterId,
    });
    calendarEvents += 1;
  }

  return { status: 'calendar_seed_complete', tenantId, calendarEvents, courtHearings };
}
