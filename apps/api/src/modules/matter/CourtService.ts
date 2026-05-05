// apps/api/src/modules/matter/CourtService.ts

import CourtHearingService, {
  type CourtHearingUpdateInput,
  type MatterCourtDbClient,
} from './court-hearing.service';

export type CourtHearingUpdateBridgeInput = {
  matterId?: string | null;
  title?: string | null;
  caseNumber?: string | null;
  courtName?: string | null;
  courtStation?: string | null;
  courtroom?: string | null;
  judge?: string | null;
  hearingType?: string | null;
  status?: string | null;
  hearingDate?: Date | string | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  outcome?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

function removeUndefinedFields<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as Partial<T>;
}

function normalizeUpdateInput(
  input: CourtHearingUpdateBridgeInput,
): CourtHearingUpdateInput {
  return removeUndefinedFields({
    matterId: input.matterId,
    title: input.title,
    caseNumber: input.caseNumber,
    courtName: input.courtName,
    courtStation: input.courtStation,
    courtroom: input.courtroom,
    judge: input.judge,
    hearingType: input.hearingType,
    status: input.status,
    hearingDate: input.hearingDate === null ? undefined : input.hearingDate,
    startTime: input.startTime,
    endTime: input.endTime,
    outcome: input.outcome,
    notes: input.notes,
    metadata: input.metadata,
  }) as CourtHearingUpdateInput;
}

export class CourtService {
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
    return CourtHearingService.listMatterHearings(db, params);
  }

  static async createCourtHearing(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      matterId: string;
      title?: string | null;
      caseNumber?: string | null;
      courtName?: string | null;
      courtStation?: string | null;
      courtroom?: string | null;
      judge?: string | null;
      hearingType?: string | null;
      hearingDate: Date | string;
      startTime?: Date | string | null;
      endTime?: Date | string | null;
      location?: string | null;
      notes?: string | null;
      createdById?: string | null;
      createCalendarEvent?: boolean;
      reminderOffsetMinutes?: number | null;
    },
  ) {
    return CourtHearingService.create(db, {
      tenantId: params.tenantId,
      matterId: params.matterId,
      title: params.title ?? null,
      caseNumber: params.caseNumber ?? null,
      courtName: params.courtName ?? params.location ?? null,
      courtStation: params.courtStation ?? null,
      courtroom: params.courtroom ?? null,
      judge: params.judge ?? null,
      hearingType: params.hearingType ?? null,
      hearingDate: params.hearingDate,
      startTime: params.startTime ?? null,
      endTime: params.endTime ?? null,
      notes: params.notes ?? null,
      createdById: params.createdById ?? null,
      createCalendarEvent: params.createCalendarEvent ?? false,
      reminderOffsetMinutes: params.reminderOffsetMinutes ?? null,
    });
  }

  static async updateCourtHearing(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      courtHearingId: string;
      input: CourtHearingUpdateBridgeInput;
    },
  ) {
    return CourtHearingService.update(db, {
      tenantId: params.tenantId,
      courtHearingId: params.courtHearingId,
      input: normalizeUpdateInput(params.input),
    });
  }

  static async markOutcome(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      courtHearingId: string;
      outcome: string;
      nextActionDate?: Date | string | null;
      notes?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return CourtHearingService.markOutcome(db, params);
  }

  static async cancelCourtHearing(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      courtHearingId: string;
      reason?: string | null;
    },
  ) {
    return CourtHearingService.cancel(db, params);
  }

  static async adjournCourtHearing(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      courtHearingId: string;
      reason?: string | null;
      nextDate?: Date | string | null;
    },
  ) {
    return CourtHearingService.adjourn(db, params);
  }

  static async getCourtHearingById(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      courtHearingId: string;
    },
  ) {
    return CourtHearingService.getById(db, params);
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
    return CourtHearingService.upcoming(db, params);
  }

  static async getMatterCourtCalendar(
    db: MatterCourtDbClient,
    params: {
      tenantId: string;
      matterId: string;
      from?: Date | string | null;
      to?: Date | string | null;
    },
  ) {
    return CourtHearingService.listMatterHearings(db, params);
  }
}

export default CourtService;