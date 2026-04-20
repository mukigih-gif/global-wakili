export enum AuditSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export const AUDIT_REQUIRED_ACTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'PASSWORD_CHANGED',
  'MFA_ENABLED',
  'MFA_DISABLED',

  'TRUST_DEPOSIT',
  'TRUST_WITHDRAWAL',
  'TRUST_TRANSFER',
  'TRUST_REVERSAL',
  'TRUST_RECONCILIATION_COMPLETED',
  'TRUST_RECONCILIATION_FAILED',

  'JOURNAL_POSTED',
  'JOURNAL_REVERSED',
  'PAYMENT_ALLOCATED',
  'PAYMENT_UNALLOCATED',
  'INVOICE_VOIDED',

  'USER_CREATED',
  'USER_ROLE_CHANGED',
  'USER_DEACTIVATED',
  'USER_REACTIVATED',
  'PERMISSION_GRANTED',
  'PERMISSION_REVOKED',

  'DATA_EXPORT',
  'DATA_IMPORT',
  'CLIENT_RECORD_EXPORTED',
  'DOCUMENT_DOWNLOADED',
  'DOCUMENT_DELETED',

  'REQUEST_FAILURE',
  'SYSTEM_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'ETIMS_SYNC',
  'PAYROLL_GENERATED',
  'PAYROLL_APPROVED',
  'PROCUREMENT_APPROVED',
] as const;

export type AuditAction = (typeof AUDIT_REQUIRED_ACTIONS)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = {
  [key: string]: JsonValue;
};

export interface AuditActor {
  id: string;
  role: string;
}

export interface AuditEventPayload extends JsonObject {
  success?: boolean;
  error?: string;
  timestamp?: string;
  [key: string]: JsonValue;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  actorId: string;
  action: AuditAction;
  severity: AuditSeverity;
  payload: AuditEventPayload;
  hash: string;
  previousHash: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}