// apps/api/src/modules/queues/queue.types.ts

export type ExternalJobProvider =
  | 'ETIMS'
  | 'BANKING'
  | 'GOAML'
  | 'NOTIFICATIONS'
  | 'OUTLOOK'
  | 'GOOGLE';

export type ExternalJobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'RETRYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'DEAD_LETTER';

export type QueueAuditAction =
  | 'JOB_CREATED'
  | 'JOB_ENQUEUED'
  | 'JOB_VIEWED'
  | 'JOB_SEARCHED'
  | 'JOB_PROCESSING'
  | 'JOB_COMPLETED'
  | 'JOB_FAILED'
  | 'JOB_RETRIED'
  | 'JOB_DEAD_LETTERED'
  | 'DASHBOARD_VIEWED'
  | 'REPORT_VIEWED'
  | 'CAPABILITY_VIEWED';

export type QueueCreateJobInput = {
  tenantId?: string | null;
  provider: ExternalJobProvider;
  jobType: string;
  entityType?: string | null;
  entityId?: string | null;
  payload: Record<string, unknown>;
  maxAttempts?: number | null;
};

export type QueueSearchFilters = {
  tenantId?: string | null;
  provider?: ExternalJobProvider | null;
  status?: ExternalJobStatus | null;
  jobType?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdFrom?: Date | string | null;
  createdTo?: Date | string | null;
  nextRetryFrom?: Date | string | null;
  nextRetryTo?: Date | string | null;
};

export type QueueMarkFailedInput = {
  tenantId?: string | null;
  jobId: string;
  error: string;
  retry?: boolean;
};

export type QueueDbClient = {
  tenant: {
    findFirst: Function;
  };
  externalJobQueue: {
    create: Function;
    update: Function;
    findFirst: Function;
    findMany: Function;
    count: Function;
    groupBy?: Function;
  };
  auditLog: {
    create: Function;
  };
};