// apps/api/src/modules/analytics/AnalyticsPermissionMap.ts

export const ANALYTICS_PERMISSION_KEYS = {
  viewOverview: 'analytics.view_overview',
  viewClientAnalytics: 'analytics.view_client_analytics',
  viewMatterAnalytics: 'analytics.view_matter_analytics',
  viewBillingAnalytics: 'analytics.view_billing_analytics',
  viewTrustAnalytics: 'analytics.view_trust_analytics',
  viewProductivityAnalytics: 'analytics.view_productivity_analytics',
  viewComplianceAnalytics: 'analytics.view_compliance_analytics',
  viewOperationsAnalytics: 'analytics.view_operations_analytics',
  viewKpis: 'analytics.view_kpis',
  manageMetrics: 'analytics.manage_metrics',
  manageSnapshots: 'analytics.manage_snapshots',
  manageInsights: 'analytics.manage_insights',
} as const;

export type AnalyticsPermissionKey =
  (typeof ANALYTICS_PERMISSION_KEYS)[keyof typeof ANALYTICS_PERMISSION_KEYS];

export const ANALYTICS_READ_PERMISSIONS: AnalyticsPermissionKey[] = [
  ANALYTICS_PERMISSION_KEYS.viewOverview,
  ANALYTICS_PERMISSION_KEYS.viewClientAnalytics,
  ANALYTICS_PERMISSION_KEYS.viewMatterAnalytics,
  ANALYTICS_PERMISSION_KEYS.viewBillingAnalytics,
  ANALYTICS_PERMISSION_KEYS.viewTrustAnalytics,
  ANALYTICS_PERMISSION_KEYS.viewProductivityAnalytics,
  ANALYTICS_PERMISSION_KEYS.viewComplianceAnalytics,
  ANALYTICS_PERMISSION_KEYS.viewOperationsAnalytics,
  ANALYTICS_PERMISSION_KEYS.viewKpis,
];

export const ANALYTICS_WRITE_PERMISSIONS: AnalyticsPermissionKey[] = [
  ANALYTICS_PERMISSION_KEYS.manageMetrics,
  ANALYTICS_PERMISSION_KEYS.manageSnapshots,
  ANALYTICS_PERMISSION_KEYS.manageInsights,
];