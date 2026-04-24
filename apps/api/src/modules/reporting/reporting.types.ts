// apps/api/src/modules/reporting/reporting.types.ts

export const REPORT_DEFINITION_TYPES = [
  'DASHBOARD',
  'OPERATIONAL',
  'FINANCIAL',
  'TRUST',
  'COMPLIANCE',
  'ANALYTICS',
  'AI',
  'APPROVAL',
  'PLATFORM',
  'CUSTOM',
] as const;

export const REPORT_SOURCE_LAYERS = [
  'ANALYTICS',
  'DIRECT_QUERY',
  'SNAPSHOT',
  'HYBRID',
] as const;

export const REPORT_RUN_STATUSES = [
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
] as const;

export const REPORT_EXPORT_FORMATS = [
  'JSON',
  'CSV',
  'XLSX',
  'PDF',
  'POWER_BI',
] as const;

export const REPORT_EXPORT_STATUSES = [
  'PENDING',
  'GENERATING',
  'READY',
  'FAILED',
  'EXPIRED',
] as const;

export const REPORT_DELIVERY_CHANNELS = [
  'DOWNLOAD',
  'EMAIL',
  'WEBHOOK',
  'INTERNAL',
] as const;

export const DASHBOARD_VISIBILITIES = [
  'PRIVATE',
  'ROLE',
  'TENANT',
  'PLATFORM',
] as const;

export const BI_CONNECTOR_TYPES = [
  'POWER_BI',
  'GENERIC_API',
  'WEBHOOK',
  'DATA_EXPORT',
] as const;

export const SCHEDULE_FREQUENCIES = [
  'HOURLY',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
  'CUSTOM',
] as const;

export const REPORT_SENSITIVITY_LEVELS = [
  'STANDARD',
  'CONFIDENTIAL',
  'PRIVILEGED',
  'HIGHLY_RESTRICTED',
] as const;

export const REPORTING_PLAN_FEATURES = [
  'STANDARD_EXPORTS',
  'ADVANCED_SCHEDULING',
  'BI_CONNECTORS',
  'EXECUTIVE_DASHBOARDS',
  'CUSTOM_REPORTS',
] as const;

export type ReportDefinitionType = (typeof REPORT_DEFINITION_TYPES)[number];
export type ReportSourceLayer = (typeof REPORT_SOURCE_LAYERS)[number];
export type ReportRunStatus = (typeof REPORT_RUN_STATUSES)[number];
export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number];
export type ReportExportStatus = (typeof REPORT_EXPORT_STATUSES)[number];
export type ReportDeliveryChannel = (typeof REPORT_DELIVERY_CHANNELS)[number];
export type DashboardVisibility = (typeof DASHBOARD_VISIBILITIES)[number];
export type BIConnectorType = (typeof BI_CONNECTOR_TYPES)[number];
export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];
export type ReportSensitivityLevel = (typeof REPORT_SENSITIVITY_LEVELS)[number];
export type ReportingPlanFeature = (typeof REPORTING_PLAN_FEATURES)[number];

export type ReportingAuditAction =
  | 'OVERVIEW_VIEWED'
  | 'CAPABILITY_VIEWED'
  | 'CATALOG_VIEWED'
  | 'REPORT_DEFINITION_UPSERTED'
  | 'REPORT_DEFINITIONS_SEARCHED'
  | 'REPORT_RUN_CREATED'
  | 'REPORT_RUNS_SEARCHED'
  | 'REPORT_EXPORT_CREATED'
  | 'REPORT_EXPORTS_SEARCHED'
  | 'DASHBOARD_DEFINITION_UPSERTED'
  | 'DASHBOARD_DEFINITIONS_SEARCHED'
  | 'DASHBOARD_WIDGET_UPSERTED'
  | 'DASHBOARD_WIDGETS_SEARCHED'
  | 'SCHEDULE_UPSERTED'
  | 'SCHEDULES_SEARCHED'
  | 'BI_CONNECTOR_UPSERTED'
  | 'BI_CONNECTORS_SEARCHED';

export type ReportDefinitionInput = {
  tenantId: string;
  key: string;
  name: string;
  description?: string | null;
  type?: ReportDefinitionType;
  sourceLayer?: ReportSourceLayer;
  defaultFormat?: ReportExportFormat;
  isSystem?: boolean;
  isActive?: boolean;
  config?: Record<string, unknown> | null;
  filterSchema?: Record<string, unknown> | null;
  columnSchema?: Record<string, unknown> | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
};

