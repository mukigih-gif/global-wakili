// apps/api/src/modules/reporting/ReportingPermissionMap.ts

export const REPORTING_PERMISSION_KEYS = {
  viewOverview: 'reporting.view_overview',
  viewDefinitions: 'reporting.view_definitions',
  manageDefinitions: 'reporting.manage_definitions',
  viewDashboards: 'reporting.view_dashboards',
  manageDashboards: 'reporting.manage_dashboards',
  viewRuns: 'reporting.view_runs',
  runReports: 'reporting.run_reports',
  viewExports: 'reporting.view_exports',
  exportReports: 'reporting.export_reports',
  viewSchedules: 'reporting.view_schedules',
  manageSchedules: 'reporting.manage_schedules',
  viewBIConnectors: 'reporting.view_bi_connectors',
  manageBIConnectors: 'reporting.manage_bi_connectors',
} as const;

export type ReportingPermissionKey =
  (typeof REPORTING_PERMISSION_KEYS)[keyof typeof REPORTING_PERMISSION_KEYS];