// apps/api/src/modules/reception/reception.types.ts

export type ReceptionLogType = 'VISITOR' | 'CALL_LOG';

export type ReceptionAuditAction =
  | 'VISITOR_LOGGED'
  | 'CALL_LOGGED'
  | 'FILE_RECEIPT_LOGGED'
  | 'VIEWED'
  | 'SEARCHED'
  | 'DASHBOARD_VIEWED'
  | 'CAPABILITY_VIEWED'
  | 'CLIENT_ONBOARDING_HANDOFF_REQUESTED'
  | 'MATTER_OPENING_HANDOFF_REQUESTED'
  | 'TASK_HANDOFF_REQUESTED'
  | 'DOCUMENT_HANDOFF_REQUESTED'
  | 'NOTIFICATION_REQUESTED';

export type ReceptionCreateInput = {
  tenantId: string;
  type: ReceptionLogType;
  subject: string;
  description?: string | null;
  timestamp?: Date | string | null;
  receivedById: string;
  matterId?: string | null;
  isUrgent?: boolean;
  deliveryMethod?: string | null;
  trackingNumber?: string | null;
  digitalCopyUrl?: string | null;
  personMeeting?: string | null;
  durationMinutes?: number | null;
  isPlanned?: boolean;
};

export type ReceptionSearchFilters = {
  type?: ReceptionLogType | null;
  matterId?: string | null;
  receivedById?: string | null;
  isUrgent?: boolean | null;
  isPlanned?: boolean | null;
  timestampFrom?: Date | string | null;
  timestampTo?: Date | string | null;
};

export type ReceptionDbClient = {
  receptionLog: {
    create: Function;
    findFirst: Function;
    findMany: Function;
    count: Function;
    groupBy?: Function;
  };
  matter: {
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