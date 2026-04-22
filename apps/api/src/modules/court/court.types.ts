// apps/api/src/modules/court/court.types.ts

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

export type CourtAuditAction =
  | 'HEARING_CREATED'
  | 'HEARING_VIEWED'
  | 'HEARING_SEARCHED'
  | 'HEARING_UPDATED'
  | 'HEARING_STATUS_CHANGED'
  | 'HEARING_ADJOURNED'
  | 'HEARING_COMPLETED'
  | 'HEARING_CANCELLED'
  | 'HEARING_MISSED'
  | 'CALENDAR_LINKED'
  | 'OUTCOME_RECORDED'
  | 'DASHBOARD_VIEWED'
  | 'CAPABILITY_VIEWED'
  | 'FILING_REQUESTED'
  | 'PLEADING_REQUESTED'
  | 'DOCUMENT_HANDOFF_REQUESTED'
  | 'TASK_HANDOFF_REQUESTED'
  | 'NOTIFICATION_REQUESTED';

export type CourtHearingCreateInput = {
  tenantId: string;
  matterId: string;
  calendarEventId?: string | null;
  title: string;
  caseNumber?: string | null;
  courtName?: string | null;
  courtStation?: string | null;
  courtroom?: string | null;
  judge?: string | null;
  hearingType?: CourtHearingType;
  status?: CourtHearingStatus;
  hearingDate: Date | string;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  outcome?: string | null;
  notes?: string | null;
  createdById?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CourtHearingUpdateInput = {
  tenantId: string;
  hearingId: string;
  actorId: string;
  calendarEventId?: string | null;
  title?: string;
  caseNumber?: string | null;
  courtName?: string | null;
  courtStation?: string | null;
  courtroom?: string | null;
  judge?: string | null;
  hearingType?: CourtHearingType;
  status?: CourtHearingStatus;
  hearingDate?: Date | string;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  outcome?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CourtSearchFilters = {
  matterId?: string | null;
  calendarEventId?: string | null;
  caseNumber?: string | null;
  courtName?: string | null;
  courtStation?: string | null;
  judge?: string | null;
  hearingType?: CourtHearingType | null;
  status?: CourtHearingStatus | null;
  hearingFrom?: Date | string | null;
  hearingTo?: Date | string | null;
  upcomingOnly?: boolean | null;
  overdueOnly?: boolean | null;
};

export type CourtDbClient = {
  courtHearing: {
    create: Function;
    update: Function;
    findFirst: Function;
    findMany: Function;
    count: Function;
    groupBy?: Function;
  };
  matter: {
    findFirst: Function;
  };
  calendarEvent: {
    findFirst: Function;
  };
  user: {
    findFirst: Function;
    findMany?: Function;
  };
  auditLog: {
    create: Function;
    findMany?: Function;
  };
};