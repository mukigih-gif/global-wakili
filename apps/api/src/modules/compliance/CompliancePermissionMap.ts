// apps/api/src/modules/compliance/CompliancePermissionMap.ts

export const COMPLIANCE_PERMISSION_KEYS = {
  runClientReview: 'compliance.run_client_review',
  viewClientChecks: 'compliance.view_client_checks',
  createReport: 'compliance.create_report',
  updateReport: 'compliance.update_report',
  viewReport: 'compliance.view_report',
  searchReport: 'compliance.search_report',
  submitGoaml: 'compliance.submit_goaml',
  syncGoaml: 'compliance.sync_goaml',
  viewDashboard: 'compliance.view_dashboard',
  viewCalendar: 'compliance.view_calendar',
} as const;

export type CompliancePermissionKey =
  (typeof COMPLIANCE_PERMISSION_KEYS)[keyof typeof COMPLIANCE_PERMISSION_KEYS];