export type ReportRunInput = {
  tenantId: string;
  reportDefinitionId: string;
  triggeredByUserId?: string | null;
  sourceLayer?: ReportSourceLayer | null;
  parameters?: Record<string, unknown> | null;
  snapshotRefType?: string | null;
  snapshotRefId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ReportExportInput = {
  tenantId: string;
  reportDefinitionId: string;
  reportRunId?: string | null;
  format?: ReportExportFormat;
  deliveryChannel?: ReportDeliveryChannel;
  fileName?: string | null;
  mimeType?: string | null;
  expiresAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
};

export type DashboardDefinitionInput = {
  tenantId: string;
  key: string;
  name: string;
  description?: string | null;
  visibility?: DashboardVisibility;
  isSystem?: boolean;
  isActive?: boolean;
  layout?: Record<string, unknown> | null;
  filters?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type DashboardWidgetInput = {
  tenantId: string;
  dashboardDefinitionId: string;
  key: string;
  title: string;
  widgetType: string;
  dataSource?: string | null;
  config?: Record<string, unknown> | null;
  position?: Record<string, unknown> | null;
  visibilityRules?: Record<string, unknown> | null;
  refreshIntervalSec?: number | null;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
};

export type ScheduledReportInput = {
  tenantId: string;
  reportDefinitionId: string;
  name: string;
  frequency: ScheduleFrequency;
  cronExpression?: string | null;
  timezone?: string | null;
  format?: ReportExportFormat;
  deliveryChannel?: ReportDeliveryChannel;
  isEnabled?: boolean;
  recipients?: string[] | null;
  parameters?: Record<string, unknown> | null;
  nextRunAt?: Date | string | null;
  createdByUserId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type BIConnectorConfigInput = {
  tenantId: string;
  connectorType: BIConnectorType;
  name: string;
  isEnabled?: boolean;
  endpointUrl?: string | null;
  workspaceId?: string | null;
  datasetId?: string | null;
  credentialsRef?: string | null;
  config?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type ReportingSearchFilters = {
  key?: string | null;
  name?: string | null;
  type?: ReportDefinitionType | null;
  status?: ReportRunStatus | ReportExportStatus | null;
  sourceLayer?: ReportSourceLayer | null;
  format?: ReportExportFormat | null;
  deliveryChannel?: ReportDeliveryChannel | null;
  visibility?: DashboardVisibility | null;
  connectorType?: BIConnectorType | null;
  frequency?: ScheduleFrequency | null;
  isActive?: boolean | null;
  isEnabled?: boolean | null;
  reportDefinitionId?: string | null;
  dashboardDefinitionId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdFrom?: Date | string | null;
  createdTo?: Date | string | null;
};

export type PrebuiltReportCatalogEntry = {
  key: string;
  name: string;
  category: ReportDefinitionType;
  sourceLayer: ReportSourceLayer;
  supportedFormats: ReportExportFormat[];
  sensitivity: ReportSensitivityLevel;
  deliveryChannels: ReportDeliveryChannel[];
  tags: string[];
  summary: string;
  planFeatures: ReportingPlanFeature[];
};

export type DashboardWidgetBlueprint = {
  key: string;
  title: string;
  widgetType:
    | 'DONUT'
    | 'PIE'
    | 'LINE'
    | 'AREA'
    | 'BAR'
    | 'COLUMN'
    | 'KPI_SPARKLINE'
    | 'TABLE';
  dataSource: string;
  refreshIntervalSec: number;
  summary: string;
  config: Record<string, unknown>;
};

export type DashboardBlueprint = {
  key: string;
  name: string;
  roleScope: string[];
  cache: {
    strategy: 'TENANT_ROLE_SCOPED_REDIS_READY';
    ttlSeconds: number;
  };
  widgets: DashboardWidgetBlueprint[];
};

export type ReportingDbClient = {
  tenant: {
    findFirst: Function;
  };
  reportDefinition: {
    findFirst: Function;
    findMany: Function;
    create: Function;
    update: Function;
    count: Function;
    groupBy?: Function;
  };
  reportRun: {
    findFirst: Function;
    findMany: Function;
    create: Function;
    update: Function;
    count: Function;
    groupBy?: Function;
  };
  reportExport: {
    findFirst: Function;
    findMany: Function;
    create: Function;
    update: Function;
    count: Function;
    groupBy?: Function;
  };
  dashboardDefinition: {
    findFirst: Function;
    findMany: Function;
    create: Function;
    update: Function;
    count: Function;
    groupBy?: Function;
  };
  dashboardWidget: {
    findFirst: Function;
    findMany: Function;
    create: Function;
    update: Function;
    count: Function;
    groupBy?: Function;
  };
  scheduledReport: {
    findFirst: Function;
    findMany: Function;
    create: Function;
    update: Function;
    count: Function;
    groupBy?: Function;
  };
  bIConnectorConfig: {
    findFirst: Function;
    findMany: Function;
    create: Function;
    update: Function;
    count: Function;
    groupBy?: Function;
  };
  auditLog: {
    create: Function;
  };
};