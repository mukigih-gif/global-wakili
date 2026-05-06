import {
  AuditAction as PrismaAuditAction,
  AuditSeverity as PrismaAuditSeverity,
} from '@prisma/client';

export const AuditAction = PrismaAuditAction;
export const AuditSeverity = PrismaAuditSeverity;

export type AuditAction = PrismaAuditAction;
export type AuditSeverity = PrismaAuditSeverity;

export const AUTH_AUDIT_EVENT_CODES = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED_USER_NOT_FOUND: 'LOGIN_FAILED_USER_NOT_FOUND',
  LOGIN_FAILED_INVALID_PASSWORD: 'LOGIN_FAILED_INVALID_PASSWORD',
  LOGIN_FAILED_MISSING_PASSWORD_HASH: 'LOGIN_FAILED_MISSING_PASSWORD_HASH',
  LOGIN_BLOCKED_INACTIVE_USER: 'LOGIN_BLOCKED_INACTIVE_USER',
  LOGIN_BLOCKED_LOCKED_USER: 'LOGIN_BLOCKED_LOCKED_USER',
  LOGIN_BLOCKED_TENANT_SUSPENDED: 'LOGIN_BLOCKED_TENANT_SUSPENDED',
  LOGOUT_SUCCESS: 'LOGOUT_SUCCESS',
  LOGOUT_TOKEN_INVALID: 'LOGOUT_TOKEN_INVALID',
  SESSION_CREATE_FAILED: 'SESSION_CREATE_FAILED',
  TOKEN_VERIFICATION_FAILED: 'TOKEN_VERIFICATION_FAILED',
  TENANT_ACCESS_DENIED: 'TENANT_ACCESS_DENIED',
  TENANT_CONTEXT_REQUIRED: 'TENANT_CONTEXT_REQUIRED',
  PLATFORM_AUDIT_SKIPPED_TENANT_REQUIRED: 'PLATFORM_AUDIT_SKIPPED_TENANT_REQUIRED',
  REQUEST_FAILURE: 'REQUEST_FAILURE',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
} as const;

export type AuthAuditEventCode =
  (typeof AUTH_AUDIT_EVENT_CODES)[keyof typeof AUTH_AUDIT_EVENT_CODES];

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonObject
  | JsonValue[];

export type JsonObject = {
  [key: string]: JsonValue;
};

/**
 * AuditEventPayload allows optional properties at construction time.
 * Undefined values are removed by sanitizeJson before writing to Prisma JSON.
 */
export type AuditEventPayload = {
  [key: string]: JsonValue | undefined;
  success?: boolean;
  error?: string;
  eventCode?: string;
  requestId?: string | null;
  timestamp?: string;
};

export interface AuditActor {
  id: string;
  role: string;
}