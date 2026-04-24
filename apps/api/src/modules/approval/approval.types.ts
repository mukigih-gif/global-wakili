// apps/api/src/modules/approval/approval.types.ts

export const APPROVAL_ACTIONS = [
  'SUBMIT',
  'APPROVE',
  'REJECT',
  'ESCALATE',
  'DELEGATE',
  'AUTO_APPROVE',
  'REQUEST_CHANGES',
  'CANCEL',
  'EXPIRE',
  'REASSIGN',
] as const;

export const APPROVAL_LEVELS = [
  'INITIATOR',
  'REVIEWER',
  'MANAGER',
  'HEAD_OF_DEPARTMENT',
  'CFO',
  'PARTNER',
  'SENIOR_PARTNER',
  'COMPLIANCE_OFFICER',
  'SYSTEM',
] as const;

export const APPROVAL_MODULES = [
  'PROCUREMENT',
  'PAYROLL',
  'FINANCE',
  'TRUST',
  'BILLING',
  'COMPLIANCE',
  'OPERATIONS',
  'HR',
  'RECEPTION',
  'COURT',
  'CALENDAR',
  'DOCUMENT',
  'CLIENT',
  'MATTER',
  'PLATFORM',
  'SYSTEM',
] as const;

export const APPROVAL_PRIORITIES = [
  'LOW',
  'NORMAL',
  'HIGH',
  'CRITICAL',
] as const;

export const APPROVAL_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'ESCALATED',
  'DELEGATED',
  'AUTO_APPROVED',
] as const;

export const APPROVAL_OPEN_STATUSES = [
  'PENDING',
  'ESCALATED',
  'DELEGATED',
] as const;

export const APPROVAL_TERMINAL_STATUSES = [
  'APPROVED',
  'REJECTED',
  'AUTO_APPROVED',
] as const;

export type ApprovalAction = (typeof APPROVAL_ACTIONS)[number];
export type ApprovalLevel = (typeof APPROVAL_LEVELS)[number];
export type ApprovalModule = (typeof APPROVAL_MODULES)[number];
export type ApprovalPriority = (typeof APPROVAL_PRIORITIES)[number];
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type ApprovalOpenStatus = (typeof APPROVAL_OPEN_STATUSES)[number];
export type ApprovalTerminalStatus = (typeof APPROVAL_TERMINAL_STATUSES)[number];

export type ApprovalDecisionAction = Extract<
  ApprovalAction,
  'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'CANCEL'
>;

export type ApprovalAuditAction =
  | 'REQUEST_CREATED'
  | 'REQUEST_VIEWED'
  | 'REQUEST_SEARCHED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_ESCALATED'
  | 'REQUEST_DELEGATED'
  | 'REQUEST_CANCELLED'
  | 'REQUEST_EXPIRED'
  | 'REQUEST_REASSIGNED'
  | 'DASHBOARD_VIEWED'
  | 'CAPABILITY_VIEWED';

export type ApprovalCreateInput = {
  tenantId: string;
  module: ApprovalModule;
  approvalKey?: string | null;
  entityType: string;
  entityId: string;
  currentState: string;
  nextState: string;
  action?: ApprovalAction;
  level?: ApprovalLevel;
  priority?: ApprovalPriority;
  requestedById?: string | null;
  assignedApproverId?: string | null;
  comment?: string | null;
  decisionReason?: string | null;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  deadlineAt?: Date | string | null;
};

export type ApprovalDecisionInput = {
  tenantId: string;
  approvalId: string;
  decidedByUserId: string;
  action: ApprovalDecisionAction;
  comment?: string | null;
  rejectionReason?: string | null;
  decisionReason?: string | null;
  afterSnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type ApprovalEscalationInput = {
  tenantId: string;
  approvalId: string;
  escalatedByUserId?: string | null;
  escalatedToUserId: string;
  escalationReason: string;
  level?: ApprovalLevel;
  priority?: ApprovalPriority;
  metadata?: Record<string, unknown> | null;
};

export type ApprovalDelegationInput = {
  tenantId: string;
  approvalId: string;
  delegatedFromUserId: string;
  delegatedToUserId: string;
  comment?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ApprovalReassignmentInput = {
  tenantId: string;
  approvalId: string;
  reassignedByUserId: string;
  reassignedToUserId: string;
  comment?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ApprovalSearchFilters = {
  module?: ApprovalModule | null;
  status?: ApprovalStatus | null;
  level?: ApprovalLevel | null;
  priority?: ApprovalPriority | null;
  approvalKey?: string | null;
  version?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  requestedById?: string | null;
  assignedApproverId?: string | null;
  approvedById?: string | null;
  createdFrom?: Date | string | null;
  createdTo?: Date | string | null;
  deadlineFrom?: Date | string | null;
  deadlineTo?: Date | string | null;
};

export type ApprovalDbClient = {
  $transaction?: Function;
  approval: {
    create: Function;
    update: Function;
    updateMany: Function;
    findFirst: Function;
    findMany: Function;
    count: Function;
    groupBy?: Function;
  };
  user: {
    findFirst: Function;
  };
  tenant: {
    findFirst: Function;
  };
  notification?: {
    create: Function;
  };
  auditLog: {
    create: Function;
  };
};