// apps/api/src/modules/reception/ReceptionPermissionMap.ts

export const RECEPTION_PERMISSION_KEYS = {
  createVisitorLog: 'reception.create_visitor_log',
  createCallLog: 'reception.create_call_log',
  receiveFile: 'reception.receive_file',
  viewLog: 'reception.view_log',
  searchLog: 'reception.search_log',
  viewDashboard: 'reception.view_dashboard',
  manageHandoff: 'reception.manage_handoff',
} as const;

export type ReceptionPermissionKey =
  (typeof RECEPTION_PERMISSION_KEYS)[keyof typeof RECEPTION_PERMISSION_KEYS];