// apps/api/src/modules/analytics/analytics.types.ts

export const ANALYTICS_MODULES = [
  'OVERVIEW',
  'CLIENT',
  'MATTER',
  'BILLING',
  'TRUST',
  'PRODUCTIVITY',
  'COURT',
  'CALENDAR',
  'COMPLIANCE',
  'NOTIFICATIONS',
  'QUEUES',
  'FINANCE',
  'PROCUREMENT',
  'PAYROLL',
  'HR',
  'RECEPTION',
  'PLATFORM',
] as const;

export const ANALYTICS_METRIC_SCOPES = [
  'TENANT',
  'CLIENT',
  'MATTER',
  'USER',
  'MODULE',
  'ENTITY',
] as const;

export const ANALYTICS_METRIC_VALUE_TYPES = [
  'NUMBER',
  'MONEY',
  'PERCENTAGE',
  'COUNT',
  'BOOLEAN',
  'DURATION',
  'RATIO',
  'JSON',
] as const;

export const ANALYTICS_SNAPSHOT_STATUSES = [
  'ACTIVE',
  'SUPERSEDED',
  'ARCHIVED',
] as const;

export const ANALYTICS_INSIGHT_SEVERITIES = [
  'INFO',
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;

export const ANALYTICS_INSIGHT_STATUSES = [
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED',
  'DISMISSED',
] as const;

export type AnalyticsModule = (typeof ANALYTICS_MODULES)[number];

export type AnalyticsMetricScope = (typeof ANALYTICS_METRIC_SCOPES)[number];

export type AnalyticsMetricValueType =
  (typeof ANALYTICS_METRIC_VALUE_TYPES)[number];

export type AnalyticsSnapshotStatus =
  (typeof ANALYTICS_SNAPSHOT_STATUSES)[number];

export type AnalyticsInsightSeverity =
  (typeof ANALYTICS_INSIGHT_SEVERITIES)[number];

export type AnalyticsInsightStatus =
  (typeof ANALYTICS_INSIGHT_STATUSES)[number];

export type AnalyticsPeriodInput = {
  from?: Date | string | null;
  to?: Date | string | null;
};

export type AnalyticsMetricInput = {
  tenantId: string;
  module: AnalyticsModule;
  scope?: AnalyticsMetricScope;
  metricKey: string;
  metricName: string;
  value: number | string;
  valueType?: AnalyticsMetricValueType;
  unit?: string | null;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  dimensions?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type AnalyticsSnapshotInput = {
  tenantId: string;
  module: AnalyticsModule;
  snapshotKey: string;
  title: string;
  description?: string | null;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  payload: Record<string, unknown>;
  metrics?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type AnalyticsInsightInput = {
  tenantId: string;
  module: AnalyticsModule;
  insightKey: string;
  title: string;
  summary: string;
  severity?: AnalyticsInsightSeverity;
  status?: AnalyticsInsightStatus;
  entityType?: string | null;
  entityId?: string | null;
  score?: number | null;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type AnalyticsMetricSearchFilters = {
  module?: AnalyticsModule | null;
  metricKey?: string | null;
  scope?: AnalyticsMetricScope | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  periodStartFrom?: Date | string | null;
  periodStartTo?: Date | string | null;
  periodEndFrom?: Date | string | null;
  periodEndTo?: Date | string | null;
  createdFrom?: Date | string | null;
  createdTo?: Date | string | null;
};

export type AnalyticsSnapshotSearchFilters = {
  module?: AnalyticsModule | null;
  snapshotKey?: string | null;
  status?: AnalyticsSnapshotStatus | null;
};

export type AnalyticsInsightSearchFilters = {
  module?: AnalyticsModule | null;
  insightKey?: string | null;
  severity?: AnalyticsInsightSeverity | null;
  status?: AnalyticsInsightStatus | null;
  entityType?: string | null;
  entityId?: string | null;
};

export type AnalyticsAuditAction =
  | 'OVERVIEW_VIEWED'
  | 'CLIENT_ANALYTICS_VIEWED'
  | 'MATTER_ANALYTICS_VIEWED'
  | 'BILLING_ANALYTICS_VIEWED'
  | 'TRUST_ANALYTICS_VIEWED'
  | 'PRODUCTIVITY_ANALYTICS_VIEWED'
  | 'COMPLIANCE_ANALYTICS_VIEWED'
  | 'OPERATIONS_ANALYTICS_VIEWED'
  | 'KPI_VIEWED'
  | 'METRIC_CREATED'
  | 'METRIC_SEARCHED'
  | 'SNAPSHOT_CREATED'
  | 'SNAPSHOT_SEARCHED'
  | 'INSIGHT_CREATED'
  | 'INSIGHT_SEARCHED'
  | 'CAPABILITY_VIEWED';

export type AnalyticsPagination = {
  page?: number;
  limit?: number;
};

export type AnalyticsDbClient = {
  $transaction?: Function;

  analyticsMetric: {
    create: Function;
    findMany: Function;
    count: Function;
    groupBy?: Function;
  };

  analyticsSnapshot: {
    create: Function;
    updateMany: Function;
    findMany: Function;
    count: Function;
  };

  analyticsInsight: {
    create: Function;
    findMany: Function;
    count: Function;
  };

  tenant: {
    findFirst: Function;
    count: Function;
  };

  client: {
    count: Function;
    findMany: Function;
    groupBy?: Function;
  };

  matter: {
    count: Function;
    findMany: Function;
    groupBy?: Function;
    aggregate?: Function;
  };

  invoice: {
    count: Function;
    findMany: Function;
    groupBy?: Function;
    aggregate?: Function;
  };

  trustTransaction: {
    count: Function;
    findMany: Function;
    aggregate?: Function;
    groupBy?: Function;
  };

  matterTask?: {
    count: Function;
    findMany: Function;
    groupBy?: Function;
  };

  timeEntry?: {
    count: Function;
    findMany: Function;
    aggregate?: Function;
  };

  courtHearing?: {
    count: Function;
    groupBy?: Function;
  };

  calendarEvent?: {
    count: Function;
    groupBy?: Function;
  };

  clientComplianceCheck: {
    count: Function;
    findMany: Function;
    groupBy?: Function;
  };

  complianceReport: {
    count: Function;
    findMany: Function;
    groupBy?: Function;
  };

  externalJobQueue: {
    count: Function;
    findMany: Function;
    groupBy?: Function;
  };

  notification: {
    count: Function;
    findMany: Function;
    groupBy?: Function;
  };

  platformActivityLog?: {
    count: Function;
    findMany: Function;
    groupBy?: Function;
  };

  auditLog: {
    create: Function;
  };
};