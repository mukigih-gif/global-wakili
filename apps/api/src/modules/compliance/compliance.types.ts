// apps/api/src/modules/compliance/compliance.types.ts

export type AmlReportType = 'STR' | 'CTR' | 'KYC_EXCEPTION' | 'AML_REVIEW';

export type AmlStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'REJECTED';

export type ComplianceCheckType = 'KYC' | 'PEP' | 'SANCTIONS' | 'RISK';

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplianceAuditAction =
  | 'CLIENT_REVIEW_RUN'
  | 'CLIENT_CHECK_HISTORY_VIEWED'
  | 'REPORT_CREATED'
  | 'REPORT_VIEWED'
  | 'REPORT_SEARCHED'
  | 'REPORT_STATUS_UPDATED'
  | 'REPORT_SUBMITTED_GOAML'
  | 'REPORT_GOAML_STATUS_SYNCED'
  | 'DASHBOARD_VIEWED'
  | 'CALENDAR_VIEWED'
  | 'CAPABILITY_VIEWED';

export type ComplianceReviewInput = {
  tenantId: string;
  clientId: string;
  actorId?: string | null;
  performKyc?: boolean;
  performPepCheck?: boolean;
  performSanctionsCheck?: boolean;
  persistResult?: boolean;
};

export type ComplianceReportCreateInput = {
  tenantId: string;
  reportType: AmlReportType;
  status?: AmlStatus;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  referenceNumber?: string | null;
  regulatorAck?: string | null;
  submittedAt?: Date | string | null;
  clientId?: string | null;
  createdById?: string | null;
  payload?: Record<string, unknown> | null;
};

export type ComplianceReportUpdateInput = {
  tenantId: string;
  reportId: string;
  actorId?: string | null;
  status?: AmlStatus;
  referenceNumber?: string | null;
  regulatorAck?: string | null;
  submittedAt?: Date | string | null;
  payload?: Record<string, unknown> | null;
};

export type ComplianceReportSearchFilters = {
  reportType?: AmlReportType | null;
  status?: AmlStatus | null;
  clientId?: string | null;
  periodStartFrom?: Date | string | null;
  periodStartTo?: Date | string | null;
  periodEndFrom?: Date | string | null;
  periodEndTo?: Date | string | null;
  createdFrom?: Date | string | null;
  createdTo?: Date | string | null;
};

export type ComplianceCheckSearchFilters = {
  clientId?: string | null;
  checkType?: ComplianceCheckType | null;
  riskBand?: RiskBand | null;
  checkedFrom?: Date | string | null;
  checkedTo?: Date | string | null;
};

export type ComplianceDbClient = {
  tenant: {
    findFirst: Function;
  };
  client: {
    findFirst: Function;
    findMany: Function;
    count: Function;
  };
  clientComplianceCheck: {
    findMany: Function;
    count: Function;
    groupBy?: Function;
  };
  complianceReport: {
    create: Function;
    update: Function;
    findFirst: Function;
    findMany: Function;
    count: Function;
    groupBy?: Function;
  };
  auditLog: {
    create: Function;
    findMany?: Function;
  };
  user: {
    findFirst: Function;
    findMany?: Function;
  };
};