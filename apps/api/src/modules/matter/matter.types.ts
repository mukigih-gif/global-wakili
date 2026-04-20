import type { Prisma } from '@global-wakili/database';

export type DecimalLike = Prisma.Decimal | string | number;

export type MatterStatus =
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CLOSED'
  | 'ARCHIVED';

export type BillingModel =
  | 'HOURLY'
  | 'FIXED_FEE'
  | 'CONTINGENCY'
  | 'CAPPED_FEE';

export type MatterProgressStage =
  | 'INTAKE'
  | 'OPENED'
  | 'IN_PROGRESS'
  | 'AWAITING_CLIENT'
  | 'AWAITING_COURT'
  | 'BILLING'
  | 'COMPLETED'
  | 'CLOSED';

export type MatterValidationIssueCode =
  | 'MISSING_CLIENT'
  | 'INVALID_BRANCH'
  | 'INVALID_PARTNER'
  | 'INVALID_ASSIGNEE'
  | 'DUPLICATE_MATTER_CODE'
  | 'INVALID_DATES'
  | 'TENANT_BRANCH_CONFLICT'
  | 'CLIENT_BRANCH_CONFLICT'
  | 'POLICY_VIOLATION';

export type MatterValidationIssue = {
  code: MatterValidationIssueCode;
  message: string;
  meta?: Record<string, unknown>;
};

export type MatterValidationResult = {
  valid: boolean;
  issues: MatterValidationIssue[];
};

export type MatterBillingConfig = {
  model?: BillingModel;
  rate?: DecimalLike | null;
  capAmount?: DecimalLike | null;
  retainerAmount?: DecimalLike | null;
  billingNotes?: string | null;
};

export type MatterDocumentConfig = {
  folderId?: string | null;
  documentCount?: number | null;
  requiredDocuments?: string[] | null;
};

export type MatterCalendarConfig = {
  nextKeyDate?: string | null;
  nextCourtDate?: string | null;
  reminderMode?: 'NONE' | 'EMAIL' | 'SMS' | 'BOTH' | null;
};

export type MatterInvoiceConfig = {
  invoiceCycle?: 'AD_HOC' | 'MONTHLY' | 'MILESTONE' | null;
  lastInvoiceDate?: string | null;
  unbilledTimeValue?: DecimalLike | null;
};

export type MatterReportConfig = {
  clientReportingFrequency?: 'NONE' | 'WEEKLY' | 'MONTHLY' | 'ON_DEMAND' | null;
  internalReportingFrequency?: 'NONE' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | null;
};

export type MatterInput = {
  matterCode?: string | null;
  matterReference?: string | null;
  title: string;
  description?: string | null;
  clientId: string;
  branchId?: string | null;

  status?: MatterStatus;
  billingModel?: BillingModel;
  currency?: string | null;
  openedDate?: Date | null;
  closeDate?: Date | null;

  originatorId?: string | null;
  partnerId?: string | null;
  assigneeId?: string | null;

  estimatedValue?: DecimalLike | null;
  progressPercent?: number | null;
  progressStage?: MatterProgressStage | null;

  billing?: MatterBillingConfig | null;
  documents?: MatterDocumentConfig | null;
  calendar?: MatterCalendarConfig | null;
  invoice?: MatterInvoiceConfig | null;
  reports?: MatterReportConfig | null;

  metadata?: Record<string, unknown> | null;
};

export type TenantMatterDbClient = {
  matter: {
    findFirst: Function;
    findMany: Function;
    create: Function;
    update: Function;
  };
  client: {
    findFirst: Function;
  };
  branch: {
    findFirst: Function;
  };
  user: {
    findFirst: Function;
  };
};