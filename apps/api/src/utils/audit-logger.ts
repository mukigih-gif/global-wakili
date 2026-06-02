import type { Request } from 'express';
import type { Prisma } from '@prisma/client';

import { prisma as rootPrisma } from '../../../../packages/database/src/prisma';
import { generateAuditHash } from './audit-hash';
import {
  AuditSeverity,
  type AuditAction,
  type AuditActor,
  type AuditEventPayload,
  type JsonObject,
  type JsonValue,
} from '../types/audit';

type AuditLogDelegate = {
  findFirst(args: unknown): Promise<{ hash: string } | null>;
  create(args: unknown): Promise<unknown>;
};

type AuditLogDb = {
  auditLog: AuditLogDelegate;
};

export type SecurityAuditResult =
  | {
      written: true;
      auditLog: unknown;
    }
  | {
      written: false;
      skippedReason: string;
    };

export type SecurityAuditParams = {
  db?: AuditLogDb;
  req?: Request;
  tenantId?: string | null;
  userId?: string | null;
  actor?: AuditActor;
  action: AuditAction;
  severity?: AuditSeverity;
  entityType: string;
  entityId: string;
  success?: boolean;
  failureReason?: string | null;
  reason?: string | null;
  correlationId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  changedFields?: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  allowMissingTenant?: boolean;
};

type LegacyAuditLoggerParams = {
  actor?: AuditActor;
  tenantId?: string;
  action: AuditAction;
  severity?: AuditSeverity;
  entityType?: string;
  entityId?: string | null;
  payload?: AuditEventPayload;
  beforeData?: unknown;
  afterData?: unknown;
  after?: unknown;
  changedFields?: string[];
  req?: Request;
  requestId?: string;
  success?: boolean;
  failureReason?: string | null;
  reason?: string | null;
};

function requestIdToString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return null;
}

function normalizeIp(req?: Request): string | null {
  if (!req) {
    return null;
  }

  const forwarded =
    typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0]?.trim() || null
      : null;

  return forwarded || req.ip || null;
}

function normalizeUserAgent(req?: Request): string | null {
  if (!req) {
    return null;
  }

  const header = req.headers['user-agent'];

  return typeof header === 'string' ? header : null;
}

function normalizeTenantId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEntityId(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return 'unknown';
}

function sanitizeJson(value: unknown): JsonValue {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJson(item));
  }

  if (typeof value === 'object') {
    const result: JsonObject = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (typeof nestedValue === 'undefined') {
        continue;
      }

      result[key] = sanitizeJson(nestedValue);
    }

    return result;
  }

  return String(value);
}

function ensureJsonObject(value: JsonValue): JsonObject {
  if (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return value;
  }

  return {
    value,
  };
}

function getAuditDb(params: SecurityAuditParams): AuditLogDb {
  return (
    params.db ??
    ((params.req as unknown as { db?: AuditLogDb } | undefined)?.db) ??
    (rootPrisma as unknown as AuditLogDb)
  );
}

function getActorUserId(params: SecurityAuditParams): string | null {
  const explicitUserId =
    typeof params.userId === 'string' && params.userId.trim().length > 0
      ? params.userId.trim()
      : null;

  if (explicitUserId) {
    return explicitUserId;
  }

  const actorUserId =
    typeof params.actor?.id === 'string' &&
    params.actor.id.trim().length > 0 &&
    params.actor.id !== 'SYSTEM' &&
    params.actor.id !== 'system'
      ? params.actor.id.trim()
      : null;

  if (actorUserId) {
    return actorUserId;
  }

  const requestUser = (params.req as unknown as {
    user?: {
      sub?: string;
      id?: string;
      userId?: string;
    };
  } | undefined)?.user;

  return requestUser?.sub ?? requestUser?.id ?? requestUser?.userId ?? null;
}

function getRequestRole(req?: Request): string | null {
  const requestUser = (req as unknown as {
    user?: {
      role?: string | null;
      primaryRole?: string | null;
      systemRole?: string | null;
      tenantRole?: string | null;
    };
  } | undefined)?.user;

  return (
    requestUser?.role ??
    requestUser?.primaryRole ??
    requestUser?.tenantRole ??
    requestUser?.systemRole ??
    null
  );
}

