// apps/api/src/modules/court/CourtPermissionMap.ts

export const COURT_PERMISSION_KEYS = {
  createHearing: 'court.create_hearing',
  updateHearing: 'court.update_hearing',
  viewHearing: 'court.view_hearing',
  searchHearing: 'court.search_hearing',
  manageCalendarLink: 'court.manage_calendar_link',
  recordOutcome: 'court.record_outcome',
  viewDashboard: 'court.view_dashboard',
  manageFiling: 'court.manage_filing',
  manageHandoff: 'court.manage_handoff',
} as const;

export type CourtPermissionKey =
  (typeof COURT_PERMISSION_KEYS)[keyof typeof COURT_PERMISSION_KEYS];