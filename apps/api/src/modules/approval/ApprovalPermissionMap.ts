// apps/api/src/modules/approval/ApprovalPermissionMap.ts

export const APPROVAL_PERMISSION_KEYS = {
  createRequest: 'approval.create_request',
  viewRequest: 'approval.view_request',
  searchRequests: 'approval.search_requests',
  approveRequest: 'approval.approve_request',
  rejectRequest: 'approval.reject_request',
  requestChanges: 'approval.request_changes',
  escalateRequest: 'approval.escalate_request',
  delegateRequest: 'approval.delegate_request',
  reassignRequest: 'approval.reassign_request',
  cancelRequest: 'approval.cancel_request',
  expireRequest: 'approval.expire_request',
  viewDashboard: 'approval.view_dashboard',
} as const;

export type ApprovalPermissionKey =
  (typeof APPROVAL_PERMISSION_KEYS)[keyof typeof APPROVAL_PERMISSION_KEYS];