export async function logSecurityEvent(
  params: SecurityAuditParams,
): Promise<SecurityAuditResult> {
  const tenantId =
    normalizeTenantId(params.tenantId) ??
    normalizeTenantId((params.req as unknown as { tenantId?: string } | undefined)?.tenantId);

  if (!tenantId) {
    if (params.allowMissingTenant) {
      return {
        written: false,
        skippedReason: 'AUDIT_TENANT_REQUIRED',
      };
    }

    throw new Error('Audit logger requires tenantId because AuditLog.tenantId is non-null.');
  }

  const db = getAuditDb(params);

  const requestId =
    requestIdToString(params.requestId) ??
    requestIdToString((params.req as unknown as { id?: unknown } | undefined)?.id);

  const userId = getActorUserId(params);
  const ipAddress = params.ipAddress ?? normalizeIp(params.req);
  const userAgent = params.userAgent ?? normalizeUserAgent(params.req);
  const role = params.actor?.role ?? getRequestRole(params.req);
  const entityId = normalizeEntityId(params.entityId);
  const severity = params.severity ?? AuditSeverity.INFO;
  const success = params.success ?? true;
  const failureReason = params.failureReason ?? null;
  const correlationId = params.correlationId ?? requestId;
  const reason = params.reason ?? null;
  const changedFields = params.changedFields ?? [];

  const baseAfterData = ensureJsonObject(sanitizeJson(params.afterData ?? null));

 const afterDataForHash: JsonObject = {
  ...baseAfterData,
  requestId,
  actorRole: role,
  timestamp: new Date().toISOString(),
};

  const beforeDataForHash =
    typeof params.beforeData === 'undefined'
      ? null
      : sanitizeJson(params.beforeData);

  const beforeDataForDb =
    typeof params.beforeData === 'undefined'
      ? undefined
      : (beforeDataForHash as Prisma.InputJsonValue);

  const afterDataForDb = afterDataForHash as Prisma.InputJsonValue;

  const lastLog = await db.auditLog.findFirst({
    where: {
      tenantId,
    },
    orderBy: {
      sequenceNumber: 'desc',
    },
    select: {
      hash: true,
    },
  });

  const previousHash = lastLog?.hash ?? '0'.repeat(64);

  const hashPayload: JsonObject = {
    tenantId,
    userId,
    action: params.action,
    severity,
    entityType: params.entityType,
    entityId,
    beforeData: beforeDataForHash,
    afterData: afterDataForHash,
    changedFields,
    success,
    failureReason,
    correlationId,
    reason,
    ipAddress,
    userAgent,
  };

  const hash = generateAuditHash(hashPayload, previousHash);

  const auditLog = await db.auditLog.create({
    data: {
      tenantId,
      userId,
      action: params.action,
      severity,
      entityType: params.entityType,
      entityId,
      beforeData: beforeDataForDb,
      afterData: afterDataForDb,
      changedFields,
      ipAddress,
      userAgent,
      hash,
      previousHash,
      success,
      failureReason,
      correlationId,
      reason,
    },
  });

  return {
    written: true,
    auditLog,
  };
}

export async function logAdminAction(
  params: LegacyAuditLoggerParams,
): Promise<SecurityAuditResult> {
  const payload = params.payload ?? {
    success: params.success ?? true,
  };

  const success =
    typeof payload.success === 'boolean'
      ? payload.success
      : params.success ?? true;

  const failureReason =
    params.failureReason ??
    (typeof payload.error === 'string' ? payload.error : null);

  return logSecurityEvent({
    req: params.req,
    tenantId: params.tenantId,
    actor: params.actor,
    action: params.action,
    severity: params.severity ?? AuditSeverity.INFO,
    entityType: params.entityType ?? 'AdminAction',
    entityId:
      params.entityId ??
      params.actor?.id ??
      requestIdToString((params.req as unknown as { id?: unknown } | undefined)?.id) ??
      'system',
    beforeData: params.beforeData,
    afterData: params.afterData ?? params.after ?? payload,
    changedFields: params.changedFields ?? [],
    requestId: params.requestId,
    success,
    failureReason,
    reason: params.reason,
    allowMissingTenant: true,
  });
}