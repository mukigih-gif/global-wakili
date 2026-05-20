// apps/api/src/modules/matter/matter.types.ts

import type { Request } from 'express';
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
  | 'MISSING_BRANCH'
  | 'MISSING_CATEGORY'
  | 'MISSING_LEAD_ADVOCATE'
  | 'INVALID_BRANCH'
  | 'INVALID_PARTNER'
  | 'INVALID_ASSIGNEE'
  | 'INVALID_ASSIGNED_LAWYER'
  | 'INVALID_LEAD_ADVOCATE'
  | 'INVALID_ORIGINATOR'
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
  /**
   * Legacy/current onboarding-compatible fields.
   */
  folderId?: string | null;
  documentCount?: number | null;
  requiredDocuments?: string[] | null;

  /**
   * Forward-looking provider fields for future Document module integration.
   */
  storageProvider?: 'LOCAL' | 'S3' | 'GOOGLE_DRIVE' | null;
  folderPath?: string | null;
};

export type MatterCalendarConfig = {
  /**
   * Legacy/current onboarding-compatible fields.
   */
  nextKeyDate?: string | null;
  nextCourtDate?: string | null;
  reminderMode?: 'NONE' | 'EMAIL' | 'SMS' | 'BOTH' | null;

  /**
   * Forward-looking sync fields for Calendar integration.
   */
  syncEnabled?: boolean;
  provider?: 'GOOGLE' | 'TEAMS' | 'BOTH' | null;
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

/**
 * MatterInput represents the create/update contract for Matter persistence.
 *
 * Physical Matter columns must be carried as first-class properties so they
 * remain searchable, reportable, auditable, and enforceable by Prisma/Postgres.
 * Metadata is reserved for operational context and non-authoritative extension
 * data only.
 */
export type MatterInput = {
  /**
   * Primary identifiers.
   */
  matterCode?: string | null;
  caseNumber?: string | null;
  matterReference?: string | null;

  /**
   * Core identity and categorisation.
   *
   * category is required by the physical Matter schema and must be validated
   * before create persistence.
   */
  title: string;
  description?: string | null;
  category?: string | null;
  riskLevel?: string | null;

  /**
   * Tenant-owned relationships.
   *
   * branchId is required by the physical Matter schema and must be validated
   * before create persistence.
   */
  clientId: string;
  branchId?: string | null;

  /**
   * Governance and workflow.
   */
  status?: MatterStatus;
  billingModel?: BillingModel;
  currency?: string | null;

  /**
   * Temporal/legal lifecycle data.
   */
  openedDate?: Date | null;
  closeDate?: Date | null;
  closedDate?: Date | null;
  archivedDate?: Date | null;
  statuteOfLimitationsDate?: Date | null;

  /**
   * Matter responsibility roles.
   *
   * leadAdvocateId is required by the physical Matter schema and must be
   * validated before create persistence.
   */
  originatorId?: string | null;
  partnerId?: string | null;
  assigneeId?: string | null;
  leadAdvocateId?: string | null;
  assignedLawyerId?: string | null;

  /**
   * Financial planning.
   */
  estimatedValue?: DecimalLike | null;

  /**
   * Operational context stored in Matter.metadata.
   */
  progressPercent?: number | null;
  progressStage?: MatterProgressStage | null;
  billing?: MatterBillingConfig | null;
  documents?: MatterDocumentConfig | null;
  calendar?: MatterCalendarConfig | null;
  invoice?: MatterInvoiceConfig | null;
  reports?: MatterReportConfig | null;

  metadata?: Record<string, unknown> | null;
};

/**
 * Matter service DB contract.
 *
 * This derives delegate shapes from the actual request-scoped DB client so the
 * service remains compatible with tenant-scoped Prisma extensions without
 * falling back to weak Function-based delegates.
 */
export type TenantMatterDbClient = {
  matter: Request['db']['matter'];
  client: Request['db']['client'];
  branch: Request['db']['branch'];
  user: Request['db']['user'];
};
